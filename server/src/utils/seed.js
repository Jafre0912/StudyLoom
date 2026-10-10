require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
const Category = require("../models/Category");
const Course = require("../models/Course");
const LearningPath = require("../models/LearningPath");
const Promo = require("../models/Promo");
const live = require("../services/live.service");

const CATEGORIES = [
  ["Computer Basics", "computer-basics", "Monitor"], ["MS Office", "ms-office", "FileSpreadsheet"], ["Web Development", "web-development", "Globe"],
  ["Backend", "backend", "Server"], ["Programming", "programming", "Code2"], ["DSA", "dsa", "Network"], ["AI & Data Analytics", "ai-data", "Brain"],
];
const INSTRUCTORS = {
  i1: ["Jafre Alam", "jafre@studyloom.com", "Senior Full-Stack Engineer", "10+ years building production web apps."],
  i2: ["Amjad Ansari", "amjad@studyloom.com", "Data Scientist", "Applied ML and analytics mentor."],
  i3: ["Aasis Mandal", "aasis@studyloom.com", "Backend Architect", "API design, databases and scalable systems."],
  i4: ["Sajid Alam", "sajid@studyloom.com", "Office & Productivity Trainer", "Certified MS Office trainer who has coached 500+ professionals."],
  i5: ["Zafar Ali Khan", "zafar@studyloom.com", "Competitive Programmer", "Teaches DSA with an interview-first mindset."],
  i6: ["Raees Alam", "raees@studyloom.com", "Software Instructor", "Makes first-time programmers feel confident from the first class."],
};
const MODULES = {
  "computer-basics": ["Computer Hardware & Software", "Operating System Essentials", "Files, Folders & Storage", "Touch Typing Foundations", "Typing Speed Drills", "Internet & Browser Skills", "Email & Online Communication", "Cyber Safety Basics", "Productivity Tools Overview", "Final Assessment & Review"],
  "ms-office": ["Interface & Fundamentals", "Formatting & Styles", "Working with Tables", "Formulas & Functions", "Charts & Visuals", "Data Analysis Tools", "Templates & Automation", "Collaboration & Sharing", "Real-world Workflow Practice", "Capstone Project"],
  "web-development": ["Web Fundamentals", "HTML Structure", "CSS & Layouts", "Responsive Design", "JavaScript Core", "DOM & Events", "APIs & Async JS", "Frameworks & Components", "State & Routing", "Capstone Project & Deployment"],
  backend: ["Backend Fundamentals", "Server Setup & Routing", "Request Handling & Middleware", "Databases & Modeling", "Authentication & Security", "REST API Design", "Validation & Error Handling", "Testing & Debugging", "Deployment & DevOps Basics", "Capstone API Project"],
  programming: ["Getting Started", "Variables & Data Types", "Control Flow", "Functions & Modularity", "Collections & Data Structures", "Object-Oriented Programming", "File Handling & Errors", "Libraries & Tooling", "Mini Projects", "Capstone Project"],
  dsa: ["Complexity Analysis", "Arrays & Strings", "Linked Lists", "Stacks & Queues", "Recursion & Backtracking", "Trees & BSTs", "Graphs", "Sorting & Searching", "Dynamic Programming", "Mock Interviews"],
  "ai-data": ["Foundations & Tooling", "Data Collection & Cleaning", "Exploratory Analysis", "Visualization & Dashboards", "Statistics Essentials", "Modeling Techniques", "Evaluation & Insights", "Automation & Pipelines", "Case Studies", "Capstone Project"],
};
//
const COURSES = [
  ["computer-fundamentals-touch-typing", "Computer Fundamentals & Touch Typing", "computer-basics", "beginner", 3500, 5000, 4, 3, "i4"],
  ["ms-word-complete-course", "MS Word Complete Course", "ms-office", "beginner", 3000, 4500, 4, 3, "i4"],
  ["ms-excel-beginner-to-advanced", "MS Excel: Beginner to Advanced", "ms-office", "intermediate", 5500, 7500, 6, 4, "i4"],
  ["ms-powerpoint-mastery", "MS PowerPoint Mastery", "ms-office", "beginner", 3200, 4200, 3, 3, "i4"],
  ["html-css-javascript-fundamentals", "HTML, CSS & JavaScript Fundamentals", "web-development", "beginner", 6500, 9000, 8, 5, "i1"],
  ["tailwind-css-complete-guide", "Tailwind CSS Complete Guide", "web-development", "intermediate", 4500, 6000, 4, 3, "i1"],
  ["javascript-beginner-to-advanced", "JavaScript: Beginner to Advanced", "web-development", "intermediate", 7000, 9500, 8, 4, "i1"],
  ["javascript-full-course-beginner-to-advanced", "JavaScript Full Course", "web-development", "advanced", 8500, 11000, 10, 5, "i1"],
  ["react-js-complete-guide", "React JS Complete Guide", "web-development", "intermediate", 9500, 12500, 8, 5, "i1"],
  ["mern-stack-for-beginners", "MERN Stack for Beginners", "web-development", "intermediate", 12000, 16000, 10, 5, "i1"],
  ["complete-mern-full-stack-developer", "Complete MERN Full-Stack Developer", "web-development", "advanced", 18000, 24000, 16, 5, "i1"],
  ["node-js-express-complete-course", "Node.js & Express Complete Course", "backend", "intermediate", 8000, 10500, 8, 4, "i3"],
  ["django-full-course-python-mvt", "Django Full Course (Python MVT)", "backend", "intermediate", 9000, 12000, 8, 4, "i3"],
  ["laravel-full-course-php-mvc", "Laravel Full Course (PHP MVC)", "backend", "intermediate", 8500, 11000, 8, 4, "i3"],
  ["python-beginner-to-advanced", "Python: Beginner to Advanced", "programming", "beginner", 6000, 8500, 8, 4, "i6"],
  ["java-core-advanced", "Java Core & Advanced", "programming", "intermediate", 7500, 10000, 10, 4, "i6"],
  ["data-structures-algorithms-with-c", "DSA with C", "dsa", "intermediate", 7000, 9000, 10, 4, "i5"],
  ["data-structures-algorithms-with-python", "DSA with Python", "dsa", "intermediate", 7500, 9800, 10, 4, "i5"],
  ["data-structures-algorithms-with-java", "DSA with Java", "dsa", "intermediate", 7800, 10200, 10, 4, "i5"],
  ["python-for-data-science", "Python for Data Science", "ai-data", "intermediate", 10000, 13500, 10, 4, "i2"],
  ["data-analytics-with-power-bi", "Data Analytics with Power BI", "ai-data", "beginner", 8500, 11000, 6, 4, "i2"],
  ["agentic-ai-beginner-to-advanced", "Agentic AI: Beginner to Advanced", "ai-data", "advanced", 15000, 20000, 12, 4, "i2"],
];
const PATHS = [
  ["Frontend Developer", "frontend", "From HTML basics to production React apps.", 20, ["html-css-javascript-fundamentals", "tailwind-css-complete-guide", "react-js-complete-guide"]],
  ["MERN Full-Stack Developer", "fullstack", "Build and ship complete web products end to end.", 32, ["javascript-beginner-to-advanced", "node-js-express-complete-course", "complete-mern-full-stack-developer"]],
  ["Data Analyst", "data-analyst", "Clean, analyse and visualise data with confidence.", 26, ["ms-excel-beginner-to-advanced", "python-for-data-science", "data-analytics-with-power-bi"]],
  ["Interview-Ready Engineer", "interview-ready", "Master problem solving for top tech interviews.", 18, ["python-beginner-to-advanced", "data-structures-algorithms-with-python"]],
  ["AI Builder", "ai-builder", "Go from Python to building agentic AI apps.", 30, ["python-beginner-to-advanced", "python-for-data-science", "agentic-ai-beginner-to-advanced"]],
];
const FAQS = (t) => [
  { q: "Are the classes recorded or live?", a: "All classes are live and instructor-led. You join at your chosen batch time and can ask questions in real time." },
  { q: "What if I miss a class?", a: "You can still complete the course as long as your overall attendance stays at or above 80%." },
  { q: "How do I get my certificate?", a: `Finish ${t} with at least 80% attendance. Your certificate is issued automatically with a verifiable ID.` },
  { q: "Can I change my batch later?", a: "Contact support before the course starts and we will move you if a seat is free." },
];

