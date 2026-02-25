const express = require('express');
const cors = require('cors');
const path = require('path');
const { ObjectId } = require('mongodb');
const { connectToDatabase, getDb } = require('./db');
const { createCourse } = require('./course');
const { registerUser, loginUser, getUserProfile, updateUserProfile } = require('./user');
const { createRazorpayOrder, verifyPayment } = require('./payment');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 5000;

// --- ADMIN CREDENTIALS ---
const ADMIN_USER = 'admin_dedica';
const ADMIN_PASS = 'Power@9090';

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
                if (user.email === 'its.devloper.aditya@gmail.com' || (user.purchasedCourses && user.purchasedCourses.some(id => id.toString() === courseId))) {
                    hasPurchased = true;
                }
            }
        }

        if (!hasPurchased) {
            delete course.videoLinks;
            delete course.pdfLinks;
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
    const { courseId, title, description, category, price, discountedPrice } = req.body;
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
                discountedPrice: (discountedPrice !== undefined && discountedPrice !== null && discountedPrice !== '') ? Number(discountedPrice) : null
            } }
        );
        res.json({ message: 'Course updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Course Content (Links)
app.post('/api/update-course-content', async (req, res) => {
    const { courseId, videoLinks, pdfLinks } = req.body;
    if (!courseId || !ObjectId.isValid(courseId)) {
        return res.status(400).json({ error: 'Valid courseId is required' });
    }
    try {
        const db = getDb();
        await db.collection('courses').updateOne(
            { _id: new ObjectId(courseId) },
            { $set: { videoLinks, pdfLinks } }
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
        res.status(401).json({ error: error.message });
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

        if (user.email === 'its.devloper.aditya@gmail.com') {
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
        const { courseId } = req.body;
        const result = await createRazorpayOrder(courseId);
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

// Start Server
async function startServer() {
    try {
        await connectToDatabase();
        
        // Seed initial courses if empty
        const db = getDb();
        const count = await db.collection('courses').countDocuments();
        if (count === 0) {
            const sampleCourses = [
                { title: "Class 9th Science", description: "Comprehensive course covering all topics in 9th Grade Science.", price: 2, category: "Science" },
                { title: "JEE Advanced 2024", description: "Complete JEE preparation", price: 4999, category: "JEE" }
            ];
            await db.collection('courses').insertMany(sampleCourses);
            console.log('✅ Sample courses added');
        }

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`\n🚀 SERVER RUNNING ON http://0.0.0.0:${PORT}`);
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
