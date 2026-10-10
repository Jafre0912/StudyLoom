const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const sendResponse = require("../utils/apiResponse");
const Certificate = require("../models/Certificate");

const POP = [{ path: "courseId", select: "title slug thumbnailUrl instructorId", populate: { path: "instructorId", select: "name" } }, { path: "userId", select: "name" }];
const shape = (c) => ({ _id: c._id, certId: c.certId, attendance: c.attendance, hours: c.hours, grade: c.grade, issuedAt: c.issuedAt, verified: true, studentName: c.userId?.name, course: c.courseId });

// GET /api/certificates - my certificates
const listMine = asyncHandler(async (req, res) => {
  const items = await Certificate.find({ userId: req.user._id }).populate(POP).sort({ issuedAt: -1 });
  sendResponse(res, 200, "Certificates fetched", { items: items.map(shape) });
});
// GET /api/certificates/verify/:certId - public verification
const verify = asyncHandler(async (req, res) => {
  const c = await Certificate.findOne({ certId: req.params.certId.toUpperCase() }).populate(POP);
  if (!c) throw new ApiError(404, "No certificate found with this ID");
  sendResponse(res, 200, "Certificate is valid", { certificate: shape(c) });
});
module.exports = { listMine, verify };
