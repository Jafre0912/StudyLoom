// Live-class rules: session generation, seat counts, real-time attendance, progress, certificates.
const mongoose = require("mongoose");
const Batch = require("../models/Batch");
const Session = require("../models/Session");
const Attendance = require("../models/Attendance");
const Enrollment = require("../models/Enrollment");
const Certificate = require("../models/Certificate");
const Course = require("../models/Course");

const NEPAL_OFFSET_MIN = 345; // UTC+05:45
const DAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const LIVE_WINDOW_MS = 90 * 1000; // heartbeat older than this = no longer "in class"
const MAX_GAP_S = 45; // never credit more than this between two heartbeats

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const to12h = (t) => { const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; };
const batchLabel = (b) => (b.key === "morning" ? "Morning Batch" : "Evening Batch");
const batchTime = (b) => `${to12h(b.startTime)} – ${to12h(b.endTime)}`;

// Wall-clock Nepal date/time -> UTC Date
function nepalDate(y, mo, d, hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(y, mo, d, h, m) - NEPAL_OFFSET_MIN * 60000);
}

// Builds every concrete class for a batch: weeks x classesPerWeek, on the batch weekdays.
async function generateSessions(batch, course) {
  if (await Session.exists({ batchId: batch._id })) return 0;
  const total = course.weeks * course.classesPerWeek;
  const days = (batch.days || []).map((d) => DAY_INDEX[d]);
  if (!days.length) return 0;
  const [bh, bm] = batch.startTime.split(":").map(Number);
  const [eh, em] = batch.endTime.split(":").map(Number);
  const durationMin = eh * 60 + em - (bh * 60 + bm);
  const mods = course.modules?.length ? course.modules : [{ title: "Live class" }];
  const docs = [];
  const cursor = new Date(batch.startDate);
  let guard = 0;
  while (docs.length < total && guard++ < 800) {
    const local = new Date(cursor.getTime() + NEPAL_OFFSET_MIN * 60000);
    if (days.includes(local.getUTCDay())) {
      const n = docs.length;
      const mod = mods[Math.min(mods.length - 1, Math.floor((n / total) * mods.length))];
      docs.push({
        courseId: course._id, batchId: batch._id, instructorId: course.instructorId,
        title: `${mod.title} · Class ${n + 1}`, moduleTitle: `Module ${mods.indexOf(mod) + 1} · ${mod.title}`,
        startsAt: nepalDate(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), batch.startTime),
        durationMin, status: "scheduled",
      });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  await Session.insertMany(docs);
  return docs.length;
}

async function seatInfo(batch) {
  const taken = await Enrollment.countDocuments({ batchId: batch._id, status: { $in: ["active", "completed"] } });
  return { taken, left: Math.max(batch.capacity - taken, 0) };
}

function attendanceStatus(seconds, durationMin) {
  const pct = seconds / (durationMin * 60);
  return pct >= 0.75 ? "present" : pct >= 0.25 ? "partial" : "absent";
}

// Add elapsed time since the last heartbeat (capped) to the attendance record.
function credit(att, now = new Date()) {
  if (att.lastSeenAt) {
    const gap = Math.max(0, (now - att.lastSeenAt) / 1000);
    att.seconds += Math.min(gap, MAX_GAP_S);
  }
  att.lastSeenAt = now;
}

async function liveCount(sessionId) {
  return Attendance.countDocuments({ sessionId, leftAt: null, lastSeenAt: { $gte: new Date(Date.now() - LIVE_WINDOW_MS) } });
}

// Same head-count for many sessions in one round trip, so list endpoints don't fan out (N+1).
async function liveCounts(sessionIds) {
  const ids = [...new Set(sessionIds.map(String))].map(oid);
  if (!ids.length) return new Map();
  const rows = await Attendance.aggregate([
    { $match: { sessionId: { $in: ids }, leftAt: null, lastSeenAt: { $gte: new Date(Date.now() - LIVE_WINDOW_MS) } } },
    { $group: { _id: "$sessionId", n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.n]));
}

// progress / attendance numbers for one enrollment (all computed from real records)
async function enrollmentStats(enrollment) {
  if (!enrollment.batchId) return { progress: 0, attendance: 100, classesDone: 0, totalClasses: 0 };
  const sessions = await Session.find({ batchId: enrollment.batchId }).select("status durationMin");
  const done = sessions.filter((s) => s.status === "completed");
  const recs = await Attendance.find({ userId: enrollment.userId, sessionId: { $in: done.map((s) => s._id) } });
  const bySession = new Map(recs.map((r) => [String(r.sessionId), r]));
  let attended = 0, total = 0, classesDone = 0;
  for (const s of done) {
    const secs = bySession.get(String(s._id))?.seconds || 0;
    total += s.durationMin * 60;
    attended += Math.min(secs, s.durationMin * 60);
    if (attendanceStatus(secs, s.durationMin) !== "absent") classesDone += 1;
  }
  return {
    progress: sessions.length ? Math.round((done.length / sessions.length) * 100) : 0,
    attendance: total ? Math.round((attended / total) * 100) : 100,
    classesDone, totalClasses: sessions.length,
  };
}

// Called when a session ends: if that was the batch last class, certify everyone with 80%+.
async function issueCertificatesForBatch(batchId) {
  const pending = await Session.countDocuments({ batchId, status: { $ne: "completed" } });
  if (pending > 0) return 0;
  const enrollments = await Enrollment.find({ batchId });
  let issued = 0;
  for (const en of enrollments) {
    const stats = await enrollmentStats(en);
    await Enrollment.updateOne({ _id: en._id }, { status: "completed" });
    if (stats.attendance < 80 || (await Certificate.exists({ userId: en.userId, courseId: en.courseId }))) continue;
    const course = await Course.findById(en.courseId);
    const _id = new mongoose.Types.ObjectId();
    await Certificate.create({
      _id, certId: `SL-${new Date().getFullYear()}-${String(_id).slice(-8).toUpperCase()}`,
      userId: en.userId, courseId: en.courseId, attendance: stats.attendance,
      hours: Math.round((course.weeks * course.classesPerWeek * course.minutesPerClass) / 60),
      grade: stats.attendance >= 95 ? "Distinction" : stats.attendance >= 88 ? "Merit" : "Pass",
    });
    issued += 1;
  }
  return issued;
}

// Class days by classes-per-week (Nepal week: Sun-Fri).
const WEEKDAYS = { 1: ["Sun"], 2: ["Sun", "Wed"], 3: ["Sun", "Tue", "Thu"], 4: ["Sun", "Mon", "Wed", "Thu"], 5: ["Sun", "Mon", "Tue", "Wed", "Thu"], 6: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri"] };
const SLOTS = { morning: ["07:00", 7 * 60], evening: ["19:00", 19 * 60] };
const hhmm = (mins) => `${String(Math.floor(mins / 60) % 24).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

// Makes sure a published course has its Morning + Evening batches and their concrete sessions.
async function ensureBatches(course) {
  for (const key of ["morning", "evening"]) {
    const [start, startMin] = SLOTS[key];
    const batch = await Batch.findOneAndUpdate(
      { courseId: course._id, key },
      { $setOnInsert: { startTime: start, endTime: hhmm(startMin + (course.minutesPerClass || 90)), days: WEEKDAYS[course.classesPerWeek] || WEEKDAYS[4], startDate: course.startDate, capacity: 30, isOpen: true } },
      { upsert: true, new: true }
    );
    await generateSessions(batch, course);
  }
}

async function batchesForCourse(courseId) {
  const batches = await Batch.find({ courseId }).sort({ key: 1 });
  return Promise.all(batches.map(async (b) => ({ _id: b._id, id: b.key, key: b.key, label: batchLabel(b), time: batchTime(b), days: b.days, startDate: b.startDate, capacity: b.capacity, isOpen: b.isOpen, ...(await seatInfo(b)) })));
}


// After a batch's time changes, move its upcoming classes to the new time.
async function rescheduleSessions(batch) {
  const [bh, bm] = batch.startTime.split(":").map(Number);
  const [eh, em] = batch.endTime.split(":").map(Number);
  const durationMin = eh * 60 + em - (bh * 60 + bm);
  const sessions = await Session.find({ batchId: batch._id, status: "scheduled", startsAt: { $gt: new Date() } });
  if (!sessions.length) return 0;
  await Session.bulkWrite(sessions.map((s) => {
    const local = new Date(s.startsAt.getTime() + NEPAL_OFFSET_MIN * 60000);
    return {
      updateOne: {
        filter: { _id: s._id },
        update: { startsAt: nepalDate(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), batch.startTime), durationMin },
      },
    };
  }));
  return sessions.length;
}
module.exports = { ensureBatches, batchesForCourse, generateSessions, seatInfo, batchLabel, batchTime, attendanceStatus, credit, liveCount, liveCounts, enrollmentStats, issueCertificatesForBatch, oid, rescheduleSessions };
