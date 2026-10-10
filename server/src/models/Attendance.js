const mongoose = require("mongoose");
// Real-time attendance: seconds are accumulated server-side from join + heartbeat + leave,
// so the browser cannot claim time it did not spend in the class.
const attendanceSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    joinedAt: Date,
    leftAt: Date,
    lastSeenAt: Date,
    seconds: { type: Number, default: 0 },
  },
  { timestamps: true }
);
attendanceSchema.index({ sessionId: 1, userId: 1 }, { unique: true });
module.exports = mongoose.model("Attendance", attendanceSchema);
