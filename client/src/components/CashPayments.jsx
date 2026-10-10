import toast from "react-hot-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote } from "lucide-react";
import * as api from "../services/api.js";
import { Button, Skeleton, ErrorState, EmptyState } from "./ui/index.jsx";
import { money, fmtDate } from "../utils/format.js";

// Admin: cash received at the office -> click "Confirm received" -> receipt is generated for the student.
export default function CashPayments() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "cash-pending"], queryFn: api.fetchPendingCash });

  const confirm = async (p) => {
    if (!window.confirm(`Confirm that you received ${money(p.amount)} cash from ${p.student?.name}?`)) return;
    try {
      await api.confirmCash(p._id);
      toast.success("Payment confirmed. Receipt generated.");
      ["cash-pending", "stats"].forEach((k) => qc.invalidateQueries({ queryKey: ["admin", k] }));
    } catch (e) { toast.error(e.message); }
  };

  if (q.isLoading) return <Skeleton className="h-48" />;
  if (q.error) return <ErrorState error={q.error} onRetry={q.refetch} />;
  if (!q.data.length) return <EmptyState icon={Banknote} title="No cash payments waiting" />;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500"><tr>{["Student", "Course", "Amount", "Date", ""].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">
          {q.data.map((p) => (
            <tr key={p._id} className="hover:bg-slate-50">
              <td className="px-4 py-3"><p className="font-medium">{p.student?.name}</p><p className="text-xs text-slate-500">{p.student?.phone || p.student?.email}</p></td>
              <td className="px-4 py-3">{p.course?.title}</td>
              <td className="px-4 py-3 font-semibold">{money(p.amount)}</td>
              <td className="px-4 py-3">{fmtDate(p.createdAt)}</td>
              <td className="px-4 py-3 text-right"><Button size="sm" variant="success" onClick={() => confirm(p)}>Confirm received</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}