require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { ObjectId } = require('mongodb');
const { connectToDatabase, getDb } = require('./db');
const { createCourse } = require('./course');
const { registerUser, loginUser, getUserProfile, updateUserProfile, deleteUser } = require('./user');
const { createRazorpayOrder, verifyPayment } = require('./payment');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 5000;

// --- ADMIN CREDENTIALS ---
const ADMIN_USER = 'admin_dedica';
const ADMIN_PASS = 'Power@9090';

// --- CORS CONFIGURATION ---
// Relaxed for stability during deployment debugging
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
// Path changed to ../frontend because server.js is now inside backend/ folder
app.use(express.static(path.join(__dirname, '../frontend')));

// Setup nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'its.devloper.aditya@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD || ''
  }
});

/**
 * API ROUTES
 */

const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client('537837416637-cgfl4j0k14hijtns9qcltllq41ehmv82.apps.googleusercontent.com');

// Root Route
app.get('/', (req, res) => {
    res.send('Backend is running successfully 🚀');
});

// Google Login Route
app.post('/api/auth/google', async (req, res) => {
    const { token } = req.body;
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: '537837416637-cgfl4j0k14hijtns9qcltllq41ehmv82.apps.googleusercontent.com'
        });
        const payload = ticket.getPayload();
        const { email, name, picture, sub: googleId } = payload;

        const db = getDb();
        const usersCollection = db.collection('users');

        // Check if user exists
        let user = await usersCollection.findOne({ email });

        if (!user) {
            // Register new user from Google info
            const newUser = {
                email,
                name,
                photoUrl: picture,
                googleId,
                createdAt: new Date(),
                purchasedCourses: []
            };
            const result = await usersCollection.insertOne(newUser);
            user = { ...newUser, _id: result.insertedId };
        }

        res.json({ 
            success: true, 
            userId: user._id, 
            email: user.email, 
            name: user.name 
        });
    } catch (error) {
        console.error('Google Verification Error:', error);
        res.status(401).json({ error: 'Invalid Google Token' });
    }
});

// Test Route
app.get('/api/test', (req, res) => {
    res.json({ message: 'DedicaYukti backend running' });
});

// Admin Login
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        res.json({ success: true, message: 'Welcome Admin!', token: 'admin_session_active' });
    } else {
        res.status(401).json({ success: false, error: 'Invalid Credentials' });
    }
});

