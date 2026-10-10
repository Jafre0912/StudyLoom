import { useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Sun, Moon, CheckCircle2, Users } from "lucide-react";
import { useCourse, useSelectBatch, useEnrollments } from "../hooks/queries.js";
import { Button, ErrorState, Skeleton, ProgressBar } from "../components/ui/index.jsx";

export default function BatchSelectPage() {
  const { courseId } = useParams();
  const nav = useNavigate();
  const { data: c, error, refetch, isLoading } = useCourse(courseId);
  const { data: enrollments, isLoading: enLoading } = useEnrollments();
  const mutate = useSelectBatch();
  const [pick, setPick] = useState(null);

  if (error) return <div className="mx-auto max-w-xl p-10"><ErrorState error={error} onRetry={refetch} /></div>;
  if (isLoading || enLoading) return <div className="mx-auto max-w-3xl space-y-4 p-10"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-52 w-full" /></div>;
  const en = enrollments?.find((e) => e.courseId === c.id);
  if (!en) return <Navigate to={`/checkout/${c.slug}`} replace />;
  if (en.batch) return <Navigate to="/dashboard/courses" replace />;

  const confirm = async () => {
    try { await mutate.mutateAsync({ courseId: c.slug, batch: pick }); toast.success("Batch confirmed — see you in class!"); nav("/dashboard/courses"); }
    catch (e) { toast.error(e.message); refetch(); }
  };
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"><CheckCircle2 size={14} />Payment received</div>
      <h1 className="text-3xl font-bold tracking-tight">Choose your batch</h1>
      <p className="mt-1 text-slate-500">{c.title} · {c.classesPerWeek} live classes per week</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {c.batches.map((b) => {
          const I = b.key === "morning" ? Sun : Moon; const full = b.left <= 0 || !b.isOpen; const active = pick === b.key;
          return (
            <button key={b.key} disabled={full} onClick={() => setPick(b.key)} aria-pressed={active} className={`card p-6 text-left transition ${active ? "border-brand-500 ring-4 ring-brand-100" : "hover:border-brand-300 hover:shadow-lg"} ${full ? "opacity-50" : ""}`}>
              <div className="flex items-center justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><I size={22} /></span>{active && <CheckCircle2 className="text-brand-600" />}</div>
              <h3 className="mt-4 text-lg font-semibold">{b.label}</h3><p className="text-slate-600">{b.time}</p><p className="text-xs text-slate-500">{b.days.join(" · ")}</p>
              <ProgressBar className="mt-4" value={(b.taken / b.capacity) * 100} tone={b.left <= 6 ? "amber" : "brand"} />
              <p className={`mt-2 flex items-center gap-1.5 text-sm font-semibold ${b.left <= 6 ? "text-rose-600" : "text-emerald-600"}`}><Users size={14} />{full ? "Batch full" : `${b.left} of ${b.capacity} seats left`}</p>
            </button>
          );
        })}
      </div>
      <Button size="lg" className="mt-8 w-full sm:w-auto" disabled={!pick} loading={mutate.isPending} onClick={confirm}>Confirm batch</Button>
    </div>
  );
}
