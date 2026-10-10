const slugify = require("slugify");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const sendResponse = require("../utils/apiResponse");
const Category = require("../models/Category");

// GET /api/categories
const listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  sendResponse(res, 200, "Categories fetched", { categories });
});

// POST /api/categories (admin only)
const createCategory = asyncHandler(async (req, res) => {
  const { name, icon } = req.body;
  if (!name) throw new ApiError(400, "Category name is required");
  const slug = slugify(name, { lower: true, strict: true });
  const category = await Category.create({ name, slug, icon });
  sendResponse(res, 201, "Category created", { category });
});

module.exports = { listCategories, createCategory };
