import React, { useState } from "react";
import { playSound, unlockAudio } from "../../state/sounds.js";

const ROWS = 6;
const COLS = 7;

export default function Connect4Board({
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
  const [hoverCol, setHoverCol] = useState(-1);

  const board = gameState?.board || Array(COLS).fill([]);
  const legalMoves = new Set(gameState?.legalMoves || []);
  const winningCells = gameState?.winningCells || [];
  const winningSet = new Set(winningCells.map((c) => `${c.col}-${c.row}`));

  // First player = red, second = yellow
  const playerIndex = players.findIndex((p) => p.playerId === session.playerId);
  const playerColor = playerIndex === 0 ? "red" : playerIndex === 1 ? "yellow" : null;

  const isYourTurn = playerColor && gameState?.turn === playerColor && !gameFinished;
  const isAiGame = gameState?.ai?.enabled;

  const handleMove = (col) => {
    if (!isYourTurn) return;
    if (!legalMoves.has(col)) return;

    unlockAudio();
    playSound("place");
    onAction({ type: "MOVE", payload: { col } });
  };

  const getStatusMessage = () => {
    if (gameFinished) {
      if (gameState?.winner === "draw") return "Game ended in a draw!";
      if (gameState?.winner === playerColor) return "You won!";
      if (isAiGame && gameState?.winner === "yellow") return "Computer wins!";
      return `${gameState?.winner === "red" ? "Red" : "Yellow"} wins!`;
    }
    if (players.length < 2 && !isAiGame) return "Waiting for opponent...";
    if (isYourTurn) return "Your turn - drop a piece!";
    if (isAiGame && gameState?.turn === "yellow") return "Computer is thinking...";
    return "Waiting for opponent...";
  };

  const renderBoard = () => {
    const cells = [];
    for (let row = ROWS - 1; row >= 0; row--) {
      for (let col = 0; col < COLS; col++) {
        const piece = board[col]?.[row] || null;
        const isWinning = winningSet.has(`${col}-${row}`);
        const isHovered = hoverCol === col && !piece && isYourTurn;

        cells.push(
          <div
            key={`${col}-${row}`}
            className={`c4-cell ${isHovered ? "hovered" : ""}`}
            onClick={() => handleMove(col)}
            onMouseEnter={() => setHoverCol(col)}
            onMouseLeave={() => setHoverCol(-1)}
          >
            <div className="c4-hole">
              {piece && (
                <div className={`c4-piece ${piece} ${isWinning ? "winning" : ""}`} />
              )}
              {isHovered && !piece && (
                <div className={`c4-piece ${playerColor} preview`} />
              )}
            </div>
          </div>
        );
      }
    }
    return cells;
  };

  return (
    <div className="connect4-game-area">
      <div className="c4-scoreboard">
        <div className={`c4-player-card ${gameState?.turn === "red" && !gameFinished ? "active" : ""} ${gameState?.winner === "red" ? "winner" : ""}`}>
          <div className="c4-piece red small" />
          <div className="c4-player-info">
            <span className="c4-player-name">{players[0]?.displayName || "Waiting..."}</span>
            <span className="c4-player-label">Red</span>
          </div>
        </div>
        <div className="c4-vs">VS</div>
        <div className={`c4-player-card ${gameState?.turn === "yellow" && !gameFinished ? "active" : ""} ${gameState?.winner === "yellow" ? "winner" : ""}`}>
          <div className="c4-piece yellow small" />
          <div className="c4-player-info">
            <span className="c4-player-name">{isAiGame ? "Computer" : (players[1]?.displayName || "Waiting...")}</span>
            <span className="c4-player-label">Yellow</span>
          </div>
        </div>
      </div>

      <div className="c4-status">{getStatusMessage()}</div>

      <div className="c4-board-container">
        <div className="c4-board">
          {renderBoard()}
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
