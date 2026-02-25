const { getDb } = require('./db');

/**
 * Creates a new course in the 'courses' collection.
 * 
 * @param {Object} courseData - The course details.
 * @param {string} courseData.title - Title of the course.
 * @param {string} courseData.description - Description of the course.
 * @param {string} courseData.category - Category of the course.
 * @param {number} [courseData.price=5] - Price of the course (defaults to 5).
 * @param {string[]} [courseData.videoLinks=[]] - Array of video links.
 * @param {string[]} [courseData.pdfLinks=[]] - Array of PDF links.
 * @returns {Promise<Object>} The result of the insertion.
 */
async function createCourse(courseData) {
  const db = getDb();
  const coursesCollection = db.collection('courses');

  const {
    title,
    description,
    category,
    price = 5,
    discountedPrice = null,
    videoLinks = [],
    pdfLinks = []
  } = courseData;

  const newCourse = {
    title,
    description,
    category,
    price: Number(price),
    discountedPrice: (discountedPrice !== undefined && discountedPrice !== null && discountedPrice !== '') ? Number(discountedPrice) : null,
    videoLinks,
    pdfLinks,
    createdAt: new Date()
  };

  const result = await coursesCollection.insertOne(newCourse);
  return { ...newCourse, _id: result.insertedId };
}

module.exports = { createCourse };
