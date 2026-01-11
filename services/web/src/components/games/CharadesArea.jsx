import React, { useState } from "react";
import { playSound, unlockAudio } from "../../state/sounds.js";

export default function CharadesArea({
  room,
  gameState,
  session,
  players,
  isHost,
  gameFinished,
  onAction,
  onRematch,
  onSwitchGame,
  timeLeft,
}) {
  const [guess, setGuess] = useState("");

  const isPerformer = gameState?.performerId === session.playerId;
  const phase = gameState?.phase || "LOBBY";
  const prompt = gameState?.prompt;
  const guesses = gameState?.guesses || [];

  const submitGuess = () => {
    const trimmed = guess.trim();
    if (!trimmed) return;
    unlockAudio();
    playSound("beep");
    onAction({ type: "GUESS", payload: trimmed });
    setGuess("");
  };


  const charadesPlayers = gameState?.players || [];
  const performer = charadesPlayers.find((p) => p.playerId === gameState?.performerId);

  const getCategoryLabel = (category) => {
    const labels = {
      MOVIES: "Movie",
      ACTIONS: "Action",
      ANIMALS: "Animal",
      OCCUPATIONS: "Job",
      SPORTS: "Sport",
      OBJECTS: "Object",
      FAMOUS: "Famous Person",
      PHRASES: "Phrase",
    };
    return labels[category] || category;
  };

  return (
    <div className="charades-game-area">
      <div className="charades-header">
        <div className="charades-info">
          <span className="charades-round">Round {gameState?.round || 0}</span>
          <span className="charades-phase">{phase}</span>
          {timeLeft > 0 && <span className="charades-timer">{timeLeft}s</span>}
        </div>
        {phase !== "LOBBY" && performer && (
          <div className="charades-performer">
            {isPerformer ? "You are performing!" : `${performer.displayName} is performing`}
          </div>
        )}
      </div>

      <div className="charades-content">
        <div className="charades-player-sidebar">
          <div className="charades-panel-title">Scores</div>
          {charadesPlayers.map((player) => (
            <div
              key={player.playerId}
              className={`charades-player-item ${player.playerId === gameState?.performerId ? "active" : ""}`}
            >
              <span className="charades-player-name">{player.displayName}</span>
              <span className="charades-player-score">{gameState?.scores?.[player.playerId] || 0}</span>
            </div>
          ))}
        </div>

        <div className="charades-main">
          {phase === "LOBBY" && (
            <div className="charades-lobby">
              <h3>Charades</h3>
              <p>{charadesPlayers.length} players ready</p>
              <p className="charades-waiting">
                {isHost
                  ? (charadesPlayers.length >= 2 ? "Use the Start Game button in the sidebar" : "Need at least 2 players")
                  : "Waiting for host to start..."}
              </p>
            </div>
          )}

          {phase === "PERFORMING" && isPerformer && (
            <div className="charades-prompt-card">
              <div className="charades-prompt-label">Act out:</div>
              <div className="charades-prompt-text">{prompt?.text}</div>
              <div className="charades-prompt-category">
                Category: {getCategoryLabel(prompt?.category)}
              </div>
              <p className="charades-performer-tip">
                Act it out! No speaking or pointing at objects.
              </p>
            </div>
          )}

          {phase === "PERFORMING" && !isPerformer && (
            <div className="charades-guess-area">
              <div className="charades-category-hint">
                Category: {getCategoryLabel(prompt?.category)}
              </div>
              <p className="charades-guess-tip">
                Watch the performer and type your guess!
              </p>
              <div className="charades-guess-input">
                <input
                  value={guess}
                  onChange={(event) => setGuess(event.target.value)}
                  placeholder="Type your guess"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") submitGuess();
                  }}
                />
                <button className="room-btn primary" onClick={submitGuess}>Guess</button>
              </div>
            </div>
          )}

          {phase === "REVEAL" && (
            <div className="charades-reveal">
              <div className="charades-reveal-label">The answer was:</div>
              <div className="charades-reveal-text">{prompt?.text}</div>
              <div className="charades-reveal-category">
                Category: {getCategoryLabel(prompt?.category)}
              </div>
            </div>
          )}
        </div>

        <div className="charades-guesses-sidebar">
          <div className="charades-panel-title">Wrong Guesses</div>
          <div className="charades-guesses-list">
            {guesses.length === 0 && phase === "PERFORMING" && (
              <div className="charades-no-guesses">No guesses yet</div>
            )}
            {guesses.map((g, idx) => (
              <div key={`${g.timestamp}-${idx}`} className="charades-guess-item">
                <span className="charades-guess-author">{g.displayName}:</span>
                <span className="charades-guess-text">{g.text}</span>
              </div>
            ))}
          </div>
          <div className="charades-feed">
            {(gameState?.feed || []).slice(-5).map((entry, idx) => (
              <div key={`${entry.timestamp}-${idx}`} className={`charades-feed-item ${entry.type}`}>
                {entry.message}
              </div>
            ))}
          </div>
        </div>
      </div>

      {gameFinished && isHost && (
        <div className="game-end-actions">
          <button className="room-btn primary" onClick={onRematch}>Play Again</button>
          <button className="room-btn secondary" onClick={onSwitchGame}>Switch Game</button>
        </div>
      )}
    </div>
  );
}
