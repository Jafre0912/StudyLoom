import { useState, useRef, useEffect } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { Search, ChevronDown, Menu, X, LogOut, LayoutDashboard } from "lucide-react";
import { Logo, Button, Avatar } from "../ui/index.jsx";
import { useCategories } from "../../hooks/queries.js";
import { useAuth, homeFor } from "../../context/AuthContext.jsx";

function Dropdown({ label, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => { const h = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false); document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  return (
    <div ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900" aria-expanded={open}>{label}<ChevronDown size={14} className={`transition ${open ? "rotate-180" : ""}`} /></button>
      {open && <div className="absolute left-0 top-full z-50 pt-2"><div className="card w-72 p-2 animate-fadeUp" onClick={() => setOpen(false)}>{children}</div></div>}
    </div>
  );
}
const item = "block rounded-lg px-3 py-2.5 text-sm text-slate-700 transition hover:bg-brand-50 hover:text-brand-700";
const link = ({ isActive }) => `rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-slate-100 ${isActive ? "text-brand-700" : "text-slate-600 hover:text-slate-900"}`;

export default function Navbar() {
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState(false);
  const [q, setQ] = useState("");
  const { user, logout } = useAuth();
  const CATEGORIES = useCategories().data || [];
  const nav = useNavigate();
  const { pathname } = useLocation();
  const go = (e) => { e.preventDefault(); nav(`/courses?q=${encodeURIComponent(q)}`); setSearch(false); setDrawer(false); };

  // close drawer when the page changes
  useEffect(() => setDrawer(false), [pathname]);
  // lock page scroll + Escape key while the drawer is open
  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    const onKey = (e) => e.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [drawer]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6">
          <Link to="/" className="mr-4"><Logo /></Link>
          <nav className="hidden items-center lg:flex">
            <Dropdown label="Courses">
              {CATEGORIES.map((c) => <Link key={c._id} to={`/courses?category=${c.slug}`} className={item}>{c.name}</Link>)}
              <Link to="/courses" className={`${item} mt-1 border-t border-slate-100 font-semibold text-brand-700`}>Browse all courses →</Link>
            </Dropdown>
            <NavLink to="/live-classes" className={link}>Live Classes</NavLink>
            <NavLink to="/learning-paths" className={link}>Learning Paths</NavLink>
            <NavLink to="/about" className={link}>About</NavLink>
          </nav>
          <div className="ml-auto hidden items-center gap-2 lg:flex">
            {search ? (
              <form onSubmit={go} className="flex items-center"><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => !q && setSearch(false)} placeholder="Search courses…" className="input w-56 py-2" /></form>
            ) : <button onClick={() => setSearch(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Search"><Search size={18} /></button>}
            {user ? (
              <>
                <Link to={homeFor(user.role)} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-medium hover:bg-slate-100"><Avatar name={user.name} size={28} />{user.name.split(" ")[0]}</Link>
                <button onClick={async () => { await logout(); nav("/"); }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Log out"><LogOut size={18} /></button>
              </>
            ) : (
              <>
                <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Login</Link>
                <Link to="/register" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Register</Link>
              </>
            )}
            <Button as={Link} to="/courses" size="sm">Explore Courses</Button>
          </div>
          <button className="ml-auto rounded-lg p-2 hover:bg-slate-100 lg:hidden" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu size={22} /></button>
        </div>
      </header>

      {/* Mobile drawer: OUTSIDE <header> on purpose. backdrop-blur on the header would trap a fixed child inside the 64px bar. */}
      {drawer && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Main menu">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col bg-white shadow-2xl animate-fadeUp">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5">
              <Logo />
              <button onClick={() => setDrawer(false)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Close menu"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <form onSubmit={go} className="relative mb-4"><Search size={16} className="absolute left-3 top-3.5 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses…" className="input pl-9" /></form>
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Courses</p>
              {CATEGORIES.map((c) => <Link key={c._id} to={`/courses?category=${c.slug}`} className={item}>{c.name}</Link>)}
              <div className="my-3 border-t border-slate-100" />
              {[["/live-classes", "Live Classes"], ["/learning-paths", "Learning Paths"], ["/about", "About"]].map(([to, l]) => <Link key={to} to={to} className={item}>{l}</Link>)}
            </div>

            <div className="shrink-0 space-y-2 border-t border-slate-100 p-5">
              {user ? (
                <>
                  <div className="mb-1 flex items-center gap-3"><Avatar name={user.name} size={36} /><div className="min-w-0 leading-tight"><p className="truncate text-sm font-semibold">{user.name}</p><p className="text-xs capitalize text-slate-500">{user.role}</p></div></div>
                  <Button as={Link} to={homeFor(user.role)} variant="secondary" className="w-full"><LayoutDashboard size={16} />Dashboard</Button>
                  <Button variant="ghost" className="w-full text-red-600" onClick={async () => { await logout(); setDrawer(false); nav("/"); }}><LogOut size={16} />Log out</Button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2"><Button as={Link} to="/login" variant="secondary">Login</Button><Button as={Link} to="/register" variant="secondary">Register</Button></div>
              )}
              <Button as={Link} to="/courses" className="w-full">Explore Courses</Button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}