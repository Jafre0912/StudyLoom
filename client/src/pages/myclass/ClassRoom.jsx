import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Mic, MicOff, Video, VideoOff, Hand, PhoneOff, MonitorUp, Send, VolumeX, Maximize, Minimize, MessageSquare, X } from "lucide-react";

const DOMAIN = import.meta.env.VITE_JITSI_DOMAIN || "meet.jit.si";
const CTL = "[[SL]]"; // chhupe control sandesh (share permission, teacher ki screen). Chat mein nahi dikhte.

const DESKTOP_Q = "(min-width: 768px) and (min-height: 521px)";
const COMPACT_Q = "(orientation: landscape) and (max-height: 520px)"; 
const CAN_CAPTURE = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia;
{CAN_CAPTURE && (
  <Btn sm={compact} title={isInstructor || canShare ? "Share screen" : "Ask the teacher to let you share your screen"} on={sharing} dim={!isInstructor && !canShare} onClick={share}><MonitorUp size={20} /></Btn>
)}

const loadApi = (domain, appId) =>
  new Promise((resolve, reject) => {
    if (window.JitsiMeetExternalAPI) return resolve();
    const s = document.createElement("script");
    s.src = appId ? `https://${domain}/${appId}/external_api.js` : `https://${domain}/external_api.js`;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Could not load the class room"));
    document.body.appendChild(s);
  });

const initials = (n = "") => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

function useMedia(q) {
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [q]);
  return m;
}

const Btn = ({ on, danger, dim, sm, badge, title, onClick, children }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={`relative flex shrink-0 items-center justify-center rounded-full text-white transition ${sm ? "h-10 w-10" : "h-11 w-11 sm:h-12 sm:w-12"} ${
      danger ? "bg-red-600 hover:bg-red-700" : on ? "bg-blue-600 hover:bg-blue-700" : "bg-white/10 ring-1 ring-white/30 hover:bg-white/20"
    } ${dim ? "opacity-60" : ""}`}
  >
    {children}
    {badge > 0 && (
      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-bold text-black">{badge}</span>
    )}
  </button>
);

