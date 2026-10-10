const mongoose = require("mongoose");
const learningPathSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    blurb: { type: String, default: "" },
    weeks: { type: Number, default: 0 },
    courses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
  },
  { timestamps: true }
);
module.exports = mongoose.model("LearningPath", learningPathSchema);
