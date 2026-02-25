const { connectToDatabase } = require('./db');
const { createCourse } = require('./course');

async function seed() {
    await connectToDatabase();
    
    const courses = [
        {
            title: "Class 9th Science - Matter in Our Surroundings",
            description: "Explore the physical nature of matter, its states, and the phenomena of evaporation.",
            category: "Science",
            price: 5,
            videoLinks: ["https://example.com/matter-1"],
            pdfLinks: ["https://example.com/matter-notes.pdf"]
        },
        {
            title: "Class 9th Science - Atoms and Molecules",
            description: "Understand the fundamental building blocks of matter, laws of chemical combination, and mole concept.",
            category: "Science",
            price: 5,
            videoLinks: ["https://example.com/atoms-1"],
            pdfLinks: ["https://example.com/atoms-notes.pdf"]
        },
        {
            title: "Class 9th Science - The Fundamental Unit of Life",
            description: "A deep dive into cells, their structure, functions, and the difference between plant and animal cells.",
            category: "Science",
            price: 5,
            videoLinks: ["https://example.com/cell-1"],
            pdfLinks: ["https://example.com/cell-notes.pdf"]
        },
        {
            title: "Class 9th Science - Motion & Laws of Motion",
            description: "Learn about distance, displacement, velocity, and Newton's three laws of motion with real-world examples.",
            category: "Science",
            price: 5,
            videoLinks: ["https://example.com/motion-1"],
            pdfLinks: ["https://example.com/motion-notes.pdf"]
        }
    ];

    for (const course of courses) {
        const result = await createCourse(course);
        console.log(`Created course: ${result.title} (ID: ${result._id})`);
    }

    process.exit(0);
}

seed();
