const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'dedicayukti';

let db = null;

async function connectToDatabase() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('Successfully connected to MongoDB');
    db = client.db(DB_NAME);
    return db;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call connectToDatabase first.');
  }
  return db;
}

module.exports = { connectToDatabase, getDb };
