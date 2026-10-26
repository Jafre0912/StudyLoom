// const slugify = require("slugify");
// const asyncHandler = require("../utils/asyncHandler");
// const ApiError = require("../utils/apiError");
// const sendResponse = require("../utils/apiResponse");
// const Category = require("../models/Category");

// // GET /api/categories
// const listCategories = asyncHandler(async (req, res) => {
//   const categories = await Category.find().sort({ name: 1 });
//   sendResponse(res, 200, "Categories fetched", { categories });
// });

// // POST /api/categories (admin only)
// const createCategory = asyncHandler(async (req, res) => {
//   const { name, icon } = req.body;
//   if (!name) throw new ApiError(400, "Category name is required");
//   const slug = slugify(name, { lower: true, strict: true });
//   const category = await Category.create({ name, slug, icon });
//   sendResponse(res, 201, "Category created", { category });
// });

// module.exports = { listCategories, createCategory };

const slugify = require("slugify");
const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const sendResponse = require("../utils/apiResponse");
const Category = require("../models/Category");
const Course = require("../models/Course");

// GET /api/categories  (public: hidden ones are not returned)
const listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isHidden: { $ne: true } }).sort({ name: 1 });
  sendResponse(res, 200, "Categories fetched", { categories });
});

// GET /api/categories/admin/all  (admin: everything + how many courses each has)
const adminListCategories = asyncHandler(async (req, res) => {
  const [categories, counts] = await Promise.all([
    Category.find().sort({ name: 1 }),
    Course.aggregate([{ $group: { _id: "$categoryId", total: { $sum: 1 }, published: { $sum: { $cond: ["$isPublished", 1, 0] } } } }]),
  ]);
  const map = new Map(counts.map((c) => [String(c._id), c]));
  const items = categories.map((c) => ({
    _id: c._id, name: c.name, slug: c.slug, isHidden: !!c.isHidden,
    totalCourses: map.get(String(c._id))?.total || 0,
    publishedCourses: map.get(String(c._id))?.published || 0,
  }));
  sendResponse(res, 200, "Categories fetched", { items });
});

// POST /api/categories (admin)
const createCategory = asyncHandler(async (req, res) => {
  const { name, icon } = req.body;
  if (!name?.trim()) throw new ApiError(400, "Category name is required");
  const slug = slugify(name, { lower: true, strict: true });
  if (await Category.findOne({ $or: [{ slug }, { name: name.trim() }] })) throw new ApiError(409, "That category already exists");
  const category = await Category.create({ name: name.trim(), slug, icon });
  sendResponse(res, 201, "Category created", { category });
});

// PATCH /api/categories/:id  { name?, isHidden? }   (slug stays the same so old links keep working)
const updateCategory = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(404, "Category not found");
  const cat = await Category.findById(req.params.id);
  if (!cat) throw new ApiError(404, "Category not found");
  if (typeof req.body.isHidden === "boolean") cat.isHidden = req.body.isHidden;
  if (typeof req.body.name === "string" && req.body.name.trim()) {
    const name = req.body.name.trim();
    if (await Category.findOne({ name, _id: { $ne: cat._id } })) throw new ApiError(409, "Another category already has this name");
    cat.name = name;
  }
  await cat.save();
  sendResponse(res, 200, "Category updated", { category: cat });
});

// DELETE /api/categories/:id  (blocked while published courses still use it)
const deleteCategory = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(404, "Category not found");
  const cat = await Category.findById(req.params.id);
  if (!cat) throw new ApiError(404, "Category not found");
  const live = await Course.countDocuments({ categoryId: cat._id, isPublished: true });
  if (live > 0) throw new ApiError(409, `${live} published course(s) use this category. Move them to another category first, or just hide it.`);
  await Course.updateMany({ categoryId: cat._id }, { $unset: { categoryId: "" } }); // old unpublished leftovers
  await cat.deleteOne();
  sendResponse(res, 200, "Category deleted");
});

module.exports = { listCategories, adminListCategories, createCategory, updateCategory, deleteCategory };
