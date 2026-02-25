const { connectToDatabase, getDb } = require('./db');
const { ObjectId } = require('mongodb');

async function removeDuplicates() {
    await connectToDatabase();
    const db = getDb();
    
    // Find all science courses
    const courses = await db.collection('courses').find({ category: 'Science' }).toArray();
    console.log(`Found ${courses.length} science courses.`);

    if (courses.length > 1) {
        // Keep the first one and remove the rest
        const toKeep = courses[0];
        const toRemove = courses.slice(1);
        
        console.log(`Keeping course: ${toKeep.title} (${toKeep._id})`);
        
        for (const course of toRemove) {
            await db.collection('courses').deleteOne({ _id: new ObjectId(course._id) });
            console.log(`Removed course: ${course.title} (${course._id})`);
        }

        // Optionally update the title of the kept one to be more general
        await db.collection('courses').updateOne(
            { _id: new ObjectId(toKeep._id) },
            { $set: { title: "Class 9th Science", description: "Comprehensive course covering all topics in 9th Grade Science." } }
        );
        console.log(`Updated kept course title to 'Class 9th Science'`);
    }

    process.exit(0);
}

removeDuplicates();