export default function ClassRoom({ roomName, displayName, email, subject, isInstructor, onLeave, onEnd, jaas }) {  const box = useRef(null);
  const api = useRef(null);
  const chatEnd = useRef(null);
  const ids = useRef({ me: null, host: null, hostSharing: false });
  const sharingRef = useRef(false);
  const onLeaveRef = useRef(onLeave);
  onLeaveRef.current = onLeave;

  const desktop = useMedia(DESKTOP_Q);
  const compact = useMedia(COMPACT_Q);

  const [status, setStatus] = useState("loading"); // loading | live | error
  const [muted, setMuted] = useState(!isInstructor);
  const [camOff, setCamOff] = useState(!isInstructor);
  const [hand, setHand] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [canShare, setCanShare] = useState(false); // student: teacher ne screen share allow kiya?
  const [pending, setPending] = useState(false);   // student: request bhej di
  const [requests, setRequests] = useState([]);    // teacher: kaun screen share maang raha hai
  const [granted, setGranted] = useState([]);      // teacher: kisko allow kiya
  const [people, setPeople] = useState([]);
  const [meId, setMeId] = useState(null);
  const [hostId, setHostId] = useState(null);
  const [hostSharing, setHostSharing] = useState(false);
  const [focusKey, setFocusKey] = useState("");
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [chatOpen, setChatOpen] = useState(() => window.matchMedia(DESKTOP_Q).matches);
  const [unread, setUnread] = useState(0);
  const [fs, setFs] = useState(false);
  const chatOpenRef = useRef(chatOpen);
  chatOpenRef.current = chatOpen;

  const cmd = (...a) => api.current?.executeCommand(...a);
  const ctl = (obj) => cmd("sendChatMessage", CTL + JSON.stringify(obj));
  // Kisi ko bada (large video) dikhao. type: "camera" ya "desktop" (screen share)
  const focus = (id, type = "camera") => {
    if (!id) return;
    cmd("setLargeVideoParticipant", id, type);
    setFocusKey(`${id}:${type}`);
  };

  useEffect(() => {
    const on = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  useEffect(() => {
    let dead = false;
    let j;
    const small = window.innerWidth < 900 || window.innerHeight < 520; // phone
    const refresh = () =>
      j && setPeople((j.getParticipantsInfo() || []).map((p) => ({ id: p.participantId, name: p.displayName || "Guest" })));
    const announce = () => { if (isInstructor) setTimeout(() => ctl({ t: "host", sharing: sharingRef.current }), 1500); };

    loadApi()
      .then(() => {
        if (dead || !box.current) return;
        j = new window.JitsiMeetExternalAPI(jaas ? "8x8.vc" : DOMAIN, {
          roomName: jaas ? `${jaas.appId}/${jaas.room}` : roomName,
           jwt: jaas?.token,
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
            toolbarButtons: [], // Jitsi ka apna toolbar chhupa do
            disableInviteFunctions: true,
            hideConferenceSubject: true,
            subject,
            // Student ke liye: grid view band, aur phone pe thumbnails band, taaki teacher bada dikhe
            disableTileView: !isInstructor,
            tileView: { disabled: !isInstructor },
            filmstrip: { disabled: !isInstructor && small },
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

        j.addListener("videoConferenceJoined", (e) => {
          ids.current.me = e.id;
          setMeId(e.id);
          if (isInstructor) { ids.current.host = e.id; setHostId(e.id); }
          setStatus("live");
          refresh();
          announce();
        });
        j.addListener("participantJoined", () => { refresh(); announce(); });
        j.addListener("participantLeft", refresh);
        j.addListener("displayNameChange", refresh);

        j.addListener("incomingMessage", (e) => {
          const raw = e.message || "";
          if (raw.startsWith(CTL)) {
            let d;
            try { d = JSON.parse(raw.slice(CTL.length)); } catch { return; }

            if (d.t === "host" && !isInstructor) {
              const sh = !!d.sharing;
              const changed = ids.current.host !== e.from || ids.current.hostSharing !== sh;
              ids.current.host = e.from;
              ids.current.hostSharing = sh;
              setHostId(e.from);
              setHostSharing(sh);
              if (changed) focus(e.from, sh ? "desktop" : "camera");
            } else if (d.t === "share" && !isInstructor && e.from === ids.current.host) {
              ids.current.hostSharing = !!d.on;
              setHostSharing(!!d.on);
              setTimeout(() => focus(e.from, d.on ? "desktop" : "camera"), d.on ? 800 : 0);
            } else if (d.t === "req" && isInstructor) {
              setRequests((r) => (r.includes(e.from) ? r : [...r, e.from]));
              toast(`${e.nick || "A student"} wants to share their screen`);
            } else if (!isInstructor && e.from === ids.current.host && d.to === ids.current.me) {
              if (d.t === "allow") { setCanShare(true); setPending(false); toast.success("The teacher allowed you to share your screen"); }
              if (d.t === "deny") { setPending(false); toast("The teacher declined your request"); }
              if (d.t === "revoke") {
                setCanShare(false); setPending(false);
                if (sharingRef.current) j.executeCommand("toggleShareScreen");
                toast("Screen sharing was turned off by the teacher");
              }
            }
            return; // control sandesh chat mein nahi dikhna chahiye
          }
          setMsgs((m) => [...m, { from: e.nick || e.from || "User", text: raw, me: false }]);
          if (!chatOpenRef.current) setUnread((u) => u + 1);
        });

        j.addListener("audioMuteStatusChanged", (e) => setMuted(e.muted));
        j.addListener("videoMuteStatusChanged", (e) => setCamOff(e.muted));
        j.addListener("screenSharingStatusChanged", (e) => {
          sharingRef.current = e.on;
          setSharing(e.on);
          if (isInstructor) ctl({ t: "share", on: e.on }); // students ko batao: teacher ki screen aa gayi / chali gayi
        });
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

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, chatOpen]);

  const leave = () => { cmd("hangup"); onLeaveRef.current?.(); };
  const toggleChat = () => { setChatOpen((o) => !o); setUnread(0); };
  const send = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || t.startsWith(CTL)) return;
    cmd("sendChatMessage", t);
    setMsgs((m) => [...m, { from: "You", text: t, me: true }]);
    setText("");
  };

  // Teacher side: screen share permission
  const allow = (id) => { ctl({ t: "allow", to: id }); setGranted((g) => [...new Set([...g, id])]); setRequests((r) => r.filter((x) => x !== id)); };
  const deny = (id) => { ctl({ t: "deny", to: id }); setRequests((r) => r.filter((x) => x !== id)); };
  const revoke = (id) => { ctl({ t: "revoke", to: id }); setGranted((g) => g.filter((x) => x !== id)); };

  // Share button: teacher seedha; student tabhi jab permission mili ho, warna request jaati hai
  const share = () => {
    if (isInstructor || canShare) return cmd("toggleShareScreen");
    if (pending) return toast("Request already sent to the teacher");
    ctl({ t: "req" });
    setPending(true);
    setTimeout(() => setPending(false), 30000);
    toast("Asked the teacher for permission to share your screen");
  };

  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) { await document.exitFullscreen(); return; }
      await document.documentElement.requestFullscreen();
      await Promise.resolve(window.screen.orientation?.lock?.("landscape")).catch(() => {});
    } catch {
      toast("Rotate your phone sideways for a bigger view");
    }
  };

  const chipName = (p) => `${p.id === meId ? "You" : p.name.split(" ")[0]}${p.id === hostId ? " · Teacher" : ""}`;

  // Users + chat panel (PC pe left sidebar, phone pe overlay)
  const panel = (
    <div className="flex h-full min-h-0 flex-col bg-white text-slate-800">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
        <p className="text-xs font-semibold tracking-wide text-slate-500">USERS ({people.length}) · CHAT</p>
        <button onClick={toggleChat} aria-label="Close chat"><X size={18} /></button>
      </div>
      <ul className="max-h-40 shrink-0 space-y-2 overflow-y-auto border-b border-slate-200 px-4 py-3">
        {people.map((p) => {
          const me = p.id === meId;
          const asking = requests.includes(p.id);
          const ok = granted.includes(p.id);
          return (
            <li key={p.id} className="flex items-center gap-2">
              <button onClick={() => focus(p.id)} title="Show on the big screen" className="flex min-w-0 flex-1 items-center gap-2 text-left">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-900 text-xs font-bold text-white">{initials(p.name)}</span>
                <span className="truncate text-sm">{p.name}{me ? " (You)" : ""}{p.id === hostId ? " · Teacher" : ""}</span>
              </button>
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
      <div className="flex min-h-0 flex-1 flex-col px-4 py-3">
        <div className="flex-1 space-y-2 overflow-y-auto">
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
    </div>
  );

  return (
    <div className="flex flex-col bg-[#0b1220] text-white" style={{ height: "100dvh" }}>
      {/* Top bar */}
      <div className={`flex shrink-0 items-center justify-between px-3 sm:px-4 ${compact ? "h-9" : "h-14"}`}>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />LIVE
          </span>
          <p className="truncate text-xs font-medium text-slate-200 sm:text-sm">{subject}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isInstructor && requests.length > 0 && (
            <span className="rounded-full bg-amber-500 px-2.5 py-1 text-xs font-semibold text-black">{requests.length} share request</span>
          )}
          {isInstructor && (
            <button onClick={() => cmd("muteEveryone")} className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs hover:bg-white/20 sm:px-3 sm:text-sm">
              <VolumeX size={15} /><span className="hidden sm:inline">Mute all</span>
            </button>
          )}
          {isInstructor && onEnd && (
            <button onClick={onEnd} className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold hover:bg-red-700 sm:px-3 sm:text-sm">End class</button>
          )}
        </div>
      </div>

      {/* Stage + panel */}
      <div className="relative flex min-h-0 flex-1">
        {desktop && chatOpen && <aside className="w-72 shrink-0">{panel}</aside>}

        <main className="relative min-w-0 flex-1">
          <div ref={box} className="absolute inset-0" />
          {status !== "live" && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0b1220] px-6 text-center text-slate-300">
              {status === "error" ? "Could not load the class room. Refresh the page." : "Joining class…"}
            </div>
          )}
        </main>

        {!desktop && chatOpen && (
          <div className={`absolute z-30 overflow-hidden shadow-2xl ${compact ? "inset-y-0 right-0 w-80 max-w-[70%]" : "inset-x-0 bottom-0 h-[62%] rounded-t-2xl"}`}>
            {panel}
          </div>
        )}
      </div>

      {/* Phone (portrait): kisko bada dekhna hai, tap karo */}
      {!desktop && !compact && (
        <div className="flex shrink-0 gap-2 overflow-x-auto px-3 py-2">
          {hostSharing && !isInstructor && hostId && (
            <button onClick={() => focus(hostId, "desktop")}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${focusKey === `${hostId}:desktop` ? "bg-blue-600" : "bg-white/10"}`}>
              <MonitorUp size={13} />Teacher screen
            </button>
          )}
          {people.map((p) => (
            <button key={p.id} onClick={() => focus(p.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${focusKey === `${p.id}:camera` ? "bg-blue-600" : "bg-white/10"}`}>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-900 text-[10px] font-bold">{initials(p.name)}</span>
              {chipName(p)}
            </button>
          ))}
        </div>
      )}

      {/* Bottom bar */}
      <div className={`flex shrink-0 items-center justify-center gap-2 px-2 sm:gap-4 ${compact ? "h-14" : "h-16 sm:h-20"}`}>
        <Btn sm={compact} title="Raise hand" on={hand} onClick={() => { cmd("toggleRaiseHand"); setHand((h) => !h); }}><Hand size={20} /></Btn>
        <Btn sm={compact} title={muted ? "Unmute" : "Mute"} danger={muted} onClick={() => cmd("toggleAudio")}>{muted ? <MicOff size={20} /> : <Mic size={20} />}</Btn>
        <Btn sm={compact} title={camOff ? "Start camera" : "Stop camera"} danger={camOff} onClick={() => cmd("toggleVideo")}>{camOff ? <VideoOff size={20} /> : <Video size={20} />}</Btn>
        <Btn sm={compact} title={isInstructor || canShare ? "Share screen" : "Ask the teacher to let you share your screen"} on={sharing} dim={!isInstructor && !canShare} onClick={share}><MonitorUp size={20} /></Btn>
        <Btn sm={compact} title={chatOpen ? "Hide chat" : "Show chat"} on={chatOpen} badge={unread + (isInstructor ? requests.length : 0)} onClick={toggleChat}><MessageSquare size={20} /></Btn>
        <Btn sm={compact} title={fs ? "Exit fullscreen" : "Fullscreen"} onClick={fullscreen}>{fs ? <Minimize size={20} /> : <Maximize size={20} />}</Btn>
        <Btn sm={compact} title="Leave class" danger onClick={leave}><PhoneOff size={20} /></Btn>
      </div>
    </div>
  );
}