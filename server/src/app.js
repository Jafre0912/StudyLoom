const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const { errorHandler, notFound } = require("./middleware/error.middleware");
const { apiLimiter } = require("./middleware/rateLimiter");

const authRoutes = require("./routes/auth.routes");
const courseRoutes = require("./routes/course.routes");
const enrollmentRoutes = require("./routes/enrollment.routes");
const billingRoutes = require("./routes/billing.routes");
const userRoutes = require("./routes/user.routes");
const categoryRoutes = require("./routes/category.routes");
const certificateRoutes = require("./routes/certificate.routes");
const adminRoutes = require("./routes/admin.routes");
const chatbotRoutes = require("./routes/chatbot.routes");
const sessionRoutes = require("./routes/session.routes");
const instructorRoutes = require("./routes/instructor.routes");
const learningPathRoutes = require("./routes/learningPath.routes");
const classBookingRoutes = require("./routes/class-booking.routes");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/api", apiLimiter);

app.get("/api/health", (req, res) => res.json({ success: true, message: "StudyLoom API is running" }));

app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/instructor", instructorRoutes);
app.use("/api/learning-paths", learningPathRoutes);

// class-booking.routes.js already declares its own full path
// ("/api/class-bookings" inside the file), so mount it at root, ONCE,
// and only after express.json() so req.body is actually populated.
app.use(classBookingRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;