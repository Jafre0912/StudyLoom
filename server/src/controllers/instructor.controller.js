const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/apiResponse");
const Course = require("../models/Course");
const Session = require("../models/Session");
const Enrollment = require("../models/Enrollment");
const Attendance = require("../models/Attendance");

// GET /api/instructor/overview
const overview = asyncHandler(async (req, res) => {
  const mine = req.user.role === "admin" ? {} : { instructorId: req.user._id };
  const courseIds = await Course.find(mine).distinct("_id");
  const batchIds = await Session.find({ courseId: { $in: courseIds } }).distinct("batchId");
  const [students, liveNow, upcoming, completed, att] = await Promise.all([
    Enrollment.distinct("userId", { courseId: { $in: courseIds }, batchId: { $in: batchIds } }),
    Session.countDocuments({ courseId: { $in: courseIds }, status: "live" }),
    Session.countDocuments({ courseId: { $in: courseIds }, status: "scheduled", startsAt: { $gte: new Date() } }),
    Session.find({ courseId: { $in: courseIds }, status: "completed" }).select("durationMin"),
    Attendance.aggregate([{ $match: { courseId: { $in: courseIds } } }, { $group: { _id: null, secs: { $sum: "$seconds" } } }]),
  ]);
  const possible = completed.reduce((a, s) => a + s.durationMin * 60, 0) * Math.max(students.length, 1);
  sendResponse(res, 200, "Overview fetched", {
    students: students.length, liveNow, upcoming, courses: courseIds.length,
    avgAttendance: possible ? Math.min(100, Math.round(((att[0]?.secs || 0) / possible) * 100)) : null,
  });
});
module.exports = { overview };
