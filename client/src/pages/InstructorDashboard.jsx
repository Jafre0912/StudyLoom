import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Video, Users, Clock, Play, TrendingUp, LayoutDashboard } from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout.jsx";
import { useInstructorOverview, useSessions, useRoster, useStartSession } from "../hooks/queries.js";
import { PageHeader, StatCard, Button, Badge, Avatar, ProgressBar, Skeleton, ErrorState, EmptyState, statusTone } from "../components/ui/index.jsx";
import { fmtDay, fmtTime } from "../utils/format.js";

export const InstructorLayout = () => <DashboardLayout subtitle="Instructor" items={[["/instructor/dashboard", "Dashboard", LayoutDashboard, true]]} />;

export default function InstructorDashboard() {
  const ov = useInstructorOverview(); const ss = useSessions();
  const start = useStartSession();
  const nav = useNavigate();
  const [picked, setPicked] = useState(null);
  const mine = (ss.data || []).filter((s) => s.status !== "completed");
  const focus = picked || mine.find((s) => s.status === "live")?.id || mine[0]?.id;
  const roster = useRoster(focus);
  if (ov.isLoading || ss.isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-40" /><Skeleton className="h-72" /></div>;
  if (ov.error || ss.error) return <ErrorState error={ov.error || ss.error} onRetry={() => { ov.refetch(); ss.refetch(); }} />;
  const o = ov.data;
  const go = async (s) => { try { if (s.status !== "live") await start.mutateAsync(s.id); nav(`/live-class/${s.id}`); } catch (e) { toast.error(e.message); } };
  const fs = mine.find((s) => s.id === focus);
  return (
    <>
      <PageHeader title="Instructor Dashboard" subtitle="Manage classes, rosters and live attendance." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Video} label="Live now" value={o.liveNow} tone="rose" /><StatCard icon={Clock} label="Upcoming classes" value={o.upcoming} tone="amber" />
        <StatCard icon={Users} label="Enrolled students" value={o.students} /><StatCard icon={TrendingUp} label="Avg. attendance" value={o.avgAttendance == null ? "—" : `${o.avgAttendance}%`} tone="green" hint={o.avgAttendance == null ? "After your first class" : undefined} />
      </div>
      <h2 className="mb-3 mt-8 font-semibold">My classes</h2>
      {mine.length === 0 ? <EmptyState icon={Video} title="No upcoming classes" text="Classes appear here once a course assigned to you has a batch." /> : <div className="space-y-3">{mine.slice(0, 8).map((s) => (
        <div key={s.id} className={`card flex flex-wrap items-center gap-4 p-4 ${focus === s.id ? "ring-2 ring-brand-200" : ""}`}><button onClick={() => setPicked(s.id)} className="min-w-[12rem] flex-1 text-left"><div className="flex items-center gap-2"><Badge tone={statusTone[s.status]} className="capitalize">{s.status}</Badge><span className="text-xs text-slate-500">{fmtDay(s.startsAt)} · {fmtTime(s.startsAt)}</span></div><p className="mt-1 font-semibold">{s.title}</p>
        <p className="text-sm text-slate-500">{s.course?.title} · {s.batchTime || "—"}</p>
        </button>
          <Button loading={start.isPending && start.variables === s.id} onClick={() => go(s)} variant={s.status === "live" ? "primary" : "secondary"}><Play size={15} />{s.status === "live" ? "Rejoin class" : "Start class"}</Button></div>))}</div>}
      {fs && <><h2 className="mb-3 mt-8 font-semibold">Roster & attendance <span className="text-sm font-normal text-slate-500">· {fs.title}</span></h2>
        {roster.isLoading ? <Skeleton className="h-40" /> : roster.error ? <ErrorState error={roster.error} onRetry={roster.refetch} /> : roster.data.length === 0 ? <EmptyState icon={Users} title="No students in this batch yet" /> : (
          <div className="card overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500"><tr>{["Student", "Status", "Time in this class", "Overall"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">{roster.data.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50"><td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={r.name} size={30} /><div><p className="font-medium">{r.name}</p><p className="text-xs text-slate-500">{r.email}</p></div></div></td>
                <td className="px-4 py-3"><div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${r.online ? "bg-emerald-500" : "bg-slate-300"}`} /><Badge tone={statusTone[r.status]} className="capitalize">{r.status}</Badge></div></td>
                <td className="px-4 py-3"><div className="w-36"><p className="mb-1 text-xs tabular-nums">{r.minutes} min</p><ProgressBar value={(r.minutes / (fs.durationMin || 90)) * 100} tone={r.status === "present" ? "green" : r.status === "partial" ? "amber" : "brand"} /></div></td><td className="px-4 py-3 font-semibold">{r.attendance}%</td></tr>))}</tbody></table></div>)}</>}
    </>
  );
}
