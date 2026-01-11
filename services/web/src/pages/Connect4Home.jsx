import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRoom } from "../state/api.js";
import { ensureSession, updateDisplayName } from "../state/session.js";
import { playSound, unlockAudio } from "../state/sounds.js";
import SoundToggle from "../components/SoundToggle.jsx";

export default function Connect4Home() {
  const navigate = useNavigate();
  const session = useMemo(() => ensureSession(), []);
  const [name, setName] = useState(session.displayName);
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.body.classList.add("connect4-mode");
    return () => document.body.classList.remove("connect4-mode");
  }, []);

  const handleNameChange = (value) => {
    setName(value);
    updateDisplayName(value.trim() || "Player");
  };

  const handleCreate = async (mode) => {
    setError("");
    setLoading(true);
    unlockAudio();
    playSound("beep");
    try {
      const room = await createRoom({ gameKey: "connect4", mode });
      navigate(`/connect4/${room.joinCode}`);
    } catch (err) {
      setError(err.message || "Unable to create room");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    unlockAudio();
    playSound("beep");
    navigate(`/connect4/${code}`);
  };

  return (
    <div className="app-shell connect4-shell">
      <header className="connect4-title">
        <span className="connect4-logo">
          <span className="red-disc"></span>
          <span className="yellow-disc"></span>
        </span>
        <span className="title-text">CONNECT 4</span>
      </header>

      <section className="panel connect4-panel">
        <div className="panel-title">Player Setup</div>
        <div className="menu">
          <input
            className="input"
            value={name}
            onChange={(event) => handleNameChange(event.target.value)}
            placeholder="Your name"
          />
          <div className="subtle">Playing as {name || "Player"}</div>
          <SoundToggle />
        </div>
      </section>

      <section className="panel connect4-panel">
        <div className="panel-title">Start a Match</div>
        <div className="menu">
          <button className="button connect4-button" onClick={() => handleCreate("AI")} disabled={loading}>
            Play vs Computer
          </button>
          <button className="button connect4-button" onClick={() => handleCreate("PVP")} disabled={loading}>
            Play 2-Player
          </button>
        </div>
      </section>

      <section className="panel connect4-panel">
        <div className="panel-title">Join Existing Game</div>
        <div className="menu">
          <input
            className="input"
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value)}
            placeholder="Enter code"
          />
          <button className="button secondary connect4-button" onClick={handleJoin}>
            Join Game
          </button>
          {error ? <div className="subtle error">{error}</div> : null}
        </div>
      </section>

      <footer className="connect4-footer">
        <button className="button ghost" onClick={() => navigate("/")}>
          Back to Hub
        </button>
      </footer>
    </div>
  );
}
