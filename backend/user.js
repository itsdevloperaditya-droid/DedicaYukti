const { getDb } = require('./db');

/**
 * Registers a new user with plain text password.
 */
async function registerUser(userData) {
  const db = getDb();
  const usersCollection = db.collection('users');

  const { email, password, name } = userData;

  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  // Check if user already exists
  const existingUser = await usersCollection.findOne({ email });
  if (existingUser) {
    throw new Error('User already exists');
  }

  const newUser = {
    email,
    password, // Storing as plain text as requested
    name,
    createdAt: new Date()
  };

  const result = await usersCollection.insertOne(newUser);
  return { userId: result.insertedId, email: newUser.email };
}

/**
 * Logs in a user by checking plain text password.
 */
async function loginUser(credentials) {
  const db = getDb();
  const usersCollection = db.collection('users');

  const { email, password } = credentials;

  const user = await usersCollection.findOne({ email, password });
  if (!user) {
    throw new Error('Invalid email or password');
  }

  return { userId: user._id, email: user.email };
}

/**
 * Gets user profile data.
 */
async function getUserProfile(userId) {
  const { ObjectId } = require('mongodb');
  const db = getDb();
  const user = await db.collection('users').findOne(
    { _id: new ObjectId(userId) },
    { projection: { password: 0 } }
  );
  if (!user) throw new Error('User not found');
  return user;
}

/**
 * Updates user profile data.
 */
async function updateUserProfile(userId, profileData) {
  const { ObjectId } = require('mongodb');
  const db = getDb();
  const { name, photoUrl } = profileData;
  
  const updateFields = {};
  if (name) updateFields.name = name;
  if (photoUrl) updateFields.photoUrl = photoUrl;

  const result = await db.collection('users').updateOne(
    { _id: new ObjectId(userId) },
    { $set: updateFields }
  );
  return result;
}

/**
 * Permanently deletes a user account.
 */
async function deleteUser(userId, password) {
  const { ObjectId } = require('mongodb');
  const db = getDb();
  
  // Verify password first
  const user = await db.collection('users').findOne({ _id: new ObjectId(userId), password });
  if (!user) throw new Error('Incorrect password. Account deletion aborted.');

  const result = await db.collection('users').deleteOne({ _id: new ObjectId(userId) });
  return result;
}

module.exports = { registerUser, loginUser, getUserProfile, updateUserProfile, deleteUser };
