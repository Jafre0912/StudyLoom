import { Loader2, Inbox, AlertTriangle, X } from "lucide-react";
import { useEffect } from "react";

const variants = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/20",
  secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
  ghost: "text-slate-600 hover:bg-slate-100",
  danger: "bg-red-600 text-white hover:bg-red-700",
  success: "bg-emerald-600 text-white hover:bg-emerald-700",
};
const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2.5 text-sm", lg: "px-6 py-3 text-base" };

export function Button({ variant = "primary", size = "md", loading, className = "", children, as: As = "button", ...p }) {
  return (
    <As {...p} disabled={p.disabled || loading} className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`}>
      {loading && <Loader2 size={16} className="animate-spin" />}{children}
    </As>
  );
}

const tones = { brand: "bg-brand-50 text-brand-700 ring-brand-200", green: "bg-emerald-50 text-emerald-700 ring-emerald-200", amber: "bg-amber-50 text-amber-700 ring-amber-200", red: "bg-red-50 text-red-700 ring-red-200", gray: "bg-slate-100 text-slate-600 ring-slate-200", rose: "bg-rose-50 text-rose-600 ring-rose-200" };
export const Badge = ({ tone = "gray", className = "", children }) => <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${tones[tone]} ${className}`}>{children}</span>;

export const statusTone = { present: "green", partial: "amber", absent: "red", paid: "green", pending: "amber", active: "green", suspended: "red", completed: "gray", live: "rose", upcoming: "brand", scheduled: "brand", pending_batch: "amber", success: "green", failed: "red" };

export const Skeleton = ({ className = "" }) => (
  <div className={`relative overflow-hidden rounded-lg bg-slate-200/70 ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
  </div>
);
export const CardSkeletons = ({ n = 6 }) => (
  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: n }).map((_, i) => (
    <div key={i} className="card overflow-hidden"><Skeleton className="aspect-video rounded-none" /><div className="space-y-3 p-4"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /><Skeleton className="h-3 w-full" /><Skeleton className="h-9 w-full" /></div></div>
  ))}</div>
);
export const RowSkeletons = ({ n = 4 }) => <div className="space-y-3">{Array.from({ length: n }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div>;

export function EmptyState({ icon: Icon = Inbox, title, text, action }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><Icon size={26} /></div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
export function ErrorState({ error, onRetry }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600"><AlertTriangle size={26} /></div>
      <h3 className="text-lg font-semibold">Something went wrong</h3>
      <p className="mt-1 text-sm text-slate-500">{error?.message || "Please try again."}</p>
      {onRetry && <Button variant="secondary" className="mt-5" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export const ProgressBar = ({ value, tone = "brand", className = "" }) => (
  <div className={`h-2 w-full overflow-hidden rounded-full bg-slate-100 ${className}`}>
    <div className={`h-full rounded-full transition-all duration-700 ${tone === "green" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-500" : "bg-brand-600"}`} style={{ width: `${Math.min(100, value)}%` }} />
  </div>
);

export function StatCard({ icon: Icon, label, value, hint, tone = "brand" }) {
  const bg = { brand: "bg-brand-50 text-brand-600", green: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600", rose: "bg-rose-50 text-rose-600" }[tone];
  return (
    <div className="card p-5 transition hover:-translate-y-0.5">
      <div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-500">{label}</p><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}><Icon size={18} /></span></div>
      <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => { if (!open) return; const h = (e) => e.key === "Escape" && onClose(); window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative max-h-[90vh] w-full overflow-auto rounded-2xl bg-white p-6 shadow-2xl animate-fadeUp ${wide ? "max-w-3xl" : "max-w-md"}`}>
        <div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-semibold">{title}</h3><button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={18} /></button></div>
        {children}
      </div>
    </div>
  );
}

export const PageHeader = ({ title, subtitle, action }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold tracking-tight">{title}</h1>{subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}</div>{action}</div>
);

export const Avatar = ({ name = "", size = 36, className = "" }) => {
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${className}`} style={{ width: size, height: size, fontSize: size / 2.6, background: `hsl(${hue} 60% 48%)` }}>{name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}</span>;
};

export const Tabs = ({ tabs, value, onChange }) => (
  <div className="inline-flex gap-1 rounded-xl bg-slate-100 p-1">
    {tabs.map((t) => <button key={t.id} onClick={() => onChange(t.id)} className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${value === t.id ? "bg-white text-brand-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>{t.label}{t.count != null && <span className="ml-1.5 text-xs text-slate-400">{t.count}</span>}</button>)}
  </div>
);

export const Logo = ({ light }) => (
  <span className="inline-flex items-center gap-2 text-xl font-extrabold tracking-tight">
    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-600/30">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M4 7c5 0 5 10 10 10M4 12c3 0 3 5 6 5M4 17h2M14 7c3 0 3 3 6 3"/></svg>
    </span>
    <span className={light ? "text-white" : "text-slate-900"}>Study<span className="text-brand-600">Loom</span></span>
  </span>
);
