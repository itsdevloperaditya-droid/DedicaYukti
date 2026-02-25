const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'dedicayukti';

/**
 * Strict Database Connection for Production.
 * No more Mock Mode - we need a real database now.
 */
async function connectToDatabase() {
  if (!MONGO_URI || (MONGO_URI.includes('localhost') && process.env.RENDER)) {
    console.error('--------------------------------------------------');
    console.error('❌ CRITICAL ERROR: Real MONGO_URI is missing!');
    console.error('Render cannot use localhost. You MUST add MongoDB Atlas URI.');
    console.error('--------------------------------------------------');
    // We stop the process so you know it's not connected
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI, { 
        dbName: DB_NAME,
        serverSelectionTimeoutMS: 5000 // Stop waiting after 5 seconds
    });
    console.log('✅ Successfully connected to MongoDB Atlas 🚀');
    return mongoose.connection.db;
  } catch (error) {
    console.error('--------------------------------------------------');
    console.error('❌ DATABASE CONNECTION FAILED:', error.message);
    console.error('Check your IP Whitelist on MongoDB Atlas.');
    console.error('--------------------------------------------------');
    process.exit(1);
  }
}

function getDb() {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    return mongoose.connection.db;
  }
  throw new Error('Database not connected. Process should have exited.');
}

module.exports = { connectToDatabase, getDb };
