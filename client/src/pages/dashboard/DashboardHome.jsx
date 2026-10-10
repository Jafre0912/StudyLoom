import { Link, useNavigate } from "react-router-dom";
import { BookOpen, CalendarClock, Percent, Award, Video, Clock } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useEnrollments, useSessions, useCertificates } from "../../hooks/queries.js";
import { StatCard, Button, ProgressBar, Skeleton, ErrorState, EmptyState, Badge } from "../../components/ui/index.jsx";
import useCountdown from "../../hooks/useCountdown.js";
import { greeting, fmtDay, fmtTime } from "../../utils/format.js";

function TodayClass({ s }) {
  const nav = useNavigate();
  const left = useCountdown(s.startsAt);
  const live = s.status === "live";
  const mins = Math.ceil(left / 60);
  const h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60), x = left % 60;
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white shadow-lg">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
      <div className="relative flex flex-wrap items-center justify-between gap-5">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold"><Video size={12} />Today’s Live Class</span>
          <h2 className="mt-3 text-xl font-bold">{s.title}</h2><p className="text-sm text-brand-100">{s.course?.title} · {s.instructor} · {fmtTime(s.startsAt)}</p>
          <p className="mt-4 text-2xl font-extrabold tabular-nums">{live ? <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-400" />Class is live now</span> : left <= 0 ? "Waiting for the instructor to start" : <>Class starts in {mins <= 60 ? `${mins} minutes` : left < 86400 ? `${h}h ${m}m` : `${Math.floor(left / 86400)} days`}</>}</p>
          {!live && left <= 3600 && <p className="text-xs text-brand-200 tabular-nums">{String(m).padStart(2, "0")}:{String(x).padStart(2, "0")} remaining</p>}
        </div>
        <Button variant="secondary" size="lg" disabled={!live} onClick={() => nav(`/live-class/${s.id}`)} className="!border-0">{live ? "Join Class" : "Opens when live"}</Button>
      </div>
    </div>
  );
}

export default function DashboardHome() {
  const { user } = useAuth();
  const en = useEnrollments(); const ss = useSessions(); const ce = useCertificates();
  if (en.isLoading || ss.isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><div className="grid gap-4 sm:grid-cols-4">{[0,1,2,3].map((i) => <Skeleton key={i} className="h-28" />)}</div><Skeleton className="h-40" /></div>;
  if (en.error || ss.error) return <ErrorState error={en.error || ss.error} onRetry={() => { en.refetch(); ss.refetch(); }} />;
  const active = en.data.filter((e) => e.status === "active");
  const sessions = ss.data.filter((s) => s.status !== "completed" && active.some((a) => a.courseId === s.course?._id)).sort((a, b) => (a.status === "live" ? -1 : b.status === "live" ? 1 : 0));
  const next = sessions[0];
  const upcoming = sessions.filter((s) => s.status === "scheduled").length;
  const tracked = en.data.filter((e) => e.status !== "pending_batch");
  const avg = tracked.length ? Math.round(tracked.reduce((a, e) => a + e.attendance, 0) / tracked.length) : 0;
  return (
    <div className="space-y-8">
      <div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{greeting()}, {user.name.split(" ")[0]} 👋</h1><p className="mt-1 text-slate-500">Here is what is happening in your learning today.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={BookOpen} label="Enrolled courses" value={en.data.length} hint={`${active.length} in progress`} />
        <StatCard icon={CalendarClock} label="Upcoming classes" value={upcoming} tone="amber" hint="Scheduled classes" />
        <StatCard icon={Percent} label="Attendance" value={`${avg}%`} tone="green" hint="Need 80% for certificate" />
        <StatCard icon={Award} label="Certificates earned" value={ce.data?.length ?? "–"} tone="rose" />
      </div>
      {next ? <TodayClass s={next} /> : <EmptyState icon={Video} title="No classes scheduled today" text="Enroll in a course to see your live classes here." action={<Button as={Link} to="/courses">Browse courses</Button>} />}
      <div className="grid gap-6 lg:grid-cols-5">
        <section className="card p-6 lg:col-span-3"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Active courses</h2><Link to="/dashboard/courses" className="text-sm font-semibold text-brand-600">View all</Link></div>
          {active.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">No active courses yet.</p> : <div className="space-y-5">{active.map((e) => <div key={e.id}><div className="mb-1.5 flex justify-between text-sm"><span className="font-medium">{e.course.title}</span><span className="text-slate-500">{e.progress}%</span></div><ProgressBar value={e.progress} /></div>)}</div>}
        </section>
        <section className="card p-6 lg:col-span-2"><h2 className="mb-4 font-semibold">Upcoming schedule</h2>
          {sessions.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">Nothing scheduled.</p> : <ul className="space-y-3">{sessions.slice(0, 4).map((s) => <li key={s.id} className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Clock size={17} /></span><div className="min-w-0"><p className="truncate text-sm font-medium">{s.title}</p><p className="text-xs text-slate-500">{s.status === "live" ? "Live now" : `${fmtDay(s.startsAt)} · ${fmtTime(s.startsAt)}`}</p></div></li>)}</ul>}
        </section>
      </div>
    </div>
  );
}
