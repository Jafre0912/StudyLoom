const jwt = require("jsonwebtoken");
const crypto = require("crypto");

function generateAccessToken(userId, role) {
  return jwt.sign({ id: userId, role }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m",
  });
}

function generateRefreshToken(userId) {
  // jti makes every token unique. Without it two logins in the same second produce byte-identical
  // tokens, so a browser with two tabs on the same account cannot tell the sessions apart.
  return jwt.sign({ id: userId, jti: crypto.randomUUID() }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || "30d",
  });
}

module.exports = { generateAccessToken, generateRefreshToken };
