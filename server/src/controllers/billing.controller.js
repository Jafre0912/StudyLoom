const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const sendResponse = require("../utils/apiResponse");
const { getPagination, buildPaginatedResponse } = require("../utils/paginate");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const User = require("../models/User");
const billing = require("../services/billing.service");
const { listAvailable } = require("../services/gateways");
const { streamReceipt } = require("../services/receipt.service");

const findCourse = (v, select) => Course.findOne(mongoose.isValidObjectId(v) ? { $or: [{ _id: v }, { slug: v }] } : { slug: v }).select(select);
const isAdmin = (user) => ["admin", "instructor"].includes(user.role);
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const currency = billing.currency;

// The payment fields the browser is allowed to see (no gateway order ids etc.)
const publicPayment = (p) => ({
  _id: p._id,
  amount: p.amount,
  currency: p.currency,
  gateway: p.gateway,
  status: p.status,
  receiptNumber: p.receiptNumber,
  paidAt: p.paidAt,
});

// GET /api/billing/checkout/:courseId
const getCheckoutSummary = asyncHandler(async (req, res) => {
  const course = await findCourse(req.params.courseId, "title slug thumbnailUrl price oldPrice weeks classesPerWeek isPublished");
  if (!course || !course.isPublished) throw new ApiError(404, "Course not found");

  const invoice = await Invoice.findOne({ userId: req.user._id, courseId: course._id });
  sendResponse(res, 200, "Checkout summary fetched", {
    course: { _id: course._id, title: course.title, slug: course.slug, thumbnailUrl: course.thumbnailUrl, price: course.price, oldPrice: course.oldPrice || course.price, weeks: course.weeks, classesPerWeek: course.classesPerWeek },
    invoice,
    currency: billing.currency(),
    minPayment: billing.minPayment(),
    gateways: listAvailable(),
  });
});

// POST /api/billing/pay  { courseId, amount, gateway, promo, student }
const startPayment = asyncHandler(async (req, res) => {
  const { courseId, gateway } = req.body;
  const amount = Number(req.body.amount);
  if (!mongoose.isValidObjectId(courseId)) throw new ApiError(400, "Invalid course");
  if (!Number.isFinite(amount)) throw new ApiError(400, "Enter a valid amount");

  const { student } = req.body;
  if (student && typeof student === "object") {
    const patch = {};
    if (student.name?.trim()) patch.name = student.name.trim();
    if (student.phone?.trim()) patch.phone = student.phone.trim();
    if (student.city?.trim()) patch.city = student.city.trim();
    if (Object.keys(patch).length) await User.updateOne({ _id: req.user._id }, patch);
  }
  const result = await billing.startPayment({ user: req.user, courseId, amount, gatewayId: gateway, promo: req.body.promo });
  sendResponse(res, 201, "Payment started", result);
});

// POST /api/billing/verify  { gateway, payload }
const verifyPayment = asyncHandler(async (req, res) => {
  const { gateway, payload } = req.body;
  const { payment, invoice } = await billing.verifyPayment({ user: req.user, gatewayId: gateway, payload });
  const course = await Course.findById(payment.courseId).select("title slug");
  const enrollment = await Enrollment.findOne({ userId: req.user._id, courseId: payment.courseId }).select("status batchId");
  sendResponse(res, 200, "Payment verified", { payment: publicPayment(payment), invoice, course, needsBatch: !enrollment?.batchId });
});

// GET /api/billing/invoices
const listMyInvoices = asyncHandler(async (req, res) => {
  const invoices = await Invoice.find({ userId: req.user._id }).populate("courseId", "title slug thumbnailUrl").sort({ updatedAt: -1 });
  const payments = await Payment.find({ invoiceId: { $in: invoices.map((i) => i._id) }, status: "success" }).sort({ paidAt: -1 });
  const byInvoice = {};
  payments.forEach((p) => (byInvoice[p.invoiceId] ||= []).push(publicPayment(p)));
  const items = invoices.map((inv) => ({ ...inv.toJSON(), payments: byInvoice[inv._id] || [] }));
  sendResponse(res, 200, "Invoices fetched", { items });
});

// GET /api/billing/payments - every payment attempt of the logged-in student
const listMyPayments = asyncHandler(async (req, res) => {
  const items = await Payment.find({ userId: req.user._id }).populate("courseId", "title slug").sort({ createdAt: -1 });
  sendResponse(res, 200, "Payments fetched", { items: items.map((p) => ({ ...publicPayment(p), createdAt: p.createdAt, course: p.courseId })) });
});

