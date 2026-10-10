const mongoose = require("mongoose");
// One concrete live class (a single date/time) belonging to a batch.
const sessionSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true },
    instructorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    moduleTitle: { type: String, default: "" },
    startsAt: { type: Date, required: true },
    durationMin: { type: Number, default: 90 },
    status: { type: String, enum: ["scheduled", "live", "completed"], default: "scheduled" },
    startedAt: Date,
    endedAt: Date,
  },
  { timestamps: true }
);
sessionSchema.index({ batchId: 1, startsAt: 1 });
sessionSchema.index({ instructorId: 1, startsAt: 1 });
module.exports = mongoose.model("Session", sessionSchema);
