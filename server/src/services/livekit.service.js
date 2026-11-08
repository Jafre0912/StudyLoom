const { AccessToken, RoomServiceClient, TrackSource } = require("livekit-server-sdk");

const STUDENT_SOURCES = [TrackSource.MICROPHONE, TrackSource.CAMERA];
const ALL_SOURCES = [TrackSource.MICROPHONE, TrackSource.CAMERA, TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO];

const roomClient = () =>
  new RoomServiceClient(
    String(process.env.LIVEKIT_URL).replace(/^wss:/, "https:").replace(/^ws:/, "http:"),
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET
  );

// Teacher: sab kuch. Student: sirf mic + camera (screen share permission teacher deta hai).
async function makeToken({ room, user, isHost }) {
  const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity: String(user._id),
    name: user.name,
    ttl: "4h",
    metadata: JSON.stringify({ host: !!isHost }),
  });
  at.addGrant({
    roomJoin: true, room,
    canSubscribe: true, canPublishData: true, canPublish: true,
    canPublishSources: isHost ? ALL_SOURCES : STUDENT_SOURCES,
  });
  return at.toJwt();
}

// Teacher kisi student ko screen share ki permission de ya wapas le
async function setShareAllowed(room, identity, allowed) {
  const permission = {
    canSubscribe: true, canPublish: true, canPublishData: true,
    canPublishSources: allowed ? ALL_SOURCES : STUDENT_SOURCES,
  };
  const rc = roomClient();
  try { await rc.updateParticipant(room, identity, { permission }); }
  catch { await rc.updateParticipant(room, identity, undefined, permission); } // SDK ke purane version ke liye
}

module.exports = { makeToken, setShareAllowed };