import { Link } from "react-router-dom";
import { Star, CalendarDays, Clock, Users, Radio } from "lucide-react";
import { Badge } from "../ui/index.jsx";
import { money } from "../../utils/format.js";
const lvl = { beginner: "green", intermediate: "brand", advanced: "amber" };
export default function CourseCard({ course: c }) {
  return (
    <Link to={`/courses/${c.slug}`} className="card group flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-video overflow-hidden bg-slate-100">
        <img src={c.thumbnail} alt={c.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-rose-600 shadow"><Radio size={12} />Live</span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center gap-2"><Badge tone={lvl[c.level]} className="capitalize">{c.level}</Badge><span className="ml-auto flex items-center gap-1 text-xs font-semibold text-amber-600"><Star size={13} fill="currentColor" />{c.ratingCount ? c.rating : "New"}</span></div>
        <h3 className="line-clamp-2 font-semibold leading-snug transition group-hover:text-brand-700">{c.title}</h3>
        <p className="mt-1 text-sm text-slate-500">{c.instructor.name}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">
          <span className="flex items-center gap-1"><CalendarDays size={13} className="text-brand-600" />{c.weeks} Weeks</span>
          <span className="flex items-center gap-1"><Users size={13} className="text-brand-600" />{c.classesPerWeek} / Week</span>
          <span className="flex items-center gap-1"><Clock size={13} className="text-brand-600" />{c.minutesPerClass} Min</span>
        </div>
        <div className="mt-auto flex items-end justify-between pt-4"><div><span className="text-lg font-bold">{money(c.price)}</span><span className="ml-2 text-xs text-slate-400 line-through">{money(c.oldPrice)}</span></div><span className="text-sm font-semibold text-brand-600 transition group-hover:translate-x-0.5">View →</span></div>
      </div>
    </Link>
  );
}
