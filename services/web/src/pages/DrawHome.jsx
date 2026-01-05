import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ensureSession, updateDisplayName } from "../state/session.js";
import { playSound, unlockAudio } from "../state/sounds.js";

export default function DrawHome() {
  const navigate = useNavigate();
  const session = useMemo(() => ensureSession(), []);
  const [name, setName] = useState(session.displayName);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");

  React.useEffect(() => {
    document.body.classList.add("draw-mode");
    return () => document.body.classList.remove("draw-mode");
  }, []);

  const handleNameChange = (value) => {
    setName(value);
    updateDisplayName(value.trim() || "Player");
  };

  const createRoom = async () => {
    setError("");
    unlockAudio();
    playSound("beep");

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameKey: "draw", mode: "PARTY" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "CREATE_FAILED");
      navigate(`/draw/${data.joinCode}`);
    } catch (err) {
      setError(err.message || "Unable to create room");
    }
  };

  const joinRoom = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    unlockAudio();
    playSound("beep");
    navigate(`/draw/${code}`);
  };

  return (
    <div className="draw-root">
      <div className="draw-bg" />
      <div className="draw-shell">
        <header className="draw-header">
          <h1>Draw & Guess</h1>
          <p>Sketch fast. Guess faster. 2–12 players.</p>
        </header>

        <section className="draw-panel">
          <div className="draw-panel-title">Player</div>
          <input
            className="draw-input"
            value={name}
            onChange={(event) => handleNameChange(event.target.value)}
            placeholder="Enter name"
          />
        </section>

        <section className="draw-panel">
          <div className="draw-panel-title">Host a Room</div>
          <button className="draw-button" onClick={createRoom}>Create Room</button>
        </section>

        <section className="draw-panel">
          <div className="draw-panel-title">Join a Room</div>
          <div className="draw-row">
            <input
              className="draw-input"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
              placeholder="Room code"
            />
            <button className="draw-button alt" onClick={joinRoom}>Join</button>
          </div>
          {error ? <div className="draw-message error">{error}</div> : null}
        </section>

        <button className="draw-button ghost" onClick={() => navigate("/")}>Back to Hub</button>
      </div>
    </div>
  );
}
