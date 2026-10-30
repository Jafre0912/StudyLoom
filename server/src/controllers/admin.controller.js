const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const sendResponse = require("../utils/apiResponse");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Course = require("../models/Course");
const Batch = require("../models/Batch");
const Enrollment = require("../models/Enrollment");
const Payment = require("../models/Payment");
const Certificate = require("../models/Certificate");
const Promo = require("../models/Promo");
const settings = require("../services/settings.service");
const live = require("../services/live.service");
const { present, POPULATE } = require("./course.controller");
const mongoose = require("mongoose");
const Session = require("../models/Session");

const escapeRegex = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/; // "HH:MM", 24h

// GET /api/admin/stats
const getStats = asyncHandler(async (req, res) => {
  const since = new Date(); since.setMonth(since.getMonth() - 5); since.setDate(1); since.setHours(0, 0, 0, 0);
  const [students, instructors, courses, certificates, revenue, monthly] = await Promise.all([
    User.countDocuments({ role: "student" }), User.countDocuments({ role: "instructor" }), Course.countDocuments({ isPublished: true }), Certificate.countDocuments(),
    Payment.aggregate([{ $match: { status: "success" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Payment.aggregate([{ $match: { status: "success", paidAt: { $gte: since } } }, { $group: { _id: { y: { $year: "$paidAt" }, m: { $month: "$paidAt" } }, total: { $sum: "$amount" } } }]),
  ]);
  const byKey = new Map(monthly.map((m) => [`${m._id.y}-${m._id.m}`, m.total]));
  const revenueByMonth = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(since); d.setMonth(since.getMonth() + i);
    return { label: d.toLocaleString("en", { month: "short" }), total: byKey.get(`${d.getFullYear()}-${d.getMonth() + 1}`) || 0 };
  });
  sendResponse(res, 200, "Stats fetched", { students, instructors, courses, certificates, revenue: revenue[0]?.total || 0, revenueByMonth });
});

// GET /api/admin/users?role=&search=
const listUsers = asyncHandler(async (req, res) => {
  const { role, search } = req.query;
  const filter = {};
  if (["student", "instructor", "admin"].includes(role)) filter.role = role;
  if (search) { const rx = new RegExp(escapeRegex(search), "i"); filter.$or = [{ name: rx }, { email: rx }]; }
  const items = await User.find(filter).select("name email role isActive createdAt").sort({ createdAt: -1 }).limit(200);
  sendResponse(res, 200, "Users fetched", { items });
});

// PATCH /api/admin/users/:id  { isActive?, role? }
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");
  if (String(user._id) === String(req.user._id)) throw new ApiError(400, "You cannot change your own account here");
  if (typeof req.body.isActive === "boolean") user.isActive = req.body.isActive;
  if (["student", "instructor", "admin"].includes(req.body.role)) user.role = req.body.role;
  await user.save();
  sendResponse(res, 200, "User updated", { user: { _id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive } });
});

// POST /api/admin/instructors  { name, email, password, title, bio }
const createInstructor = asyncHandler(async (req, res) => {
  const { name, email, password, title, bio } = req.body;
  if (!name || !email || !password) throw new ApiError(400, "Name, email and password are required");
  if (await User.findOne({ email })) throw new ApiError(409, "An account with this email already exists");
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10), role: "instructor", title, bio, isEmailVerified: true });
  sendResponse(res, 201, "Instructor created", { user: { _id: user._id, name: user.name, email: user.email, role: user.role } });
});

