const mongoose = require("mongoose");
// A student's seat in a course. Created by the first successful payment (status pending_batch),
// becomes active once the student picks a batch.
const enrollmentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", default: null },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
    status: { type: String, enum: ["pending_batch", "active", "completed", "cancelled"], default: "pending_batch" },
    enrolledAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
enrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });
enrollmentSchema.index({ batchId: 1 });
module.exports = mongoose.model("Enrollment", enrollmentSchema);
