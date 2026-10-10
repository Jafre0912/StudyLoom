import { useAdmin } from "../../hooks/queries.js";
import * as api from "../../services/api.js";
import { PageHeader, Button } from "../../components/ui/index.jsx";
import { money, fmtDate } from "../../utils/format.js";
import { Table, Panel, useAct } from "./shared.jsx";

// Student paid cash at the office -> "Confirm received" -> receipt is generated for the student.
export default function AdminCashPayments() {
  const pending = useAdmin("cash-pending", api.fetchPendingCash);
  const act = useAct();

  const confirm = (p) => {
    if (!window.confirm(`Confirm that you received ${money(p.amount)} in cash from ${p.student?.name}?`)) return;
    act(() => api.confirmCash(p._id), "Confirmed. Receipt generated for the student.", "cash-pending", "stats");
  };
  const reject = (p) => {
    if (!window.confirm(`Reject this ${money(p.amount)} cash payment from ${p.student?.name}? The student will not get a receipt.`)) return;
    act(() => api.rejectCash(p._id), "Payment rejected", "cash-pending");
  };

  return (
    <>
      <PageHeader title="Cash payments" subtitle="Confirm cash received at the office. The student's receipt is generated on confirmation." />
      <Panel q={pending} empty="No cash payments waiting">
        {(d) => (
          <Table heads={["Student", "Course", "Amount", "Date", ""]}>
            {d.map((p) => (
              <tr key={p._id} className="hover:bg-slate-50">
                <td className="px-4 py-3"><p className="font-medium">{p.student?.name}</p><p className="text-xs text-slate-500">{p.student?.phone || p.student?.email}</p></td>
                <td className="px-4 py-3">{p.course?.title}</td>
                <td className="px-4 py-3 font-semibold">{money(p.amount)}</td>
                <td className="px-4 py-3">{fmtDate(p.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="success" onClick={() => confirm(p)}>Confirm received</Button>
                    <Button size="sm" variant="secondary" onClick={() => reject(p)}>Reject</Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </>
  );
}