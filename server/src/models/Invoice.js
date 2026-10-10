const mongoose = require("mongoose");

// One invoice per student per course. It holds the fee that was agreed when the student
// first tried to pay, plus how much has been paid so far. Every installment is a Payment
// document that points back here through Payment.invoiceId.
const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    totalAmount: { type: Number, required: true }, // whole rupees, locked at creation
    amountPaid: { type: Number, default: 0 }, // always recalculated from successful payments
    currency: { type: String, default: "NPR" },
    listAmount: { type: Number, default: 0 }, // price before promo
    promoCode: { type: String, default: "" },
    discount: { type: Number, default: 0 },
    status: { type: String, enum: ["unpaid", "partial", "paid"], default: "unpaid" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

invoiceSchema.index({ userId: 1, courseId: 1 }, { unique: true });

invoiceSchema.virtual("balance").get(function () {
  return Math.max(this.totalAmount - this.amountPaid, 0);
});

module.exports = mongoose.model("Invoice", invoiceSchema);