// GET /api/billing/receipts/:paymentId - streams the PDF receipt (only for paid payments)
const downloadReceipt = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.paymentId)) throw new ApiError(404, "Receipt not found");

  const filter = { _id: req.params.paymentId, status: "success" };
  if (!isAdmin(req.user)) filter.userId = req.user._id;

  const payment = await Payment.findOne(filter);
  if (!payment) throw new ApiError(404, "Receipt not found");

  const [invoice, user, course, earlier] = await Promise.all([
    Invoice.findById(payment.invoiceId),
    User.findById(payment.userId),
    Course.findById(payment.courseId),
    Payment.aggregate([
      { $match: { invoiceId: payment.invoiceId, status: "success", paidAt: { $lte: payment.paidAt } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);
  if (!invoice || !user || !course) throw new ApiError(404, "Receipt not found");

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="receipt-${payment.receiptNumber}.pdf"`);
  streamReceipt(res, { payment, invoice, user, course, paidToDate: earlier[0]?.total || payment.amount });
});

// POST /api/billing/promo  { code, courseId }
const checkPromo = asyncHandler(async (req, res) => {
  const course = await findCourse(req.body.courseId, "price isPublished");
  if (!course || !course.isPublished) throw new ApiError(404, "Course not found");
  const promo = await billing.findPromo(req.body.code);
  sendResponse(res, 200, "Promo applied", { code: promo.code, percent: promo.percent, ...billing.priceWithPromo(course, promo) });
});

// GET /api/billing/admin/invoices  (admin/instructor)
const adminListInvoices = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  const filter = {};
  if (["unpaid", "partial", "paid"].includes(status)) filter.status = status;
  if (search) {
    const rx = new RegExp(escapeRegex(search.trim()), "i");
    const users = await User.find({ $or: [{ name: rx }, { email: rx }] }).select("_id");
    filter.userId = { $in: users.map((u) => u._id) };
  }

  const [items, totalItems, [totals]] = await Promise.all([
    Invoice.find(filter).populate("userId", "name email").populate("courseId", "title").sort({ updatedAt: -1 }).skip(skip).limit(limit),
    Invoice.countDocuments(filter),
    Invoice.aggregate([{ $group: { _id: null, billed: { $sum: "$totalAmount" }, collected: { $sum: "$amountPaid" } } }]),
  ]);

  const billed = totals?.billed || 0;
  const collected = totals?.collected || 0;
  sendResponse(res, 200, "Invoices fetched", {
    ...buildPaginatedResponse(items, page, limit, totalItems),
    summary: { billed, collected, outstanding: Math.max(billed - collected, 0), currency: billing.currency() },
  });
});

// GET /api/billing/admin/cash-pending  (admin/instructor) -> cash payments waiting for confirmation
const listPendingCash = asyncHandler(async (req, res) => {
  const items = await Payment.find({ gateway: "cash", status: "pending" })
    .populate("userId", "name email phone")
    .populate("courseId", "title")
    .sort({ createdAt: -1 })
    .limit(200);
  sendResponse(res, 200, "Pending cash payments", {
    items: items.map((p) => ({ _id: p._id, amount: p.amount, createdAt: p.createdAt, student: p.userId, course: p.courseId })),
  });
});

// POST or PATCH /api/billing/admin/payments/:paymentId/confirm
// Staff received the cash at the counter -> mark paid, generate the receipt number, update the invoice, enroll the student.
const confirmCashPayment = asyncHandler(async (req, res) => {
  const paymentId = req.params.paymentId || req.params.id;
  if (!mongoose.isValidObjectId(paymentId)) throw new ApiError(404, "Payment not found");
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new ApiError(404, "Payment not found");
  if (payment.gateway !== "cash") throw new ApiError(400, "Only cash payments are confirmed manually");
  if (payment.status === "failed") throw new ApiError(409, "This payment was cancelled");

  if (payment.status !== "success") {
    // Older cash rows may not have an invoice yet: create and attach one.
    if (!payment.invoiceId) {
      const [course, student] = await Promise.all([Course.findById(payment.courseId), User.findById(payment.userId)]);
      if (!course || !student) throw new ApiError(404, "Course or student not found");
      payment.invoiceId = (await billing.getOrCreateInvoice(student, course))._id;
      await payment.save();
    }
    const invoice = await Invoice.findById(payment.invoiceId);
    const balance = invoice.totalAmount - invoice.amountPaid;
    if (payment.amount > balance) throw new ApiError(400, `This payment is more than the balance due (${currency()} ${balance})`);

    await billing.fulfilPayment(payment, `CASH-${String(req.user._id).slice(-6).toUpperCase()}-${Date.now()}`);
  }

  const [fresh, invoice] = await Promise.all([Payment.findById(payment._id), Invoice.findById(payment.invoiceId)]);
  sendResponse(res, 200, "Cash payment confirmed", { payment: publicPayment(fresh), invoice });
});


// POST /api/billing/admin/payments/:paymentId/reject -> cancel a cash payment (duplicate / never paid)
const rejectCashPayment = asyncHandler(async (req, res) => {
  const p = await Payment.findById(req.params.paymentId);
  if (!p) throw new ApiError(404, "Payment not found");
  if (p.gateway !== "cash") throw new ApiError(400, "Only cash payments can be rejected here");
  if (p.status === "success") throw new ApiError(409, "This payment is already confirmed");
  p.status = "failed";
  await p.save();
  sendResponse(res, 200, "Cash payment rejected", { payment: publicPayment(p) });
});

module.exports = {
  getCheckoutSummary, startPayment, verifyPayment, checkPromo,
  listMyInvoices, listMyPayments, downloadReceipt,
  adminListInvoices, listPendingCash, confirmCashPayment, rejectCashPayment
};