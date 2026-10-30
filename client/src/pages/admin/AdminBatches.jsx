import { useAdmin } from "../../hooks/queries.js";
import * as api from "../../services/api.js";
import { PageHeader, Button } from "../../components/ui/index.jsx";
import { fmtDate } from "../../utils/format.js";
import { Table, Panel, useAct } from "./shared.jsx";

const to12 = (t) => {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

// "7:30 pm" / "12 am" -> "19:30" / "00:00"
// "1:00 AM", "1am", "1.30 pm", "1:00 a.m.", "13:00", "00:30" -> "HH:MM"
const parse12 = (txt) => {
  const s = String(txt || "").trim().toLowerCase().replace(/\./g, ":").replace(/:+$/, "").replace(/\s+/g, " ");
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(a|p)?m?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] || 0);
  if (min > 59) return null;
  if (m[3]) {
    if (h < 1 || h > 12) return null;
    h = m[3] === "p" ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h);
  } else if (h > 12 || h === 0) {
    // 24-hour typing like 13:00 or 00:30
    if (h > 23) return null;
  } else {
    return null; // 1 to 12 bina AM/PM ke: pata nahi AM hai ya PM
  }
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
};

function askTimes(defStart, defEnd) {
  const s = window.prompt("Start time (e.g. 7:00 AM, 12:00 PM, 12:00 AM)", defStart ? to12(defStart) : "");
  if (s === null) return null;
  const e = window.prompt("End time (e.g. 8:30 AM)", defEnd ? to12(defEnd) : "");
  if (e === null) return null;
  const startTime = parse12(s), endTime = parse12(e);
  if (!startTime || !endTime) { window.alert("Please type time like 7:30 AM or 12:00 PM"); return null; }
  if (startTime >= endTime) { window.alert("End time must be after start time"); return null; }
  return { startTime, endTime };
}

export default function AdminBatches() {
  const batches = useAdmin("batches", api.fetchAdminBatches);
  const act = useAct();

  const setTime = (b) => {
    const t = askTimes(b.startTime, b.endTime);
    if (t) act(() => api.updateBatch(b._id, t), "Time updated", "batches");
  };

  const addBatch = (b) => {
    const t = askTimes();
    if (t) act(() => api.createBatch({ courseId: b.course._id, ...t }), "Batch created", "batches");
  };

  const setCapacity = (b) => {
    const v = Number(window.prompt("New capacity", b.capacity));
    if (v > 0) act(() => api.updateBatch(b._id, { capacity: v }), "Capacity updated", "batches");
  };

  return (
    <>
      <PageHeader title="Batches" subtitle="Set any class time for a course, open or close it, and start a class any time." />
      <Panel q={batches} empty="No batches yet. Publish a course to create them.">
        {(d) => (
          <Table heads={["Course", "Time", "Starts", "Seats", ""]}>
            {d.map((b) => (
              <tr key={b._id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{b.course?.title}</td>
                <td className="px-4 py-3">{b.time}</td>
                <td className="px-4 py-3">{fmtDate(b.startDate)}</td>
                <td className="px-4 py-3">{b.taken} / {b.capacity}</td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="sm" onClick={() => act(() => api.updateBatch(b._id, { isOpen: !b.isOpen }), b.isOpen ? "Batch closed" : "Batch opened", "batches")}>
                    {b.isOpen ? "Close" : "Open"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setCapacity(b)}>Capacity</Button>
                  <Button variant="ghost" size="sm" onClick={() => setTime(b)}>Time</Button>
                  <Button variant="ghost" size="sm" onClick={() => addBatch(b)}>+ Time slot</Button>
                  <Button variant="ghost" size="sm" onClick={() => act(() => api.startBatchNow(b._id), "Class started", "batches")}>Start now</Button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </>
  );
}