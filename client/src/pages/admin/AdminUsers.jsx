import { useState } from "react";
import { useAdmin } from "../../hooks/queries.js";
import * as api from "../../services/api.js";
import { PageHeader, Badge, Button, Avatar, Modal } from "../../components/ui/index.jsx";
import { fmtDate } from "../../utils/format.js";
import { Table, Panel, useAct } from "./shared.jsx";

export default function AdminUsers() {
  const users = useAdmin("users", api.fetchAdminUsers);
  const act = useAct();
  const [role, setRole] = useState("all");
  const [target, setTarget] = useState(null); // user being deleted
  const [reassign, setReassign] = useState("");
  const [busy, setBusy] = useState(false);

  const list = (users.data || []).filter((u) => role === "all" || u.role === role);
  const otherInstructors = (users.data || []).filter((u) => u.role === "instructor" && u.isActive && u._id !== target?._id);

  const askDelete = (u) => {
    if (u.role === "instructor") { setReassign(""); setTarget(u); }
    else if (window.confirm(`Delete ${u.name}? This cannot be undone.`)) act(() => api.deleteAdminUser(u._id), "User deleted", "users", "stats");
  };
  const confirmDelete = async () => {
    setBusy(true);
    await act(() => api.deleteAdminUser(target._id, { reassignTo: reassign || undefined }), "Instructor deleted", "users", "courses", "batches", "stats");
    setBusy(false);
    setTarget(null);
  };

  const [addOpen, setAddOpen] = useState(false);
const [form, setForm] = useState({ name: "", email: "", password: "", title: "" });
const createInst = async () => {
  setBusy(true);
  await act(() => api.createInstructor(form), "Instructor created", "users", "stats");
  setBusy(false);
  setAddOpen(false);
  setForm({ name: "", email: "", password: "", title: "" });
};

  return (
    <>
      <PageHeader title="Users" subtitle="Every account on the platform." />
      <div className="mb-4"><Button onClick={() => setAddOpen(true)}>+ Add instructor</Button></div>
      <div className="mb-4 flex flex-wrap gap-2">
        {["all", "student", "instructor", "admin"].map((r) => (
          <button key={r} onClick={() => setRole(r)} className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition ${role === r ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}>{r === "all" ? "All" : `${r}s`}</button>
        ))}
      </div>

      <Panel q={users} empty="No users yet">
        {() => (
          <Table heads={["User", "Role", "Status", "Joined", ""]}>
            {list.map((u) => (
              <tr key={u._id} className="hover:bg-slate-50">
                <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={u.name} size={30} /><div><p className="font-medium">{u.name}</p><p className="text-xs text-slate-500">{u.email}</p></div></div></td>
                <td className="px-4 py-3 capitalize">{u.role}</td>
                <td className="px-4 py-3"><Badge tone={u.isActive ? "green" : "red"}>{u.isActive ? "Active" : "Suspended"}</Badge></td>
                <td className="px-4 py-3 text-slate-500">{fmtDate(u.createdAt)}</td>
                <td className="px-4 py-3">
                  {u.role !== "admin" && (
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => act(() => api.updateAdminUser(u._id, { isActive: !u.isActive }), u.isActive ? "User suspended" : "User activated", "users")}>{u.isActive ? "Suspend" : "Activate"}</Button>
                      <Button variant="ghost" size="sm" className="!text-red-600" onClick={() => askDelete(u)}>Delete</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>

      <Modal open={!!target} onClose={() => setTarget(null)} title={`Delete ${target?.name}?`}>
        <p className="text-sm text-slate-600">If this instructor teaches any courses or classes, choose who takes them over. All their courses, batches' classes and future sessions move to that instructor.</p>
        <label className="label mt-4">Move their courses to</label>
        <select className="input" value={reassign} onChange={(e) => setReassign(e.target.value)}>
          <option value="">No courses (delete only)</option>
          {otherInstructors.map((i) => <option key={i._id} value={i._id}>{i.name}</option>)}
        </select>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setTarget(null)}>Cancel</Button>
          <Button variant="danger" loading={busy} onClick={confirmDelete}>Delete instructor</Button>
        </div>
      </Modal>
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add instructor">
  {["name", "email", "password", "title"].map((f) => (
    <div key={f} className="mt-3">
      <label className="label capitalize">{f === "title" ? "Title (e.g. Senior Developer)" : f}</label>
      <input className="input" type={f === "password" ? "password" : "text"} value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
    </div>
  ))}
  <div className="mt-5 flex justify-end gap-2">
    <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
    <Button loading={busy} onClick={createInst}>Create</Button>
  </div>
</Modal>
    </>
  );
}