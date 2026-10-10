const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const sendResponse = require("../utils/apiResponse");
const { getPagination, buildPaginatedResponse } = require("../utils/paginate");
const Review = require("../models/Review");
const Course = require("../models/Course");

// POST /api/courses/:id/reviews
const addReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const courseId = req.params.id;
  if (!rating) throw new ApiError(400, "Rating is required");

  const existing = await Review.findOne({ userId: req.user._id, courseId });
  if (existing) throw new ApiError(409, "You already reviewed this course");

  const review = await Review.create({ userId: req.user._id, courseId, rating, comment });

  // Recalculate the course's aggregate rating.
  const stats = await Review.aggregate([
    { $match: { courseId: review.courseId } },
    { $group: { _id: "$courseId", avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  if (stats.length) {
    await Course.findByIdAndUpdate(courseId, {
      rating: Math.round(stats[0].avgRating * 10) / 10,
      ratingCount: stats[0].count,
    });
  }

  sendResponse(res, 201, "Review added", { review });
});

// GET /api/courses/:id/reviews?page=&limit=
const getCourseReviews = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { courseId: req.params.id };

  const [items, totalItems] = await Promise.all([
    Review.find(filter).populate("userId", "name avatarUrl").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Review.countDocuments(filter),
  ]);

  sendResponse(res, 200, "Reviews fetched", buildPaginatedResponse(items, page, limit, totalItems));
});

module.exports = { addReview, getCourseReviews };
