import { Link } from "react-router-dom";
import { Users, Mic, Video, CalendarClock } from "lucide-react";
import { Avatar, Skeleton } from "./ui/index.jsx";
import { usePublicSessions } from "../hooks/queries.js";
import { fmtDay, fmtTime } from "../utils/format.js";

// Real data: shows the class that is live right now, otherwise the next scheduled one.
export default function LiveClassPreview() {
  const { data, isLoading } = usePublicSessions();
  const s = data?.find((x) => x.status === "live") || data?.[0];
  if (isLoading) return <div className="card p-4"><Skeleton className="aspect-video" /><Skeleton className="mt-4 h-10" /></div>;
  if (!s) return <div className="card flex aspect-[4/3] flex-col items-center justify-center p-8 text-center"><CalendarClock className="text-brand-600" size={32} /><p className="mt-3 font-semibold">No classes scheduled right now</p><p className="text-sm text-slate-500">New live batches are added regularly.</p><Link to="/courses" className="mt-4 text-sm font-semibold text-brand-600">Browse courses →</Link></div>;
  const isLive = s.status === "live";
  return (
    <div className="card relative overflow-hidden p-4 shadow-xl">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 to-brand-900">
        <div className="absolute inset-0 flex items-center justify-center"><Avatar name={s.instructor} size={84} /></div>
        <span className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold text-white ${isLive ? "bg-rose-600" : "bg-slate-600"}`}>{isLive && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />}{isLive ? "LIVE" : `${fmtDay(s.startsAt)} · ${fmtTime(s.startsAt)}`}</span>
        {isLive && <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-xs font-medium text-white backdrop-blur"><Users size={12} />{s.students} in class</span>}
        <div className="absolute bottom-3 left-3 flex gap-2 text-white/80"><span className="rounded-lg bg-black/40 p-1.5"><Mic size={14} /></span><span className="rounded-lg bg-black/40 p-1.5"><Video size={14} /></span></div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0"><p className="truncate font-semibold">{s.title}</p><p className="truncate text-sm text-slate-500">{s.instructor} · {s.batch === "morning" ? "Morning" : "Evening"} Batch</p></div>
        <Link to={isLive ? `/live-class/${s.id}` : `/courses/${s.course.slug}`} className="shrink-0 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">{isLive ? "Join Class" : "View course"}</Link>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />Attendance is tracked in real time</div>
    </div>
  );
}
