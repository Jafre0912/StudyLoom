
const express = require("express");
const router = express.Router();
const c = require("../controllers/session.controller");
const { protect } = require("../middleware/auth.middleware");
const { restrictTo } = require("../middleware/role.middleware");

router.get("/public", c.publicSessions);
router.get("/me", protect, c.mySessions);
router.get("/attendance/me", protect, c.myAttendance);
router.get("/:id", protect, c.getSession);
router.get("/:id/roster", protect, restrictTo("admin", "instructor"), c.roster);

router.post("/:id/start", protect, restrictTo("admin", "instructor"), c.startSession);
router.post("/:id/end", protect, restrictTo("admin", "instructor"), c.endSession);
router.post("/:id/join", protect, c.join);
router.post("/:id/heartbeat", protect, c.heartbeat);
router.post("/:id/leave", protect, c.leave);

router.post("/:id/token", protect, c.roomToken);
router.post("/:id/share", protect, c.shareAccess);

module.exports = router;
