import { useAdmin } from "../../hooks/queries.js";
import * as api from "../../services/api.js";
import { PageHeader, Button } from "../../components/ui/index.jsx";
import { fmtDate } from "../../utils/format.js";
import { Table, Panel, useAct } from "./shared.jsx";

export default function AdminBatches() {
  const batches = useAdmin("batches", api.fetchAdminBatches);
  const act = useAct();

  const setCapacity = (b) => {
    const v = Number(window.prompt("New capacity", b.capacity));
    if (v > 0) act(() => api.updateBatch(b._id, { capacity: v }), "Capacity updated", "batches");
  };

  return (
    <>
      <PageHeader title="Batches" subtitle="Open, close and resize course batches." />
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
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </>
  );
}