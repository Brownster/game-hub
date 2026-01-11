import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ensureSession, updateDisplayName } from "../state/session.js";
import { playSound, unlockAudio } from "../state/sounds.js";

export default function CharadesHome() {
  const navigate = useNavigate();
  const session = useMemo(() => ensureSession(), []);
  const [name, setName] = useState(session.displayName);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    document.body.classList.add("charades-mode");
    return () => document.body.classList.remove("charades-mode");
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
        body: JSON.stringify({ gameKey: "charades", mode: "PARTY" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "CREATE_FAILED");
      navigate(`/charades/${data.joinCode}`);
    } catch (err) {
      setError(err.message || "Unable to create room");
    }
  };

  const joinRoom = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    unlockAudio();
    playSound("beep");
    navigate(`/charades/${code}`);
  };

  return (
    <div className="charades-root">
      <div className="charades-bg" />
      <div className="charades-shell">
        <header className="charades-header">
          <div className="charades-icon">
            <span className="icon-person">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </span>
            <span className="icon-sparkle">?</span>
          </div>
          <h1>Charades</h1>
          <p>Act it out. Guess the answer. 2-12 players.</p>
        </header>

        <section className="charades-panel">
          <div className="charades-panel-title">Player Name</div>
          <input
            className="charades-input"
            value={name}
            onChange={(event) => handleNameChange(event.target.value)}
            placeholder="Enter your name"
          />
        </section>

        <section className="charades-panel">
          <div className="charades-panel-title">Host a Game</div>
          <button className="charades-button" onClick={createRoom}>Create Room</button>
        </section>

        <section className="charades-panel">
          <div className="charades-panel-title">Join a Game</div>
          <div className="charades-row">
            <input
              className="charades-input"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
              placeholder="Room code"
            />
            <button className="charades-button alt" onClick={joinRoom}>Join</button>
          </div>
          {error ? <div className="charades-message error">{error}</div> : null}
        </section>

        <button className="charades-button ghost" onClick={() => navigate("/")}>Back to Hub</button>
      </div>
    </div>
  );
}