// GET /api/admin/courses - every course, published or not
const listCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find().populate(POPULATE).sort({ createdAt: -1 });
  const counts = await Enrollment.aggregate([{ $group: { _id: "$courseId", n: { $sum: 1 } } }]);
  const m = new Map(counts.map((c) => [String(c._id), c.n]));
  const batches = await Batch.find({ courseId: { $in: courses.map((c) => c._id) } }).sort({ startTime: 1 });
  const slotsBy = new Map();
  for (const b of batches) {
    const k = String(b.courseId);
    if (!slotsBy.has(k)) slotsBy.set(k, []);
    slotsBy.get(k).push({ startTime: b.startTime, endTime: b.endTime });
  }
  sendResponse(res, 200, "Courses fetched", {
    items: courses.map((c) => ({ ...present(c, { learners: m.get(String(c._id)) || 0 }), slots: slotsBy.get(String(c._id)) || [] })),
  });
});

const listBatches = asyncHandler(async (req, res) => {
  const batches = await Batch.find().populate("courseId", "title slug").sort({ startDate: 1 }).limit(300);
  const items = await Promise.all(batches.map(async (b) => ({
    _id: b._id,
    course: b.courseId,
    key: b.key,
    startTime: b.startTime,
    endTime: b.endTime,
    label: live.batchLabel(b),
    time: live.batchTime(b),
    days: b.days,
    startDate: b.startDate,
    capacity: b.capacity,
    isOpen: b.isOpen,
    ...(await live.seatInfo(b)),
  })));
  sendResponse(res, 200, "Batches fetched", { items });
});
// PATCH /api/admin/batches/:id  { capacity?, isOpen?, startTime?, endTime? }
const updateBatch = asyncHandler(async (req, res) => {
  const b = await Batch.findById(req.params.id);
  if (!b) throw new ApiError(404, "Batch not found");
  if (Number.isInteger(req.body.capacity) && req.body.capacity > 0) b.capacity = req.body.capacity;
  if (typeof req.body.isOpen === "boolean") b.isOpen = req.body.isOpen;
  if (typeof req.body.name === "string") b.name = req.body.name.trim();

  const timeChanged = req.body.startTime !== undefined || req.body.endTime !== undefined;
if (timeChanged) {
  const s = req.body.startTime ?? b.startTime;
  const e = req.body.endTime ?? b.endTime;
  if (!TIME_RE.test(s) || !TIME_RE.test(e)) throw new ApiError(400, "Invalid time");
  if (s >= e) throw new ApiError(400, "End time must be after start time (a class cannot cross midnight)");
  const newKey = live.slotKey(s, e);
  if (await Batch.exists({ courseId: b.courseId, key: newKey, _id: { $ne: b._id } })) throw new ApiError(409, "This course already has a batch at that time");
  b.startTime = s;
  b.endTime = e;
  b.key = newKey;
}
  await b.save();
  if (timeChanged) await live.rescheduleSessions(b);
  sendResponse(res, 200, "Batch updated", { batch: b });
});

// POST /api/admin/batches  { courseId, startTime, endTime, name?, days?, startDate?, capacity? }
const createBatch = asyncHandler(async (req, res) => {
  const { courseId, startTime, endTime } = req.body;
  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "Course not found");
  if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) throw new ApiError(400, "Times must be in HH:MM format");
  if (startTime >= endTime) throw new ApiError(400, "End time must be after start time");
  if (await Batch.exists({ courseId, key: live.slotKey(startTime, endTime) })) throw new ApiError(409, "This course already has a batch at that time");
  const batch = await live.createCustomBatch(course, req.body);
  sendResponse(res, 201, "Batch created", { batch });
});

