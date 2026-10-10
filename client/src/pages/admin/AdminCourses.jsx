import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { useAdmin, useCategories } from "../../hooks/queries.js";
import * as api from "../../services/api.js";
import { PageHeader, Badge, Button, Modal } from "../../components/ui/index.jsx";
import { money } from "../../utils/format.js";
import { Table, Panel } from "./shared.jsx";

function CourseForm({ course, onClose, onSaved }) {
  const cats = useCategories().data || [];
  const instructors = useAdmin("instructors", api.fetchInstructors);
  const [f, setF] = useState({
    title: course?.title || "",
    description: course?.description || "",
    categoryId: course?.category ? cats.find((c) => c.slug === course.category)?._id || "" : "",
    instructorId: course?.instructor?._id || "",
    level: course?.level || "beginner",
    price: course?.price ?? "",
    oldPrice: course?.oldPrice ?? "",
    weeks: course?.weeks || 8,
    classesPerWeek: course?.classesPerWeek || 4,
    thumbnailUrl: course?.thumbnailUrl || "",
    startDate: course?.startDate ? course.startDate.slice(0, 10) : "",
    isPublished: course?.isPublished ?? true,
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = {
        ...f,
        price: Number(f.price) || 0,
        oldPrice: Number(f.oldPrice) || Number(f.price) || 0,
        weeks: Number(f.weeks),
        classesPerWeek: Number(f.classesPerWeek),
      };
      if (!body.categoryId) delete body.categoryId;
      if (!body.instructorId) delete body.instructorId;
      if (!body.startDate) delete body.startDate;
      await api.saveCourse(body, course?._id);
      toast.success(course ? "Course updated" : "Course created with batches and sessions");
      onSaved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const I = (k, label, type = "text", extra = {}) => (
    <div><label className="label">{label}</label><input className="input" type={type} value={f[k]} onChange={set(k)} {...extra} /></div>
  );

  return (
    <Modal open onClose={onClose} title={course ? "Edit course" : "New live course"} wide>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">{I("title", "Title", "text", { required: true })}</div>
        <div className="sm:col-span-2"><label className="label">Description</label><textarea className="input min-h-[80px]" value={f.description} onChange={set("description")} required /></div>
        <div>
          <label className="label">Category</label>
          <select className="input" value={f.categoryId} onChange={set("categoryId")}>
            <option value="">Select…</option>
            {cats.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Instructor</label>
          <select className="input" value={f.instructorId} onChange={set("instructorId")}>
            <option value="">Me</option>
            {(instructors.data || []).map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Level</label>
          <select className="input" value={f.level} onChange={set("level")}>
            {["beginner", "intermediate", "advanced"].map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
        {I("startDate", "Start date", "date")}
        {I("price", "Price (NPR)", "number", { min: 0 })}
        {I("oldPrice", "List price (NPR)", "number", { min: 0 })}
        {I("weeks", "Weeks", "number", { min: 1 })}
        {I("classesPerWeek", "Classes / week (1–6)", "number", { min: 1, max: 6 })}
        <div className="sm:col-span-2">{I("thumbnailUrl", "Thumbnail URL")}</div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={f.isPublished} onChange={set("isPublished")} className="accent-brand-600" />
          Published (creates Morning &amp; Evening batches and every live session)
        </label>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={busy}>Save course</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminCourses() {
  const qc = useQueryClient();
  const courses = useAdmin("courses", api.fetchAdminCourses);
  const [editing, setEditing] = useState(null);

  const saved = () => {
    setEditing(null);
    ["courses", "batches", "stats"].forEach((k) => qc.invalidateQueries({ queryKey: ["admin", k] }));
    qc.invalidateQueries({ queryKey: ["courses"] });
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <PageHeader title="Courses" subtitle="Create, edit and publish live courses." />
        <Button size="sm" onClick={() => setEditing({})}><Plus size={15} />New course</Button>
      </div>
      <Panel q={courses} empty="No courses yet">
        {(d) => (
          <Table heads={["Course", "Category", "Instructor", "Price", "Enrolled", "Status", ""]}>
            {d.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{c.title}</td>
                <td className="px-4 py-3">{c.categoryName || "—"}</td>
                <td className="px-4 py-3">{c.instructor?.name}</td>
                <td className="px-4 py-3">{money(c.price)}</td>
                <td className="px-4 py-3">{c.learners}</td>
                <td className="px-4 py-3"><Badge tone={c.isPublished ? "green" : "gray"}>{c.isPublished ? "Published" : "Draft"}</Badge></td>
                <td className="px-4 py-3 text-right"><Button variant="ghost" size="sm" onClick={() => setEditing(c)}>Edit</Button></td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
      {editing && <CourseForm course={editing._id ? editing : null} onClose={() => setEditing(null)} onSaved={saved} />}
    </>
  );
}