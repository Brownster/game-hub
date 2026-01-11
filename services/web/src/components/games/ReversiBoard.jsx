import React from "react";
import { playSound, unlockAudio } from "../../state/sounds.js";

export default function ReversiBoard({
  room,
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

  // Find player sides based on room.players order (first = black, second = white)
  const playerIndex = players.findIndex((p) => p.playerId === session.playerId);
  const playerSide = playerIndex === 0 ? "B" : playerIndex === 1 ? "W" : null;

  const isYourTurn = playerSide && gameState?.turn === playerSide && !gameFinished;
  const isAiGame = gameState?.ai?.enabled;

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
      if (winner === "DRAW") return "Game ended in a draw!";
      if (winner === playerSide) return "You won!";
      if (isAiGame && winner === "W") return "Computer wins!";
      return `${winner === "B" ? "Black" : "White"} wins!`;
    }
    if (!players.length || players.length < 2) return "Waiting for opponent...";
    if (isYourTurn) return "Your turn";
    if (isAiGame && gameState?.turn === "W") return "Computer is thinking...";
    return "Waiting for opponent...";
  };

  return (
    <div className="reversi-game-area">
      <div className="reversi-scoreboard">
        <div className={`reversi-score-card ${gameState?.turn === "B" && !gameFinished ? "active" : ""} ${gameState?.winner === "B" ? "winner" : ""}`}>
          <div className="piece black" />
          <div className="score-info">
            <span className="score-label">Black</span>
            <span className="score-name">{players[0]?.displayName || "Waiting..."}</span>
          </div>
          <span className="score-count">{gameState?.counts?.B ?? 0}</span>
        </div>
        <div className="score-vs">VS</div>
        <div className={`reversi-score-card ${gameState?.turn === "W" && !gameFinished ? "active" : ""} ${gameState?.winner === "W" ? "winner" : ""}`}>
          <div className="piece white" />
          <div className="score-info">
            <span className="score-label">White</span>
            <span className="score-name">{isAiGame ? "Computer" : (players[1]?.displayName || "Waiting...")}</span>
          </div>
          <span className="score-count">{gameState?.counts?.W ?? 0}</span>
        </div>
      </div>

      <div className="reversi-status">{getStatusMessage()}</div>

      <div className="reversi-board-wrap">
        <div className="reversi-board">
          {board.map((row, r) =>
            row.map((cell, c) => {
              const key = `${r}-${c}`;
              const isLegal = isYourTurn && legalMoves.has(key);
              const isLast = gameState?.lastMove?.r === r && gameState?.lastMove?.c === c;

              return (
                <div
                  key={key}
                  className={`reversi-cell ${isLegal ? "legal" : ""} ${isLast ? "last-move" : ""}`}
                  onClick={() => handleMove(r, c)}
                >
                  {cell === "B" && <div className="piece black" />}
                  {cell === "W" && <div className="piece white" />}
                </div>
              );
            })
          )}
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
