import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ensureSession, updateDisplayName } from "../state/session.js";
import { playSound, unlockAudio } from "../state/sounds.js";

export default function WordleHome() {
  const navigate = useNavigate();
  const session = useMemo(() => ensureSession(), []);
  const [name, setName] = useState(session.displayName);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");

  React.useEffect(() => {
    document.body.classList.add("wordle-mode");
    return () => document.body.classList.remove("wordle-mode");
  }, []);

  const handleNameChange = (value) => {
    setName(value);
    updateDisplayName(value.trim() || "Player");
  };

  const goTo = (path) => {
    unlockAudio();
    playSound("beep");
    navigate(path);
  };

  const createVsRoom = async () => {
    setError("");
    unlockAudio();
    playSound("beep");

    try {
      const res = await fetch("/api/wordle/vs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rounds: 3 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "CREATE_FAILED");
      navigate(`/wordle/vs/${data.joinCode}`);
    } catch (err) {
      setError(err.message || "Could not create VS room");
    }
  };

  const joinVsRoom = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    goTo(`/wordle/vs/${code}`);
  };

  return (
    <div className="wordle-root">
      <div className="wordle-ambient" />
      <div className="wordle-grid" />
      <div className="wordle-crt" />

      <div className="wordle-shell">
        <header className="wordle-header">
          <h1 className="wordle-title">WORDLE_</h1>
          <p className="wordle-subtitle">Neon word duels for the LAN.</p>
        </header>

        <section className="wordle-panel">
          <div className="wordle-panel-title">Player</div>
          <input
            className="wordle-input"
            value={name}
            onChange={(event) => handleNameChange(event.target.value)}
            placeholder="ENTER NAME"
          />
        </section>

        <section className="wordle-panel">
          <div className="wordle-panel-title">Choose Mode</div>
          <div className="wordle-actions">
            <button className="wordle-button" onClick={() => goTo("/wordle/daily")}>Daily Wordle</button>
            <button className="wordle-button" onClick={() => goTo("/wordle/free")}>Free Play</button>
            <button className="wordle-button" onClick={createVsRoom}>VS Room (3 Rounds)</button>
          </div>
        </section>

        <section className="wordle-panel">
          <div className="wordle-panel-title">Join VS Room</div>
          <div className="wordle-actions">
            <input
              className="wordle-input"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
              placeholder="ROOM CODE"
            />
            <button className="wordle-button secondary" onClick={joinVsRoom}>Join Room</button>
          </div>
          {error ? <div className="wordle-message error">{error}</div> : null}
        </section>

        <button className="wordle-button ghost" onClick={() => goTo("/")}>Back to Hub</button>
      </div>
    </div>
  );
}
