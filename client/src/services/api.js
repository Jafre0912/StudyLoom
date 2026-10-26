// Every call goes to the Express/MongoDB backend. Responses are normalised here so pages stay simple.
import http, { tokenStore, refreshStore } from "./http.js";

const id = (o) => (o ? { ...o, id: o._id ?? o.id } : o);

// ---- shape helpers ----
export const normCourse = (c) => ({
  ...c, id: c._id, category: c.category?.slug, categoryName: c.category?.name, thumbnail: c.thumbnailUrl,
  instructor: c.instructor ? id(c.instructor) : { name: "StudyLoom" }, learners: c.learners ?? 0, schedules: c.schedules ?? [],
});
const normSession = (s) => ({ ...s, id: s._id, course: s.course ? normCourse({ ...s.course, instructor: null }) : null });

// ---- auth ----
// Both tokens are kept in sessionStorage so each tab holds its own session (see http.js).
export const login = async (body) => { const r = await http.post("/auth/login", body); tokenStore.set(r.accessToken); refreshStore.set(r.refreshToken); return r.user; };
export const register = async (body) => { const r = await http.post("/auth/signup", body); tokenStore.set(r.accessToken); refreshStore.set(r.refreshToken); return r.user; };
export const logoutApi = async () => { try { await http.post("/auth/logout", { refreshToken: refreshStore.get() }); } finally { refreshStore.clear(); tokenStore.clear(); } };
export const updateProfile = (body) => http.put("/users/me", body).then((r) => r.user);

// ---- catalogue ----
export const fetchCategories = () => http.get("/categories").then((r) => r.categories);
export const listCourses = () => http.get("/courses").then((r) => r.items.map(normCourse));
export const fetchCourse = (slug) => http.get(`/courses/${slug}`).then((r) => normCourse(r.course));
export const fetchLearningPaths = () => http.get("/learning-paths").then((r) => r.items);
export const fetchPublicSessions = () => http.get("/sessions/public").then((r) => r.items.map(normSession));

// ---- checkout (real eSewa / Khalti) ----
export const fetchCheckout = (courseId) => http.get(`/billing/checkout/${courseId}`);
export const checkPromo = (body) => http.post("/billing/promo", body);
export const startPayment = (body) => http.post("/billing/pay", body); // -> { paymentId, redirect }
export const verifyPayment = (body) => http.post("/billing/verify", body);
export const enrollFree = (courseId) => http.post("/enrollments/free", { courseId });
export const selectBatch = ({ courseId, batch }) => http.post(`/enrollments/${courseId}/batch`, { batch });

// ---- student LMS ----
export const fetchEnrollments = () => http.get("/enrollments/me").then((r) => r.items.map((e) => ({ ...e, id: e._id, course: normCourse({ ...e.course, instructor: e.course.instructorId && { name: e.course.instructorId.name } }), courseId: e.course._id })));
export const fetchSessions = () => http.get("/sessions/me").then((r) => r.items.map(normSession));
export const fetchSession = (sid) => http.get(`/sessions/${sid}`).then((r) => normSession(r.session));
export const fetchAttendance = () => http.get("/sessions/attendance/me").then((r) => r.items.map((a) => ({ ...a, id: a._id })));
export const fetchCertificates = () => http.get("/certificates").then((r) => r.items.map((c) => ({ ...c, id: c._id, course: normCourse({ ...c.course, instructor: c.course.instructorId }) })));
export const fetchPayments = () => http.get("/billing/payments").then((r) => r.items.map((p) => ({ ...p, id: p._id })));
export const joinSession = (sid) => http.post(`/sessions/${sid}/join`);
export const heartbeat = (sid) => http.post(`/sessions/${sid}/heartbeat`);
export const leaveSession = (sid) => http.post(`/sessions/${sid}/leave`);

// ---- instructor ----
export const fetchInstructorOverview = () => http.get("/instructor/overview");
export const fetchRoster = (sid) => http.get(`/sessions/${sid}/roster`).then((r) => r.items);
export const startSession = (sid) => http.post(`/sessions/${sid}/start`);
export const endSession = (sid) => http.post(`/sessions/${sid}/end`);

// ---- admin ----
export const fetchAdminStats = () => http.get("/admin/stats");
export const fetchAdminUsers = () => http.get("/admin/users").then((r) => r.items);
export const updateAdminUser = (uid, body) => http.patch(`/admin/users/${uid}`, body);
export const fetchAdminCourses = () => http.get("/admin/courses").then((r) => r.items.map(normCourse));
export const saveCourse = (body, courseId) => (courseId ? http.put(`/courses/${courseId}`, body) : http.post("/courses", body));
export const fetchAdminBatches = () => http.get("/admin/batches").then((r) => r.items);
export const updateBatch = (bid, body) => http.patch(`/admin/batches/${bid}`, body);
export const fetchSettings = () => http.get("/admin/settings").then((r) => r.settings);
export const saveSettings = (body) => http.put("/admin/settings", body).then((r) => r.settings);
export const fetchPromos = () => http.get("/admin/promos").then((r) => r.items);
export const createPromo = (body) => http.post("/admin/promos", body);
export const togglePromo = (pid) => http.patch(`/admin/promos/${pid}/toggle`);
export const fetchInstructors = () => http.get("/admin/users?role=instructor").then((r) => r.items);


export const fetchPendingCash = () => http.get("/billing/admin/cash-pending").then((r) => r.items);
export const confirmCash = (paymentId) => http.post(`/billing/admin/payments/${paymentId}/confirm`);
export const rejectCash = (paymentId) => http.post(`/billing/admin/payments/${paymentId}/reject`);


export const fetchAdminCategories = () => http.get("/categories/admin/all").then((r) => r.items);
export const createCategory = (body) => http.post("/categories", body);
export const updateCategory = (cid, body) => http.patch(`/categories/${cid}`, body);
export const deleteCategory = (cid) => http.delete(`/categories/${cid}`);