import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { PhoneOff, ShieldCheck, Square, Radio } from "lucide-react";
import { useSession, useEndSession } from "../hooks/queries.js";
import * as api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Badge, ErrorState, Skeleton, Button } from "../components/ui/index.jsx";
import { clock } from "../utils/format.js";
import ClassRoom from "./myclass/ClassRoom.jsx";
import { MC, IS_MYCLASS_HOST } from "./myclass/base.js";

// Real video room (Jitsi, custom UI via ClassRoom). Attendance is credited by the SERVER from join + 30s heartbeats,
// so the time shown here is whatever the server has recorded, not a browser timer.
export default function LiveRoomPage() {
  const { sessionId } = useParams();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const inPortal = IS_MYCLASS_HOST || pathname.startsWith("/myclass");
  const { user } = useAuth();
  const { data: s, isLoading, error, refetch } = useSession(sessionId);
  const endMut = useEndSession();
  const [att, setAtt] = useState({ seconds: 0, status: "absent", classLive: true });
  const [joinErr, setJoinErr] = useState("");
  const joined = useRef(false);
  const isHost = !!s?.isHost;
  const isStudent = user?.role === "student";

  useEffect(() => {
    if (!s || s.status !== "live" || !isStudent || joined.current) return;
    joined.current = true;
    api.joinSession(sessionId).then((r) => setAtt((a) => ({ ...a, seconds: r.seconds }))).catch((e) => setJoinErr(e.message));
    const t = setInterval(() => api.heartbeat(sessionId).then((r) => { setAtt(r); if (!r.classLive) toast("The instructor ended this class"); }).catch(() => {}), 30000);
    const bye = () => navigator.sendBeacon?.(`/api/sessions/${sessionId}/leave`);
    window.addEventListener("pagehide", bye);
    return () => { clearInterval(t); window.removeEventListener("pagehide", bye); };
  }, [s?.status, isStudent, sessionId]);

  // smooth local tick between heartbeats
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((v) => v + 1), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { setTick(0); }, [att.seconds]);

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-900 p-10"><Skeleton className="h-96 w-full max-w-4xl bg-slate-700" /></div>;
  if (error) return <div className="flex h-screen items-center justify-center bg-slate-900 p-6"><div className="w-full max-w-md"><ErrorState error={error} onRetry={refetch} /><Button variant="secondary" className="mt-3 w-full" onClick={() => nav(-1)}>Go back</Button></div></div>;

  const back = inPortal ? MC("/classes") : isHost ? (user.role === "admin" ? "/admin" : "/instructor/dashboard") : "/dashboard/live-classes";
  const leave = async () => { if (isStudent && joined.current) await api.leaveSession(sessionId).catch(() => {}); nav(back); };
  const start = async () => { try { await api.startSession(sessionId); await refetch(); } catch (e) { toast.error(e.message); } };
  const end = async () => {
    if (!window.confirm("End this class for everyone?")) return;
    try { const r = await endMut.mutateAsync(sessionId); toast.success(r.certificatesIssued ? `Class ended · ${r.certificatesIssued} certificates issued` : "Class ended"); nav(back); } catch (e) { toast.error(e.message); }
  };

  const secs = att.seconds + (att.classLive ? tick : 0);
  const pct = Math.min(100, Math.round((secs / (s.durationMin * 60)) * 100));
  const tone = att.status === "present" ? "bg-emerald-500/20 text-emerald-300" : att.status === "partial" ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-slate-300";

  // Live class: full custom classroom UI
  if (s.status === "live" && !joinErr) {
    return (
      <div className="relative" style={{ height: "100dvh" }}>
        <ClassRoom
          roomName={`studyloom-b-${s.batchId || sessionId}`}
          displayName={user.name}
          email={user.email}
          subject={`${s.course?.title} · ${s.title}`}
          isInstructor={isHost}
          onLeave={leave}
          onEnd={isHost ? end : undefined}
        />
        {isStudent && (
          <span className={`pointer-events-none absolute left-1/2 top-3 z-10 hidden -translate-x-1/2 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold sm:flex ${tone}`}>
            <ShieldCheck size={13} />Attendance: <span className="capitalize">{att.status}</span> · {clock(secs)} ({pct}%)
          </span>
        )}
      </div>
    );
  }

  // Not live / error states
  return (
    <div className="flex h-screen flex-col bg-slate-950 text-white">
      <header className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3">
        {s.status === "live" ? <Badge tone="rose"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />LIVE</Badge> : <Badge tone="gray" className="capitalize">{s.status}</Badge>}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{s.title}</p>
          <p className="truncate text-xs text-slate-400">{s.course?.title} · {s.instructor}</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
          {isHost && s.status === "live" && <Button size="sm" variant="danger" loading={endMut.isPending} onClick={end}><Square size={13} />End class</Button>}
          <Button size="sm" variant="secondary" onClick={leave}><PhoneOff size={14} />Leave</Button>
        </div>
      </header>
      <div className="min-h-0 flex-1">
        {joinErr ? (
          <div className="flex h-full items-center justify-center p-6">
            <div className="max-w-sm text-center">
              <p className="font-semibold">Could not join</p>
              <p className="mt-1 text-sm text-slate-400">{joinErr}</p>
              <Button className="mt-4" onClick={() => nav(back)}>Back</Button>
            </div>
          </div>
        ) : s.status === "completed" ? (
          <div className="flex h-full items-center justify-center text-slate-400">This class has ended.</div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
            <Radio className="text-slate-500" size={40} />
            <p className="text-lg font-semibold">{isHost ? "This class has not started yet" : "Waiting for the instructor to start the class"}</p>
            {isHost ? <Button size="lg" onClick={start}>Start class now</Button> : <Button variant="secondary" onClick={() => refetch()}>Refresh</Button>}
          </div>
        )}
      </div>
    </div>
  );
}