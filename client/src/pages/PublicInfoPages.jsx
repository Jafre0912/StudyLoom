import { Link } from "react-router-dom";
import { Radio, Users, ArrowRight, Target, Heart, ShieldCheck, Award } from "lucide-react";
import { Button, Badge, EmptyState, RowSkeletons, ErrorState } from "../components/ui/index.jsx";
import { usePublicSessions, useLearningPaths } from "../hooks/queries.js";
import { money, fmtDay, fmtTime } from "../utils/format.js";

export function LiveClassesPublicPage() {
  const { data, isLoading, error, refetch } = usePublicSessions();
  const up = data || [];
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Live Classes</h1><p className="mt-1 text-slate-500">A look at what is happening on StudyLoom right now and next.</p>
      <div className="mt-8 space-y-3">
        {isLoading ? <RowSkeletons /> : error ? <ErrorState error={error} onRetry={refetch} /> : up.length === 0 ? <EmptyState icon={Radio} title="No classes scheduled" text="Check back soon." /> : up.map((s) => (
          <div key={s.id} className="card flex flex-wrap items-center gap-4 p-4">
            <img src={s.course?.thumbnail} alt="" className="h-16 w-28 rounded-lg object-cover" />
            <div className="min-w-[10rem] flex-1">
              <div className="flex items-center gap-2">{s.status === "live" ? <Badge tone="rose">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />Live now</Badge> : <Badge tone="brand">{fmtDay(s.startsAt)} · {fmtTime(s.startsAt)}</Badge>}
                </div>
                <p className="mt-1 font-semibold">{s.title.replace(/\s·\s(Class|Lesson)\s\d+$/, "")}</p>
                 <p className="text-sm text-slate-500">{s.course?.title} · {s.instructor}</p>
                 </div>
            <Button as={Link} to={`/courses/${s.course?.slug}`} variant="secondary" size="sm">View course</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LearningPathsPage() {
  const { data, isLoading, error, refetch } = useLearningPaths();
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Learning Paths</h1><p className="mt-1 text-slate-500">Curated course sequences that take you from beginner to job-ready.</p>
      {isLoading ? <div className="mt-8"><RowSkeletons /></div> : error ? <div className="mt-8"><ErrorState error={error} onRetry={refetch} /></div> : (data || []).length === 0 ? <div className="mt-8"><EmptyState title="No learning paths yet" /></div> :
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {data.map((p) => {
          const cs = p.courses.filter((c) => c.isPublished); if (!cs.length) return null; const total = cs.reduce((a, c) => a + c.price, 0);
          return (
            <div key={p.id} className="card p-6 transition hover:-translate-y-0.5 hover:shadow-xl">
              <div className="flex items-start justify-between"><div><h2 className="text-xl font-bold">{p.title}</h2><p className="mt-1 text-sm text-slate-500">{p.blurb}</p></div><Badge tone="brand">{p.weeks} weeks</Badge></div>
              <ol className="mt-5 space-y-3">{cs.map((c, i) => <li key={c._id}><Link to={`/courses/${c.slug}`} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-brand-300 hover:bg-brand-50/40"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{i + 1}</span><span className="flex-1 text-sm font-medium">{c.title}</span><span className="text-xs text-slate-500">{c.weeks}w</span></Link></li>)}</ol>
              <div className="mt-5 flex items-center justify-between"><p className="text-sm text-slate-500">All courses: <b className="text-slate-900">{money(total)}</b></p><Button as={Link} to={`/courses/${cs[0].slug}`} size="sm">Start path <ArrowRight size={15} /></Button></div>
            </div>
          );
        })}
      </div>}
    </div>
  );
}

export function AboutPage() {
  const vals = [[Radio, "Live first", "Real instructors, real-time questions. No passive video watching."], [ShieldCheck, "Honest attendance", "Real-time tracking means certificates actually mean something."], [Target, "Practice-driven", "Every class ends with hands-on work you can show employers."], [Heart, "Accessible", "Flexible morning and evening batches with local payment options."]];
  return (
    <div>
      <section className="bg-gradient-to-b from-brand-50 to-white py-16"><div className="mx-auto max-w-3xl px-4 text-center"><h1 className="text-4xl font-extrabold tracking-tight">We believe learning works best <span className="text-brand-600">together, live.</span></h1><p className="mt-4 text-lg text-slate-600">StudyLoom is a live learning platform from Kathmandu. Learn. Practice. Build.</p></div></section>
      <section className="mx-auto grid max-w-5xl gap-5 px-4 py-14 sm:grid-cols-2">{vals.map(([I, t, d]) => <div key={t} className="card p-6"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><I size={20} /></span><h3 className="mt-4 font-semibold">{t}</h3><p className="mt-1 text-sm text-slate-500">{d}</p></div>)}</section>
      <section className="mx-auto max-w-3xl px-4 pb-16 text-center"><div className="card flex flex-col items-center p-8"><Award className="text-brand-600" size={30} /><h2 className="mt-3 text-xl font-bold">Ready to join a live class?</h2><Button as={Link} to="/courses" className="mt-5">Explore Courses</Button></div></section>
    </div>
  );
}

export function NotFoundPage() {
  return <div className="mx-auto max-w-md px-4 py-24 text-center"><p className="text-6xl font-extrabold text-brand-600">404</p><h1 className="mt-3 text-2xl font-bold">Page not found</h1><p className="mt-1 text-slate-500">The page you are looking for does not exist.</p><Button as={Link} to="/" className="mt-6">Back home</Button></div>;
}
