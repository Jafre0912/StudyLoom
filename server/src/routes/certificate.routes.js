const express = require("express");
const router = express.Router();
const { listMine, verify } = require("../controllers/certificate.controller");
const { protect } = require("../middleware/auth.middleware");
router.get("/verify/:certId", verify);
router.get("/", protect, listMine);
module.exports = router;
