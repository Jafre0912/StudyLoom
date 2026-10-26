import { useAdmin } from "../../hooks/queries.js";
import * as api from "../../services/api.js";
import { PageHeader, Button } from "../../components/ui/index.jsx";
import { fmtDate } from "../../utils/format.js";
import { Table, Panel, useAct } from "./shared.jsx";

const SLOTS = {
  morning: [["07:00", "08:00"], ["08:00", "09:00"], ["07:00", "08:30"]],
  evening: [["19:00", "20:00"], ["20:00", "21:00"], ["21:00", "22:00"], ["19:00", "20:30"]],
};

const to12 = (t) => {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

export default function AdminBatches() {
  const batches = useAdmin("batches", api.fetchAdminBatches);
  const act = useAct();

  const setTime = (b, value) => {
    if (!value) return;
    const [startTime, endTime] = value.split("-");
    act(() => api.updateBatch(b._id, { startTime, endTime }), "Time updated", "batches");
  };

  const setCapacity = (b) => {
    const v = Number(window.prompt("New capacity", b.capacity));
    if (v > 0) act(() => api.updateBatch(b._id, { capacity: v }), "Capacity updated", "batches");
  };

  return (
    <>
      <PageHeader title="Batches" subtitle="Open, close, resize and reschedule course batches." />
      <Panel q={batches} empty="No batches yet. Publish a course to create them.">
        {(d) => (
          <Table heads={["Course", "Batch", "Time", "Starts", "Seats", ""]}>
            {d.map((b) => (
              <tr key={b._id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{b.course?.title}</td>
                <td className="px-4 py-3">{b.label}</td>
                <td className="px-4 py-3">{b.time}</td>
                <td className="px-4 py-3">{fmtDate(b.startDate)}</td>
                <td className="px-4 py-3">{b.taken} / {b.capacity}</td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="sm" onClick={() => act(() => api.updateBatch(b._id, { isOpen: !b.isOpen }), b.isOpen ? "Batch closed" : "Batch opened", "batches")}>
                    {b.isOpen ? "Close" : "Open"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setCapacity(b)}>Capacity</Button>
                  <select
                    value=""
                    onChange={(e) => setTime(b, e.target.value)}
                    className="ml-1 rounded border border-slate-200 px-2 py-1 text-sm"
                  >
                    <option value="">Change time</option>
                    {(SLOTS[b.key] || []).map(([s, e]) => (
                      <option key={s + e} value={`${s}-${e}`}>{to12(s)} – {to12(e)}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </>
  );
}