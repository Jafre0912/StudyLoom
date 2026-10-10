import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal, SearchX } from "lucide-react";
import { useCourses, useCategories } from "../hooks/queries.js";
import CourseCard from "../components/course/CourseCard.jsx";
import { CardSkeletons, ErrorState, EmptyState, Button } from "../components/ui/index.jsx";

const PRICES = [["all", "Any price"], ["u5", "Under Rs. 5,000"], ["5-10", "Rs. 5,000 – 10,000"], ["o10", "Over Rs. 10,000"]];
const DURATIONS = [["all", "Any duration"], ["s", "Up to 4 weeks"], ["m", "5 – 8 weeks"], ["l", "9+ weeks"]];
const inPrice = (p, f) => f === "all" || (f === "u5" ? p < 5000 : f === "5-10" ? p >= 5000 && p <= 10000 : p > 10000);
const inDur = (w, f) => f === "all" || (f === "s" ? w <= 4 : f === "m" ? w > 4 && w <= 8 : w > 8);

function Select({ label, value, onChange, options }) {
  return <div><label className="label">{label}</label><select className="input" value={value} onChange={(e) => onChange(e.target.value)}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>;
}

export default function CoursesPage() {
  const [sp, setSp] = useSearchParams();
  const { data, isLoading, error, refetch } = useCourses();
  const CATEGORIES = useCategories().data || [];
  const [showFilters, setShowFilters] = useState(false);
  const f = { category: sp.get("category") || "all", level: sp.get("level") || "all", price: sp.get("price") || "all", schedule: sp.get("schedule") || "all", duration: sp.get("duration") || "all", sort: sp.get("sort") || "popular", q: sp.get("q") || "" };
  const set = (k, v) => { const n = new URLSearchParams(sp); v === "all" || v === "" ? n.delete(k) : n.set(k, v); setSp(n, { replace: true }); };

  const list = useMemo(() => {
    if (!data) return [];
    const q = f.q.toLowerCase();
    const r = data.filter((c) => (f.category === "all" || c.category === f.category) && (f.level === "all" || c.level === f.level) && inPrice(c.price, f.price) && inDur(c.weeks, f.duration) && (f.schedule === "all" || c.schedules.includes(f.schedule)) && (!q || c.title.toLowerCase().includes(q) || c.instructor.name.toLowerCase().includes(q)));
    const sorts = { popular: (a, b) => b.learners - a.learners, rating: (a, b) => b.rating - a.rating, low: (a, b) => a.price - b.price, high: (a, b) => b.price - a.price, soon: (a, b) => new Date(a.startDate) - new Date(b.startDate) };
    return r.sort(sorts[f.sort]);
  }, [data, sp]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Live Course Marketplace</h1>
      <p className="mt-1 text-slate-500">Instructor-led live classes. Choose your batch after enrolling.</p>
      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className={`${showFilters ? "block" : "hidden"} lg:block`}>
          <div className="card space-y-4 p-5 lg:sticky lg:top-24">
            <Select label="Category" value={f.category} onChange={(v) => set("category", v)} options={[["all", "All categories"], ...CATEGORIES.map((c) => [c.slug, c.name])]} />
            <Select label="Level" value={f.level} onChange={(v) => set("level", v)} options={[["all", "All levels"], ["beginner", "Beginner"], ["intermediate", "Intermediate"], ["advanced", "Advanced"]]} />
            <Select label="Price" value={f.price} onChange={(v) => set("price", v)} options={PRICES} />
            <Select label="Schedule" value={f.schedule} onChange={(v) => set("schedule", v)} options={[["all", "Any batch"], ["morning", "Morning · 7:00 AM"], ["evening", "Evening · 7:00 PM"]]} />
            <Select label="Duration" value={f.duration} onChange={(v) => set("duration", v)} options={DURATIONS} />
            <Button variant="ghost" className="w-full" onClick={() => setSp({}, { replace: true })}>Clear filters</Button>
          </div>
        </aside>
        <div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">{isLoading ? "Loading…" : <><b className="text-slate-900">{list.length}</b> courses{f.q && <> for “{f.q}”</>}</>}</p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" className="lg:hidden" onClick={() => setShowFilters((s) => !s)}><SlidersHorizontal size={15} />Filters</Button>
              <select aria-label="Sort" className="input w-auto py-2" value={f.sort} onChange={(e) => set("sort", e.target.value)}>
                <option value="popular">Most popular</option><option value="rating">Top rated</option><option value="soon">Starting soon</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option>
              </select>
            </div>
          </div>
          {isLoading ? <CardSkeletons /> : error ? <ErrorState error={error} onRetry={refetch} /> : list.length === 0 ? <EmptyState icon={SearchX} title="No courses match your filters" text="Try removing a filter or searching for something else." action={<Button onClick={() => setSp({}, { replace: true })}>Clear filters</Button>} /> : <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{list.map((c) => <CourseCard key={c.id} course={c} />)}</div>}
        </div>
      </div>
    </div>
  );
}
