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

const escapeRegex = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
  sendResponse(res, 200, "Courses fetched", { items: courses.map((c) => present(c, { learners: m.get(String(c._id)) || 0 })) });
});

// GET /api/admin/batches
const listBatches = asyncHandler(async (req, res) => {
  const batches = await Batch.find().populate("courseId", "title slug").sort({ startDate: 1 }).limit(300);
  const items = await Promise.all(batches.map(async (b) => ({ _id: b._id, course: b.courseId, label: live.batchLabel(b), time: live.batchTime(b), days: b.days, startDate: b.startDate, capacity: b.capacity, isOpen: b.isOpen, ...(await live.seatInfo(b)) })));
  sendResponse(res, 200, "Batches fetched", { items });
});
// PATCH /api/admin/batches/:id  { capacity?, isOpen? }
const updateBatch = asyncHandler(async (req, res) => {
  const b = await Batch.findById(req.params.id);
  if (!b) throw new ApiError(404, "Batch not found");
  if (Number.isInteger(req.body.capacity) && req.body.capacity > 0) b.capacity = req.body.capacity;
  if (typeof req.body.isOpen === "boolean") b.isOpen = req.body.isOpen;
  await b.save();
  sendResponse(res, 200, "Batch updated", { batch: b });
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

module.exports = { getStats, listUsers, updateUser, createInstructor, listCourses, listBatches, updateBatch, getSettings, updateSettings, listPromos, createPromo, togglePromo };
