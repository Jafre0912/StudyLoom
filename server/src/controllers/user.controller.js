const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const sendResponse = require("../utils/apiResponse");
const User = require("../models/User");

// PUT /api/users/me
const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");
  for (const f of ["name", "avatarUrl", "phone", "city"]) if (typeof req.body[f] === "string") user[f] = req.body[f].trim();
  if (!user.name) throw new ApiError(400, "Name is required");
  await user.save();
  sendResponse(res, 200, "Profile updated", { user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, city: user.city, avatarUrl: user.avatarUrl } });
});
module.exports = { updateProfile };
