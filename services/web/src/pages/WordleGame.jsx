import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ensureSession } from "../state/session.js";
import { getSocket } from "../state/socket.js";
import { MAX_GUESSES, WORD_LENGTH, checkGuess, getKeyboardStatus, normalizeGuess } from "../state/wordleUtils.js";
import { playSound, unlockAudio } from "../state/sounds.js";

const KEYBOARD = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACK"]
];

export default function WordleGame({ mode }) {
  const navigate = useNavigate();
  const { code } = useParams();
  const session = useMemo(() => ensureSession(), []);
  const joinCode = String(code || "").toUpperCase();

  const [answer, setAnswer] = useState("");
  const [gameId, setGameId] = useState(null);
  const [guesses, setGuesses] = useState([]);
  const [results, setResults] = useState([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [status, setStatus] = useState("IN_PROGRESS");
  const [message, setMessage] = useState("");
  const [shakeRow, setShakeRow] = useState(false);
  const [dailyInfo, setDailyInfo] = useState(null);
  const [vsState, setVsState] = useState(null);
  const [roundMessage, setRoundMessage] = useState("");
  const [countdown, setCountdown] = useState(null);

  const isVs = mode === "vs";

  const socketRef = useRef(null);

  useEffect(() => {
    document.body.classList.add("wordle-mode");
    return () => document.body.classList.remove("wordle-mode");
  }, []);

  useEffect(() => {
    if (mode === "daily") {
      startDaily();
    }

    if (mode === "free") {
      startFree();
    }

    if (mode === "vs") {
      joinVsRoom();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off("wordle:state");
        socketRef.current.off("wordle:roundEnd");
        socketRef.current.off("wordle:error");
      }
    };
  }, [mode, joinCode]);

  const startFree = async () => {
    const res = await fetch("/api/wordle/free/word");
    const data = await res.json();
    setAnswer(data.word);
    setGameId(null);
    setGuesses([]);
    setResults([]);
    setCurrentGuess("");
    setStatus("IN_PROGRESS");
    setMessage("");
    setRoundMessage("");
  };

  const startDaily = async () => {
    setDailyInfo(null);
    setMessage("");

    const res = await fetch("/api/wordle/daily/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: session.playerId, displayName: session.displayName })
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      if (error?.error === "ALREADY_PLAYED") {
        await loadDailyStatus();
        setStatus("LOCKED");
        setMessage("Daily already completed.");
        return;
      }
      setMessage(error?.error || "Unable to start daily");
      setStatus("LOCKED");
      return;
    }

    const data = await res.json();
    setGameId(data.gameId);
    setGuesses([]);
    setResults([]);
    setCurrentGuess("");
    setStatus("IN_PROGRESS");
  };

  const loadDailyStatus = async () => {
    const res = await fetch(`/api/wordle/daily/status?name=${encodeURIComponent(session.displayName)}&playerId=${session.playerId}`);
    if (!res.ok) return;
    const data = await res.json();
    setDailyInfo(data);
  };

  const joinVsRoom = () => {
    const socket = getSocket();
    socketRef.current = socket;

    const handleState = (payload) => {
      setVsState(payload);
      const yourState = payload.state.players?.[session.playerId];
      if (payload.room.status === "LOBBY") {
        setStatus("WAITING");
        return;
      }
      if (payload.room.status === "FINISHED") {
        setStatus("FINISHED");
        return;
      }
      if (yourState?.status && yourState.status !== "IN_PROGRESS") {
        setStatus("WAITING");
      } else {
        setStatus("IN_PROGRESS");
      }
    };

    const handleRoundEnd = (payload) => {
      if (!payload?.word) return;
      setRoundMessage(`Round complete. Word was ${payload.word}.`);
      setTimeout(() => setRoundMessage(""), 4000);
    };

    const handleError = (payload) => {
      setMessage(payload?.message || payload?.code || "Error");
      setShakeRow(true);
      setTimeout(() => setShakeRow(false), 500);
    };

    socket.on("wordle:state", handleState);
    socket.on("wordle:roundEnd", handleRoundEnd);
    socket.on("wordle:error", handleError);

    socket.emit("wordle:join", { joinCode });
  };

  const onKey = (key) => {
    if (inputLock) return;

    if (key === "ENTER") {
      submitGuess();
      return;
    }

    if (key === "BACK") {
      setCurrentGuess((prev) => prev.slice(0, -1));
      return;
    }

    if (currentGuess.length < WORD_LENGTH && /^[A-Z]$/.test(key)) {
      setCurrentGuess((prev) => prev + key);
    }
  };

  const submitGuess = async () => {
    if (currentGuess.length !== WORD_LENGTH) {
      setShakeRow(true);
      setTimeout(() => setShakeRow(false), 500);
      return;
    }

    unlockAudio();
    playSound("place");

    if (mode === "free") {
      const normalized = normalizeGuess(currentGuess);
      const result = checkGuess(normalized, answer);
      const nextGuesses = [...guesses, normalized];
      const nextResults = [...results, result];
      setGuesses(nextGuesses);
      setResults(nextResults);
      setCurrentGuess("");

      if (normalized === answer) {
        setStatus("WIN");
        setMessage("⚡ Victory! ⚡");
      } else if (nextGuesses.length >= MAX_GUESSES) {
        setStatus("LOSE");
        setMessage(`Word was ${answer}`);
      }
      return;
    }

    if (mode === "daily") {
      const res = await fetch("/api/wordle/daily/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, guess: currentGuess })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data?.error || "Invalid word");
        setShakeRow(true);
        setTimeout(() => setShakeRow(false), 500);
        return;
      }

      setGuesses(data.guesses || []);
      setResults(data.results || []);
      setCurrentGuess("");
      setStatus(data.status || "IN_PROGRESS");

      if (data.status && data.status !== "IN_PROGRESS") {
        await loadDailyStatus();
        if (data.answer) {
          setMessage(data.status === "WIN" ? "⚡ Victory! ⚡" : `Word: ${data.answer}`);
        }
      }
      return;
    }

    if (mode === "vs") {
      const socket = socketRef.current;
      if (socket) {
        socket.emit("wordle:guess", { roomId: vsState?.room?.roomId, guess: currentGuess });
        setCurrentGuess("");
      }
    }
  };

  const restartFree = () => {
    unlockAudio();
    playSound("beep");
    startFree();
  };

  const leaveGame = () => {
    unlockAudio();
    playSound("beep");
    navigate("/wordle");
  };

  const vsPlayers = vsState?.room?.players || {};
  const vsScore = vsState?.state?.scores || {};
  const vsRound = vsState?.state?.currentRound || 1;
  const vsRounds = vsState?.state?.rounds || 3;

  const yourState = isVs ? vsState?.state?.players?.[session.playerId] : null;
  const opponentId = isVs
    ? (vsPlayers.black?.playerId === session.playerId ? vsPlayers.white?.playerId : vsPlayers.black?.playerId)
    : null;

  const opponentName = isVs
    ? (vsPlayers.black?.playerId === opponentId ? vsPlayers.black?.displayName : vsPlayers.white?.displayName)
    : null;

  const roundStatus = isVs ? vsState?.state?.roundStatus : null;
  const activeGuesses = isVs ? (yourState?.guesses || []) : guesses;
  const activeResults = isVs ? (yourState?.results || []) : results;
  const activeStatus = isVs ? (yourState?.status || status) : status;
  const inputLock = activeStatus !== "IN_PROGRESS" || (isVs && roundStatus !== "IN_PROGRESS");

  const boardRows = buildRows(activeGuesses, currentGuess, activeResults, activeStatus);
  const keyboardStatus = getKeyboardStatus(activeGuesses, activeResults);

  const readyMap = vsState?.state?.ready || {};
  const isReady = Boolean(readyMap?.[session.playerId]);
  const opponentReady = opponentId ? Boolean(readyMap?.[opponentId]) : false;

  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key.toUpperCase();
      if (key === "BACKSPACE") {
        onKey("BACK");
        return;
      }
      if (key === "ENTER") {
        onKey("ENTER");
        return;
      }
      if (/^[A-Z]$/.test(key)) {
        onKey(key);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentGuess, inputLock]);

  useEffect(() => {
    if (!isVs || !vsState?.state?.countdownEndsAt) {
      setCountdown(null);
      return undefined;
    }

    const update = () => {
      const msLeft = vsState.state.countdownEndsAt - Date.now();
      setCountdown(Math.max(0, Math.ceil(msLeft / 1000)));
    };

    update();
    const interval = setInterval(update, 200);
    return () => clearInterval(interval);
  }, [isVs, vsState?.state?.countdownEndsAt]);

  return (
    <div className="wordle-root">
      <div className="wordle-ambient" />
      <div className="wordle-grid" />
      <div className="wordle-crt" />

      <div className="wordle-shell">
        <header className="wordle-header compact">
          <div>
            <h1 className="wordle-title">WORDLE_</h1>
            <p className="wordle-subtitle">
              {mode === "daily" ? "Daily Wordle" : mode === "free" ? "Free Play" : `VS Round ${vsRound}/${vsRounds}`}
            </p>
          </div>
          <button className="wordle-button ghost" onClick={leaveGame}>Back</button>
        </header>

        {isVs && vsState?.room?.status === "LOBBY" ? (
          <div className="wordle-panel">
            <div className="wordle-panel-title">Waiting for opponent...</div>
            <div className="wordle-message">Share code {joinCode} to start.</div>
          </div>
        ) : null}

        {isVs && vsState?.room?.status === "IN_PROGRESS" ? (
          <div className="wordle-scoreboard">
            <div>
              <div className="wordle-score-label">You</div>
              <div className="wordle-score-value">{vsScore[session.playerId] || 0}</div>
            </div>
            <div>
              <div className="wordle-score-label">Opponent</div>
              <div className="wordle-score-value">{vsScore[opponentId] || 0}</div>
              <div className="wordle-score-name">{opponentName || "Waiting"}</div>
            </div>
          </div>
        ) : null}

        {isVs && vsState?.room?.status === "IN_PROGRESS" && roundStatus === "READY" ? (
          <div className="wordle-panel">
            <div className="wordle-panel-title">Round Ready</div>
            <div className="wordle-message">You: {isReady ? "Ready" : "Not ready"} | Opponent: {opponentReady ? "Ready" : "Waiting"}</div>
            <div className="wordle-actions">
              <button
                className="wordle-button"
                onClick={() => {
                  const socket = socketRef.current;
                  if (socket && vsState?.room?.roomId) {
                    socket.emit("wordle:ready", { roomId: vsState.room.roomId });
                  }
                }}
                disabled={isReady}
              >
                {isReady ? "Ready ✓" : "I'm Ready"}
              </button>
            </div>
          </div>
        ) : null}

        {isVs && roundStatus === "COUNTDOWN" ? (
          <div className="wordle-panel">
            <div className="wordle-panel-title">Starting Round</div>
            <div className="wordle-message">Round begins in {countdown ?? 3}…</div>
          </div>
        ) : null}

        <div className="wordle-board">
          {boardRows.map((row, rowIndex) => (
            <div
              key={`row-${rowIndex}`}
              className={`wordle-row ${shakeRow && rowIndex === guesses.length ? "shake" : ""}`}
            >
              {row.map((cell, idx) => (
                <div
                  key={`cell-${rowIndex}-${idx}`}
                  className={`wordle-cell ${cell.status || "empty"}`}
                >
                  {cell.letter}
                </div>
              ))}
            </div>
          ))}
        </div>

        {message ? <div className="wordle-message">{message}</div> : null}
        {roundMessage ? <div className="wordle-message">{roundMessage}</div> : null}

        {status !== "IN_PROGRESS" && mode === "free" ? (
          <div className="wordle-actions">
            <button className="wordle-button" onClick={restartFree}>Play Again</button>
          </div>
        ) : null}

        {mode === "daily" && dailyInfo?.stats ? (
          <section className="wordle-panel">
            <div className="wordle-panel-title">Daily Stats</div>
            <div className="wordle-leaderboard">
              <div className="wordle-leaderboard-row">
                <span>Wins</span>
                <span>{dailyInfo.stats.wins}</span>
              </div>
              <div className="wordle-leaderboard-row">
                <span>Losses</span>
                <span>{dailyInfo.stats.losses}</span>
              </div>
              <div className="wordle-leaderboard-row">
                <span>Streak</span>
                <span>{dailyInfo.stats.streak}</span>
              </div>
              <div className="wordle-leaderboard-row">
                <span>Max streak</span>
                <span>{dailyInfo.stats.maxStreak}</span>
              </div>
              <div className="wordle-leaderboard-row">
                <span>Avg guesses</span>
                <span>{dailyInfo.stats.avgGuesses}</span>
              </div>
            </div>
          </section>
        ) : null}

        {mode === "daily" && dailyInfo?.leaderboard?.length ? (
          <section className="wordle-panel">
            <div className="wordle-panel-title">Daily Leaderboard</div>
            <div className="wordle-leaderboard">
              {dailyInfo.leaderboard.map((entry, index) => (
                <div key={entry.playerId} className="wordle-leaderboard-row">
                  <span>{index + 1}. {entry.name}</span>
                  <span>{entry.guesses} guesses</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {mode === "vs" && status === "FINISHED" && vsState?.state?.history?.length ? (
          <section className="wordle-panel">
            <div className="wordle-panel-title">Match Result</div>
            <div className="wordle-leaderboard">
              <div className="wordle-leaderboard-row">
                <span>You</span>
                <span>{vsScore[session.playerId] || 0} wins</span>
              </div>
              <div className="wordle-leaderboard-row">
                <span>{opponentName || "Opponent"}</span>
                <span>{vsScore[opponentId] || 0} wins</span>
              </div>
            </div>
          </section>
        ) : null}

        <div className="wordle-keyboard">
          {KEYBOARD.map((row, rowIndex) => (
            <div key={`kb-${rowIndex}`} className="wordle-keyboard-row">
              {row.map((key) => {
                const statusClass = keyboardStatus[key] || "unused";
                const isSpecial = key === "ENTER" || key === "BACK";
                return (
                  <button
                    key={key}
                    className={`wordle-key ${statusClass} ${isSpecial ? "special" : ""}`}
                    onClick={() => onKey(key)}
                  >
                    {key === "BACK" ? "DEL" : key}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function buildRows(guesses, currentGuess, results, status) {
  const rows = [];

  for (let i = 0; i < MAX_GUESSES; i += 1) {
    const guess = guesses[i] || (i === guesses.length && status === "IN_PROGRESS" ? currentGuess : "");
    const row = [];
    for (let c = 0; c < WORD_LENGTH; c += 1) {
      row.push({
        letter: guess[c] || "",
        status: results[i]?.[c] || (guess[c] ? "filled" : "empty")
      });
    }
    rows.push(row);
  }

  return rows;
}