async function upsertUser(email, data, password) {
  let u = await User.findOne({ email });
  if (!u) u = await User.create({ email, passwordHash: await bcrypt.hash(password, 10), isEmailVerified: true, ...data });
  else { Object.assign(u, data); await u.save(); }
  return u;
}

async function seed() {
  await connectDB();
  const db = mongoose.connection.db;
  // Old recorded-video collections are no longer used.
  for (const c of ["lessons", "modules", "progresses"]) await db.dropCollection(c).catch(() => {});
  // Old lead-form enrollments / URL certificates have a different shape and would break the new indexes.
  await db.collection("enrollments").deleteMany({ userId: { $exists: false } });
  await db.collection("certificates").deleteMany({ certId: { $exists: false } });
  if (process.argv.includes("--reset-live")) {
    for (const c of ["enrollments", "sessions", "attendances", "certificates", "batches", "payments", "invoices"]) await db.collection(c).deleteMany({});
    console.log("Cleared old live data.");
  }
  await Promise.all([Course.syncIndexes(), require("../models/Enrollment").syncIndexes(), require("../models/Certificate").syncIndexes()]);

  await upsertUser("admin@studyloom.com", { name: "Admin User", role: "admin" }, "Admin@123");
  await upsertUser("student@studyloom.com", { name: "Jafre Alam", role: "student", phone: "9824207442", city: "Kathmandu" }, "Student@123");
  const ins = {};
  for (const [k, [name, email, title, bio]] of Object.entries(INSTRUCTORS)) ins[k] = await upsertUser(email, { name, role: "instructor", title, bio }, "Instructor@123");
  await upsertUser("instructor@studyloom.com", { name: "Jafre Alam", role: "instructor", title: INSTRUCTORS.i1[2], bio: INSTRUCTORS.i1[3] }, "Instructor@123");

  const cat = {};
  for (const [name, slug, icon] of CATEGORIES) cat[slug] = (await Category.findOneAndUpdate({ slug }, { name, slug, icon }, { upsert: true, new: true }))._id;

  const bySlug = {};
  let i = 0;
  for (const [slug, title, c, level, price, oldPrice, weeks, perWeek, inst] of COURSES) {
    const fields = {
      title, description: `Learn ${title} in live, instructor-led classes. Ask questions in real time, practise on guided exercises after every session, and finish with a project that goes straight into your portfolio.`,
      thumbnailUrl: `/${slug}.png`, categoryId: cat[c], instructorId: (inst === "i1" ? await User.findOne({ email: "instructor@studyloom.com" }) : ins[inst])._id,
      price, oldPrice, level, weeks, classesPerWeek: perWeek, minutesPerClass: 90, isPublished: true, tags: [c],
      outcomes: ["Attend interactive live classes with a real instructor", "Practice with hands-on exercises every week", "Build a portfolio-ready final project", "Earn a verifiable digital certificate (80%+ attendance)"],
      modules: MODULES[c].map((t) => ({ title: t, topics: [`Live walkthrough: ${t}`, "Guided practice session", "Q&A and review"] })), faqs: FAQS(title),
    };
    let course = await Course.findOne({ slug });
    if (!course) { course = await Course.create({ slug, startDate: new Date(Date.now() + (2 + (i % 6)) * 864e5), ...fields }); console.log("Created course:", title); }
    else { Object.assign(course, fields); await course.save(); }
    await live.ensureBatches(course);
    bySlug[slug] = course._id; i += 1;
  }
  await Course.updateMany({ slug: { $nin: COURSES.map((r) => r[0]) }, mode: { $exists: true } }, { isPublished: false }); // retire old demo courses

  for (const [title, slug, blurb, weeks, slugs] of PATHS) await LearningPath.findOneAndUpdate({ slug }, { title, slug, blurb, weeks, courses: slugs.map((s) => bySlug[s]) }, { upsert: true });
  for (const [code, percent] of [["LOOM10", 10], ["LIVE15", 15]]) await Promo.findOneAndUpdate({ code }, { code, percent, isActive: true }, { upsert: true });

  console.log("\nSeed complete. Logins:\n  admin@studyloom.com / Admin@123\n  instructor@studyloom.com / Instructor@123\n  student@studyloom.com / Student@123\n");
  await mongoose.connection.close();
  process.exit(0);
}
seed().catch((e) => { console.error(e); process.exit(1); });
