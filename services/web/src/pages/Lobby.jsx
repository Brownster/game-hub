import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSocket } from "../state/socket.js";
import { playSound, unlockAudio } from "../state/sounds.js";

export default function Lobby() {
  const { code } = useParams();
  const navigate = useNavigate();
  const joinCode = useMemo(() => String(code || "").toUpperCase(), [code]);
  const [room, setRoom] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const socket = getSocket();

    const handleState = (payload) => {
      setRoom(payload.room);
      if (payload.room.status === "IN_PROGRESS") {
        navigate(`/game/${payload.room.joinCode}`);
      }
    };

    const handleToast = (payload) => {
      setToast(payload.message || "");
      setTimeout(() => setToast(""), 2200);
    };

    const handleError = (payload) => {
      playSound("invalid");
      setToast(payload?.message || payload?.code || "Error");
      setTimeout(() => setToast(""), 2200);
    };

    socket.on("room:state", handleState);
    socket.on("game:toast", handleToast);
    socket.on("room:error", handleError);

    socket.emit("room:join", { joinCode });

    return () => {
      socket.off("room:state", handleState);
      socket.off("game:toast", handleToast);
      socket.off("room:error", handleError);
    };
  }, [joinCode, navigate]);

  const shareUrl = `${window.location.origin}/lobby/${joinCode}`;

  const copyLink = async () => {
    try {
      unlockAudio();
      playSound("beep");
      await navigator.clipboard.writeText(shareUrl);
      setToast("Link copied!");
      setTimeout(() => setToast(""), 2000);
    } catch {
      setToast("Copy failed. Tap and hold to copy.");
      setTimeout(() => setToast(""), 2200);
    }
  };

  const blackName = room?.players?.black && room.players.black !== "AI" ? room.players.black.displayName : "Waiting...";
  const whiteName = room?.players?.white && room.players.white !== "AI" ? room.players.white.displayName : room?.mode === "AI" ? "Computer" : "Waiting...";

  return (
    <div className="app-shell">
      <header className="reversi-title">
        {"LOBBY".split("").map((letter, idx) => (
          <span key={letter + idx} className={idx % 2 === 0 ? "dark" : "light"}>
            {letter}
          </span>
        ))}
      </header>

      <section className="panel">
        <div className="lobby-header">
          <div className="panel-title">Room Code</div>
          <div className="join-code">{joinCode}</div>
          <div className="subtle">Share this code or link with the next player.</div>
          <div className="share-row">
            <button className="button" onClick={copyLink}>Copy Share Link</button>
            <a className="button secondary" href={shareUrl}>Open Link</a>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">Players</div>
        <div className="scoreboard">
          <div className="score-card">
            <div className="score-name">Black</div>
            <div className="score-name">{blackName}</div>
          </div>
          <div className="score-card">
            <div className="score-name">White</div>
            <div className="score-name">{whiteName}</div>
          </div>
        </div>
        <div className="subtle">Waiting for both players to join...</div>
      </section>

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}
