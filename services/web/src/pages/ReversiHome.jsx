import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRoom } from "../state/api.js";
import { ensureSession, updateDisplayName } from "../state/session.js";
import { playSound, unlockAudio } from "../state/sounds.js";
import SoundToggle from "../components/SoundToggle.jsx";

export default function ReversiHome() {
  const navigate = useNavigate();
  const session = useMemo(() => ensureSession(), []);
  const [name, setName] = useState(session.displayName);
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      const room = await createRoom({ gameKey: "reversi", mode });
      navigate(`/lobby/${room.joinCode}`);
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
    navigate(`/lobby/${code}`);
  };


  return (
    <div className="app-shell">
      <header className="reversi-title">
        {"REVERSI".split("").map((letter, idx) => (
          <span key={letter + idx} className={idx % 2 === 0 ? "dark" : "light"}>
            {letter}
          </span>
        ))}
      </header>

      <section className="panel">
        <div className="panel-title">Player Setup</div>
        <div className="menu">
          <input
            className="input"
            value={name}
            onChange={(event) => handleNameChange(event.target.value)}
            placeholder="Your name"
          />
          <div className="subtle">Welcome, {name || "Player"}!</div>
          <SoundToggle />
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">Start a Match</div>
        <div className="menu">
          <button className="button" onClick={() => handleCreate("AI")} disabled={loading}>
            Play vs Computer
          </button>
          <button className="button" onClick={() => handleCreate("PVP")} disabled={loading}>
            Play 2-Player
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">Join Existing Game</div>
        <div className="menu">
          <input
            className="input"
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value)}
            placeholder="Enter code"
          />
          <button className="button secondary" onClick={handleJoin}>
            Join Game
          </button>
          {error ? <div className="subtle">{error}</div> : null}
        </div>
      </section>
    </div>
  );
}
