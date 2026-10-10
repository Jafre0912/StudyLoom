import { CalendarCheck, Info } from "lucide-react";
import { useAttendance, useEnrollments } from "../../hooks/queries.js";
import { PageHeader, ProgressBar, Badge, statusTone, Skeleton, ErrorState, EmptyState } from "../../components/ui/index.jsx";
import { fmtDate, fmtTime } from "../../utils/format.js";

export default function Attendance() {
  const at = useAttendance(); const en = useEnrollments();
  if (at.isLoading || en.isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-60" /><Skeleton className="h-40" /><Skeleton className="h-64" /></div>;
  if (at.error) return <ErrorState error={at.error} onRetry={at.refetch} />;
  const tracked = en.data.filter((e) => e.status !== "pending_batch");
  const overall = tracked.length ? Math.round(tracked.reduce((a, e) => a + e.attendance, 0) / tracked.length) : 0;
  const tone = (v) => (v >= 80 ? "green" : v >= 70 ? "amber" : "brand");
  return (
    <>
      <PageHeader title="Attendance" subtitle="Tracked automatically while you are in a live class." />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card flex flex-col items-center justify-center p-6 text-center">
          <div className="relative flex h-32 w-32 items-center justify-center rounded-full" style={{ background: `conic-gradient(#4f46e5 ${overall * 3.6}deg, #e2e8f0 0)` }}><div className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-3xl font-extrabold">{overall}%</div></div>
          <p className="mt-4 font-semibold">Overall attendance</p><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Info size={12} />80% required for a certificate</p>
        </div>
        <div className="card p-6 lg:col-span-2"><h2 className="mb-4 font-semibold">Course-wise breakdown</h2><div className="space-y-5">{tracked.map((e) => <div key={e.id}><div className="mb-1.5 flex justify-between text-sm"><span className="font-medium">{e.course.title}</span><span className={e.attendance >= 80 ? "font-semibold text-emerald-600" : "font-semibold text-amber-600"}>{e.attendance}%</span></div><ProgressBar value={e.attendance} tone={tone(e.attendance)} /></div>)}</div></div>
      </div>
      <h2 className="mb-3 mt-8 font-semibold">Join / leave log</h2>
      {at.data.length === 0 ? <EmptyState icon={CalendarCheck} title="No attendance yet" text="Your logs will appear after your first live class." /> : (
        <div className="card overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500"><tr>{["Date", "Course", "Joined", "Left", "Time in class", "Status"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{at.data.map((a) => <tr key={a.id} className="hover:bg-slate-50"><td className="px-4 py-3">{fmtDate(a.date)}</td><td className="px-4 py-3 font-medium">{a.course?.title}<p className="text-xs font-normal text-slate-500">{a.title}</p></td><td className="px-4 py-3">{a.joinedAt ? fmtTime(a.joinedAt) : "—"}</td><td className="px-4 py-3">{a.leftAt ? fmtTime(a.leftAt) : "—"}</td><td className="px-4 py-3">{a.minutes} / {a.durationMin} min</td><td className="px-4 py-3"><Badge tone={statusTone[a.status]} className="capitalize">{a.status}</Badge></td></tr>)}</tbody></table></div>
      )}
      <p className="mt-3 text-xs text-slate-500">Present = attended 75%+ of the class · Partial = 25–74% · Absent = under 25%.</p>
    </>
  );
}
