import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Mic, MicOff, Video, VideoOff, Hand, PhoneOff, MonitorUp, Send, VolumeX } from "lucide-react";

const DOMAIN = import.meta.env.VITE_JITSI_DOMAIN || "meet.jit.si";
const CTL = "[[SL]]"; // chhupe control sandesh (screen-share permission), chat mein nahi dikhte

const loadApi = () =>
  new Promise((resolve, reject) => {
    if (window.JitsiMeetExternalAPI) return resolve();
    const s = document.createElement("script");
    s.src = `https://${DOMAIN}/external_api.js`;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Could not load the class room"));
    document.body.appendChild(s);
  });

const initials = (n = "") => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

const Btn = ({ on, danger, dim, title, onClick, children }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={`flex h-12 w-12 items-center justify-center rounded-full text-white transition ${
      danger ? "bg-red-600 hover:bg-red-700" : on ? "bg-blue-600 hover:bg-blue-700" : "bg-white/10 ring-1 ring-white/30 hover:bg-white/20"
    } ${dim ? "opacity-60" : ""}`}
  >
    {children}
  </button>
);

export default function ClassRoom({ roomName, displayName, email, subject, isInstructor, onLeave, onEnd }) {
  const box = useRef(null);
  const api = useRef(null);
  const chatEnd = useRef(null);
  const ids = useRef({ me: null, host: null });
  const sharingRef = useRef(false);
  const onLeaveRef = useRef(onLeave);
  onLeaveRef.current = onLeave;

  const [status, setStatus] = useState("loading"); // loading | live | error
  const [muted, setMuted] = useState(!isInstructor);
  const [camOff, setCamOff] = useState(!isInstructor);
  const [hand, setHand] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [canShare, setCanShare] = useState(false); // student: teacher ne permission di?
  const [pending, setPending] = useState(false);   // student: request bhej di
  const [requests, setRequests] = useState([]);    // teacher: kaun maang raha hai
  const [granted, setGranted] = useState([]);      // teacher: kisko di hai
  const [people, setPeople] = useState([]);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");

  const cmd = (...a) => api.current?.executeCommand(...a);
  const ctl = (obj) => cmd("sendChatMessage", CTL + JSON.stringify(obj));

  useEffect(() => {
    let dead = false;
    let j;
    const refresh = () =>
      j && setPeople((j.getParticipantsInfo() || []).map((p) => ({ id: p.participantId, name: p.displayName || "Guest" })));
    const announce = () => { if (isInstructor) setTimeout(() => ctl({ t: "host" }), 1500); };

    loadApi()
      .then(() => {
        if (dead || !box.current) return;
        j = new window.JitsiMeetExternalAPI(DOMAIN, {
          roomName,
          parentNode: box.current,
          width: "100%",
          height: "100%",
          userInfo: { displayName, email },
          configOverwrite: {
            prejoinConfig: { enabled: false },
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            startWithAudioMuted: !isInstructor,
            startWithVideoMuted: !isInstructor,
            toolbarButtons: [],
            disableInviteFunctions: true,
            hideConferenceSubject: true,
            subject,
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [],
            SHOW_JITSI_WATERMARK: false,
            SHOW_BRAND_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            DEFAULT_BACKGROUND: "#0b1220",
          },
        });
        api.current = j;

        j.addListener("videoConferenceJoined", (e) => { ids.current.me = e.id; setStatus("live"); refresh(); announce(); });
        j.addListener("participantJoined", () => { refresh(); announce(); });
        j.addListener("participantLeft", refresh);
        j.addListener("displayNameChange", refresh);

        j.addListener("incomingMessage", (e) => {
          const raw = e.message || "";
          if (raw.startsWith(CTL)) {
            let d;
            try { d = JSON.parse(raw.slice(CTL.length)); } catch { return; }
            if (d.t === "host") {
              if (!isInstructor) ids.current.host = e.from;
            } else if (d.t === "req" && isInstructor) {
              setRequests((r) => (r.includes(e.from) ? r : [...r, e.from]));
              toast(`${e.nick || "A student"} wants to share their screen`);
            } else if (!isInstructor && e.from === ids.current.host && d.to === ids.current.me) {
              if (d.t === "allow") { setCanShare(true); setPending(false); toast.success("The teacher allowed you to share your screen"); }
              if (d.t === "deny") { setPending(false); toast("The teacher declined your request"); }
              if (d.t === "revoke") {
                setCanShare(false); setPending(false);
                if (sharingRef.current) j.executeCommand("toggleShareScreen"); // chal raha ho toh band
                toast("Screen sharing was turned off by the teacher");
              }
            }
            return; // control sandesh chat mein nahi dikhna chahiye
          }
          setMsgs((m) => [...m, { from: e.nick || e.from || "User", text: raw, me: false }]);
        });

        j.addListener("audioMuteStatusChanged", (e) => setMuted(e.muted));
        j.addListener("videoMuteStatusChanged", (e) => setCamOff(e.muted));
        j.addListener("screenSharingStatusChanged", (e) => { sharingRef.current = e.on; setSharing(e.on); });
      })
      .catch(() => setStatus("error"));

    return () => {
      dead = true;
      api.current?.dispose();
      api.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName]);

  useEffect(() => {
    // 12 second mein join na ho toh parda hatao, taaki Jitsi ka apna message dikhe
    const t = setTimeout(() => setStatus((s) => (s === "loading" ? "live" : s)), 12000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const leave = () => { cmd("hangup"); onLeaveRef.current?.(); };
  const send = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || t.startsWith(CTL)) return;
    cmd("sendChatMessage", t);
    setMsgs((m) => [...m, { from: "You", text: t, me: true }]);
    setText("");
  };

  // Teacher side
  const allow = (id) => { ctl({ t: "allow", to: id }); setGranted((g) => [...new Set([...g, id])]); setRequests((r) => r.filter((x) => x !== id)); };
  const deny = (id) => { ctl({ t: "deny", to: id }); setRequests((r) => r.filter((x) => x !== id)); };
  const revoke = (id) => { ctl({ t: "revoke", to: id }); setGranted((g) => g.filter((x) => x !== id)); };

  // Share button: teacher seedha; student tabhi jab permission mili ho, warna request jaati hai
  const share = () => {
    if (isInstructor || canShare) return cmd("toggleShareScreen");
    if (pending) return toast("Request already sent to the teacher");
    ctl({ t: "req" });
    setPending(true);
    setTimeout(() => setPending(false), 30000); // 30 second baad dobara maang sakta hai
    toast("Asked the teacher for permission to share your screen");
  };

  return (
    <div className="flex h-screen flex-col bg-[#0b1220] text-white">
      <div className="flex h-14 shrink-0 items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />LIVE
          </span>
          <p className="truncate text-sm font-medium text-slate-200">{subject}</p>
        </div>
        <div className="flex items-center gap-2">
          {isInstructor && requests.length > 0 && (
            <span className="rounded-full bg-amber-500 px-2.5 py-1 text-xs font-semibold text-black">{requests.length} share request</span>
          )}
          {isInstructor && (
            <button onClick={() => cmd("muteEveryone")} className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20">
              <VolumeX size={15} />Mute all
            </button>
          )}
          {isInstructor && onEnd && (
            <button onClick={onEnd} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold hover:bg-red-700">End class</button>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-72 shrink-0 flex-col bg-white text-slate-800 md:flex">
          <div className="border-b border-slate-200 px-4 py-3">
            <p className="text-xs font-semibold tracking-wide text-slate-500">USERS ({people.length})</p>
            <ul className="mt-2 max-h-52 space-y-2 overflow-y-auto">
              {people.map((p) => {
                const me = p.id === ids.current.me;
                const asking = requests.includes(p.id);
                const ok = granted.includes(p.id);
                return (
                  <li key={p.id} className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-900 text-xs font-bold text-white">{initials(p.name)}</span>
                    <span className="min-w-0 flex-1 truncate text-sm">{p.name}{me ? " (You)" : ""}</span>
                    {isInstructor && !me && (ok ? (
                      <button onClick={() => revoke(p.id)} className="rounded bg-slate-200 px-2 py-0.5 text-xs hover:bg-slate-300">Revoke</button>
                    ) : asking ? (
                      <>
                        <button onClick={() => allow(p.id)} className="rounded bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-emerald-700">Allow</button>
                        <button onClick={() => deny(p.id)} className="rounded bg-slate-200 px-2 py-0.5 text-xs hover:bg-slate-300">No</button>
                      </>
                    ) : (
                      <button onClick={() => allow(p.id)} className="rounded bg-slate-100 px-2 py-0.5 text-xs hover:bg-slate-200">Allow share</button>
                    ))}
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="flex min-h-0 flex-1 flex-col px-4 py-3">
            <p className="text-xs font-semibold tracking-wide text-slate-500">PUBLIC CHAT</p>
            <div className="mt-2 flex-1 space-y-2 overflow-y-auto">
              {msgs.length === 0 && <p className="text-sm text-slate-400">No messages yet.</p>}
              {msgs.map((m, i) => (
                <div key={i} className={`rounded-lg px-3 py-2 text-sm ${m.me ? "bg-blue-50" : "bg-slate-100"}`}>
                  <p className="text-xs font-semibold text-slate-500">{m.from}</p>
                  <p className="break-words">{m.text}</p>
                </div>
              ))}
              <div ref={chatEnd} />
            </div>
            <form onSubmit={send} className="mt-2 flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              <button type="submit" className="rounded-lg bg-blue-600 px-3 text-white hover:bg-blue-700"><Send size={16} /></button>
            </form>
          </div>
        </aside>

        <main className="relative min-w-0 flex-1">
          <div ref={box} className="absolute inset-0" />
          {status !== "live" && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0b1220] text-slate-300">
              {status === "error" ? "Could not load the class room. Refresh the page." : "Joining class…"}
            </div>
          )}
        </main>
      </div>

      <div className="flex h-20 shrink-0 items-center justify-center gap-4">
        <Btn title="Raise hand" on={hand} onClick={() => { cmd("toggleRaiseHand"); setHand((h) => !h); }}><Hand size={20} /></Btn>
        <Btn title={muted ? "Unmute" : "Mute"} danger={muted} onClick={() => cmd("toggleAudio")}>{muted ? <MicOff size={20} /> : <Mic size={20} />}</Btn>
        <Btn title={camOff ? "Start camera" : "Stop camera"} danger={camOff} onClick={() => cmd("toggleVideo")}>{camOff ? <VideoOff size={20} /> : <Video size={20} />}</Btn>
        <Btn
          title={isInstructor || canShare ? "Share screen" : "Ask the teacher to let you share your screen"}
          on={sharing}
          dim={!isInstructor && !canShare}
          onClick={share}
        ><MonitorUp size={20} /></Btn>
        <Btn title="Leave class" danger onClick={leave}><PhoneOff size={20} /></Btn>
      </div>
    </div>
  );
}