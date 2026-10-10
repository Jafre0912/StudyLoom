import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Star, Users, CalendarDays, Clock, CheckCircle2, ChevronDown, Sun, Moon, Radio, Award, ShieldCheck } from "lucide-react";
import { useCourse, useEnrollments } from "../hooks/queries.js";
import { Button, Badge, ErrorState, Skeleton, Avatar } from "../components/ui/index.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { money, fmtDate } from "../utils/format.js";

function Accordion({ items }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {items.map((m, i) => (
        <div key={i}>
          <button onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50" aria-expanded={open === i}>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-700">{m.number ?? i + 1}</span>
            <span className="flex-1 font-medium">{m.title ?? m.q}</span>{m.classes && <span className="hidden text-xs text-slate-500 sm:block">{m.classes} live classes</span>}
            <ChevronDown size={16} className={`text-slate-400 transition ${open === i ? "rotate-180" : ""}`} />
          </button>
          {open === i && <div className="bg-slate-50/60 px-4 pb-4 pl-14 text-sm text-slate-600">{m.topics ? <ul className="space-y-1.5">{m.topics.map((t) => <li key={t} className="flex items-center gap-2"><Radio size={12} className="text-rose-500" />{t}</li>)}</ul> : m.a}</div>}
        </div>
      ))}
    </div>
  );
}

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { data: c, isLoading, error, refetch } = useCourse(courseId);
  const { data: enrollments } = useEnrollments({ enabled: !!user });
  if (isLoading) return <div className="mx-auto max-w-7xl space-y-4 px-4 py-10"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-5 w-1/3" /><Skeleton className="h-72 w-full" /></div>;
  if (error) return <div className="mx-auto max-w-xl px-4 py-16"><ErrorState error={error} onRetry={refetch} /><div className="mt-4 text-center"><Link to="/courses" className="text-sm font-semibold text-brand-600">← Back to courses</Link></div></div>;
  const enrolled = user && enrollments?.some((e) => e.courseId === c.id && e.status !== "pending_batch");
  const pending = user && enrollments?.find((e) => e.courseId === c.id && e.status === "pending_batch");
  const discount = c.oldPrice > c.price ? Math.round(((c.oldPrice - c.price) / c.oldPrice) * 100) : 0;
  const batches = c.batches || [];
  const enroll = () => nav(user ? (pending ? `/batch-select/${c.slug}` : `/checkout/${c.slug}`) : `/login?next=/checkout/${c.slug}`);

  return (
    <>
      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:pr-[26rem]">
          <Link to="/courses" className="text-sm text-slate-400 hover:text-white">← All courses</Link>
          <div className="mt-4 flex flex-wrap gap-2"><Badge tone="brand" className="capitalize">{c.level}</Badge><Badge tone="green"><Radio size={11} />Live instructor-led</Badge></div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{c.title}</h1>
          <p className="mt-3 max-w-2xl text-slate-300">{c.description}</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-300">
            {c.ratingCount > 0 && <span className="flex items-center gap-1.5 text-amber-400"><Star size={15} fill="currentColor" />{c.rating} ({c.ratingCount})</span>}
            <span className="flex items-center gap-1.5"><Users size={15} />{c.learners.toLocaleString()} enrolled</span>
            <span className="flex items-center gap-1.5"><CalendarDays size={15} />{c.weeks} Weeks · {c.classesPerWeek} Classes / Week</span>
            <span className="flex items-center gap-1.5"><Clock size={15} />{c.minutesPerClass} Min / Class</span>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-10 lg:order-1">
          <section><h2 className="mb-4 text-xl font-bold">What you will get</h2><div className="grid gap-3 sm:grid-cols-2">{c.outcomes.map((o) => <div key={o} className="flex gap-2.5 text-sm text-slate-700"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />{o}</div>)}</div></section>
          <section><h2 className="mb-4 text-xl font-bold">Live curriculum <span className="text-sm font-normal text-slate-500">· {c.modules.length} modules · {c.totalClasses} live classes</span></h2><Accordion items={c.modules} /></section>
          <section>
            <h2 className="mb-4 text-xl font-bold">Live schedule</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {batches.length === 0 && <p className="text-sm text-slate-500">Batches will be announced soon.</p>}
              {batches.map((b) => {
                const I = b.key === "morning" ? Sun : Moon;
                return <div key={b.key} className="card p-5"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><I size={20} /></span><div><p className="font-semibold">{b.label}</p><p className="text-sm text-slate-500">{b.time}</p></div></div><p className="mt-3 text-xs text-slate-500">Starts {fmtDate(b.startDate)} · {b.days.join(", ")}</p><p className={`mt-1 text-sm font-semibold ${!b.isOpen || b.left <= 0 ? "text-slate-500" : b.left <= 6 ? "text-rose-600" : "text-emerald-600"}`}>{!b.isOpen ? "Enrollment closed" : b.left <= 0 ? "Batch full" : `${b.left} of ${b.capacity} seats left`}</p></div>;
              })}
            </div>
          </section>
          <section><h2 className="mb-4 text-xl font-bold">Your instructor</h2><div className="card flex gap-4 p-5"><Avatar name={c.instructor.name} size={64} /><div><p className="text-lg font-semibold">{c.instructor.name}</p><p className="text-sm text-brand-600">{c.instructor.title}</p><p className="mt-2 text-sm text-slate-600">{c.instructor.bio}</p></div></div></section>
          <section><h2 className="mb-4 text-xl font-bold">Frequently asked questions</h2><Accordion items={c.faqs} /></section>
        </div>

        <aside className="lg:order-2 lg:-mt-72">
          <div className="card sticky top-24 overflow-hidden shadow-xl">
            <img src={c.thumbnail} alt="" className="aspect-video w-full object-cover" />
            <div className="p-5">
              <div className="flex items-baseline gap-2"><span className="text-3xl font-extrabold">{c.price > 0 ? money(c.price) : "Free"}</span>{discount > 0 && <><span className="text-sm text-slate-400 line-through">{money(c.oldPrice)}</span><Badge tone="green">{discount}% off</Badge></>}</div>
              {enrolled ? <Button as={Link} to="/dashboard/courses" className="mt-4 w-full" size="lg">Go to My Courses</Button> : <Button className="mt-4 w-full" size="lg" onClick={enroll}>{pending ? "Choose your batch" : c.price > 0 ? "Enroll Now" : "Enroll for Free"}</Button>}
              <ul className="mt-5 space-y-2.5 text-sm text-slate-600">
                <li className="flex gap-2"><Radio size={16} className="text-rose-500" />Live classes, {c.classesPerWeek}× per week</li>
                <li className="flex gap-2"><ShieldCheck size={16} className="text-brand-600" />Real-time attendance tracking</li>
                <li className="flex gap-2"><Award size={16} className="text-brand-600" />Verifiable certificate at 80%+ attendance</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
