import { useState } from "react";
import toast from "react-hot-toast";
import { CreditCard, Download, Clock } from "lucide-react";
import { usePayments } from "../../hooks/queries.js";
import http from "../../services/http.js";
import { PageHeader, Badge, Button, statusTone, RowSkeletons, ErrorState, EmptyState } from "../../components/ui/index.jsx";
import { money, fmtDate } from "../../utils/format.js";

const METHOD = { esewa: "eSewa", khalti: "Khalti", cash: "Cash" };

export default function Payments() {
  const { data, isLoading, error, refetch } = usePayments();
  const [busy, setBusy] = useState(null);

  const receipt = async (p) => {
    setBusy(p.id);
    try {
      const blob = await http.get(`/billing/receipts/${p._id}`, { responseType: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `receipt-${p.receiptNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) { toast.error(e.message || "Could not download receipt"); }
    finally { setBusy(null); }
  };

  const waitingCash = (data || []).filter((p) => p.gateway === "cash" && p.status === "pending").length;

  return (
    <>
      <PageHeader title="Payments" subtitle="Your receipts and payment history." />

      {waitingCash > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <Clock size={18} className="mt-0.5 shrink-0" />
          <p><b>{waitingCash} cash payment{waitingCash > 1 ? "s" : ""} awaiting confirmation.</b> Pay at the StudyLoom office. Your receipt is generated as soon as our staff confirms the cash.</p>
        </div>
      )}

      {isLoading ? <RowSkeletons n={3} /> : error ? <ErrorState error={error} onRetry={refetch} /> : data.length === 0 ? <EmptyState icon={CreditCard} title="No payments yet" text="Your eSewa, Khalti and cash payments will appear here." /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
              <tr>{["Receipt", "Course", "Method", "Date", "Amount", "Status", ""].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((p) => {
                const cashPending = p.gateway === "cash" && p.status === "pending";
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs">{p.receiptNumber || <span className="font-sans text-slate-400">{cashPending ? "After confirmation" : "—"}</span>}</td>
                    <td className="px-4 py-3 font-medium">{p.course?.title}</td>
                    <td className="px-4 py-3">{METHOD[p.gateway] || p.gateway}</td>
                    <td className="px-4 py-3">{fmtDate(p.paidAt || p.createdAt)}</td>
                    <td className="px-4 py-3 font-semibold">{money(p.amount)}</td>
                    <td className="px-4 py-3"><Badge tone={statusTone[p.status]} className="capitalize">{cashPending ? "Awaiting cash confirmation" : p.status}</Badge></td>
                    <td className="px-4 py-3 text-right">{p.status === "success" && p.receiptNumber && <Button size="sm" variant="ghost" loading={busy === p.id} onClick={() => receipt(p)}><Download size={14} />Receipt PDF</Button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}