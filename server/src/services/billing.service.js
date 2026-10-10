// All billing rules live here: invoices, partial payments, fulfilling a paid installment.
// Controllers stay thin and gateways stay dumb.
const mongoose = require("mongoose");
const ApiError = require("../utils/apiError");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const Promo = require("../models/Promo");
const { getGateway } = require("./gateways");

const currency = () => process.env.BILLING_CURRENCY || "NPR";
const minPayment = () => Number(process.env.MIN_PAYMENT_AMOUNT) || 100;

const pad = (n) => String(n).padStart(2, "0");
const yyyymmdd = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const tail = (id, n) => String(id).slice(-n).toUpperCase();

function statusFor(total, paid) {
  if (paid <= 0) return "unpaid";
  if (paid >= total) return "paid";
  return "partial";
}

// Rules for one installment: whole rupees, at least the minimum (or whatever is left if that is
// smaller), and never more than the remaining balance.
function validateAmount(invoice, amount) {
  const balance = invoice.totalAmount - invoice.amountPaid;
  if (balance <= 0) throw new ApiError(409, "This course is already fully paid");
  if (!Number.isInteger(amount)) throw new ApiError(400, "Enter a whole-rupee amount");

  const min = Math.min(minPayment(), balance);
  if (amount < min) throw new ApiError(400, `Minimum payment is ${currency()} ${min}`);
  if (amount > balance) {
    throw new ApiError(400, `You only owe ${currency()} ${balance} for this course`);
  }
}

// Looks up a promo code and returns { promo, percent } or throws a friendly error.
async function findPromo(code) {
  const promo = await Promo.findOne({ code: String(code || "").trim().toUpperCase(), isActive: true });
  if (!promo) throw new ApiError(400, "Invalid promo code");
  if (promo.expiresAt && promo.expiresAt < new Date()) throw new ApiError(400, "This promo code has expired");
  if (promo.maxUses && promo.uses >= promo.maxUses) throw new ApiError(400, "This promo code has been fully used");
  return promo;
}
const priceWithPromo = (course, promo) => {
  const list = Math.round(course.price);
  const discount = promo ? Math.round((list * promo.percent) / 100) : 0;
  return { list, discount, total: list - discount };
};

async function getOrCreateInvoice(user, course, promoCode) {
  const promo = promoCode ? await findPromo(promoCode) : null;
  const { list, discount, total } = priceWithPromo(course, promo);
  const existing = await Invoice.findOne({ userId: user._id, courseId: course._id });
  if (existing) {
    // Until the first rupee is paid the student may still change promo code; after that the fee is locked.
    if (existing.amountPaid === 0) {
      Object.assign(existing, { totalAmount: total, listAmount: list, discount, promoCode: promo?.code || "" });
      await existing.save();
    }
    return existing;
  }
  const _id = new mongoose.Types.ObjectId();
  try {
    return await Invoice.create({
      _id, invoiceNumber: `INV-${new Date().getFullYear()}-${tail(_id, 8)}`,
      userId: user._id, courseId: course._id, totalAmount: total, listAmount: list, discount, promoCode: promo?.code || "", currency: currency(),
    });
  } catch (err) {
    if (err.code === 11000) return Invoice.findOne({ userId: user._id, courseId: course._id });
    throw err;
  }
}

