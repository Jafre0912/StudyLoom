const express = require("express");
const router = express.Router();
const LearningPath = require("../models/LearningPath");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/apiResponse");
router.get("/", asyncHandler(async (req, res) => {
  const items = await LearningPath.find().populate({ path: "courses", select: "title slug price weeks thumbnailUrl isPublished" }).sort({ createdAt: 1 });
  sendResponse(res, 200, "Learning paths fetched", { items });
}));
module.exports = router;