// Admin Stats
app.get('/api/admin/stats', async (req, res) => {
    try {
        const db = getDb();
        const totalCourses = await db.collection('courses').countDocuments();
        const totalUsers = await db.collection('users').countDocuments();
        const courses = await db.collection('courses').find({}).toArray();
        const totalPotentialRevenue = courses.reduce((sum, c) => {
            const price = c.discountedPrice ? Number(c.discountedPrice) : Number(c.price);
            return sum + (price || 0);
        }, 0);

        res.json({ totalCourses, totalUsers, totalPotentialRevenue });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get All Courses
app.get('/api/courses', async (req, res) => {
    try {
        const db = getDb();
        const courses = await db.collection('courses').find({}).toArray();
        res.json(courses);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
});

// Course Details (Protected)
app.get('/api/course-details', async (req, res) => {
    const { courseId, userId } = req.query;

    if (!courseId || !ObjectId.isValid(courseId)) {
        return res.status(400).json({ error: 'Valid courseId is required' });
    }

    try {
        const db = getDb();
        const course = await db.collection('courses').findOne({ _id: new ObjectId(courseId) });
        
        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        let hasPurchased = false;
        if (userId && ObjectId.isValid(userId)) {
            const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
            if (user) {
                const developerEmails = ['its.devloper.aditya@gmail.com', 'ankeshanandart@gmail.com', 'niraj.kumar297@gmail.com'];
                if (developerEmails.includes(user.email) || (user.purchasedCourses && user.purchasedCourses.some(id => id.toString() === courseId))) {
                    hasPurchased = true;
                }
            }
        }

        if (!hasPurchased) {
            delete course.videoLinks;
            delete course.pdfLinks;
            delete course.testLinks;
        }

        res.json({ ...course, hasPurchased });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create Course
app.post('/api/courses', async (req, res) => {
    try {
        const result = await createCourse(req.body);
        res.status(201).json({ message: 'Course created successfully', course: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Course Basic Info
app.post('/api/courses/update', async (req, res) => {
    const { courseId, title, description, category, price, discountedPrice, faculty, features } = req.body;
    if (!courseId || !ObjectId.isValid(courseId)) {
        return res.status(400).json({ error: 'Valid courseId is required' });
    }
    try {
        const db = getDb();
        await db.collection('courses').updateOne(
            { _id: new ObjectId(courseId) },
            { $set: { 
                title, 
                description, 
                category, 
                price: Number(price),
                discountedPrice: (discountedPrice !== undefined && discountedPrice !== null && discountedPrice !== '') ? Number(discountedPrice) : null,
                faculty,
                features
            } }
        );
        res.json({ message: 'Course updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Update Course Content (Links & Chapters)
app.post('/api/update-course-content', async (req, res) => {
    const { courseId, videoLinks, pdfLinks, testLinks, chapters } = req.body;
    if (!courseId || !ObjectId.isValid(courseId)) {
        return res.status(400).json({ error: 'Valid courseId is required' });
    }
    try {
        const db = getDb();
        await db.collection('courses').updateOne(
            { _id: new ObjectId(courseId) },
            { $set: { videoLinks, pdfLinks, testLinks, chapters } }
        );
        res.json({ message: 'Course content updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete Course
app.post('/api/courses/delete', async (req, res) => {
    const { courseId } = req.body;
    if (!courseId || !ObjectId.isValid(courseId)) {
        return res.status(400).json({ error: 'Valid courseId is required' });
    }
    try {
        const db = getDb();
        const result = await db.collection('courses').deleteOne({ _id: new ObjectId(courseId) });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }
        res.json({ message: 'Course deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Course Enrollment Stats
app.get('/api/admin/course-stats', async (req, res) => {
    const { courseId } = req.query;
    if (!courseId || !ObjectId.isValid(courseId)) {
        return res.status(400).json({ error: 'Valid courseId is required' });
    }

    try {
        const db = getDb();
        // Find users who have this courseId in their purchasedCourses array
        const enrolledUsers = await db.collection('users').find({
            purchasedCourses: new ObjectId(courseId)
        }).project({ name: 1, email: 1, _id: 1 }).toArray();

        res.json({
            totalEnrolled: enrolledUsers.length,
            users: enrolledUsers
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch enrollment stats' });
    }
});

// Delete Account
app.post('/api/delete-account', async (req, res) => {
    const { userId, password } = req.body;
    if (!userId || !password) return res.status(400).json({ error: 'Missing information' });

    try {
        await deleteUser(userId, password);
        res.json({ success: true, message: 'Account permanently deleted' });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});

// User Registration
app.post('/api/register', async (req, res) => {
    try {
        const result = await registerUser(req.body);
        res.status(201).json({ message: 'User registered successfully', userId: result.userId });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// User Login
app.post('/api/login', async (req, res) => {
    try {
        const result = await loginUser(req.body);
        res.json({ message: 'Login successful', userId: result.userId });
    } catch (error) {
        // Specifically return the error message from loginUser (e.g., 'Invalid email or password')
        res.status(401).json({ error: error.message || 'Login failed' });
    }
});

// Get User Profile
app.get('/api/profile', async (req, res) => {
    const { userId } = req.query;
    if (!userId || !ObjectId.isValid(userId)) {
        return res.status(400).json({ error: 'Valid userId is required' });
    }
    try {
        const profile = await getUserProfile(userId);
        res.json(profile);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

// Update User Profile
app.post('/api/update-profile', async (req, res) => {
    const { userId, name, photoUrl } = req.body;
    if (!userId || !ObjectId.isValid(userId)) {
        return res.status(400).json({ error: 'Valid userId is required' });
    }
    try {
        await updateUserProfile(userId, { name, photoUrl });
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get My Batches
app.get('/api/my-batches', async (req, res) => {
    const { userId } = req.query;
    if (!userId || !ObjectId.isValid(userId)) {
        return res.status(400).json({ error: 'Valid userId is required' });
    }
    try {
        const db = getDb();
        const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const developerEmails = ['its.devloper.aditya@gmail.com', 'ankeshanandart@gmail.com', 'niraj.kumar297@gmail.com'];
        if (developerEmails.includes(user.email)) {
            const allCourses = await db.collection('courses').find({}).toArray();
            return res.json(allCourses);
        }

        if (!user.purchasedCourses || user.purchasedCourses.length === 0) {
            return res.json([]);
        }
        const batches = await db.collection('courses').find({
            _id: { $in: user.purchasedCourses.map(id => new ObjectId(id)) }
        }).toArray();
        res.json(batches);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch batches' });
    }
});

// Contact Form
app.post('/api/contact', async (req, res) => {
    const { name, email, subject, message } = req.body;
    console.log('Contact form submission:', { name, email, subject, message });
    res.json({ message: 'Message received successfully' });
});

// Create Payment Order
app.post('/api/create-order', async (req, res) => {
    try {
        const { courseId, couponCode } = req.body;
        const result = await createRazorpayOrder(courseId, couponCode);
        res.status(201).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Verify Payment
app.post('/api/payment/verify', async (req, res) => {
    try {
        const result = await verifyPayment(req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- COUPON ROUTES ---

// Get all coupons (Admin)
app.get('/api/admin/coupons', async (req, res) => {
    try {
        const db = getDb();
        const coupons = await db.collection('coupons').find({}).toArray();
        res.json(coupons);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch coupons' });
    }
});

// Create a coupon (Admin)
app.post('/api/admin/coupons', async (req, res) => {
    const { code, discountPercentage } = req.body;
    if (!code || !discountPercentage) {
        return res.status(400).json({ error: 'Code and percentage are required' });
    }
    try {
        const db = getDb();
        const existing = await db.collection('coupons').findOne({ code: code.toUpperCase() });
        if (existing) return res.status(400).json({ error: 'Coupon code already exists' });

        await db.collection('coupons').insertOne({
            code: code.toUpperCase(),
            discountPercentage: Number(discountPercentage),
            createdAt: new Date()
        });
        res.json({ success: true, message: 'Coupon created' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a coupon (Admin)
app.delete('/api/admin/coupons/:id', async (req, res) => {
    try {
        const db = getDb();
        await db.collection('coupons').deleteOne({ _id: new ObjectId(req.params.id) });
        res.json({ success: true, message: 'Coupon deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Validate Coupon (User)
app.post('/api/validate-coupon', async (req, res) => {
    const { code } = req.body;
    try {
        const db = getDb();
        const coupon = await db.collection('coupons').findOne({ code: code.toUpperCase() });
        if (!coupon) return res.status(404).json({ error: 'Invalid coupon code' });
        res.json({ discountPercentage: coupon.discountPercentage });
    } catch (error) {
        res.status(500).json({ error: 'Validation failed' });
    }
});

// Get all registered users (Admin)
app.get('/api/admin/all-users', async (req, res) => {
    try {
        const db = getDb();
        const users = await db.collection('users').find({}).project({ 
            name: 1, 
            email: 1, 
            photoUrl: 1, 
            createdAt: 1 
        }).toArray();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get specific user details (Admin)
app.get('/api/admin/user-details/:userId', async (req, res) => {
    const { userId } = req.params;
    if (!ObjectId.isValid(userId)) return res.status(400).json({ error: 'Invalid User ID' });

    try {
        const db = getDb();
        const user = await db.collection('users').findOne({ _id: new ObjectId(userId) }, { projection: { password: 0 } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Fetch purchased course details
        let purchasedBatches = [];
        if (user.purchasedCourses && user.purchasedCourses.length > 0) {
            // Convert all IDs to valid ObjectIds for the query
            const courseIds = user.purchasedCourses.map(id => {
                try {
                    return new ObjectId(id);
                } catch (e) {
                    return null;
                }
            }).filter(id => id !== null);

            purchasedBatches = await db.collection('courses').find({
                _id: { $in: courseIds }
            }).project({ title: 1, category: 1, price: 1, discountedPrice: 1 }).toArray();
        }

        res.json({ ...user, purchasedBatches });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user details' });
    }
});

// Start Server
async function startServer() {
    try {
        // Try connecting, but don't exit if it fails (using Mock Mode from db.js)
        await connectToDatabase();
        
        // Seed initial courses if empty (Safe check)
        const db = getDb();
        if (db && typeof db.collection === 'function') {
            try {
                const count = await db.collection('courses').countDocuments();
                if (count === 0) {
                    const sampleCourses = [
                        { title: "Class 9th Science", description: "Comprehensive course covering all topics in 9th Grade Science.", price: 2, category: "Science" },
                        { title: "JEE Advanced 2024", description: "Complete JEE preparation", price: 4999, category: "JEE" }
                    ];
                    await db.collection('courses').insertMany(sampleCourses);
                    console.log('✅ Sample courses added or mocked');
                }
            } catch (err) {
                console.log('⚠️  Skipping seed due to mock mode');
            }
        }

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`\n🚀 SERVER RUNNING ON http://0.0.0.0:${PORT}`);
        });
        
    } catch (error) {
        console.error('❌ CRITICAL: Failed to initialize startServer:', error);
        // Start app anyway so Render doesn't see a crash
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`\n🚀 SERVER RUNNING IN RECOVERY MODE ON PORT ${PORT}`);
        });
    }
}

startServer();
