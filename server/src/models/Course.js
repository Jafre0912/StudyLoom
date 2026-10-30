const mongoose = require("mongoose");
// A live, instructor-led course. Batches (morning/evening) and concrete Sessions are generated from it.
const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    thumbnailUrl: { type: String, default: "" },
  slots: [{ _id: false, startTime: { type: String, required: true }, endTime: { type: String, required: true } }],    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    instructorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    price: { type: Number, required: true, default: 0 }, // whole NPR, 0 = free
    oldPrice: { type: Number, default: 0 }, // list price shown struck-through
    level: { type: String, enum: ["beginner", "intermediate", "advanced"], default: "beginner" },
    weeks: { type: Number, default: 8, min: 1 },
    classesPerWeek: { type: Number, default: 4, min: 1, max: 6 },
    minutesPerClass: { type: Number, default: 90 },
    startDate: { type: Date, default: () => new Date(Date.now() + 7 * 864e5) },
    outcomes: [String],
    modules: [{ _id: false, title: { type: String, required: true }, topics: [String] }],
    faqs: [{ _id: false, q: String, a: String }],
    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
    tags: [String],
  },
  { timestamps: true }
);
courseSchema.index({ title: "text", description: "text", tags: "text" });
module.exports = mongoose.model("Course", courseSchema);
