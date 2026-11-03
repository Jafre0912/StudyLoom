import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Video, Radio, Play } from "lucide-react";
import { useSessions, useStartSession } from "../../hooks/queries.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { PageHeader, Tabs, Button, Badge, RowSkeletons, ErrorState, EmptyState } from "../../components/ui/index.jsx";
import { fmtDay, fmtTime } from "../../utils/format.js";
import { MC, MYCLASS_URL, IS_MYCLASS_HOST } from "../myclass/base.js";

export default function LiveClasses() {
  const { user } = useAuth();
  const isHost = user?.role === "instructor" || user?.role === "admin";
  const { data, isLoading, error, refetch } = useSessions();
  const start = useStartSession();
  const [tab, setTab] = useState("live");
  const nav = useNavigate();
  const by = (s) => (data || []).filter((x) => x.status === (s === "upcoming" ? "scheduled" : s));
  const list = tab === "completed" ? by("completed").reverse() : by(tab);

  const join = (s) => {
    const path = `/live-class/${s.id}`;
    if (MYCLASS_URL.startsWith("http") && !IS_MYCLASS_HOST) { window.location.href = `${MYCLASS_URL}${path}`; return; }
    nav(MC(path));
  };
  const open = async (s) => {
    try {
      if (isHost && s.status !== "live") await start.mutateAsync(s.id);
      join(s);
    } catch (e) { toast.error(e.message); }
  };

  return (
    <>
      <PageHeader title="Live Classes" subtitle="Join live sessions, see what is next, and review past classes." />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "live", label: "Live Now", count: by("live").length }, { id: "upcoming", label: "Upcoming", count: by("upcoming").length }, { id: "completed", label: "Completed", count: by("completed").length }]} />
      <div className="mt-6 space-y-3">
        {isLoading ? <RowSkeletons /> : error ? <ErrorState error={error} onRetry={refetch} /> : list.length === 0 ? <EmptyState icon={Video} title={`No ${tab === "live" ? "live" : tab} classes`} text="Check another tab or browse more courses." /> : list.map((s) => (
          <div key={s.id} className="card flex flex-wrap items-center gap-4 p-4">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${s.status === "live" ? "bg-rose-50 text-rose-600" : "bg-brand-50 text-brand-600"}`}>{s.status === "live" ? <Radio size={20} /> : <Video size={20} />}</span>
            <div className="min-w-[12rem] flex-1">
              <p className="font-semibold">{s.title}</p>
              <p className="text-sm text-slate-500">{s.course?.title} · {s.moduleTitle}</p>
              <p className="mt-0.5 text-xs text-slate-400">{s.instructor} · {fmtDay(s.startsAt)} · {fmtTime(s.startsAt)} · {s.batchTime} · {s.durationMin} min</p>
            </div>
            {s.status === "live" && <><Badge tone="rose"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />{s.students} in class</Badge>
              <Button onClick={() => open(s)}>{isHost ? "Rejoin class" : "Join Class"}</Button></>}
            {s.status === "scheduled" && (isHost
              ? <Button variant="secondary" loading={start.isPending && start.variables === s.id} onClick={() => open(s)}><Play size={15} />Start class</Button>
              : <Badge tone="brand">Scheduled</Badge>)}
            {s.status === "completed" && <Badge tone="gray">Completed</Badge>}
          </div>))}
      </div>
    </>
  );
}