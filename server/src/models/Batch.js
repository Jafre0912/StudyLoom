const mongoose = require("mongoose");
const batchSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    key: { type: String, enum: ["morning", "evening"], required: true },
    startTime: { type: String, required: true }, // "07:00" (Nepal time)
    endTime: { type: String, required: true },
    days: [{ type: String, enum: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] }],
    startDate: { type: Date, required: true },
    capacity: { type: Number, default: 30 },
    isOpen: { type: Boolean, default: true },
  },
  { timestamps: true }
);
batchSchema.index({ courseId: 1, key: 1 }, { unique: true });
module.exports = mongoose.model("Batch", batchSchema);
