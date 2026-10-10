const mongoose = require("mongoose");
const certificateSchema = new mongoose.Schema(
  {
    certId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    attendance: { type: Number, required: true },
    hours: { type: Number, default: 0 },
    grade: { type: String, default: "Pass" },
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
certificateSchema.index({ userId: 1, courseId: 1 }, { unique: true });
module.exports = mongoose.model("Certificate", certificateSchema);
