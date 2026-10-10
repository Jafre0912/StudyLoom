import { useState } from "react";
import { useAdmin } from "../../hooks/queries.js";
import * as api from "../../services/api.js";
import { PageHeader, Badge, Button } from "../../components/ui/index.jsx";
import { Table, Panel, useAct } from "./shared.jsx";

export default function AdminPromos() {
  const promos = useAdmin("promos", api.fetchPromos);
  const act = useAct();
  const [form, setForm] = useState({ code: "", percent: "" });

  const create = (e) => {
    e.preventDefault();
    act(async () => {
      await api.createPromo({ code: form.code, percent: Number(form.percent) });
      setForm({ code: "", percent: "" });
    }, "Promo created", "promos");
  };

  return (
    <>
      <PageHeader title="Promo codes" subtitle="Discount codes students can apply at checkout." />
      <div className="space-y-4">
        <form className="card flex flex-wrap items-end gap-3 p-4" onSubmit={create}>
          <div>
            <label className="label">Code</label>
            <input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          </div>
          <div>
            <label className="label">Percent off</label>
            <input className="input w-28" type="number" min="1" max="100" value={form.percent} onChange={(e) => setForm({ ...form, percent: e.target.value })} required />
          </div>
          <Button type="submit">Add promo</Button>
        </form>
        <Panel q={promos} empty="No promo codes yet">
          {(d) => (
            <Table heads={["Code", "Discount", "Used", "Status", ""]}>
              {d.map((p) => (
                <tr key={p._id}>
                  <td className="px-4 py-3 font-mono font-semibold">{p.code}</td>
                  <td className="px-4 py-3">{p.percent}%</td>
                  <td className="px-4 py-3">{p.uses}{p.maxUses ? ` / ${p.maxUses}` : ""}</td>
                  <td className="px-4 py-3"><Badge tone={p.isActive ? "green" : "gray"}>{p.isActive ? "Active" : "Disabled"}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => act(() => api.togglePromo(p._id), "Promo updated", "promos")}>
                      {p.isActive ? "Disable" : "Enable"}
                    </Button>
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