const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["student", "instructor", "admin"], default: "student" },
    avatarUrl: { type: String, default: "" },
    phone: { type: String, default: "" },
    city: { type: String, default: "" },
    title: { type: String, default: "" }, // instructor headline
    bio: { type: String, default: "" }, // instructor bio
    isActive: { type: Boolean, default: true }, // admins can suspend
    isEmailVerified: { type: Boolean, default: false },
    emailVerifyToken: { type: String, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    refreshTokens: { type: [String], select: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
