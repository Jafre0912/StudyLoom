const slugify = require("slugify");
const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const sendResponse = require("../utils/apiResponse");
const Course = require("../models/Course");
const Category = require("../models/Category");
const Batch = require("../models/Batch");
const Session = require("../models/Session");
const Enrollment = require("../models/Enrollment");
const live = require("../services/live.service");

const POPULATE = [{ path: "categoryId", select: "name slug" }, { path: "instructorId", select: "name avatarUrl title bio" }];
const escapeRegex = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The JSON shape the client consumes (real learner counts, real batch keys).
const present = (c, extra = {}) => ({
  _id: c._id, slug: c.slug, title: c.title, description: c.description, thumbnailUrl: c.thumbnailUrl,
  category: c.categoryId ? { _id: c.categoryId._id, name: c.categoryId.name, slug: c.categoryId.slug } : null,
  instructor: c.instructorId ? { _id: c.instructorId._id, name: c.instructorId.name, avatarUrl: c.instructorId.avatarUrl, title: c.instructorId.title, bio: c.instructorId.bio } : null,
  price: c.price, oldPrice: c.oldPrice || c.price, level: c.level, weeks: c.weeks, classesPerWeek: c.classesPerWeek, minutesPerClass: c.minutesPerClass,
  totalClasses: c.weeks * c.classesPerWeek, startDate: c.startDate, outcomes: c.outcomes, modules: c.modules, faqs: c.faqs,
  rating: c.rating, ratingCount: c.ratingCount, isPublished: c.isPublished, ...extra,
});

const idOrSlug = (v) => (mongoose.isValidObjectId(v) ? { $or: [{ _id: v }, { slug: v }] } : { slug: v });

// GET /api/courses?category=<slug>&level=&search=
const listCourses = asyncHandler(async (req, res) => {
  const { category, level, search } = req.query;
  const filter = { isPublished: true };
  if (category) { const cat = await Category.findOne({ slug: category }); filter.categoryId = cat ? cat._id : null; }
  if (level) filter.level = level;
  if (search) filter.title = new RegExp(escapeRegex(search), "i");
  const courses = await Course.find(filter).populate(POPULATE).sort({ createdAt: -1 }).limit(200);
  const ids = courses.map((c) => c._id);
  const [counts, batches] = await Promise.all([
    Enrollment.aggregate([{ $match: { courseId: { $in: ids }, status: { $in: ["active", "completed", "pending_batch"] } } }, { $group: { _id: "$courseId", n: { $sum: 1 } } }]),
    Batch.find({ courseId: { $in: ids }, isOpen: true }).select("courseId key"),
  ]);
  const learners = new Map(counts.map((c) => [String(c._id), c.n]));
  const keys = {};
  batches.forEach((b) => (keys[b.courseId] ||= []).push(b.key));
  sendResponse(res, 200, "Courses fetched", { items: courses.map((c) => present(c, { learners: learners.get(String(c._id)) || 0, schedules: keys[c._id] || [] })) });
});

// GET /api/courses/:slug  (slug or id)
const getCourse = asyncHandler(async (req, res) => {
  const course = await Course.findOne(idOrSlug(req.params.slug)).populate(POPULATE);
  if (!course || !course.isPublished) throw new ApiError(404, "Course not found");
  const [batches, learners] = await Promise.all([live.batchesForCourse(course._id), Enrollment.countDocuments({ courseId: course._id })]);
  sendResponse(res, 200, "Course fetched", { course: present(course, { learners, batches, schedules: batches.map((b) => b.key) }) });
});

const FIELDS = ["title", "description", "thumbnailUrl", "categoryId", "instructorId", "price", "oldPrice", "level", "weeks", "classesPerWeek", "minutesPerClass", "startDate", "outcomes", "modules", "faqs", "tags", "isPublished"];

// POST /api/courses (admin / instructor)
const createCourse = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  if (!title || !description) throw new ApiError(400, "Title and description are required");
  const slug = slugify(title, { lower: true, strict: true });
  if (await Course.findOne({ slug })) throw new ApiError(409, "A course with a similar title already exists");
  const data = { slug };
  FIELDS.forEach((f) => { if (req.body[f] !== undefined && req.body[f] !== "") data[f] = req.body[f]; });
  data.instructorId = req.user.role === "admin" && req.body.instructorId ? req.body.instructorId : req.user._id;
  if (req.body.isPublished === undefined) data.isPublished = true;
  const course = await Course.create(data);
  if (course.isPublished) await live.ensureBatches(course);
  sendResponse(res, 201, "Course created", { course: present(await course.populate(POPULATE)) });
});

// PUT /api/courses/:id
const updateCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, "Course not found");
  if (req.user.role === "instructor" && String(course.instructorId) !== String(req.user._id)) throw new ApiError(403, "You can only edit your own courses");
  FIELDS.forEach((f) => { if (req.body[f] !== undefined && !(f === "instructorId" && req.user.role !== "admin")) course[f] = req.body[f]; });
  await course.save();
  if (course.isPublished) await live.ensureBatches(course);
  sendResponse(res, 200, "Course updated", { course: present(await course.populate(POPULATE)) });
});

// DELETE /api/courses/:id (admin) - courses with students are unpublished instead of deleted
const deleteCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, "Course not found");
  if (await Enrollment.exists({ courseId: course._id })) {
    course.isPublished = false; await course.save();
    return sendResponse(res, 200, "Course has students, so it was unpublished instead of deleted");
  }
  await Promise.all([Batch.deleteMany({ courseId: course._id }), Session.deleteMany({ courseId: course._id }), course.deleteOne()]);
  sendResponse(res, 200, "Course deleted");
});

module.exports = { listCourses, getCourse, getCourseBySlug: getCourse, createCourse, updateCourse, deleteCourse, present, POPULATE };
