const { connectToDatabase } = require('./db');

async function updatePrices() {
    const db = await connectToDatabase();
    const result = await db.collection('courses').updateMany({}, { $set: { price: 2 } });
    console.log(`Updated ${result.modifiedCount} courses to ₹2.`);
    process.exit(0);
}

updatePrices();
