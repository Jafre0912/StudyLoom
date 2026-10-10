const express = require("express");
const nodemailer = require("nodemailer");

// ⚠️ Adjust this path to wherever you actually save ClassBooking.js.
// Look at how one of your existing route files (e.g. course.routes.js)
// requires its model, and copy that same pattern here.
const ClassBooking = require("../models/ClassBooking"); // adjust path to your models folder


const router = express.Router();

const SLOT_LABELS = {
  "morning-6-7": "Morning 6:00 – 7:00 AM",
  "morning-7-8": "Morning 7:00 – 8:00 AM",
  "evening-7-8": "Evening 7:00 – 8:00 PM",
  "evening-8-9": "Evening 8:00 – 9:00 PM",
  "evening-9-10": "Evening 9:00 – 10:00 PM",
};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// NOTE: path is /api/class-bookings, NOT /api/enrollments —
// your existing enrollment route/model stays untouched.
router.post("/api/class-bookings", async (req, res) => {
  try {
    const { courseId, courseTitle, name, email, phone, timeSlot, learningObjective } = req.body;

    if (!courseId || !courseTitle || !name || !email || !phone || !timeSlot) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const booking = await ClassBooking.create({
      courseId,
      courseTitle,
      name,
      email,
      phone,
      timeSlot,
      learningObjective,
    });

    try {
      await transporter.sendMail({
        from: `"Study Loom" <${process.env.EMAIL_USER}>`,
        to: process.env.ADMIN_EMAIL,
        replyTo: email,
        subject: `New class booking: ${courseTitle} — ${name}`,
        html: `
          <h2>New live class booking</h2>
          <p><strong>Course:</strong> ${courseTitle}</p>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>WhatsApp number:</strong> ${phone}</p>
          <p><strong>Preferred timing:</strong> ${SLOT_LABELS[timeSlot] || timeSlot}</p>
          <p><strong>Learning objective:</strong><br/>${learningObjective || "—"}</p>
          <hr/>
          <p style="color:#888;font-size:12px;">Reply to this email or message ${name} on WhatsApp at ${phone}.</p>
        `,
      });
    } catch (mailErr) {
      console.error("Class booking email failed to send:", mailErr.message);
    }

    res.status(201).json({ message: "Booking received", booking });
  } catch (err) {
    console.error("Class booking save failed:", err.message);
    res.status(500).json({ message: "Server error, please try again." });
  }
});

module.exports = router;