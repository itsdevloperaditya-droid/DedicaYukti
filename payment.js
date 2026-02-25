const https = require('https');
const crypto = require('crypto');
const { ObjectId } = require('mongodb');
const { getDb } = require('./db');

// REPLACE THESE WITH YOUR ACTUAL KEYS
const KEY_ID = 'rzp_live_SJWx8xpXBRPVsI'; 
const KEY_SECRET = '8adDCFDUaunXmRPthppvQtEh';

/**
 * Creates a Razorpay order for a given course using raw Node.js https module.
 */
async function createRazorpayOrder(courseId, couponCode = null) {
  const db = getDb();
  const course = await db.collection('courses').findOne({ _id: new ObjectId(courseId) });

  // Use discounted price if it exists and is valid, otherwise use regular price
  let finalPrice = (course.discountedPrice && Number(course.discountedPrice) < Number(course.price)) 
                     ? Number(course.discountedPrice) 
                     : Number(course.price);

  // Apply Coupon if provided
  if (couponCode) {
    const coupon = await db.collection('coupons').findOne({ code: couponCode.toUpperCase() });
    if (coupon) {
      const discountAmount = (finalPrice * Number(coupon.discountPercentage)) / 100;
      finalPrice = finalPrice - discountAmount;
    }
  }

  // Convert price to paise (e.g. 500 Rupees = 50000 Paise)
  const amount = Math.round(finalPrice * 100); 
  const currency = 'INR';

  const payload = JSON.stringify({
    amount: amount,
    currency: currency,
    receipt: `DY_${Date.now()}` // Dynamic short receipt (well under 40 chars)
  });

  // Basic Auth Header: "Basic " + base64(key_id:key_secret)
  const authHeader = "Basic " + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");

  console.log('--- Razorpay Authentication Debug ---');
  console.log('Using Key ID:', KEY_ID);
  console.log('Encoded Auth Header:', authHeader);

  const options = {
    hostname: 'api.razorpay.com',
    port: 443,
    path: '/v1/orders',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': payload.length,
      'Authorization': authHeader
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => responseBody += chunk);
      res.on('end', () => {
        console.log('Razorpay Response Status:', res.statusCode);
        console.log('Razorpay Response Body:', responseBody);
        
        try {
          const parsedData = JSON.parse(responseBody);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              orderId: parsedData.id,
              RAZORPAY_KEY_ID: KEY_ID,
              amount: parsedData.amount
            });
          } else {
            // Check if Razorpay returned an error description
            const errorMsg = parsedData.error ? parsedData.error.description : 'Authentication or API error';
            reject(new Error(errorMsg));
          }
        } catch (e) {
          reject(new Error('Failed to parse Razorpay response'));
        }
      });
    });

    req.on('error', (error) => {
      console.error('HTTPS Request Error:', error);
      reject(error);
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Verifies Razorpay payment signature.
 */
async function verifyPayment(paymentData) {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    courseId,
    userId
  } = paymentData;

  const body = razorpay_order_id + "|" + razorpay_payment_id;
  
  const expectedSignature = crypto
    .createHmac('sha256', KEY_SECRET)
    .update(body.toString())
    .digest('hex');

  if (expectedSignature === razorpay_signature) {
    const db = getDb();
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $addToSet: { purchasedCourses: new ObjectId(courseId) } }
    );

    return { status: 'success', message: 'Payment verified and course added' };
  } else {
    throw new Error('Invalid signature, payment verification failed');
  }
}

module.exports = { createRazorpayOrder, verifyPayment };
