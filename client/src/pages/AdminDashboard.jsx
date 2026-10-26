import { useState } from "react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Users, GraduationCap, BookOpen, Wallet, Award, Plus, LayoutDashboard } from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout.jsx";
import { useAdmin, useCategories } from "../hooks/queries.js";
import * as api from "../services/api.js";
import { PageHeader, StatCard, Tabs, Badge, Button, Skeleton, ErrorState, EmptyState, Modal, Avatar } from "../components/ui/index.jsx";
import { money, fmtDate } from "../utils/format.js";

export const AdminLayout = () => <DashboardLayout subtitle="Admin" items={[["/admin", "Management", LayoutDashboard, true]]} />;

const Table = ({ heads, children }) => <div className="card overflow-x-auto">
  <table className="w-full min-w-[640px] text-left text-sm">
    <thead className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
      <tr>{heads.map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
      </thead>
  <tbody className="divide-y divide-slate-100">{children}</tbody>
  </table>
  </div>;
const Panel = ({ q, empty, children }) => q.isLoading ? <Skeleton className="h-48" /> : q.error ? <ErrorState error={q.error} onRetry={q.refetch} /> : !q.data?.length && empty ? <EmptyState title={empty} /> : children(q.data);

function CourseForm({ course, onClose, onSaved }) {
  const cats = useCategories().data || [];
  const instructors = useAdmin("instructors", api.fetchInstructors);
  const [f, setF] = useState({ title: course?.title || "", description: course?.description || "", categoryId: course?.category ? cats.find((c) => c.slug === course.category)?._id || "" : "", instructorId: course?.instructor?._id || "", level: course?.level || "beginner", price: course?.price ?? "", oldPrice: course?.oldPrice ?? "", weeks: course?.weeks || 8, classesPerWeek: course?.classesPerWeek || 4, thumbnailUrl: course?.thumbnailUrl || "", startDate: course?.startDate ? course.startDate.slice(0, 10) : "", isPublished: course?.isPublished ?? true });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const body = { ...f, price: Number(f.price) || 0, oldPrice: Number(f.oldPrice) || Number(f.price) || 0, weeks: Number(f.weeks), classesPerWeek: Number(f.classesPerWeek) };
      if (!body.categoryId) delete body.categoryId; if (!body.instructorId) delete body.instructorId; if (!body.startDate) delete body.startDate;
      await api.saveCourse(body, course?._id); toast.success(course ? "Course updated" : "Course created with batches and sessions"); onSaved();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };
  const I = (k, label, type = "text", extra = {}) => <div><label className="label">{label}</label><input className="input" type={type} value={f[k]} onChange={set(k)} {...extra} /></div>;
  return (
    <Modal open onClose={onClose} title={course ? "Edit course" : "New live course"} wide>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">{I("title", "Title", "text", { required: true })}</div>
        <div className="sm:col-span-2"><label className="label">Description</label><textarea className="input min-h-[80px]" value={f.description} onChange={set("description")} required /></div>
        <div><label className="label">Category</label><select className="input" value={f.categoryId} onChange={set("categoryId")}><option value="">Select…</option>{cats.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select></div>
        <div><label className="label">Instructor</label><select className="input" value={f.instructorId} onChange={set("instructorId")}><option value="">Me</option>{(instructors.data || []).map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}</select></div>
        <div><label className="label">Level</label><select className="input" value={f.level} onChange={set("level")}>{["beginner", "intermediate", "advanced"].map((l) => <option key={l}>{l}</option>)}</select></div>
        {I("startDate", "Start date", "date")}
        {I("price", "Price (NPR)", "number", { min: 0 })}{I("oldPrice", "List price (NPR)", "number", { min: 0 })}
        {I("weeks", "Weeks", "number", { min: 1 })}{I("classesPerWeek", "Classes / week (1–6)", "number", { min: 1, max: 6 })}
        <div className="sm:col-span-2">{I("thumbnailUrl", "Thumbnail URL")}</div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={f.isPublished} onChange={set("isPublished")} className="accent-brand-600" />Published (creates Morning &amp; Evening batches and every live session)</label>
        <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={busy}>Save course</Button></div>
      </form>
    </Modal>
  );
}

export default function AdminDashboard() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("users");
  const [editing, setEditing] = useState(null);
  const [promoForm, setPromoForm] = useState({ code: "", percent: "" });
  const stats = useAdmin("stats", api.fetchAdminStats);
  const users = useAdmin("users", api.fetchAdminUsers);
  const courses = useAdmin("courses", api.fetchAdminCourses);
  const batches = useAdmin("batches", api.fetchAdminBatches);
  const promos = useAdmin("promos", api.fetchPromos);
  const settings = useAdmin("settings", api.fetchSettings);
  const refresh = (...k) => k.forEach((x) => qc.invalidateQueries({ queryKey: ["admin", x] }));
  const act = async (fn, ok, ...keys) => { try { await fn(); toast.success(ok); refresh(...keys); } catch (e) { toast.error(e.message); } };

  if (stats.isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><div className="grid gap-4 sm:grid-cols-5">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}</div><Skeleton className="h-72" /></div>;
  if (stats.error) return <ErrorState error={stats.error} onRetry={stats.refetch} />;
  const st = stats.data; const max = Math.max(...st.revenueByMonth.map((r) => r.total), 1);

  return (
    <>
      <PageHeader title="Admin Dashboard" subtitle="Platform-wide overview and management." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={Users} label="Total students" value={st.students.toLocaleString()} /><StatCard icon={GraduationCap} label="Instructors" value={st.instructors} tone="amber" /><StatCard icon={BookOpen} label="Active courses" value={st.courses} tone="green" />
        <StatCard icon={Wallet} label="Revenue" value={money(st.revenue)} tone="rose" /><StatCard icon={Award} label="Certificates issued" value={st.certificates.toLocaleString()} />
      </div>
      <div className="card mt-6 p-6"><h2 className="font-semibold">Revenue · last 6 months</h2>
        <div className="mt-5 flex h-40 items-end gap-3">{st.revenueByMonth.map((m) => <div key={m.label} className="flex flex-1 flex-col items-center gap-2"><span className="text-[11px] font-medium text-slate-500">{m.total ? money(m.total) : "–"}</span><div className="w-full rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-400 transition-all hover:opacity-80" style={{ height: `${Math.max((m.total / max) * 100, 2)}%` }} /><span className="text-xs text-slate-500">{m.label}</span></div>)}</div></div>

      <div className="mb-4 mt-8 flex flex-wrap items-center justify-between gap-3"><Tabs value={tab} onChange={setTab} tabs={[{ id: "users", label: "Users" }, { id: "courses", label: "Courses" }, { id: "batches", label: "Batches" }, { id: "promos", label: "Promo codes" }, { id: "settings", label: "Settings" }]} />{tab === "courses" && <Button size="sm" onClick={() => setEditing({})}><Plus size={15} />New course</Button>}</div>

      {tab === "users" && <Panel q={users} empty="No users yet">{(d) => <Table heads={["User", "Role", "Status", "Joined", ""]}>{d.map((u) => <tr key={u._id} className="hover:bg-slate-50"><td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={u.name} size={30} /><div><p className="font-medium">{u.name}</p><p className="text-xs text-slate-500">{u.email}</p></div></div></td><td className="px-4 py-3 capitalize">{u.role}</td><td className="px-4 py-3"><Badge tone={u.isActive ? "green" : "red"}>{u.isActive ? "Active" : "Suspended"}</Badge></td><td className="px-4 py-3 text-slate-500">{fmtDate(u.createdAt)}</td><td className="px-4 py-3 text-right">{u.role !== "admin" && <Button variant="ghost" size="sm" onClick={() => act(() => api.updateAdminUser(u._id, { isActive: !u.isActive }), u.isActive ? "User suspended" : "User activated", "users")}>{u.isActive ? "Suspend" : "Activate"}</Button>}</td></tr>)}</Table>}</Panel>}

      {tab === "courses" && <Panel q={courses} empty="No courses yet">{(d) => <Table heads={["Course", "Category", "Instructor", "Price", "Enrolled", "Status", ""]}>{d.map((c) => <tr key={c.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-medium">{c.title}</td><td className="px-4 py-3">{c.categoryName || "—"}</td><td className="px-4 py-3">{c.instructor?.name}</td><td className="px-4 py-3">{money(c.price)}</td><td className="px-4 py-3">{c.learners}</td><td className="px-4 py-3"><Badge tone={c.isPublished ? "green" : "gray"}>{c.isPublished ? "Published" : "Draft"}</Badge></td><td className="px-4 py-3 text-right"><Button variant="ghost" size="sm" onClick={() => setEditing(c)}>Edit</Button></td></tr>)}</Table>}</Panel>}

      {tab === "batches" && <Panel q={batches} empty="No batches yet. Publish a course to create them.">{(d) => <Table heads={["Course", "Batch", "Time", "Starts", "Seats", ""]}>{d.map((b) => <tr key={b._id} className="hover:bg-slate-50"><td className="px-4 py-3 font-medium">{b.course?.title}</td><td className="px-4 py-3">{b.label}</td><td className="px-4 py-3">{b.time}</td><td className="px-4 py-3">{fmtDate(b.startDate)}</td><td className="px-4 py-3">{b.taken} / {b.capacity}</td><td className="px-4 py-3 text-right"><Button variant="ghost" size="sm" onClick={() => act(() => api.updateBatch(b._id, { isOpen: !b.isOpen }), b.isOpen ? "Batch closed" : "Batch opened", "batches")}>{b.isOpen ? "Close" : "Open"}</Button><Button variant="ghost" size="sm" onClick={() => { const v = Number(window.prompt("New capacity", b.capacity)); if (v > 0) act(() => api.updateBatch(b._id, { capacity: v }), "Capacity updated", "batches"); }}>Capacity</Button></td></tr>)}</Table>}</Panel>}

      {tab === "promos" && <div className="space-y-4">
        <form className="card flex flex-wrap items-end gap-3 p-4" onSubmit={(e) => { e.preventDefault(); act(async () => { await api.createPromo({ code: promoForm.code, percent: Number(promoForm.percent) }); setPromoForm({ code: "", percent: "" }); }, "Promo created", "promos"); }}>
          <div><label className="label">Code</label><input className="input" value={promoForm.code} onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value })} required /></div>
          <div><label className="label">Percent off</label><input className="input w-28" type="number" min="1" max="100" value={promoForm.percent} onChange={(e) => setPromoForm({ ...promoForm, percent: e.target.value })} required /></div>
          <Button type="submit">Add promo</Button></form>
        <Panel q={promos} empty="No promo codes yet">{(d) => <Table heads={["Code", "Discount", "Used", "Status", ""]}>{d.map((p) => <tr key={p._id}><td className="px-4 py-3 font-mono font-semibold">{p.code}</td><td className="px-4 py-3">{p.percent}%</td><td className="px-4 py-3">{p.uses}{p.maxUses ? ` / ${p.maxUses}` : ""}</td><td className="px-4 py-3"><Badge tone={p.isActive ? "green" : "gray"}>{p.isActive ? "Active" : "Disabled"}</Badge></td><td className="px-4 py-3 text-right"><Button variant="ghost" size="sm" onClick={() => act(() => api.togglePromo(p._id), "Promo updated", "promos")}>{p.isActive ? "Disable" : "Enable"}</Button></td></tr>)}</Table>}</Panel></div>}

      {tab === "settings" && (settings.isLoading ? <Skeleton className="h-40" /> : settings.error ? <ErrorState error={settings.error} onRetry={settings.refetch} /> : <div className="card max-w-xl divide-y divide-slate-100">{[["registrationsOpen", "Open registrations", "Allow new students to sign up"], ["autoCertificates", "Auto-issue certificates", "Issue at 80%+ attendance when a batch ends"]].map(([k, t, d]) => <label key={k} className="flex cursor-pointer items-center justify-between gap-4 p-5"><div><p className="font-medium">{t}</p><p className="text-sm text-slate-500">{d}</p></div><input type="checkbox" checked={!!settings.data[k]} onChange={(e) => act(() => api.saveSettings({ [k]: e.target.checked }), "Setting saved", "settings")} className="h-5 w-5 accent-brand-600" /></label>)}</div>)}

      {editing && <CourseForm course={editing._id ? editing : null} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh("courses", "batches", "stats"); qc.invalidateQueries({ queryKey: ["courses"] }); }} />}
    </>
  );
}
