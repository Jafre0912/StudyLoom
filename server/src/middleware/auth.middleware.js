const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const User = require("../models/User");

// Verifies the JWT access token sent in the Authorization header ("Bearer <token>")
// and attaches the logged-in user to req.user for downstream handlers.
const protect = asyncHandler(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
  throw new ApiError(401, "Not authorized, no token provided");
}

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) throw new ApiError(401, "User no longer exists");
    if (!user.isActive) throw new ApiError(403, "This account has been suspended");
    req.user = user;
    next();
 } catch (err) {
  if (err instanceof ApiError) throw err;
  throw new ApiError(401, "Not authorized, token invalid or expired");
}
});

module.exports = { protect };
