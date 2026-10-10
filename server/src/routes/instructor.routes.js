const express = require("express");
const router = express.Router();
const { overview } = require("../controllers/instructor.controller");
const { protect } = require("../middleware/auth.middleware");
const { restrictTo } = require("../middleware/role.middleware");
router.get("/overview", protect, restrictTo("instructor", "admin"), overview);
module.exports = router;
