import { useCallback, useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import {
  Mic, MicOff, Video, VideoOff, MonitorUp, MessageSquare, Maximize,
  Minimize, Volume2, PhoneOff, Send, X,
} from "lucide-react";

/**
 * <LiveRoom roomName={classId} isTeacher={user.role !== "student"} onLeave={() => nav(-1)} />
 * Expects POST /api/live/token  { roomName }  ->  { token, url }
 * Change the fetch below if your API base URL / auth header is different.
 */

function VideoTile({ track, className = "", contain = true }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!track || !el) return;
    track.attach(el);
    return () => { track.detach(el); };
  }, [track]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      className={`${className} ${contain ? "object-contain" : "object-cover"} bg-black`}
    />
  );
}

export default function LiveRoom({ roomName, isTeacher = false, onLeave }) {
  const roomRef = useRef(null);
  const audioBox = useRef(null);
  const wrapRef = useRef(null);
  const endRef = useRef(null);

  const [status, setStatus] = useState("connecting"); // connecting | live | error
  const [tracks, setTracks] = useState({ cam: null, screen: null });
  const [showScreen, setShowScreen] = useState(true);
  const [needAudio, setNeedAudio] = useState(false);
  const [volume, setVolume] = useState(1);
  const [chatOpen, setChatOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [mic, setMic] = useState(false);
  const [cam, setCam] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [full, setFull] = useState(false);

  const refresh = useCallback(() => {
    const r = roomRef.current;
    if (!r) return;
    const parts = isTeacher ? [r.localParticipant] : [...r.remoteParticipants.values()];
    let c = null, s = null;
    parts.forEach((p) => {
      c = p.getTrackPublication(Track.Source.Camera)?.videoTrack || c;
      s = p.getTrackPublication(Track.Source.ScreenShare)?.videoTrack || s;
    });
    setTracks({ cam: c, screen: s });
  }, [isTeacher]);

  useEffect(() => {
    let dead = false;
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      videoCaptureDefaults: { resolution: { width: 1280, height: 720 } },
    });
    roomRef.current = room;

    room
      .on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio && audioBox.current) {
          const el = track.attach();
          el.volume = 1;
          audioBox.current.appendChild(el);
        }
        refresh();
      })
      .on(RoomEvent.TrackUnsubscribed, (track) => { track.detach(); refresh(); })
      .on(RoomEvent.TrackMuted, refresh)
      .on(RoomEvent.TrackUnmuted, refresh)
      .on(RoomEvent.LocalTrackPublished, refresh)
      .on(RoomEvent.LocalTrackUnpublished, refresh)
      .on(RoomEvent.ParticipantConnected, refresh)
      .on(RoomEvent.ParticipantDisconnected, refresh)
      .on(RoomEvent.AudioPlaybackStatusChanged, () => setNeedAudio(!room.canPlaybackAudio))
      .on(RoomEvent.Disconnected, () => !dead && setStatus("error"))
      .on(RoomEvent.DataReceived, (payload, p) => {
        try {
          const m = JSON.parse(new TextDecoder().decode(payload));
          setMsgs((x) => [...x, { name: p?.name || m.name || "User", text: m.text, me: false }]);
          setUnread((u) => u + 1);
        } catch { /* ignore */ }
      });

    (async () => {
      try {
        const res = await fetch("/api/live/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
          body: JSON.stringify({ roomName }),
        });
        if (!res.ok) throw new Error("Token request failed");
        const { token, url } = await res.json();
        await room.connect(url, token);
        if (dead) return room.disconnect();
        setStatus("live");
        setNeedAudio(!room.canPlaybackAudio);
        if (isTeacher) {
          await room.localParticipant.setMicrophoneEnabled(true);
          await room.localParticipant.setCameraEnabled(true);
          setMic(true); setCam(true);
        }
        refresh();
      } catch (e) {
        console.error(e);
        !dead && setStatus("error");
      }
    })();

    return () => { dead = true; room.disconnect(); };
  }, [roomName, isTeacher, refresh]);

  useEffect(() => { if (chatOpen) { setUnread(0); endRef.current?.scrollIntoView(); } }, [chatOpen, msgs]);
  useEffect(() => {
    audioBox.current?.querySelectorAll("audio").forEach((a) => { a.volume = volume; });
  }, [volume, tracks]);
  useEffect(() => {
    const f = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", f);
    return () => document.removeEventListener("fullscreenchange", f);
  }, []);

  const send = (e) => {
    e.preventDefault();
    const t = text.trim();
    const r = roomRef.current;
    if (!t || !r) return;
    r.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify({ text: t, name: r.localParticipant.name })),
      { reliable: true }
    );
    setMsgs((x) => [...x, { name: "You", text: t, me: true }]);
    setText("");
  };

  const toggle = async (kind) => {
    const lp = roomRef.current?.localParticipant;
    if (!lp) return;
    try {
      if (kind === "mic") { await lp.setMicrophoneEnabled(!mic); setMic(!mic); }
      if (kind === "cam") { await lp.setCameraEnabled(!cam); setCam(!cam); }
      if (kind === "screen") { await lp.setScreenShareEnabled(!sharing); setSharing(!sharing); }
    } catch (e) { console.error(e); }
  };

  const toggleFull = async () => {
    if (document.fullscreenElement) return document.exitFullscreen();
    await wrapRef.current?.requestFullscreen?.();
    try { await screen.orientation?.lock?.("landscape"); } catch { /* not supported */ }
  };

  const main = showScreen && tracks.screen ? tracks.screen : tracks.cam || tracks.screen;
  const small = main === tracks.screen ? tracks.cam : tracks.screen;
  const swap = () => tracks.screen && tracks.cam && setShowScreen((v) => !v);

  const btn = "flex h-11 w-11 items-center justify-center rounded-full text-white transition active:scale-95";

  return (
    <div ref={wrapRef} className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-black text-white landscape:flex-row">
      <div ref={audioBox} className="hidden" />

      {/* Video area */}
      <div className="relative min-h-0 flex-1">
        {main ? (
          <VideoTile track={main} className="h-full w-full" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            {status === "connecting" && "Connecting to class…"}
            {status === "error" && "Could not join. Check your connection and refresh."}
            {status === "live" && (isTeacher ? "Turn on your camera to start" : "Waiting for the teacher to start…")}
          </div>
        )}

        {/* top bar */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-3">
          <span className="flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs font-bold">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> LIVE
          </span>
          <div className="flex items-center gap-2">
            <Volume2 size={18} />
            <input
              type="range" min="0" max="1" step="0.05" value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-24 accent-white"
              aria-label="Volume"
            />
          </div>
        </div>

        {/* small preview (tap to swap camera / screen) */}
        {small && (
          <button onClick={swap} className="absolute bottom-20 right-3 h-24 w-36 overflow-hidden rounded-xl border-2 border-white/60 shadow-lg">
            <VideoTile track={small} className="h-full w-full" contain={false} />
          </button>
        )}

        {needAudio && (
          <button
            onClick={() => roomRef.current?.startAudio().then(() => setNeedAudio(false))}
            className="absolute left-1/2 top-16 -translate-x-1/2 rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold shadow-lg"
          >
            🔊 Tap to enable sound
          </button>
        )}

        {/* controls */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 bg-gradient-to-t from-black/80 to-transparent p-4">
          {isTeacher && (
            <>
              <button onClick={() => toggle("mic")} className={`${btn} ${mic ? "bg-white/20" : "bg-red-600"}`}>
                {mic ? <Mic size={20} /> : <MicOff size={20} />}
              </button>
              <button onClick={() => toggle("cam")} className={`${btn} ${cam ? "bg-white/20" : "bg-red-600"}`}>
                {cam ? <Video size={20} /> : <VideoOff size={20} />}
              </button>
              <button onClick={() => toggle("screen")} className={`${btn} ${sharing ? "bg-brand-600" : "bg-white/20"}`}>
                <MonitorUp size={20} />
              </button>
            </>
          )}
          <button onClick={() => setChatOpen((v) => !v)} className={`${btn} relative bg-white/20`}>
            <MessageSquare size={20} />
            {unread > 0 && !chatOpen && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold">
                {unread}
              </span>
            )}
          </button>
          <button onClick={toggleFull} className={`${btn} bg-white/20`}>
            {full ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
          <button onClick={() => { roomRef.current?.disconnect(); onLeave?.(); }} className={`${btn} bg-red-600`}>
            <PhoneOff size={20} />
          </button>
        </div>
      </div>

      {/* Chat: bottom sheet in portrait, side panel in landscape */}
      {chatOpen && (
        <div className="absolute inset-x-0 bottom-0 z-20 flex h-[55%] flex-col rounded-t-2xl bg-slate-900 landscape:static landscape:h-auto landscape:w-80 landscape:rounded-none">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h3 className="font-semibold">Class chat</h3>
            <button onClick={() => setChatOpen(false)} aria-label="Hide chat"><X size={20} /></button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {msgs.length === 0 && <p className="text-center text-sm text-slate-400">No messages yet</p>}
            {msgs.map((m, i) => (
              <div key={i} className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.me ? "ml-auto bg-brand-600" : "bg-white/10"}`}>
                {!m.me && <p className="text-xs font-semibold text-cyan-300">{m.name}</p>}
                {m.text}
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-white/10 p-3">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message…"
              className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-2 text-sm outline-none placeholder:text-slate-400"
            />
            <button type="submit" className="rounded-xl bg-brand-600 px-3"><Send size={18} /></button>
          </form>
        </div>
      )}
    </div>
  );
}