// amountPaid is always recomputed from the successful payments (the source of truth).
// Calling this twice, or after a crash halfway through, can never double count.
async function recalculateInvoice(invoiceId) {
  const [row] = await Payment.aggregate([
    { $match: { invoiceId: new mongoose.Types.ObjectId(String(invoiceId)), status: "success" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const invoice = await Invoice.findById(invoiceId);
  invoice.amountPaid = row?.total || 0;
  invoice.status = statusFor(invoice.totalAmount, invoice.amountPaid);
  await invoice.save();
  return invoice;
}

// Access starts with the first successful payment: create the seat, the student then picks a batch.
async function ensureEnrollment(userId, courseId, paymentId) {
  if (await Enrollment.exists({ userId, courseId })) return;
  try {
    await Enrollment.create({ userId, courseId, paymentId });
  } catch (err) {
    if (err.code !== 11000) throw err;
  }
}

// Marks one installment as paid. Safe to call many times (success page refresh, double click):
// the atomic claim only lets the first call set the receipt number.
async function fulfilPayment(payment, gatewayPaymentId) {
  const now = new Date();
  const claimed = await Payment.findOneAndUpdate(
    { _id: payment._id, status: { $ne: "success" } },
    {
      status: "success",
      gatewayPaymentId,
      paidAt: now,
      receiptNumber: `RCPT-${yyyymmdd(now)}-${tail(payment._id, 8)}`,
    }
  );
  const invoice = await recalculateInvoice(payment.invoiceId);
  if (claimed && invoice.promoCode && invoice.amountPaid === payment.amount) await Promo.updateOne({ code: invoice.promoCode }, { $inc: { uses: 1 } });
  // Access starts with the first successful payment, even a partial one.
  await ensureEnrollment(payment.userId, payment.courseId, payment._id);
  return invoice;
}

// Step 1: create the pending payment and get the gateway redirect for the browser.
async function startPayment({ user, courseId, amount, gatewayId, promo }) {
  const course = await Course.findById(courseId);
  if (!course || !course.isPublished) throw new ApiError(404, "Course not found");
  if (!course.price || course.price <= 0) throw new ApiError(400, "This course is free, no payment needed");

  const gateway = getGateway(gatewayId);
  const invoice = await getOrCreateInvoice(user, course, promo);
  validateAmount(invoice, amount);

  const payment = await Payment.create({
    userId: user._id,
    courseId: course._id,
    invoiceId: invoice._id,
    amount,
    currency: invoice.currency,
    gateway: gateway.id,
    status: "pending",
  });

  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const urls = {
    success: `${clientUrl}/payment/callback/${gateway.id}`,
    failure: `${clientUrl}/payment/callback/failed`,
  };

  try {
    const { gatewayOrderId, redirect } = await gateway.initiate({ payment, course, user, urls });
    if (gatewayOrderId) payment.gatewayOrderId = gatewayOrderId;
    await payment.save();
    // Cash has no gateway page to send the browser to, so redirect stays null.
    return { paymentId: payment._id, redirect: redirect || null, offline: !!gateway.offline };
  } catch (err) {
    payment.status = "failed";
    await payment.save();
    throw err;
  }
}

// Step 2: the browser is back from the gateway. Check with the gateway, then update the books.
async function verifyPayment({ user, gatewayId, payload }) {
  const gateway = getGateway(gatewayId);
  const payment = await Payment.findOne({
    ...gateway.getLookup(payload),
    userId: user._id, // nobody can verify someone else's payment
    gateway: gateway.id,
  });
  if (!payment) throw new ApiError(404, "Payment record not found");

  if (payment.status !== "success") {
    const result = await gateway.verify(payment, payload);
    if (result.paid) {
      await fulfilPayment(payment, result.gatewayPaymentId);
    } else if (result.terminal) {
      payment.status = "failed";
      await payment.save();
      throw new ApiError(402, "Payment was not completed. You have not been charged.");
    } else {
      throw new ApiError(409, "Your payment is still being processed. Please check again in a minute.");
    }
  }

  const [fresh, invoice] = await Promise.all([
    Payment.findById(payment._id),
    Invoice.findById(payment.invoiceId),
  ]);
  return { payment: fresh, invoice };
}

module.exports = {
  currency,
  minPayment,
  findPromo,
  priceWithPromo,
  statusFor,
  validateAmount,
  getOrCreateInvoice,
  recalculateInvoice,
  fulfilPayment,
  startPayment,
  verifyPayment,
};
