const express = require("express");
const router = express.Router();
const { listCategories, createCategory } = require("../controllers/category.controller");
const { protect } = require("../middleware/auth.middleware");
const { restrictTo } = require("../middleware/role.middleware");

router.get("/", listCategories);
router.post("/", protect, restrictTo("admin"), createCategory);

module.exports = router;
