import { useEffect, useState, useMemo } from "react";
import { MAX_GUESSES, WORD_LENGTH, getKeyboardStatus, normalizeGuess } from "../../../state/wordleUtils.js";

const KEYBOARD = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACK"],
];

export default function WordleBoard({ state, playerId, onAction, isHost }) {
  const [currentGuess, setCurrentGuess] = useState("");
  const [shakeRow, setShakeRow] = useState(false);
  const [message, setMessage] = useState("");

  const myState = state.playerStates?.[playerId];
  const myGuesses = myState?.guesses || [];
  const myResults = myState?.results || [];
  const myStatus = myState?.status || "WAITING";
  const isPlaying = state.phase === "PLAYING";
  const canType = isPlaying && myStatus === "IN_PROGRESS";

  const isReady = state.ready?.[playerId];

  // Time remaining
  const [timeLeft, setTimeLeft] = useState(null);
  useEffect(() => {
    if (!state.roundEndsAt) {
      setTimeLeft(null);
      return;
    }
    const update = () => {
      const ms = state.roundEndsAt - Date.now();
      setTimeLeft(Math.max(0, Math.ceil(ms / 1000)));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [state.roundEndsAt]);

  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!canType) return;

      const key = e.key.toUpperCase();
      if (key === "BACKSPACE") {
        setCurrentGuess((prev) => prev.slice(0, -1));
        return;
      }
      if (key === "ENTER") {
        submitGuess();
        return;
      }
      if (/^[A-Z]$/.test(key) && currentGuess.length < WORD_LENGTH) {
        setCurrentGuess((prev) => prev + key);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canType, currentGuess]);

  const submitGuess = () => {
    if (currentGuess.length !== WORD_LENGTH) {
      setShakeRow(true);
      setMessage("Not enough letters");
      setTimeout(() => {
        setShakeRow(false);
        setMessage("");
      }, 1000);
      return;
    }

    onAction({ type: "GUESS", payload: { guess: currentGuess } });
    setCurrentGuess("");
  };

  const onKey = (key) => {
    if (!canType) return;

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

  const boardRows = buildRows(myGuesses, currentGuess, myResults, canType);
  const keyboardStatus = getKeyboardStatus(myGuesses, myResults);

  // Get opponent info
  const opponents = state.players?.filter((p) => p.playerId !== playerId) || [];

  // Calculate scores ranking
  const scoreRanking = useMemo(() => {
    return [...(state.players || [])]
      .map((p) => ({ ...p, score: state.scores?.[p.playerId] || 0 }))
      .sort((a, b) => b.score - a.score);
  }, [state.players, state.scores]);

  const getTurnMessage = () => {
    if (state.phase === "LOBBY") {
      return "Waiting for players...";
    }
    if (state.phase === "ROUND_END") {
      const word = state.currentWord || "???";
      if (state.roundWinner === playerId) {
        return `You won this round! Word: ${word}`;
      }
      if (state.roundWinner) {
        const winner = state.players?.find((p) => p.playerId === state.roundWinner);
        return `${winner?.displayName || "Someone"} won! Word: ${word}`;
      }
      return `No one got it. Word: ${word}`;
    }
    if (state.phase === "GAME_END") {
      const topScore = Math.max(...Object.values(state.scores || {}));
      const winners = state.players?.filter((p) => (state.scores?.[p.playerId] || 0) === topScore) || [];
      if (winners.length === 1) {
        if (winners[0].playerId === playerId) {
          return "You won the game!";
        }
        return `${winners[0].displayName} wins the game!`;
      }
      return "Game over - It's a tie!";
    }
    if (state.phase === "PLAYING") {
      if (myStatus === "WIN") {
        return "Solved! Waiting for others...";
      }
      if (myStatus === "LOSE") {
        return "Out of guesses. Waiting for others...";
      }
      return `Round ${state.round}/${state.totalRounds} - Guess the word!`;
    }
    return "";
  };

  return (
    <div className="wordle-board-container">
      {/* Winner overlay */}
      {state.phase === "GAME_END" && (
        <div className="wordle-winner-overlay">
          <div className="wordle-winner-modal">
            <div className="wordle-winner-title">
              {(() => {
                const topScore = Math.max(...Object.values(state.scores || {}));
                const winners = state.players?.filter((p) => (state.scores?.[p.playerId] || 0) === topScore) || [];
                if (winners.length === 1 && winners[0].playerId === playerId) {
                  return "You Win!";
                }
                if (winners.length === 1) {
                  return `${winners[0].displayName} Wins!`;
                }
                return "It's a Tie!";
              })()}
            </div>
            <div className="wordle-winner-subtitle">Game Complete</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="wordle-header">
        <div className="wordle-status">
          <div className={`wordle-turn-msg ${isPlaying && myStatus === "IN_PROGRESS" ? "your-turn" : ""}`}>
            {getTurnMessage()}
          </div>
          {timeLeft !== null && state.phase === "PLAYING" && (
            <div className={`wordle-timer ${timeLeft <= 30 ? "warning" : ""}`}>
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
            </div>
          )}
        </div>
      </div>

      {/* Scoreboard */}
      <div className="wordle-scoreboard">
        {scoreRanking.map((p, idx) => (
          <div
            key={p.playerId}
            className={`wordle-score-entry ${p.playerId === playerId ? "you" : ""} ${idx === 0 ? "leader" : ""}`}
          >
            <span className="wordle-score-name">{p.playerId === playerId ? "You" : p.displayName}</span>
            <span className="wordle-score-value">{p.score}</span>
            {state.phase === "PLAYING" && (
              <span className={`wordle-progress ${state.playerStates?.[p.playerId]?.status || "waiting"}`}>
                {state.playerStates?.[p.playerId]?.guessCount !== undefined
                  ? `${state.playerStates[p.playerId].guessCount}/${MAX_GUESSES}`
                  : state.playerStates?.[p.playerId]?.guesses?.length !== undefined
                    ? `${state.playerStates[p.playerId].guesses.length}/${MAX_GUESSES}`
                    : ""}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Lobby / Ready state */}
      {(state.phase === "LOBBY" || state.phase === "ROUND_END") && (
        <div className="wordle-lobby">
          <div className="wordle-ready-list">
            {state.players?.map((p) => (
              <div key={p.playerId} className={`wordle-ready-item ${state.ready?.[p.playerId] ? "ready" : ""}`}>
                <span>{p.playerId === playerId ? "You" : p.displayName}</span>
                <span className="wordle-ready-status">
                  {state.ready?.[p.playerId] ? "Ready" : "Not Ready"}
                </span>
              </div>
            ))}
          </div>
          {!isReady && (
            <button className="wordle-btn wordle-btn-ready" onClick={() => onAction({ type: "READY" })}>
              Ready Up
            </button>
          )}
          {isReady && <div className="wordle-waiting">Waiting for others...</div>}
          {isHost && state.phase === "ROUND_END" && state.round < state.totalRounds && (
            <button
              className="wordle-btn wordle-btn-next"
              onClick={() => onAction({ type: "NEXT_ROUND" })}
            >
              Next Round
            </button>
          )}
        </div>
      )}

      {/* Game board */}
      {(state.phase === "PLAYING" || state.phase === "ROUND_END" || state.phase === "GAME_END") && (
        <>
          <div className="wordle-grid">
            {boardRows.map((row, rowIndex) => (
              <div
                key={rowIndex}
                className={`wordle-row ${shakeRow && rowIndex === myGuesses.length ? "shake" : ""}`}
              >
                {row.map((cell, cellIndex) => (
                  <div key={cellIndex} className={`wordle-cell ${cell.status}`}>
                    {cell.letter}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {message && <div className="wordle-message">{message}</div>}

          {/* Keyboard */}
          {state.phase === "PLAYING" && (
            <div className="wordle-keyboard">
              {KEYBOARD.map((row, rowIndex) => (
                <div key={rowIndex} className="wordle-keyboard-row">
                  {row.map((key) => {
                    const statusClass = keyboardStatus[key] || "unused";
                    const isSpecial = key === "ENTER" || key === "BACK";
                    return (
                      <button
                        key={key}
                        className={`wordle-key ${statusClass} ${isSpecial ? "special" : ""}`}
                        onClick={() => onKey(key)}
                        disabled={!canType}
                      >
                        {key === "BACK" ? "DEL" : key}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Round history */}
      {state.history?.length > 0 && (state.phase === "ROUND_END" || state.phase === "GAME_END") && (
        <div className="wordle-history">
          <div className="wordle-history-title">Round History</div>
          {state.history.map((round, idx) => (
            <div key={idx} className="wordle-history-round">
              <span className="wordle-history-label">Round {round.round}: {round.word}</span>
              <span className="wordle-history-winner">
                {round.winnerId
                  ? round.winnerId === playerId
                    ? "You won"
                    : `${state.players?.find((p) => p.playerId === round.winnerId)?.displayName || "Someone"} won`
                  : "No winner"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function buildRows(guesses, currentGuess, results, isActive) {
  const rows = [];

  for (let i = 0; i < MAX_GUESSES; i++) {
    const guess = guesses[i] || (i === guesses.length && isActive ? currentGuess : "");
    const result = results[i] || [];
    const row = [];

    for (let c = 0; c < WORD_LENGTH; c++) {
      row.push({
        letter: guess[c] || "",
        status: result[c] || (guess[c] ? "filled" : "empty"),
      });
    }
    rows.push(row);
  }

  return rows;
}
