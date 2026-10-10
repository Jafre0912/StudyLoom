const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const sendResponse = require("../utils/apiResponse");
const { generateAccessToken, generateRefreshToken } = require("../utils/generateToken");
const { sendEmail, verificationEmailTemplate } = require("../services/email.service");
const User = require("../models/User");
const settings = require("../services/settings.service");

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, phone: u.phone, city: u.city, avatarUrl: u.avatarUrl });

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

const MAX_SESSIONS = 10; // one refresh token per browser tab, capped

// Issues a session and returns both tokens. The refresh token is ALSO returned in the body so the
// browser can keep it in sessionStorage (per tab). A single shared httpOnly cookie would leak one
// tab's identity into every other tab of the same browser.
async function issueSession(res, user) {
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshTokens = [...(user.refreshTokens || []), refreshToken].slice(-MAX_SESSIONS);
  await user.save();

  res.cookie("refreshToken", refreshToken, cookieOptions); // kept for non-browser clients
  return { accessToken, refreshToken, user: publicUser(user) };
}

// A refresh token may arrive in the body (per-tab SPA) or as a cookie (older clients / curl).
const readRefreshToken = (req) => req.body?.refreshToken || req.cookies?.refreshToken;

// POST /api/auth/signup
const signup = asyncHandler(async (req, res) => {
  if (!(await settings.getAll()).registrationsOpen) throw new ApiError(403, "New registrations are currently closed");
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) throw new ApiError(400, "Name, email and password are required");

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, "An account with this email already exists");

  const passwordHash = await bcrypt.hash(password, 10);
  const emailVerifyToken = crypto.randomBytes(32).toString("hex");

  if (password.length < 6) throw new ApiError(400, "Password must be at least 6 characters");
  const user = await User.create({ name, email, passwordHash, emailVerifyToken, phone: phone || "" });

  const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${emailVerifyToken}`;
  try {
    await sendEmail({ to: email, subject: "Verify your StudyLoom account", html: verificationEmailTemplate(name, verifyUrl) });
  } catch (err) {
    console.error("[auth] verification email failed:", err.message); // never block signup on email
  }

  sendResponse(res, 201, "Account created. Check your email to verify.", await issueSession(res, user));
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, "Email and password are required");

  // +refreshTokens is select:false on the schema, so it MUST be asked for explicitly - otherwise it
// arrives undefined and assigning to it would wipe the other tabs' sessions.
const user = await User.findOne({ email }).select("+passwordHash +refreshTokens");
  if (!user) throw new ApiError(401, "Invalid email or password");
  if (!user.isActive) throw new ApiError(403, "This account has been suspended");

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) throw new ApiError(401, "Invalid email or password");

  sendResponse(res, 200, "Logged in successfully", await issueSession(res, user));
});

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  const token = readRefreshToken(req);
  if (token) {
    // Pull only this session's token: logging out in one tab must not sign the others out.
    await User.updateOne({ refreshTokens: token }, { $pull: { refreshTokens: token } });
  }
  res.clearCookie("refreshToken", cookieOptions);
  sendResponse(res, 200, "Logged out");
});

// POST /api/auth/refresh - issues a new access token for the tab that owns the refresh token
const refresh = asyncHandler(async (req, res) => {
  const jwt = require("jsonwebtoken");
  const token = readRefreshToken(req);
  if (!token) throw new ApiError(401, "No refresh token provided");

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const user = await User.findById(decoded.id).select("+refreshTokens");
  if (!user || !(user.refreshTokens || []).includes(token)) throw new ApiError(401, "Refresh token mismatch");

  const accessToken = generateAccessToken(user._id, user.role);
  sendResponse(res, 200, "Token refreshed", { accessToken });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  sendResponse(res, 200, "Current user", { user: publicUser(req.user) });
});

// GET /api/auth/verify-email?token=...
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;
  const user = await User.findOne({ emailVerifyToken: token }).select("+emailVerifyToken");
  if (!user) throw new ApiError(400, "Invalid or expired verification link");

  user.isEmailVerified = true;
  user.emailVerifyToken = undefined;
  await user.save();

  sendResponse(res, 200, "Email verified successfully");
});

module.exports = { signup, login, logout, refresh, getMe, verifyEmail };
