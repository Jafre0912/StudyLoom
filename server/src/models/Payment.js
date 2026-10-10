const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "NPR" },
    gateway: { type: String, enum: ["esewa", "khalti", "cash"], required: true },
    gatewayOrderId: { type: String, index: true },
    gatewayPaymentId: { type: String },
    status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", index: true }, // which invoice this installment belongs to
    receiptNumber: { type: String, unique: true, sparse: true }, // set when the payment succeeds
    paidAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