// Settings + promo codes
const getSettings = asyncHandler(async (req, res) => sendResponse(res, 200, "Settings fetched", { settings: await settings.getAll() }));
const updateSettings = asyncHandler(async (req, res) => {
  for (const [k, v] of Object.entries(req.body)) if (typeof v === "boolean") await settings.set(k, v);
  sendResponse(res, 200, "Settings saved", { settings: await settings.getAll() });
});
const listPromos = asyncHandler(async (req, res) => sendResponse(res, 200, "Promos fetched", { items: await Promo.find().sort({ createdAt: -1 }) }));
const createPromo = asyncHandler(async (req, res) => {
  const { code, percent } = req.body;
  if (!code || !(Number(percent) >= 1 && Number(percent) <= 100)) throw new ApiError(400, "Code and a percent between 1 and 100 are required");
  if (await Promo.findOne({ code: String(code).toUpperCase() })) throw new ApiError(409, "That code already exists");
  sendResponse(res, 201, "Promo created", { promo: await Promo.create({ code, percent: Number(percent), maxUses: Number(req.body.maxUses) || 0 }) });
});
const togglePromo = asyncHandler(async (req, res) => {
  const p = await Promo.findById(req.params.id);
  if (!p) throw new ApiError(404, "Promo not found");
  p.isActive = !p.isActive; await p.save();
  sendResponse(res, 200, "Promo updated", { promo: p });
});
// POST /api/admin/batches/:id/start-now  { title? }
const startBatchNow = asyncHandler(async (req, res) => {
  const batch = await Batch.findById(req.params.id);
  if (!batch) throw new ApiError(404, "Batch not found");
  const course = await Course.findById(batch.courseId);
  if (!course) throw new ApiError(404, "Course not found");
  if (await Session.exists({ batchId: batch._id, status: "live" })) throw new ApiError(409, "A class is already live for this batch");
  const session = await live.startAdHocSession(batch, course, req.body?.title);
  sendResponse(res, 201, "Class started", { session });
});

// POST /api/admin/courses/:id/start-class  { batchKey?, title? }
const startCourseClass = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, "Course not found");
  await live.ensureBatches(course);
  const batch = req.body?.batchId
    ? await Batch.findOne({ _id: req.body.batchId, courseId: course._id })
    : await Batch.findOne({ courseId: course._id }).sort({ startTime: 1 });
  if (!batch) throw new ApiError(404, "Batch not found");
  if (await Session.exists({ batchId: batch._id, status: "live" })) throw new ApiError(409, "A class is already live for this batch");
  const session = await live.startAdHocSession(batch, course, req.body?.title);
  sendResponse(res, 201, "Class started", { session });
});


// DELETE /api/admin/users/:id   body: { reassignTo?: instructorId }
const deleteUser = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(404, "User not found");
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");
  if (String(user._id) === String(req.user._id)) throw new ApiError(400, "You cannot delete your own account");
  if (user.role === "admin") throw new ApiError(400, "Admin accounts cannot be deleted here");

  if (user.role === "instructor") {
    const [courses, sessions] = await Promise.all([
      Course.countDocuments({ instructorId: user._id }),
      Session.countDocuments({ instructorId: user._id }),
    ]);
    if (courses > 0 || sessions > 0) {
      const to = req.body?.reassignTo;
      if (!to || !mongoose.isValidObjectId(to)) throw new ApiError(409, `This instructor has ${courses} course(s). Choose another instructor to take them over.`);
      if (String(to) === String(user._id)) throw new ApiError(400, "Choose a different instructor");
      const target = await User.findOne({ _id: to, role: "instructor", isActive: true });
      if (!target) throw new ApiError(400, "The selected instructor was not found or is suspended");
      await Promise.all([
        Course.updateMany({ instructorId: user._id }, { instructorId: target._id }),
        Session.updateMany({ instructorId: user._id }, { instructorId: target._id }),
      ]);
    }
  } else {
    // students with payments or enrollments keep their records: suspend them instead
    const [en, pay] = await Promise.all([Enrollment.exists({ userId: user._id }), Payment.exists({ userId: user._id })]);
    if (en || pay) throw new ApiError(409, "This student has enrollments or payments. Suspend the account instead of deleting it.");
  }

  await user.deleteOne();
  sendResponse(res, 200, "User deleted");
});

module.exports = {
  getStats, listUsers, updateUser, createInstructor, listCourses,
  listBatches, updateBatch, createBatch, startBatchNow, startCourseClass,
  getSettings, updateSettings, listPromos, createPromo, togglePromo, deleteUser,
};