import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Skeleton, ErrorState, EmptyState } from "../../components/ui/index.jsx";

export const Table = ({ heads, children }) => (
  <div className="card overflow-x-auto">
    <table className="w-full min-w-[640px] text-left text-sm">
      <thead className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
        <tr>{heads.map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-slate-100">{children}</tbody>
    </table>
  </div>
);

export const Panel = ({ q, empty, children }) =>
  q.isLoading ? <Skeleton className="h-48" />
    : q.error ? <ErrorState error={q.error} onRetry={q.refetch} />
      : !q.data?.length && empty ? <EmptyState title={empty} />
        : children(q.data);

// Runs a write, toasts the outcome, then refreshes the admin lists it touched.
export function useAct() {
  const qc = useQueryClient();
  return async (fn, ok, ...keys) => {
    try {
      await fn();
      toast.success(ok);
      keys.flat().forEach((k) => k && qc.invalidateQueries({ queryKey: ["admin", k] }));
    } catch (e) {
      toast.error(e.message);
    }
  };
}