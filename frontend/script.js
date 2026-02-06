const socket = io("");

const pc = new RTCPeerConnection();

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

const startAudio = document.getElementById("startAudio");
const stopAudio = document.getElementById("stopAudio");
const startVideo = document.getElementById("startVideo");
const stopVideo = document.getElementById("stopVideo");
const endCallBtn = document.getElementById("endCall");
const toggleMicBtn = document.getElementById("toggleMic");
const toggleVideoBtn = document.getElementById("toggleVideo");

let micMuted = false;
let videoOff = false;

let roomId = "";
let stream = null;
let recorder = null;
let chunks = [];
let lastFile = "";

/* ================= MEDIA INIT ================= */
async function initMedia() {
  if (stream) return;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
  } catch (e) {
    alert("Camera busy, switching to audio only");
    stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
  }

  localVideo.srcObject = stream;
  stream.getTracks().forEach((track) => pc.addTrack(track, stream));

  // ✅ ENABLE BUTTONS HERE
  startAudio.disabled = false;
  startVideo.disabled = false;
}

/* ================= WEBRTC ================= */
pc.ontrack = (e) => {
  remoteVideo.srcObject = e.streams[0];
};

pc.onicecandidate = (e) => {
  if (e.candidate && roomId) {
    socket.emit("ice-candidate", {
      candidate: e.candidate,
      room: roomId,
    });
  }
};

function joinRoom() {
  roomId = document.getElementById("room").value;
  if (!roomId) {
    alert("Enter Room ID");
    return;
  }

  // ✅ media init FIRST, then join
  initMedia().then(() => {
    socket.emit("join", { room: roomId });
  });
}

socket.on("user-joined", async () => {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit("offer", { offer, room: roomId });
});

socket.on("offer", async (data) => {
  await pc.setRemoteDescription(data.offer);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit("answer", { answer, room: roomId });
});

socket.on("answer", async (data) => {
  await pc.setRemoteDescription(data.answer);
});

socket.on("ice-candidate", async (data) => {
  try {
    await pc.addIceCandidate(data.candidate);
  } catch (e) {}
});

toggleMicBtn.onclick = () => {
  if (!stream) {
    alert("Media stream not started");
    return;
  }

  const audioTracks = stream.getAudioTracks();

  if (audioTracks.length === 0) {
    alert("No audio track found");
    return;
  }

  micMuted = !micMuted;

  // 🔥 IMPORTANT: disable ALL audio tracks
  audioTracks.forEach((track) => {
    track.enabled = !micMuted;
  });

  toggleMicBtn.innerText = micMuted ? "Unmute Mic" : "Mute Mic";

  console.log(
    micMuted
      ? "Mic muted (all audio tracks disabled)"
      : "Mic unmuted (all audio tracks enabled)",
  );
};

toggleVideoBtn.onclick = () => {
  if (!stream) return;

  const videoTracks = stream.getVideoTracks();
  if (!videoTracks.length) return;

  videoOff = !videoOff;
  videoTracks[0].enabled = !videoOff;

  toggleVideoBtn.innerText = videoOff ? "Video On" : "Video Off";
};

/* ================= RECORDING ================= */

// AUDIO RECORD
startAudio.onclick = () => {
  recorder = new MediaRecorder(stream);
  chunks = [];

  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.start();

  startAudio.disabled = true;
  stopAudio.disabled = false;
};

stopAudio.onclick = () => {
  recorder.stop();
  recorder.onstop = () => upload("audio");

  startAudio.disabled = false;
  stopAudio.disabled = true;
};

// VIDEO RECORD
startVideo.onclick = () => {
  recorder = new MediaRecorder(stream);
  chunks = [];

  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.start();

  startVideo.disabled = true;
  stopVideo.disabled = false;
};

stopVideo.onclick = () => {
  recorder.stop();
  recorder.onstop = () => upload("video");

  startVideo.disabled = false;
  stopVideo.disabled = true;
};
endCallBtn.onclick = () => {
  // 1. Stop recording if running
  if (recorder && recorder.state !== "inactive") {
    recorder.stop();
  }

  // 2. Stop all media tracks (camera + mic)
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  // 3. Close WebRTC connection
  if (pc) {
    pc.close();
  }

  // 4. Reset videos
  localVideo.srcObject = null;
  remoteVideo.srcObject = null;

  // 5. Reset buttons
  startAudio.disabled = true;
  stopAudio.disabled = true;
  startVideo.disabled = true;
  stopVideo.disabled = true;

  // 6. Reset room
  roomId = "";

  alert("Call Ended");
};

/* ================= UPLOAD ================= */
async function upload(kind) {
  const blob = new Blob(chunks, { type: "video/webm" });
  const fd = new FormData();
  fd.append("file", blob);
  fd.append("kind", kind);

  const res = await fetch("https://videocallback-8uyp.onrender.com/", {
    method: "POST",
    body: fd,
  });

  const j = await res.json();
  lastFile = j.file;
  alert("Saved: " + lastFile);
}

/* ================= NLP ================= */
async function transcribe() {
  if (!lastFile) {
    alert("No recording found");
    return;
  }

  const res = await fetch("hhttps://videocallback-8uyp.onrender.com/", {
    method: "POST",
  });
  const j = await res.json();
  document.getElementById("transcript").innerText = j.text;
}

async function summarize() {
  const text = document.getElementById("transcript").innerText;
  if (!text) return;

  const res = await fetch("https://videocallback-8uyp.onrender.com/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const j = await res.json();

  document.getElementById("summary").innerText = j.summary;
  document.getElementById("keywords").innerText = j.keywords.join(", ");
}
