const express = require("express");
const router = express.Router();
const { getMyEnrollments, chooseBatch, enrollFree } = require("../controllers/enrollment.controller");
const { protect } = require("../middleware/auth.middleware");
router.get("/me", protect, getMyEnrollments);
router.post("/free", protect, enrollFree);
router.post("/:courseId/batch", protect, chooseBatch);
module.exports = router;
