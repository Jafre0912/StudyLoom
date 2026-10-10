const express = require("express");
const router = express.Router();
const { listCourses, getCourse, createCourse, updateCourse, deleteCourse } = require("../controllers/course.controller");
const { addReview, getCourseReviews } = require("../controllers/review.controller");
const { protect } = require("../middleware/auth.middleware");
const { restrictTo } = require("../middleware/role.middleware");

router.get("/", listCourses);
router.get("/:slug", getCourse);
router.post("/:id/reviews", protect, addReview);
router.get("/:id/reviews", getCourseReviews);
router.post("/", protect, restrictTo("admin", "instructor"), createCourse);
router.put("/:id", protect, restrictTo("admin", "instructor"), updateCourse);
router.delete("/:id", protect, restrictTo("admin"), deleteCourse);
module.exports = router;
