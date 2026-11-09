const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const sendResponse = require("../utils/apiResponse");
const Session = require("../models/Session");
const jwt = require("jsonwebtoken");
const Attendance = require("../models/Attendance");
const Enrollment = require("../models/Enrollment");
const User = require("../models/User");
const live = require("../services/live.service");
const lk = require("../services/livekit.service");
const roomOf = (s) => `studyloom-b-${s.batchId._id}`; // ek batch ka ek hi room

const POP = [
  { path: "courseId", select: "title slug thumbnailUrl" },
  { path: "batchId", select: "key name startTime endTime" },
  { path: "instructorId", select: "name" },
];
const JITSI = () => process.env.JITSI_DOMAIN || "meet.jit.si";

const view = (s, liveStudents = 0) => ({
  _id: s._id, title: s.title, moduleTitle: s.moduleTitle, startsAt: s.startsAt, durationMin: s.durationMin,
  status: s.status, course: s.courseId, batch: s.batchId?.key, batchId: s.batchId?._id,
  batchTime: s.batchId?.startTime ? live.batchTime(s.batchId) : "",
  instructor: s.instructorId?.name,
  students: s.status === "live" ? liveStudents : 0,
});

// One aggregate for the whole page instead of a count query per live session.
async function views(sessions) {
  const counts = await live.liveCounts(sessions.filter((s) => s.status === "live").map((s) => s._id));
  return sessions.map((s) => view(s, counts.get(String(s._id)) || 0));
}

async function authorise(req, id, { hostOnly = false } = {}) {
  const s = await Session.findById(id).populate(POP);
  if (!s) throw new ApiError(404, "Session not found");
  const u = req.user;
  const isHost = u.role === "admin" || String(s.instructorId?._id) === String(u._id);
  if (isHost) return { s, isHost };
  // Instructors are never "enrolled", so the enrollment message would be misleading for them.
  if (hostOnly || u.role === "instructor") {
    throw new ApiError(403, "Only the instructor assigned to this class can do that");
  }
  const en = await Enrollment.findOne({ userId: u._id, batchId: s.batchId._id });
  if (!en) throw new ApiError(403, "You are not enrolled in this class");
  return { s, isHost };
}

// Live class ko theek se band karo: andar baithe students ka time jodo, phir completed mark karo.
async function closeSession(s, now = new Date()) {
  const open = await Attendance.find({ sessionId: s._id, leftAt: null });
  for (const a of open) { live.credit(a, now); a.leftAt = now; await a.save(); }
  s.status = "completed"; s.endedAt = now; await s.save();
}

// GET /api/sessions/me
const mySessions = asyncHandler(async (req, res) => {
  const u = req.user;
  let filter;
  if (u.role === "student") {
    const ids = (await Enrollment.find({ userId: u._id, batchId: { $ne: null } })).map((e) => e.batchId);
    filter = { batchId: { $in: ids } };
  } else filter = u.role === "admin" ? {} : { instructorId: u._id };
  const sessions = await Session.find(filter).populate(POP).sort({ startsAt: 1 }).limit(300);
  sendResponse(res, 200, "Sessions fetched", { items: await views(sessions) });
});

// GET /api/sessions/public  (marketing page: what is live / next, no login)
const publicSessions = asyncHandler(async (req, res) => {
  const sessions = await Session.find({ status: { $ne: "completed" }, startsAt: { $gte: new Date(Date.now() - 6 * 3600e3) } }).populate(POP).sort({ startsAt: 1 }).limit(12);
  sendResponse(res, 200, "Sessions fetched", { items: await views(sessions) });
});

// GET /api/sessions/:id  -> includes the conference room url once the class is live (or for the host)
const getSession = asyncHandler(async (req, res) => {
  const { s, isHost } = await authorise(req, req.params.id);
  const data = view(s, await live.liveCount(s._id));
if (s.status === "live" || isHost) data.roomUrl = `https://${JITSI()}/studyloom-b-${s.batchId._id}`;  sendResponse(res, 200, "Session fetched", { session: { ...data, isHost } });
});

