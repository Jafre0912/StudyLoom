const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const sendResponse = require("../utils/apiResponse");
const Enrollment = require("../models/Enrollment");
const Batch = require("../models/Batch");
const Course = require("../models/Course");
const live = require("../services/live.service");

// GET /api/enrollments/me - "My Courses", with attendance/progress computed from real class records
const getMyEnrollments = asyncHandler(async (req, res) => {
  const list = await Enrollment.find({ userId: req.user._id, status: { $ne: "cancelled" } })
    .populate({ path: "courseId", select: "title slug thumbnailUrl weeks classesPerWeek minutesPerClass instructorId", populate: { path: "instructorId", select: "name" } })
    .populate("batchId", "key startTime endTime")
    .sort({ enrolledAt: -1 });
  const items = await Promise.all(list.filter((e) => e.courseId).map(async (e) => {
    const stats = await live.enrollmentStats(e);
    return { _id: e._id, status: e.status, enrolledAt: e.enrolledAt, course: e.courseId, batch: e.batchId?.key || null, ...stats };
  }));
  sendResponse(res, 200, "Enrollments fetched", { items });
});

// POST /api/enrollments/:courseId/batch  { batch: "morning" | "evening" }
const chooseBatch = asyncHandler(async (req, res) => {
  const course = await Course.findOne(/^[a-f\d]{24}$/i.test(req.params.courseId) ? { _id: req.params.courseId } : { slug: req.params.courseId });
  if (!course) throw new ApiError(404, "Course not found");
  const en = await Enrollment.findOne({ userId: req.user._id, courseId: course._id });
  if (!en) throw new ApiError(402, "Please complete payment first");
  if (en.batchId) throw new ApiError(409, "You have already chosen a batch for this course");
  const batch = await Batch.findOne({ courseId: course._id, key: req.body.batch });
  if (!batch || !batch.isOpen) throw new ApiError(400, "That batch is not available");
  if ((await live.seatInfo(batch)).left <= 0) throw new ApiError(409, "This batch is full. Please choose another slot.");
  en.batchId = batch._id; en.status = "active"; await en.save();
  sendResponse(res, 200, "Batch confirmed", { enrollment: en });
});

// POST /api/enrollments/free  { courseId } - only for courses priced at 0
const enrollFree = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.body.courseId);
  if (!course || !course.isPublished) throw new ApiError(404, "Course not found");
  if (course.price > 0) throw new ApiError(400, "This course requires payment");
  const en = (await Enrollment.findOne({ userId: req.user._id, courseId: course._id })) || (await Enrollment.create({ userId: req.user._id, courseId: course._id }));
  sendResponse(res, 201, "Enrolled", { enrollment: en });
});

module.exports = { getMyEnrollments, chooseBatch, enrollFree };
