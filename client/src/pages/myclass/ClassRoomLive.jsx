import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Room, RoomEvent, Track, VideoPresets } from "livekit-client";
import { Mic, MicOff, Video, VideoOff, Hand, PhoneOff, MonitorUp, Send, MessageSquare, Maximize, Minimize, Expand, X, Volume2, Users } from "lucide-react";
import * as api from "../../services/api.js";

const enc = new TextEncoder();
const dec = new TextDecoder();
const isHostP = (p) => { try { return JSON.parse(p?.metadata || "{}").host === true; } catch { return false; } };
const nameOf = (p) => p?.name || p?.identity || "User";
const initials = (n = "") => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

function useMedia(q) {
  const [m, setM] = useState(() => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(q).matches : false));
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [q]);
  return m;
}

function TrackView({ track, fit = "contain", mirror = false, className = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !track) return;
    track.attach(el);
    return () => { track.detach(el); };
  }, [track]);
  return <video ref={ref} autoPlay playsInline muted className={className} style={{ objectFit: fit, transform: mirror ? "scaleX(-1)" : undefined }} />;
}

function AudioSink({ track }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    track.attach(el);
    return () => { track.detach(el); };
  }, [track]);
  return <audio ref={ref} autoPlay />;
}

const Btn = ({ on, danger, title, onClick, badge, children }) => (
  <button
    type="button"
    title={title}
    onClick={(e) => { e.stopPropagation(); onClick?.(); }}
    className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition sm:h-12 sm:w-12 ${
      danger ? "bg-red-600 hover:bg-red-700" : on ? "bg-blue-600 hover:bg-blue-700" : "bg-white/15 ring-1 ring-white/30 hover:bg-white/25"
    }`}
  >
    {children}
    {badge > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-bold text-black">{badge}</span>}
  </button>
);

export default function ClassRoomLive({ sessionId, subject, isInstructor, onLeave, onEnd }) {
  const stage = useRef(null);
  const roomRef = useRef(null);
  const chatEnd = useRef(null);
  const panelRef = useRef(null);
  const onLeaveRef = useRef(onLeave);
  onLeaveRef.current = onLeave;
  const [, force] = useState(0);
  const bump = () => force((n) => n + 1);

  const [status, setStatus] = useState("connecting"); // connecting | live | reconnecting | ended | error
  const [errMsg, setErrMsg] = useState("");
  const [needAudio, setNeedAudio] = useState(false);
  const [ui, setUi] = useState(true);
  const [panel, setPanel] = useState(null); // null | "chat" | "people"
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [unread, setUnread] = useState(0);
  const [hand, setHand] = useState(false);
  const [hands, setHands] = useState([]);
  const [requests, setRequests] = useState([]);
  const [allowed, setAllowed] = useState([]);
  const [canShare, setCanShare] = useState(false);
  const [pin, setPin] = useState(null);
  const [fitOverride, setFitOverride] = useState("");
  const [fs, setFs] = useState(false);
  const land = useMedia("(orientation: landscape)");
  const wide = useMedia("(min-width: 768px)");
  const side = land || wide;
  panelRef.current = panel;

  const sendData = (topic, obj = {}, to) => {
    const lp = roomRef.current?.localParticipant;
    if (!lp) return;
    lp.publishData(enc.encode(JSON.stringify(obj)), { reliable: true, topic, ...(to ? { destinationIdentities: [to] } : {}) }).catch(() => {});
  };

  useEffect(() => {
    let dead = false;
    const r = new Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: { autoGainControl: true, noiseSuppression: true, echoCancellation: true },
      videoCaptureDefaults: { resolution: VideoPresets.h720 },
      publishDefaults: { screenShareEncoding: { maxBitrate: 1_500_000, maxFramerate: 15 } },
    });
    roomRef.current = r;

    [
      RoomEvent.ParticipantConnected, RoomEvent.ParticipantDisconnected, RoomEvent.TrackPublished, RoomEvent.TrackUnpublished,
      RoomEvent.TrackSubscribed, RoomEvent.TrackUnsubscribed, RoomEvent.TrackMuted, RoomEvent.TrackUnmuted,
      RoomEvent.LocalTrackPublished, RoomEvent.LocalTrackUnpublished, RoomEvent.ParticipantMetadataChanged,
    ].forEach((ev) => r.on(ev, bump));
    r.on(RoomEvent.AudioPlaybackStatusChanged, () => setNeedAudio(!r.canPlaybackAudio));
    r.on(RoomEvent.Reconnecting, () => setStatus("reconnecting"));
    r.on(RoomEvent.Reconnected, () => setStatus("live"));
    r.on(RoomEvent.Disconnected, () => { if (!dead) setStatus("ended"); });

    r.on(RoomEvent.DataReceived, (payload, p, _kind, topic) => {
      let d = {};
      try { d = JSON.parse(dec.decode(payload)); } catch { return; }
      const fromHost = isHostP(p);
      if (topic === "chat") {
        setMsgs((m) => [...m, { from: nameOf(p), text: String(d.text || "").slice(0, 500), me: false, host: fromHost }]);
        if (panelRef.current !== "chat") setUnread((u) => u + 1);
      } else if (topic === "hand" && isInstructor && p) {
        setHands((h) => (d.up ? [...new Set([...h, p.identity])] : h.filter((x) => x !== p.identity)));
        if (d.up) toast(`${nameOf(p)} raised a hand`);
      } else if (topic === "share-req" && isInstructor && p) {
        setRequests((x) => [...new Set([...x, p.identity])]);
        toast(`${nameOf(p)} wants to share their screen`);
      } else if (topic === "share-allow" && !isInstructor && fromHost) {
        setCanShare(!!d.allow);
        if (d.allow) toast.success("The teacher allowed you to share your screen");
        else { r.localParticipant.setScreenShareEnabled(false).catch(() => {}); toast("Screen sharing was turned off by the teacher"); }
      } else if (topic === "mute-all" && !isInstructor && fromHost) {
        r.localParticipant.setMicrophoneEnabled(false).catch(() => {});
      }
    });

    (async () => {
      try {
        const { token, url } = await api.fetchRoomToken(sessionId);
        if (dead) return;
        await r.connect(url, token);
        if (dead) { r.disconnect(); return; }
        setStatus("live");
        setNeedAudio(!r.canPlaybackAudio);
        if (isInstructor) {
          await r.localParticipant.setMicrophoneEnabled(true).catch(() => toast.error("Allow the microphone to teach"));
          await r.localParticipant.setCameraEnabled(true).catch(() => {});
        }
        bump();
      } catch (e) {
        if (!dead) { setStatus("error"); setErrMsg(e?.message || "Could not join the class"); }
      }
    })();

    return () => { dead = true; r.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    const on = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, panel]);

  // ---- derived room state ----
  const r = roomRef.current;
  const lp = r?.localParticipant;
  const all = r ? [lp, ...Array.from(r.remoteParticipants.values())] : [];
  const trackOf = (p, src) => { const pub = p.getTrackPublication(src); return pub && pub.track && !pub.isMuted ? pub.track : null; };
  const cams = all.map((p) => ({ p, kind: "camera", track: trackOf(p, Track.Source.Camera) })).filter((x) => x.track);
  const screens = all.map((p) => ({ p, kind: "screen", track: trackOf(p, Track.Source.ScreenShare) })).filter((x) => x.track && x.p !== lp);
  const remoteCams = cams.filter((x) => x.p !== lp);
  const keyOf = (x) => `${x.p.identity}:${x.kind}`;

  let main = pin ? [...screens, ...cams].find((x) => keyOf(x) === pin) || null : null;
  main = main || screens.find((x) => isHostP(x.p)) || screens[0] || remoteCams.find((x) => isHostP(x.p)) || remoteCams[0] || cams.find((x) => x.p === lp) || null;
  const tiles = [...screens, ...cams].filter((x) => !main || keyOf(x) !== keyOf(main)).slice(0, 5);

  const autoFit = main?.kind === "screen" ? "contain" : land ? "contain" : "cover"; // portrait mein camera poori screen bhare
  const fit = fitOverride || autoFit;
  const sinks = all.filter((p) => p !== lp).flatMap((p) =>
    [Track.Source.Microphone, Track.Source.ScreenShareAudio].map((src) => {
      const pub = p.getTrackPublication(src);
      return pub?.track ? <AudioSink key={`${p.identity}:${src}`} track={pub.track} /> : null;
    })
  );

  const micOn = !!lp?.isMicrophoneEnabled;
  const camOn = !!lp?.isCameraEnabled;
  const sharingOn = !!lp?.isScreenShareEnabled;
  const host = all.find((p) => p && isHostP(p));

  // ---- actions ----
  const toggleMic = () => lp?.setMicrophoneEnabled(!micOn).then(bump).catch(() => toast.error("Allow microphone permission in your browser"));
  const toggleCam = () => lp?.setCameraEnabled(!camOn).then(bump).catch(() => toast.error("Allow camera permission in your browser"));
  const toggleHand = () => { const up = !hand; setHand(up); sendData("hand", { up }); };
  const share = async () => {
    if (isInstructor || canShare) {
      try {
        await lp.setScreenShareEnabled(!sharingOn, { audio: true, contentHint: "detail", resolution: { width: 1920, height: 1080, frameRate: 15 } });
        bump();
      } catch { toast.error("Screen sharing is not available on this device"); }
      return;
    }
    if (!host) return toast("The teacher is not in the room yet");
    sendData("share-req", {}, host.identity);
    toast("Asked the teacher for permission to share your screen");
  };
  const setShare = async (identity, allow) => {
    try {
      await api.setShareAccess(sessionId, { identity, allow });
      sendData("share-allow", { allow }, identity);
      setAllowed((a) => (allow ? [...new Set([...a, identity])] : a.filter((x) => x !== identity)));
      setRequests((x) => x.filter((i) => i !== identity));
    } catch (e) { toast.error(e?.message || "Could not change the permission"); }
  };
  const send = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    sendData("chat", { text: t });
    setMsgs((m) => [...m, { from: "You", text: t, me: true }]);
    setText("");
  };
  const togglePanel = (name) => { setPanel((p) => (p === name ? null : name)); if (name === "chat") setUnread(0); };
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) { await document.exitFullscreen(); return; }
      await stage.current.requestFullscreen();
      await Promise.resolve(window.screen.orientation?.lock?.("landscape")).catch(() => {});
    } catch { toast("Rotate your phone sideways for a bigger view"); }
  };
  const leave = () => { roomRef.current?.disconnect(); onLeaveRef.current?.(); };

  const waiting = status === "connecting" ? "Joining class…" : isInstructor ? "Waiting for students…" : "Waiting for the teacher's video…";

  return (
    <div ref={stage} className="relative w-full overflow-hidden bg-black text-white" style={{ height: "100dvh" }}>
      {/* Bada video: tap karo toh buttons chhupe/dikhen */}
      <div className="absolute inset-0" onClick={() => setUi((v) => !v)}>
        {main ? (
          <TrackView track={main.track} fit={fit} mirror={main.p === lp && main.kind === "camera"} className="h-full w-full bg-black" />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-slate-400">{waiting}</div>
        )}
      </div>
      <div className="hidden">{sinks}</div>

      {main && (
        <div className="pointer-events-none absolute bottom-24 left-3 z-10 rounded bg-black/60 px-2 py-1 text-xs">
          {main.p === lp ? "You" : nameOf(main.p)}{main.kind === "screen" ? "'s screen" : ""}
        </div>
      )}
      {main?.kind === "screen" && !side && ui && (
        <div className="pointer-events-none absolute inset-x-0 top-14 z-10 flex justify-center">
          <span className="rounded-full bg-black/60 px-3 py-1 text-xs">Rotate your phone for a bigger screen</span>
        </div>
      )}
      {needAudio && (
        <button onClick={() => r.startAudio().then(() => setNeedAudio(false))}
          className="absolute left-1/2 top-16 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold shadow-lg">
          <Volume2 size={16} />Tap to turn on sound
        </button>
      )}
      {(status === "reconnecting" || status === "ended" || status === "error") && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center">
          <p className="text-lg font-semibold">
            {status === "reconnecting" ? "Connection lost. Reconnecting…" : status === "error" ? "Could not join the class" : "You are disconnected"}
          </p>
          {status === "error" && <p className="text-sm text-slate-400">{errMsg}</p>}
          {status !== "reconnecting" && <button onClick={leave} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black">Back</button>}
        </div>
      )}

      {/* Top bar */}
      {ui && (
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />LIVE
            </span>
            <p className="truncate text-xs text-slate-100 sm:text-sm">{subject}</p>
          </div>
          {isInstructor && onEnd && (
            <button onClick={(e) => { e.stopPropagation(); onEnd(); }} className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold hover:bg-red-700 sm:text-sm">End class</button>
          )}
        </div>
      )}

      {/* Chhote tiles: tap karo toh bade ho jaate hain */}
      {ui && tiles.length > 0 && (
        <div className="absolute left-2 top-14 z-20 flex flex-col gap-2">
          {tiles.map((x) => (
            <button key={keyOf(x)} onClick={(e) => { e.stopPropagation(); setPin(keyOf(x)); }}
              className="relative h-16 w-24 overflow-hidden rounded-lg bg-slate-800 ring-1 ring-white/30 sm:h-20 sm:w-32">
              <TrackView track={x.track} fit="cover" mirror={x.p === lp && x.kind === "camera"} className="h-full w-full" />
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1 text-[10px]">{x.p === lp ? "You" : nameOf(x.p)}{x.kind === "screen" ? " · screen" : ""}</span>
            </button>
          ))}
          {pin && <button onClick={(e) => { e.stopPropagation(); setPin(null); }} className="rounded bg-black/60 px-2 py-1 text-[10px]">Auto</button>}
        </div>
      )}

      {/* Chat / People panel: show-hide */}
      {panel && (
        <div onClick={(e) => e.stopPropagation()}
          className={`absolute z-30 flex flex-col bg-slate-900/95 text-white backdrop-blur ${side ? "inset-y-0 right-0 w-[min(22rem,85%)]" : "inset-x-0 bottom-0 h-[58%] rounded-t-2xl"}`}>
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <div className="flex gap-1">
              <button onClick={() => togglePanel("chat") || setPanel("chat")} className={`rounded px-3 py-1 text-sm ${panel === "chat" ? "bg-white/15" : ""}`}>Chat</button>
              {isInstructor && <button onClick={() => setPanel("people")} className={`rounded px-3 py-1 text-sm ${panel === "people" ? "bg-white/15" : ""}`}>People</button>}
            </div>
            <button onClick={() => setPanel(null)} aria-label="Close"><X size={18} /></button>
          </div>
          {panel === "chat" ? (
            <>
              <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {msgs.length === 0 && <p className="text-sm text-slate-400">No messages yet.</p>}
                {msgs.map((m, i) => (
                  <div key={i} className={`rounded-lg px-3 py-2 text-sm ${m.me ? "bg-blue-600/40" : "bg-white/10"}`}>
                    <p className="text-xs font-semibold text-slate-300">{m.from}{m.host ? " · Teacher" : ""}</p>
                    <p className="break-words">{m.text}</p>
                  </div>
                ))}
                <div ref={chatEnd} />
              </div>
              <form onSubmit={send} className="flex gap-2 border-t border-white/10 p-2">
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message"
                  className="min-w-0 flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm outline-none placeholder:text-slate-400" />
                <button type="submit" className="rounded-lg bg-blue-600 px-3"><Send size={16} /></button>
              </form>
            </>
          ) : (
            <ul className="flex-1 space-y-2 overflow-y-auto p-3">
              {all.filter((p) => p && p !== lp).length === 0 && <li className="text-sm text-slate-400">No students yet.</li>}
              {all.filter((p) => p && p !== lp).map((p) => (
                <li key={p.identity} className="flex items-center gap-2 text-sm">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-900 text-xs font-bold">{initials(nameOf(p))}</span>
                  <span className="min-w-0 flex-1 truncate">{nameOf(p)}{hands.includes(p.identity) ? " ✋" : ""}</span>
                  {allowed.includes(p.identity)
                    ? <button onClick={() => setShare(p.identity, false)} className="rounded bg-white/15 px-2 py-1 text-xs">Revoke share</button>
                    : <button onClick={() => setShare(p.identity, true)} className={`rounded px-2 py-1 text-xs ${requests.includes(p.identity) ? "bg-emerald-600" : "bg-white/15"}`}>{requests.includes(p.identity) ? "Allow share" : "Allow screen"}</button>}
                </li>
              ))}
              <li><button onClick={() => sendData("mute-all")} className="mt-2 w-full rounded bg-white/15 py-2 text-xs">Ask everyone to mute</button></li>
            </ul>
          )}
        </div>
      )}

      {/* Bottom buttons */}
      {ui && (
        <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-2 bg-gradient-to-t from-black/80 to-transparent px-2 pb-3 pt-8 sm:gap-3">
          <Btn title={micOn ? "Mute" : "Unmute"} danger={!micOn} onClick={toggleMic}>{micOn ? <Mic size={20} /> : <MicOff size={20} />}</Btn>
          <Btn title={camOn ? "Stop camera" : "Start camera"} danger={!camOn} onClick={toggleCam}>{camOn ? <Video size={20} /> : <VideoOff size={20} />}</Btn>
          {!isInstructor && <Btn title="Raise hand" on={hand} onClick={toggleHand}><Hand size={20} /></Btn>}
          <Btn title={isInstructor || canShare ? "Share screen" : "Ask to share your screen"} on={sharingOn} onClick={share}><MonitorUp size={20} /></Btn>
          <Btn title="Chat" badge={unread} onClick={() => togglePanel("chat")}><MessageSquare size={20} /></Btn>
          {isInstructor && <Btn title="People" badge={requests.length + hands.length} onClick={() => togglePanel("people")}><Users size={20} /></Btn>}
          <Btn title={fit === "cover" ? "Fit video" : "Fill screen"} onClick={() => setFitOverride(fit === "cover" ? "contain" : "cover")}><Expand size={20} /></Btn>
          <Btn title={fs ? "Exit fullscreen" : "Fullscreen"} onClick={fullscreen}>{fs ? <Minimize size={20} /> : <Maximize size={20} />}</Btn>
          <Btn title="Leave class" danger onClick={leave}><PhoneOff size={20} /></Btn>
        </div>
      )}
    </div>
  );
}