import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { playSound, unlockAudio } from "../state/sounds.js";

const API_BASE = "";

export default function HubHome() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    unlockAudio();
    playSound("beep");
    navigate(`/room/${code}`);
  };

  const createRoom = async () => {
    if (creating) return;
    setCreating(true);
    unlockAudio();
    playSound("beep");
    try {
      const res = await fetch(`${API_BASE}/api/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxPlayers: 12 }),
      });
      const data = await res.json();
      if (data.joinCode) {
        navigate(`/room/${data.joinCode}`);
      }
    } catch (err) {
      console.error("Failed to create room:", err);
    } finally {
      setCreating(false);
    }
  };

  const goToReversi = () => {
    unlockAudio();
    playSound("beep");
    navigate("/reversi");
  };

  const goToSerpent = () => {
    unlockAudio();
    playSound("beep");
    navigate("/slither");
  };

  const goToWordle = () => {
    unlockAudio();
    playSound("beep");
    navigate("/wordle");
  };

  const goToDraw = () => {
    unlockAudio();
    playSound("beep");
    navigate("/draw");
  };

  const goToConnect4 = () => {
    unlockAudio();
    playSound("beep");
    navigate("/connect4");
  };

  const goToCharades = () => {
    unlockAudio();
    playSound("beep");
    navigate("/charades");
  };

  return (
    <div className="app-shell">
      <header className="reversi-title">
        {"GAME HUB".split("").map((letter, idx) => (
          <span key={`${letter}-${idx}`} className={idx % 2 === 0 ? "dark" : "light"}>
            {letter}
          </span>
        ))}
      </header>

      <section className="panel highlight">
        <div className="panel-title">Multiplayer Room</div>
        <div className="menu">
          <button className="button primary" onClick={createRoom} disabled={creating}>
            {creating ? "Creating..." : "Create Room"}
          </button>
          <div className="subtle">Create a room and invite friends to play multiple games together with chat!</div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">Join Existing Room</div>
        <div className="menu">
          <input
            className="input"
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value)}
            placeholder="Enter room code"
            onKeyDown={(event) => {
              if (event.key === "Enter") handleJoin();
            }}
          />
          <button className="button secondary" onClick={handleJoin}>
            Join Room
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">Quick Play</div>
        <div className="menu">
          <button className="button" onClick={goToReversi}>
            Reversi (Othello)
          </button>
          <button className="button" onClick={goToConnect4}>
            Connect 4
          </button>
          <button className="button" onClick={goToWordle}>
            Wordle (Daily / Free / VS)
          </button>
          <button className="button" onClick={goToDraw}>
            Draw & Guess (Party)
          </button>
          <button className="button" onClick={goToCharades}>
            Charades (Party)
          </button>
          <button className="button" onClick={goToSerpent}>
            SERPENT.IO Arena
          </button>
          <div className="subtle">Quick play uses legacy game modes without the unified room system.</div>
        </div>
      </section>
    </div>
  );
}
