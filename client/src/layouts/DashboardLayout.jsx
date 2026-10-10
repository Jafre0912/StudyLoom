import { useState, useEffect } from "react";
import { NavLink, Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, BookOpen, Video, CalendarCheck, Award, CreditCard, User, Menu, X, LogOut, Home } from "lucide-react";
import { Avatar } from "../components/ui/index.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const NAV = [
  ["/dashboard", "Dashboard", LayoutDashboard, true], ["/dashboard/courses", "My Courses", BookOpen], ["/dashboard/live-classes", "Live Classes", Video],
  ["/dashboard/attendance", "Attendance", CalendarCheck], ["/dashboard/certificates", "Certificates", Award], ["/dashboard/payments", "Payments", CreditCard], ["/dashboard/profile", "Profile", User],
];

/* Logo for the white header */
const HeaderLogo = () => (
  <Link to="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-slate-900">
    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-600/30">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M4 7c5 0 5 10 10 10M4 12c3 0 3 5 6 5M4 17h2M14 7c3 0 3 3 6 3" /></svg>
    </span>
    <span className="hidden sm:inline">Study<span className="text-brand-600">Loom</span></span>
  </Link>
);

/* ---------- TOP HEADER (full width, white) ---------- */
function Header({ onMenu, menuOpen, subtitle }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center gap-2 border-b border-slate-200 bg-white px-3 shadow-sm sm:gap-3 sm:px-5">
      <button onClick={onMenu} className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100" aria-label="Toggle menu">{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
      <HeaderLogo />
      {subtitle && <span className="ml-1 hidden rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700 md:inline">{subtitle}</span>}

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <Link to="/" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50" aria-label="Back to site">
          <Home size={16} /><span className="hidden md:inline">Back to site</span>
        </Link>
        <span className="hidden h-8 w-px bg-slate-200 sm:block" />
        <div className="flex items-center gap-3">
          <Avatar name={user?.name} size={36} className="ring-2 ring-brand-100" />
          <div className="hidden min-w-0 leading-tight sm:block">
            <p className="max-w-[150px] truncate text-sm font-semibold text-slate-900">{user?.name}</p>
            <p className="text-xs capitalize text-slate-500">{user?.role}</p>
          </div>
        </div>
        <button onClick={async () => { await logout(); nav("/"); }} className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100" aria-label="Log out">
          <LogOut size={16} /><span className="hidden sm:inline">Log out</span>
        </button>
      </div>
    </header>
  );
}

/* ---------- SIDEBAR links ---------- */
function SideNav({ items = NAV, onNavigate, className = "space-y-1 p-3 pt-0" }) {
  return (
    <nav className={className}>
      {items.map(([to, label, Icon, end]) => (
        <NavLink key={to} to={to} end={end} onClick={onNavigate}
          className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition lg:py-2.5 ${isActive ? "bg-brand-50 text-brand-700 shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>
          <Icon size={18} />{label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function DashboardLayout({ items, subtitle }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();

  const toggle = () => (window.innerWidth >= 1024 ? setCollapsed((c) => !c) : setMobileOpen((o) => !o));

  useEffect(() => setMobileOpen(false), [pathname]); // close drawer after navigating
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    const onKey = (e) => e.key === "Escape" && setMobileOpen(false);
    const onResize = () => window.innerWidth >= 1024 && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); window.removeEventListener("resize", onResize); };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header onMenu={toggle} menuOpen={mobileOpen} subtitle={subtitle} />

      {/* Desktop sidebar */}
      <aside className={`fixed bottom-0 left-0 top-16 z-30 hidden w-64 overflow-y-auto border-r border-slate-200 bg-white transition-transform duration-200 lg:block ${collapsed ? "-translate-x-full" : ""}`}>
        <SideNav items={items} />
      </aside>

      {/* Mobile drawer: sits ON TOP of the page, below the header */}
      {mobileOpen && (
        <div className="fixed inset-x-0 bottom-0 top-16 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col bg-white shadow-2xl animate-fadeUp">
            {subtitle && <p className="px-5 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-slate-400">{subtitle} menu</p>}
            <div className="flex-1 overflow-y-auto"><SideNav items={items} className="space-y-1 p-3" /></div>
            <div className="shrink-0 border-t border-slate-100 p-4">
              <div className="mb-3 flex items-center gap-3"><Avatar name={user?.name} size={38} /><div className="min-w-0 leading-tight"><p className="truncate text-sm font-semibold">{user?.name}</p><p className="text-xs capitalize text-slate-500">{user?.role}</p></div></div>
              <div className="grid grid-cols-2 gap-2">
                <Link to="/" className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"><Home size={15} />Site</Link>
                <button onClick={async () => { await logout(); nav("/"); }} className="flex items-center justify-center gap-1.5 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100"><LogOut size={15} />Log out</button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Page content */}
      <div className={`pt-16 transition-[padding] duration-200 ${collapsed ? "lg:pl-0" : "lg:pl-64"}`}>
        <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}