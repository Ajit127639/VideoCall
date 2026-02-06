from flask import Flask, request, jsonify
from flask_socketio import SocketIO, join_room, emit
from datetime import datetime
import os

from nlp import summarize_text, extract_keywords

app = Flask(__name__)
app.config["SECRET_KEY"] = "secret"

socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="threading"
)

# ---------- BASIC ----------
@app.route("/")
def home():
    return "SocketIO Server Running"

# ---------- SOCKET ----------
@socketio.on("join")
def join(data):
    room = data["room"]
    join_room(room)
    emit("user-joined", {}, room=room, include_self=False)

@socketio.on("offer")
def offer(data):
    emit("offer", data, room=data["room"], include_self=False)

@socketio.on("answer")
def answer(data):
    emit("answer", data, room=data["room"], include_self=False)

@socketio.on("ice-candidate")
def ice(data):
    emit("ice-candidate", data, room=data["room"], include_self=False)

# ---------- UPLOAD ----------
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.route("/upload", methods=["POST"])
def upload():
    file = request.files.get("file")
    kind = request.form.get("kind", "media")

    if not file:
        return jsonify({"error": "no file"}), 400

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{kind}_{ts}.webm"
    file.save(os.path.join(UPLOAD_DIR, filename))

    return jsonify({"file": filename})

# ---------- TRANSCRIBE (DUMMY NLP SAFE) ----------
@app.route("/transcribe", methods=["POST"])
def transcribe():
    return jsonify({
        "text": "This is a sample transcription generated for NLP processing."
    })

# ---------- SUMMARY + KEYWORDS ----------
@app.route("/summarize", methods=["POST"])
def summarize():
    text = request.json.get("text", "")
    summary = summarize_text(text)
    keywords = extract_keywords(text)
    return jsonify({
        "summary": summary,
        "keywords": keywords
    })

# ---------- RUN ----------
if __name__ == "__main__":
    socketio.run(
    app,
    host="0.0.0.0",
    port=5000,
    allow_unsafe_werkzeug=True
)
