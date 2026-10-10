const ApiError = require("../utils/apiError");

// Restricts a route to specific roles, e.g. restrictTo("admin") or restrictTo("admin", "instructor")
// Must be used AFTER the `protect` middleware since it relies on req.user.
const restrictTo = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    throw new ApiError(403, "You do not have permission to perform this action");
  }
  next();
};

module.exports = { restrictTo };
