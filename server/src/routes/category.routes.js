// const express = require("express");
// const router = express.Router();
// const { listCategories, createCategory } = require("../controllers/category.controller");
// const { protect } = require("../middleware/auth.middleware");
// const { restrictTo } = require("../middleware/role.middleware");

// router.get("/", listCategories);
// router.post("/", protect, restrictTo("admin"), createCategory);

// module.exports = router;

const express = require("express");
const router = express.Router();
const c = require("../controllers/category.controller");
const { protect } = require("../middleware/auth.middleware");
const { restrictTo } = require("../middleware/role.middleware");

router.get("/", c.listCategories);
router.get("/admin/all", protect, restrictTo("admin"), c.adminListCategories); // must stay above "/:id"
router.post("/", protect, restrictTo("admin"), c.createCategory);
router.patch("/:id", protect, restrictTo("admin"), c.updateCategory);
router.delete("/:id", protect, restrictTo("admin"), c.deleteCategory);

module.exports = router;