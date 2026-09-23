import React from "react";
import { playSound, unlockAudio } from "../../state/sounds.js";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8"];

// The four star points on a tournament board, at the corners of the centre 4x4.
const STAR_POINTS = [
  { top: "25%", left: "25%" },
  { top: "25%", left: "75%" },
  { top: "75%", left: "25%" },
  { top: "75%", left: "75%" },
];

const SIDE_LABEL = { B: "Black", W: "White" };

// The server fills empty squares with "E", which is truthy — test for a side.
const isDisc = (cell) => cell === "B" || cell === "W";

/**
 * A disc is one object with two faces, rotated by its colour rather than by any
 * remembered history: dark sits at 0deg, light at 180deg. When the server flips
 * a disc the class changes, CSS transitions the rotation, and the disc turns
 * over on its own. A newly placed disc mounts already rotated, so it drops in
 * without spinning.
 */
function Disc({ side }) {
  return (
    <span className={`othello-disc ${side === "W" ? "is-light" : "is-dark"}`}>
      <img className="othello-disc__face is-dark" src="/reversi/disc-dark.png" alt="" draggable={false} />
      <img className="othello-disc__face is-light" src="/reversi/disc-light.png" alt="" draggable={false} />
    </span>
  );
}

export default function ReversiBoard({
  gameState,
  session,
  players,
  isHost,
  gameFinished,
  onAction,
  onRematch,
  onSwitchGame,
}) {
  const board = gameState?.board || [];
  const legalMoves = new Set((gameState?.legalMoves || []).map((move) => `${move.r}-${move.c}`));

  const playerIndex = players.findIndex((p) => p.playerId === session.playerId);
  const playerSide = playerIndex === 0 ? "B" : playerIndex === 1 ? "W" : null;

  const isYourTurn = playerSide && gameState?.turn === playerSide && !gameFinished;
  const isAiGame = gameState?.ai?.enabled;
  const counts = gameState?.counts || {};

  const handleMove = (r, c) => {
    if (!isYourTurn) return;
    if (!legalMoves.has(`${r}-${c}`)) return;

    unlockAudio();
    playSound("place");
    onAction({ type: "MOVE", payload: { row: r, col: c } });
  };

  const getStatusMessage = () => {
    if (gameFinished) {
      const winner = gameState?.winner;
      if (winner === "DRAW") return "A draw — dead level";
      if (winner === playerSide) return "You won!";
      if (isAiGame && winner === "W") return "Computer wins";
      return `${SIDE_LABEL[winner]} wins`;
    }
    if (!players.length || players.length < 2) return "Waiting for an opponent…";
    if (isYourTurn) return "Your turn";
    if (isAiGame && gameState?.turn === "W") return "Computer is thinking…";
    return `Waiting for ${SIDE_LABEL[gameState?.turn] || "opponent"}…`;
  };

  const renderScoreCard = (side, name) => {
    const isTurn = gameState?.turn === side && !gameFinished;
    const isWinner = gameState?.winner === side;
    return (
      <div className={`othello-score ${isTurn ? "is-turn" : ""} ${isWinner ? "is-winner" : ""}`}>
        <img
          className="othello-score__chip"
          src={side === "W" ? "/reversi/disc-light.png" : "/reversi/disc-dark.png"}
          alt=""
        />
        <div className="othello-score__who">
          <span className="othello-score__label">{SIDE_LABEL[side]}</span>
          <span className="othello-score__name">{name}</span>
        </div>
        <span className="othello-score__count">{counts[side] ?? 0}</span>
      </div>
    );
  };

  return (
    <div className="othello">
      <div className="othello__scores">
        {renderScoreCard("B", players[0]?.displayName || "Waiting…")}
        <div className="othello__versus" aria-hidden="true">vs</div>
        {renderScoreCard("W", isAiGame ? "Computer" : players[1]?.displayName || "Waiting…")}
      </div>

      <p className={`othello__status ${isYourTurn ? "is-active" : ""}`} role="status">
        {getStatusMessage()}
      </p>

      <div className="othello__frame">
        <div className="othello__coords othello__coords--file" aria-hidden="true">
          {FILES.map((f) => <span key={`top-${f}`}>{f}</span>)}
        </div>
        <div className="othello__coords othello__coords--rank" aria-hidden="true">
          {RANKS.map((r) => <span key={`left-${r}`}>{r}</span>)}
        </div>

        <div className="othello__grid">
          {board.map((row, r) =>
            row.map((cell, c) => {
              const key = `${r}-${c}`;
              const isLegal = isYourTurn && legalMoves.has(key);
              const isLast = gameState?.lastMove?.r === r && gameState?.lastMove?.c === c;
              const square = `${FILES[c]}${RANKS[r]}`;
              const occupant = isDisc(cell) ? SIDE_LABEL[cell] : "empty";

              return (
                <button
                  type="button"
                  key={key}
                  className={`othello__cell ${isLegal ? "is-legal" : ""} ${isLast ? "is-last" : ""}`}
                  onClick={() => handleMove(r, c)}
                  disabled={!isLegal}
                  aria-label={isLegal ? `Play ${square}` : `${square}, ${occupant}`}
                >
                  {isDisc(cell) && <Disc side={cell} />}
                  {isLegal && <span className="othello__hint" aria-hidden="true" />}
                </button>
              );
            })
          )}

          {STAR_POINTS.map((pos, i) => (
            <span key={`star-${i}`} className="othello__star" style={pos} aria-hidden="true" />
          ))}
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