const startSession = asyncHandler(async (req, res) => {
  const { s, isHost } = await authorise(req, req.params.id);
  if (!isHost) throw new ApiError(403, "Only the instructor can start this class");
  if (s.status === "completed") throw new ApiError(409, "This class has already ended");
  if (s.status !== "live") {
    // Ek batch mein ek hi live class: purani atki hui class band karo, taaki sab ek hi room mein aayein.
    const stale = await Session.find({ batchId: s.batchId._id, status: "live", _id: { $ne: s._id } });
    for (const o of stale) await closeSession(o);
    s.status = "live"; s.startedAt = new Date(); await s.save();
  }
  sendResponse(res, 200, "Class started", { session: view(s) });
});

const endSession = asyncHandler(async (req, res) => {
  const { s, isHost } = await authorise(req, req.params.id);
  if (!isHost) throw new ApiError(403, "Only the instructor can end this class");
  await closeSession(s);
  const issued = await live.issueCertificatesForBatch(s.batchId._id);
  sendResponse(res, 200, "Class ended", { certificatesIssued: issued });
});

// Student attendance: join -> heartbeat (every ~30s) -> leave
const studentOnly = (req) => { if (req.user.role !== "student") throw new ApiError(400, "Attendance is tracked for students only"); };
const join = asyncHandler(async (req, res) => {
  studentOnly(req);
  const { s } = await authorise(req, req.params.id);
  if (s.status !== "live") throw new ApiError(409, "This class is not live yet");
  const now = new Date();
  const att = (await Attendance.findOne({ sessionId: s._id, userId: req.user._id })) ||
    new Attendance({ sessionId: s._id, userId: req.user._id, courseId: s.courseId._id, joinedAt: now });
  att.leftAt = null; att.lastSeenAt = now; await att.save();
  sendResponse(res, 200, "Joined", { minutes: Math.floor(att.seconds / 60), seconds: att.seconds });
});
const heartbeat = asyncHandler(async (req, res) => {
  studentOnly(req);
  const { s } = await authorise(req, req.params.id);
  const att = await Attendance.findOne({ sessionId: s._id, userId: req.user._id });
  if (!att) throw new ApiError(409, "Join the class first");
  if (s.status === "live") { live.credit(att); await att.save(); }
  sendResponse(res, 200, "ok", { seconds: att.seconds, status: live.attendanceStatus(att.seconds, s.durationMin), classLive: s.status === "live" });
});
const leave = asyncHandler(async (req, res) => {
  studentOnly(req);
  const { s } = await authorise(req, req.params.id);
  const att = await Attendance.findOne({ sessionId: s._id, userId: req.user._id });
  if (!att) return sendResponse(res, 200, "Not joined", { status: "absent" });
  if (s.status === "live" && !att.leftAt) live.credit(att);
  att.leftAt = att.leftAt || new Date(); await att.save();
  sendResponse(res, 200, "Left", { status: live.attendanceStatus(att.seconds, s.durationMin), minutes: Math.floor(att.seconds / 60) });
});

// GET /api/sessions/:id/roster  (host) -> every enrolled student with live attendance minutes
const roster = asyncHandler(async (req, res) => {
  const { s, isHost } = await authorise(req, req.params.id, { hostOnly: true });
  if (!isHost) throw new ApiError(403, "Instructors only");
  const enrollments = await Enrollment.find({ batchId: s.batchId._id }).populate("userId", "name email");
  const recs = await Attendance.find({ sessionId: s._id });
  const map = new Map(recs.map((r) => [String(r.userId), r]));
  const items = await Promise.all(enrollments.filter((e) => e.userId).map(async (e) => {
    const a = map.get(String(e.userId._id));
    const seconds = a?.seconds || 0;
    const stats = await live.enrollmentStats(e);
    return {
      id: e.userId._id, name: e.userId.name, email: e.userId.email, batch: s.batchId.key,
      minutes: Math.floor(seconds / 60), status: live.attendanceStatus(seconds, s.durationMin),
      online: !!a && !a.leftAt && a.lastSeenAt > new Date(Date.now() - 90e3), attendance: stats.attendance,
    };
  }));
  sendResponse(res, 200, "Roster fetched", { items });
});

