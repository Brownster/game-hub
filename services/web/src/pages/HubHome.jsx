import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { playSound, unlockAudio } from "../state/sounds.js";

export default function HubHome() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    unlockAudio();
    playSound("beep");
    navigate(`/lobby/${code}`);
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

  return (
    <div className="app-shell">
      <header className="reversi-title">
        {"GAME HUB".split("").map((letter, idx) => (
          <span key={`${letter}-${idx}`} className={idx % 2 === 0 ? "dark" : "light"}>
            {letter}
          </span>
        ))}
      </header>

      <section className="panel">
        <div className="panel-title">Choose a Game</div>
        <div className="menu">
          <button className="button" onClick={goToReversi}>
            Reversi (Othello)
          </button>
          <button className="button" onClick={goToWordle}>
            Wordle (Daily / Free / VS)
          </button>
          <button className="button" onClick={goToSerpent}>
            SERPENT.IO Arena
          </button>
          <div className="subtle">Pick a game to start or jump into a live arena.</div>
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
        </div>
      </section>
    </div>
  );
}
