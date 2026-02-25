const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'dedicayukti';

// Mock DB structure taaki functions crash na ho
const mockCollection = {
  find: () => ({ toArray: async () => [] }),
  findOne: async () => null,
  updateOne: async () => ({ modifiedCount: 1 }),
  insertOne: async () => ({ insertedId: 'mock_id' }),
  deleteOne: async () => ({ deletedCount: 1 }),
  countDocuments: async () => 0,
  insertMany: async () => ({ insertedCount: 0 })
};

const mockDb = {
  collection: () => mockCollection
};

async function connectToDatabase() {
  // Agar MONGO_URI missing hai ya localhost hai Render par, toh skip karein
  if (!MONGO_URI || (MONGO_URI.includes('localhost') && process.env.RENDER)) {
    console.log('⚠️  DATABASE WARNING: Running in MOCK MODE (No real database connected)');
    return mockDb;
  }

  try {
    await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
    console.log('✅ Successfully connected to MongoDB Atlas 🚀');
    return mongoose.connection.db;
  } catch (error) {
    console.error('❌ MONGODB CONNECTION FAILED:', error.message);
    console.log('⚠️  Falling back to MOCK MODE to keep server running.');
    return mockDb;
  }
}

function getDb() {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    return mongoose.connection.db;
  }
  return mockDb;
}

module.exports = { connectToDatabase, getDb };