// GET /api/sessions/attendance/me - full join/leave log (absent = completed class with no record)
const myAttendance = asyncHandler(async (req, res) => {
  const ens = await Enrollment.find({ userId: req.user._id, batchId: { $ne: null } });
  const sessions = await Session.find({ batchId: { $in: ens.map((e) => e.batchId) }, status: { $in: ["completed", "live"] } })
    .populate("courseId", "title slug thumbnailUrl").sort({ startsAt: -1 }).limit(200);
  const recs = await Attendance.find({ userId: req.user._id, sessionId: { $in: sessions.map((s) => s._id) } });
  const map = new Map(recs.map((r) => [String(r.sessionId), r]));
  const items = sessions.map((s) => {
    const a = map.get(String(s._id));
    const secs = a?.seconds || 0;
    return { _id: s._id, date: s.startsAt, course: s.courseId, title: s.title, joinedAt: a?.joinedAt || null, leftAt: a?.leftAt || null, minutes: Math.floor(secs / 60), durationMin: s.durationMin, status: live.attendanceStatus(secs, s.durationMin) };
  });
  sendResponse(res, 200, "Attendance fetched", { items });
});

// POST /api/sessions/:id/jaas-token  -> JaaS room ka login token
const jaasToken = asyncHandler(async (req, res) => {
  const { s, isHost } = await authorise(req, req.params.id);
  if (s.status !== "live" && !isHost) throw new ApiError(409, "This class is not live yet");
  const appId = process.env.JAAS_APP_ID;
  const kid = process.env.JAAS_KID;
  const key = String(process.env.JAAS_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!appId || !kid || !key) throw new ApiError(500, "JaaS is not configured");
  const now = Math.floor(Date.now() / 1000);
  const token = jwt.sign(
    {
      aud: "jitsi", iss: "chat", sub: appId, room: "*",
      iat: now, nbf: now - 10, exp: now + 4 * 3600,
      context: {
        user: { id: String(req.user._id), name: req.user.name, email: req.user.email, moderator: isHost ? "true" : "false" },
        features: { livestreaming: "false", recording: "false", transcription: "false", "outbound-call": "false" },
      },
    },
    key,
    { algorithm: "RS256", header: { alg: "RS256", kid, typ: "JWT" } }
  );
  sendResponse(res, 200, "Token issued", { appId, token, room: `studyloom-b-${s.batchId._id}` });
});

// POST /api/sessions/:id/token  -> LiveKit room ka token (host ya enrolled student ke liye)
const roomToken = asyncHandler(async (req, res) => {
  const { s, isHost } = await authorise(req, req.params.id);
  if (s.status !== "live" && !isHost) throw new ApiError(409, "This class is not live yet");
  const token = await lk.makeToken({ room: roomOf(s), user: req.user, isHost });
  sendResponse(res, 200, "Token issued", { token, url: process.env.LIVEKIT_URL, identity: String(req.user._id) });
});

// POST /api/sessions/:id/share  { identity, allow }  (sirf teacher)
const shareAccess = asyncHandler(async (req, res) => {
  const { s, isHost } = await authorise(req, req.params.id, { hostOnly: true });
  if (!isHost) throw new ApiError(403, "Only the instructor can do that");
  await lk.setShareAllowed(roomOf(s), String(req.body.identity), !!req.body.allow);
  sendResponse(res, 200, "Updated");
});

module.exports = { mySessions, publicSessions, getSession, startSession, endSession, join, heartbeat, leave, roster, myAttendance, roomToken, shareAccess, jaasToken };
