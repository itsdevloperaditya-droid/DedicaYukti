const { connectToDatabase, getDb } = require('./db');

async function listCourses() {
    await connectToDatabase();
    const db = getDb();
    const courses = await db.collection('courses').find({}).toArray();
    console.log(JSON.stringify(courses, null, 2));
    process.exit(0);
}

listCourses();
