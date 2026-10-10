const mongoose = require("mongoose");

// This is intentionally a SEPARATE model from your existing "Enrollment"
// model (the one that grants course access). This one just stores the
// live-class timing preference + contact details someone submits, so it
// never touches your existing enrollment/access logic.
const classBookingSchema = new mongoose.Schema(
  {
    courseId: { type: String, required: true },
    courseTitle: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    timeSlot: { type: String, required: true },
    learningObjective: { type: String, default: "" },
    status: {
      type: String,
      enum: ["new", "contacted", "confirmed"],
      default: "new",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ClassBooking", classBookingSchema);