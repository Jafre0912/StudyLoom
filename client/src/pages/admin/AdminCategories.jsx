import { useState } from "react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAdmin } from "../../hooks/queries.js";
import * as api from "../../services/api.js";
import { PageHeader, Badge, Button } from "../../components/ui/index.jsx";
import { Table, Panel } from "./shared.jsx";

export default function AdminCategories() {
  const qc = useQueryClient();
  const cats = useAdmin("categories", api.fetchAdminCategories);
  const [name, setName] = useState("");

  // run a write, then refresh both the admin list and the public site's category list
  const run = async (fn, ok) => {
    try {
      await fn();
      toast.success(ok);
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
    } catch (e) { toast.error(e.message); }
  };

  return (
    <>
      <PageHeader title="Categories" subtitle="Hide, rename or delete the categories shown on the website." />
      <div className="space-y-4">
        <form className="card flex flex-wrap items-end gap-3 p-4" onSubmit={(e) => { e.preventDefault(); run(async () => { await api.createCategory({ name }); setName(""); }, "Category added"); }}>
          <div><label className="label">New category</label><input className="input w-64" value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <Button type="submit">Add</Button>
        </form>

        <Panel q={cats} empty="No categories yet">
          {(d) => (
            <Table heads={["Name", "Slug", "Courses", "Status", ""]}>
              {d.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{c.slug}</td>
                  <td className="px-4 py-3">{c.publishedCourses} published{c.totalCourses > c.publishedCourses ? ` · ${c.totalCourses - c.publishedCourses} draft` : ""}</td>
                  <td className="px-4 py-3"><Badge tone={c.isHidden ? "gray" : "green"}>{c.isHidden ? "Hidden" : "Visible"}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => run(() => api.updateCategory(c._id, { isHidden: !c.isHidden }), c.isHidden ? "Category is now visible" : "Category hidden")}>{c.isHidden ? "Show" : "Hide"}</Button>
                      <Button variant="ghost" size="sm" onClick={() => { const n = window.prompt("New name", c.name); if (n && n.trim() !== c.name) run(() => api.updateCategory(c._id, { name: n }), "Renamed"); }}>Rename</Button>
                      <Button variant="ghost" size="sm" className="!text-red-600" onClick={() => { if (window.confirm(`Delete "${c.name}"? This cannot be undone.`)) run(() => api.deleteCategory(c._id), "Category deleted"); }}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Panel>
      </div>
    </>
  );
}