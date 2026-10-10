import { Users, GraduationCap, BookOpen, Wallet, Award } from "lucide-react";
import { useAdmin } from "../../hooks/queries.js";
import * as api from "../../services/api.js";
import { PageHeader, StatCard, Skeleton, ErrorState } from "../../components/ui/index.jsx";
import { money } from "../../utils/format.js";

export default function AdminOverview() {
  const stats = useAdmin("stats", api.fetchAdminStats);
  if (stats.isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><div className="grid gap-4 sm:grid-cols-5">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}</div><Skeleton className="h-72" /></div>;
  if (stats.error) return <ErrorState error={stats.error} onRetry={stats.refetch} />;

  const st = stats.data;
  const months = st.revenueByMonth || [];
  const max = Math.max(...months.map((m) => m.total), 1);

  return (
    <>
      <PageHeader title="Admin Overview" subtitle="Platform-wide numbers at a glance." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={Users} label="Total students" value={st.students.toLocaleString()} />
        <StatCard icon={GraduationCap} label="Instructors" value={st.instructors} tone="amber" />
        <StatCard icon={BookOpen} label="Active courses" value={st.courses} tone="green" />
        <StatCard icon={Wallet} label="Revenue" value={money(st.revenue)} tone="rose" />
        <StatCard icon={Award} label="Certificates issued" value={st.certificates.toLocaleString()} />
      </div>
      <div className="card mt-6 p-6">
        <h2 className="font-semibold">Revenue · last 6 months</h2>
        <div className="mt-5 flex h-40 items-end gap-3">
          {months.map((m) => (
            <div key={m.label} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-[11px] font-medium text-slate-500">{m.total ? money(m.total) : "–"}</span>
              <div className="w-full rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-400 transition-all hover:opacity-80" style={{ height: `${Math.max((m.total / max) * 100, 2)}%` }} />
              <span className="text-xs text-slate-500">{m.label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}