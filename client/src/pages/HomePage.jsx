import { Link } from "react-router-dom";
import { Video, CalendarClock, UserCheck, Award, ArrowRight, Search, CreditCard, Users } from "lucide-react";
import { Button } from "../components/ui/index.jsx";
import LiveClassPreview from "../components/LiveClassPreview.jsx";
import CategoryIcon from "../components/CategoryIcon.jsx";
import CourseCard from "../components/course/CourseCard.jsx";
import { useCourses, useCategories } from "../hooks/queries.js";
import { CardSkeletons, ErrorState, Skeleton } from "../components/ui/index.jsx";

const TRUST = [[Video, "Live instructors"], [CalendarClock, "Flexible batches"], [UserCheck, "Real-time attendance"], [Award, "Verifiable certificates"]];
const STEPS = [[Search, "Pick a course", "Browse live, instructor-led courses."], [CreditCard, "Enroll & pay", "eSewa, Khalti or cash."], [CalendarClock, "Choose your batch", "Morning or evening slot."], [Users, "Attend live", "Attendance tracked in real time."], [Award, "Get certified", "80%+ attendance earns your certificate."]];

export default function HomePage() {
  const { data, isLoading, error, refetch } = useCourses();
  const cats = useCategories();
  return (
    <>
<section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white">
  <div className="pointer-events-none absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-brand-200/40 blur-3xl" />
  <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-2 lg:gap-12 lg:py-24">
    <div className="min-w-0 animate-fadeUp">
      <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm ring-1 ring-brand-100"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />100% live, instructor-led classes</span>
      <h1 className="mt-4 text-3xl font-extrabold leading-[1.15] tracking-tight sm:mt-5 sm:text-5xl lg:text-6xl">Learn Skills. Live Classes. <span className="text-brand-600">Build Your Career.</span></h1>
      <p className="mt-4 max-w-xl text-base text-slate-600 sm:text-lg">Join real instructors in real time. Pick a batch that fits your day, attend live, get tracked automatically, and earn a certificate anyone can verify.</p>
      <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row">
        <Button as={Link} to="/courses" size="lg" className="w-full sm:w-auto">Explore Courses <ArrowRight size={18} /></Button>
        <Button as={Link} to="/live-classes" size="lg" variant="secondary" className="w-full sm:w-auto">See Live Classes</Button>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-4 sm:mt-10 sm:grid-cols-4">
        {TRUST.map(([I, t]) => (
          <div key={t} className="flex min-w-0 items-center gap-2 text-xs font-medium text-slate-700 sm:text-sm">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm ring-1 ring-slate-200"><I size={17} /></span>
            <span className="leading-tight">{t}</span>
          </div>
        ))}
      </div>
    </div>
    <div className="min-w-0 animate-fadeUp lg:pl-6"><LiveClassPreview /></div>
  </div>
</section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between"><div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Explore by category</h2>
          <p className="mt-1 text-slate-500">{cats.data?.length ? `${cats.data.length} tracks` : "Tracks"}, one live learning experience.</p>
          </div>
          <Link to="/courses" className="hidden text-sm font-semibold text-brand-600 sm:block">View all →</Link>
          </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cats.isLoading && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)}
          {(cats.data || []).map((c) => (
            <Link key={c._id} to={`/courses?category=${c.slug}`} className="card group p-5 transition duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-xl">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white"><CategoryIcon name={c.icon} size={22} /></span>
              <h3 className="mt-4 font-semibold">{c.name}</h3>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <h2 className="mb-8 text-2xl font-bold tracking-tight sm:text-3xl">Popular live courses</h2>
        {isLoading ? <CardSkeletons n={3} /> : error ? <ErrorState error={error} onRetry={refetch} /> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[...data].sort((a, b) => b.learners - a.learners).slice(0, 6).map((c) => <CourseCard key={c.id} course={c} />)}</div>}
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">How StudyLoom works</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">{STEPS.map(([I, t, d], i) => <div key={t} className="text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/25"><I size={20} /></span><p className="mt-1 text-xs font-bold text-brand-600">STEP {i + 1}</p><h3 className="mt-1 font-semibold">{t}</h3><p className="mt-1 text-sm text-slate-500">{d}</p></div>)}</div>
        </div>
      </section>
    </>
  );
}
