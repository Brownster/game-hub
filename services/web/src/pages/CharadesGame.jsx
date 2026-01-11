import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ensureSession } from "../state/session.js";
import { getSocket } from "../state/socket.js";
import { playSound, unlockAudio } from "../state/sounds.js";

const CATEGORY_LABELS = {
  MOVIES: "Movies & TV",
  ACTIONS: "Actions",
  ANIMALS: "Animals",
  OCCUPATIONS: "Occupations",
  SPORTS: "Sports & Activities",
  OBJECTS: "Objects",
  FAMOUS: "Famous People",
  PHRASES: "Phrases & Sayings",
};

export default function CharadesGame() {
  const navigate = useNavigate();
  const { code } = useParams();
  const session = useMemo(() => ensureSession(), []);
  const joinCode = String(code || "").toUpperCase();

  const socketRef = useRef(null);

  const [state, setState] = useState(null);
  const [guess, setGuess] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [newGuess, setNewGuess] = useState(null);

  const isPerformer = state?.performerId === session.playerId;
  const performer = state?.players?.find((p) => p.playerId === state?.performerId);

  useEffect(() => {
    document.body.classList.add("charades-mode");
    return () => document.body.classList.remove("charades-mode");
  }, []);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const handleState = (payload) => {
      const prevGuessCount = state?.guesses?.length || 0;
      const newState = { ...payload.state, roomId: payload.roomId };
      setState(newState);

      if (payload.state?.roundEndsAt) {
        const remaining = Math.max(0, Math.ceil((payload.state.roundEndsAt - Date.now()) / 1000));
        setTimeLeft(remaining);
      }

      // Check for new wrong guess to animate
      const newGuessCount = payload.state?.guesses?.length || 0;
      if (newGuessCount > prevGuessCount && payload.state?.guesses?.length > 0) {
        const latestGuess = payload.state.guesses[payload.state.guesses.length - 1];
        setNewGuess(latestGuess);
        playSound("invalid");
        setTimeout(() => setNewGuess(null), 2000);
      }
    };

    const handleError = (payload) => {
      console.error("Charades error:", payload);
    };

    socket.on("charades:state", handleState);
    socket.on("charades:error", handleError);

    socket.emit("charades:join", { joinCode });

    return () => {
      socket.off("charades:state", handleState);
      socket.off("charades:error", handleError);
    };
  }, [joinCode]);

  useEffect(() => {
    if (!state?.roundEndsAt || state.phase !== "PERFORMING") {
      setTimeLeft(0);
      return undefined;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((state.roundEndsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    }, 500);

    return () => clearInterval(interval);
  }, [state?.roundEndsAt, state?.phase]);

  const submitGuess = () => {
    const trimmed = guess.trim();
    if (!trimmed) return;
    unlockAudio();
    playSound("beep");
    const socket = socketRef.current;
    socket.emit("charades:guess", { roomId: state?.roomId, guess: trimmed });
    setGuess("");
  };

  const leaveRoom = () => {
    unlockAudio();
    playSound("beep");
    const socket = socketRef.current;
    if (socket && state?.roomId) {
      socket.emit("charades:leave", { roomId: state.roomId });
    }
    navigate("/charades");
  };

  const copyLink = async () => {
    try {
      unlockAudio();
      playSound("beep");
      await navigator.clipboard.writeText(`${window.location.origin}/charades/${joinCode}`);
    } catch {
      // Ignore clipboard errors
    }
  };

  const players = state?.players || [];
  const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
  const guesses = state?.guesses || [];
  const feed = state?.feed || [];
  const categoryLabel = CATEGORY_LABELS[state?.prompt?.category] || state?.prompt?.category || "";

  const renderLobby = () => (
    <div className="charades-center-panel">
      <div className="charades-waiting">
        <div className="charades-waiting-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        <h2>Waiting for Players</h2>
        <p>Share the room code to invite friends</p>
        <div className="charades-code-display">{joinCode}</div>
        <button className="charades-button" onClick={copyLink}>Copy Invite Link</button>
        <div className="charades-player-count">{players.length} player{players.length !== 1 ? "s" : ""} joined</div>
        {players.length < 2 && (
          <div className="charades-hint">Need at least 2 players to start</div>
        )}
      </div>
    </div>
  );

  const renderPerformerView = () => (
    <div className="charades-center-panel performer">
      <div className="charades-prompt-card">
        <div className="charades-prompt-label">Act out:</div>
        <div className="charades-prompt-text">{state?.prompt?.text || "..."}</div>
        <div className="charades-prompt-category">{categoryLabel}</div>
      </div>
      <div className="charades-performer-hint">
        <p>Act this out without speaking or using props!</p>
        <p>Other players are guessing...</p>
      </div>
    </div>
  );

  const renderGuesserView = () => (
    <div className="charades-center-panel guesser">
      <div className="charades-performing-info">
        <div className="charades-performer-avatar">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
        <div className="charades-performer-name">{performer?.displayName || "Someone"}</div>
        <div className="charades-performer-label">is performing</div>
        <div className="charades-category-hint">{categoryLabel}</div>
      </div>

      <div className="charades-wrong-guesses">
        {guesses.slice(-6).map((g, idx) => (
          <div
            key={`${g.timestamp}-${idx}`}
            className={`charades-wrong-guess ${newGuess?.timestamp === g.timestamp ? "new" : ""}`}
          >
            <span className="guess-name">{g.displayName}:</span>
            <span className="guess-text">{g.text}</span>
          </div>
        ))}
      </div>

      <div className="charades-guess-form">
        <input
          className="charades-input large"
          value={guess}
          onChange={(event) => setGuess(event.target.value)}
          placeholder="Type your guess..."
          onKeyDown={(event) => {
            if (event.key === "Enter") submitGuess();
          }}
          autoFocus
        />
        <button className="charades-button" onClick={submitGuess}>Guess</button>
      </div>
    </div>
  );

  const renderReveal = () => (
    <div className="charades-center-panel reveal">
      <div className="charades-reveal-card">
        <div className="charades-reveal-label">The answer was:</div>
        <div className="charades-reveal-text">{state?.prompt?.text}</div>
        <div className="charades-reveal-category">{categoryLabel}</div>
      </div>
      <div className="charades-reveal-message">
        {feed.length > 0 && feed[feed.length - 1]?.type === "correct" ? (
          <span className="success">{feed[feed.length - 1].message}</span>
        ) : (
          <span className="timeout">Nobody guessed it!</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="charades-root">
      <div className="charades-bg" />
      <div className="charades-arena">
        <header className="charades-top">
          <div className="charades-top-info">
            <h2>Charades</h2>
            <p>Room {joinCode}</p>
          </div>
          <div className="charades-timer-wrap">
            {state?.phase === "PERFORMING" && (
              <div className={`charades-timer ${timeLeft <= 10 ? "warning" : ""}`}>
                {timeLeft}s
              </div>
            )}
            {state?.phase === "REVEAL" && (
              <div className="charades-timer reveal">REVEAL</div>
            )}
          </div>
          <button className="charades-button ghost small" onClick={leaveRoom}>Leave</button>
        </header>

        <div className="charades-body">
          <section className="charades-sidebar">
            <div className="charades-panel-title">Scoreboard</div>
            <div className="charades-player-list">
              {sortedPlayers.map((player, idx) => (
                <div
                  key={player.playerId}
                  className={`charades-player ${player.playerId === state?.performerId ? "performing" : ""} ${player.playerId === session.playerId ? "you" : ""}`}
                >
                  <span className="player-rank">{idx + 1}</span>
                  <span className="player-name">
                    {player.displayName}
                    {player.playerId === session.playerId && " (You)"}
                  </span>
                  <span className="player-score">{player.score || 0}</span>
                </div>
              ))}
            </div>
            <div className="charades-panel-title">Activity</div>
            <div className="charades-feed">
              {feed.slice(-8).map((entry, idx) => (
                <div key={`${entry.timestamp}-${idx}`} className={`charades-feed-item ${entry.type}`}>
                  {entry.message}
                </div>
              ))}
            </div>
          </section>

          <section className="charades-main">
            {state?.phase === "LOBBY" && renderLobby()}
            {state?.phase === "PERFORMING" && isPerformer && renderPerformerView()}
            {state?.phase === "PERFORMING" && !isPerformer && renderGuesserView()}
            {state?.phase === "REVEAL" && renderReveal()}
          </section>
        </div>
      </div>
    </div>
  );
}
