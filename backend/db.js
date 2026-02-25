const mongoose = require('mongoose');

// Get URI from environment
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'dedicayukti';

/**
 * Proper MongoDB connection using Mongoose for production safety.
 * Validates MONGO_URI and ensures connection before the server listens.
 */
async function connectToDatabase() {
  // Check if URI is missing
  if (!MONGO_URI) {
    console.error('--------------------------------------------------');
    console.error('❌ CRITICAL ERROR: MONGO_URI is not set in environment variables');
    console.error('Please add MONGO_URI to your .env file or Render secrets.');
    console.error('--------------------------------------------------');
    process.exit(1);
  }

  try {
    // Mongoose connect handles localhost and cloud URIs seamlessly
    await mongoose.connect(MONGO_URI, {
      dbName: DB_NAME,
      autoIndex: true, // Recommended for development
    });

    console.log('✅ Successfully connected to MongoDB via Mongoose 🚀');
    
    // Check if we are connecting to localhost (for developer warning)
    if (MONGO_URI.includes('localhost')) {
      console.log('⚠️  Warning: Currently using LOCAL database (localhost). Ensure this is intentional.');
    }

    return mongoose.connection.db;
  } catch (error) {
    console.error('--------------------------------------------------');
    console.error('❌ FAILED TO CONNECT TO MONGODB:', error.message);
    console.error('Check your network connection or MONGO_URI credentials.');
    console.error('--------------------------------------------------');
    process.exit(1);
  }
}

/**
 * Returns the underlying native database object to keep existing 
 * db.collection() calls working without rewriting entire project models.
 */
function getDb() {
  if (!mongoose.connection || mongoose.connection.readyState === 0) {
    throw new Error('Database not initialized. Call connectToDatabase first.');
  }
  return mongoose.connection.db;
}

module.exports = { connectToDatabase, getDb };
