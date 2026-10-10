import { Link } from "react-router-dom";
import { Logo } from "../ui/index.jsx";
import { useCategories } from "../../hooks/queries.js";
export default function Footer() {
  const CATEGORIES = useCategories().data || [];
  return (
    <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-10 sm:px-6 md:grid-cols-4 md:gap-10 md:py-12">
  <div className="col-span-2 md:col-span-1"><Logo /><p className="mt-3 text-sm text-slate-500">Learn. Practice. Build.<br />Instructor-led live classes with real-time attendance and verifiable certificates.</p></div>
        <div><h4 className="mb-3 text-sm font-semibold">Courses</h4><ul className="space-y-2 text-sm text-slate-500">{CATEGORIES.slice(0, 5).map((c) => <li key={c._id}><Link className="hover:text-brand-700" to={`/courses?category=${c.slug}`}>{c.name}</Link></li>)}</ul></div>
        <div><h4 className="mb-3 text-sm font-semibold">Platform</h4><ul className="space-y-2 text-sm text-slate-500"><li><Link className="hover:text-brand-700" to="/live-classes">Live Classes</Link></li><li><Link className="hover:text-brand-700" to="/learning-paths">Learning Paths</Link></li><li><Link className="hover:text-brand-700" to="/about">About</Link></li></ul></div>
        <div><h4 className="mb-3 text-sm font-semibold">Contact</h4><ul className="space-y-2 text-sm text-slate-500"><li>hello@studyloom.com</li><li>Kathmandu, Nepal</li><li>Sun–Fri · 9 AM – 6 PM</li></ul></div>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">© {new Date().getFullYear()} StudyLoom. All rights reserved.</div>
    </footer>
  );
}
