import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ensureSession } from "../state/session.js";
import { getSocket } from "../state/socket.js";
import { playSound, unlockAudio } from "../state/sounds.js";

const ROWS = 6;
const COLS = 7;

export default function Connect4Game() {
  const { code } = useParams();
  const navigate = useNavigate();
  const joinCode = useMemo(() => String(code || "").toUpperCase(), [code]);
  const session = useMemo(() => ensureSession(), []);
  const [room, setRoom] = useState(null);
  const [toast, setToast] = useState("");
  const [hoverCol, setHoverCol] = useState(-1);
  const [droppingPiece, setDroppingPiece] = useState(null);

  useEffect(() => {
    document.body.classList.add("connect4-mode");
    return () => document.body.classList.remove("connect4-mode");
  }, []);

  useEffect(() => {
    const socket = getSocket();

    const handleState = (payload) => {
      setRoom(payload.room);
      // Trigger drop animation for last move
      if (payload.room?.state?.lastMove) {
        const { col, row } = payload.room.state.lastMove;
        setDroppingPiece({ col, row, color: payload.room.state.turn === "red" ? "yellow" : "red" });
        setTimeout(() => setDroppingPiece(null), 400);
      }
    };

    const handleToast = (payload) => {
      setToast(payload.message || "");
      setTimeout(() => setToast(""), 2200);
    };

    const handleError = (payload) => {
      playSound("invalid");
      setToast(payload?.message || payload?.code || "Error");
      setTimeout(() => setToast(""), 2200);
    };

    const handleEnd = (payload) => {
      if (!payload) return;
      let message;
      if (payload.winner === "draw") {
        message = "It's a draw!";
      } else {
        const winnerName = payload.winner === "red" ? "Red" : "Yellow";
        message = `${winnerName} wins!`;
      }
      setToast(message);
    };

    socket.on("room:state", handleState);
    socket.on("game:toast", handleToast);
    socket.on("connect4:error", handleError);
    socket.on("game:ended", handleEnd);

    socket.emit("connect4:join", { joinCode });

    return () => {
      socket.off("room:state", handleState);
      socket.off("game:toast", handleToast);
      socket.off("connect4:error", handleError);
      socket.off("game:ended", handleEnd);
    };
  }, [joinCode]);

  const roomState = room?.state;
  const board = roomState?.board || Array(COLS).fill([]);
  const legalMoves = new Set(roomState?.legalMoves || []);
  const winningCells = roomState?.winningCells || [];
  const winningSet = new Set(winningCells.map((c) => `${c.col}-${c.row}`));

  const redPlayer = room?.players?.red && room.players.red !== "AI" ? room.players.red : null;
  const yellowPlayer = room?.players?.yellow && room.players.yellow !== "AI" ? room.players.yellow : null;

  const playerColor =
    redPlayer?.playerId === session.playerId ? "red" :
    yellowPlayer?.playerId === session.playerId ? "yellow" :
    null;

  const isYourTurn = playerColor && roomState?.turn === playerColor;
  const gameFinished = roomState?.status === "FINISHED";

  const handleMove = (col) => {
    if (!room?.roomId || !roomState) return;
    if (gameFinished) return;
    if (!isYourTurn) return;
    if (!legalMoves.has(col)) return;

    unlockAudio();
    playSound("place");
    const socket = getSocket();
    socket.emit("connect4:move", {
      roomId: room.roomId,
      col
    });
  };

  const leaveGame = () => {
    unlockAudio();
    playSound("beep");
    navigate("/connect4");
  };

  const playAgain = () => {
    unlockAudio();
    playSound("beep");
    navigate("/connect4");
  };

  const shareUrl = `${window.location.origin}/connect4/${joinCode}`;
  const copyLink = async () => {
    try {
      unlockAudio();
      playSound("beep");
      await navigator.clipboard.writeText(shareUrl);
      setToast("Link copied!");
      setTimeout(() => setToast(""), 2000);
    } catch {
      setToast("Copy failed");
      setTimeout(() => setToast(""), 2200);
    }
  };

  // Build the visual grid (row 0 at top, row 5 at bottom)
  const renderBoard = () => {
    const cells = [];
    for (let row = ROWS - 1; row >= 0; row--) {
      for (let col = 0; col < COLS; col++) {
        const piece = board[col]?.[row] || null;
        const isWinning = winningSet.has(`${col}-${row}`);
        const isHovered = hoverCol === col && !piece && isYourTurn && !gameFinished;
        const isDropping = droppingPiece?.col === col && droppingPiece?.row === row;

        cells.push(
          <div
            key={`${col}-${row}`}
            className={`connect4-cell ${isHovered ? "hovered" : ""}`}
            onClick={() => handleMove(col)}
            onMouseEnter={() => setHoverCol(col)}
            onMouseLeave={() => setHoverCol(-1)}
          >
            <div className="cell-hole">
              {piece && (
                <div className={`connect4-piece ${piece} ${isWinning ? "winning" : ""} ${isDropping ? "dropping" : ""}`} />
              )}
              {isHovered && !piece && (
                <div className={`connect4-piece ${playerColor} preview`} />
              )}
            </div>
          </div>
        );
      }
    }
    return cells;
  };

  // Render column indicators
  const renderColumnIndicators = () => {
    return Array(COLS).fill(null).map((_, col) => {
      const canDrop = legalMoves.has(col) && isYourTurn && !gameFinished;
      return (
        <div
          key={col}
          className={`column-indicator ${hoverCol === col && canDrop ? "active" : ""}`}
          onMouseEnter={() => setHoverCol(col)}
          onMouseLeave={() => setHoverCol(-1)}
          onClick={() => handleMove(col)}
        >
          {canDrop && hoverCol === col && (
            <div className={`indicator-piece ${playerColor}`} />
          )}
        </div>
      );
    });
  };

  const getTurnMessage = () => {
    if (gameFinished) {
      if (roomState?.winner === "draw") return "Game ended in a draw!";
      const winnerLabel = roomState?.winner === "red" ? "Red" : "Yellow";
      if (roomState?.winner === playerColor) return "You won!";
      if (room?.mode === "AI" && roomState?.winner === "yellow") return "Computer wins!";
      return `${winnerLabel} wins!`;
    }
    if (!room?.players?.red || !room?.players?.yellow) return "Waiting for opponent...";
    if (isYourTurn) return "Your turn - drop a piece!";
    if (room?.mode === "AI") return "Computer is thinking...";
    return "Waiting for opponent...";
  };

  return (
    <div className="app-shell connect4-shell">
      <header className="connect4-title">
        <span className="connect4-logo">
          <span className="red-disc"></span>
          <span className="yellow-disc"></span>
        </span>
        <span className="title-text">CONNECT 4</span>
      </header>

      <section className="panel connect4-panel scoreboard-panel">
        <div className="connect4-scoreboard">
          <div className={`player-card ${roomState?.turn === "red" && !gameFinished ? "active" : ""} ${roomState?.winner === "red" ? "winner" : ""}`}>
            <div className="connect4-piece red small" />
            <div className="player-info">
              <span className="player-name">{redPlayer?.displayName || (room?.mode === "AI" ? "You" : "Waiting...")}</span>
              <span className="player-label">Red</span>
            </div>
          </div>
          <div className="vs-divider">VS</div>
          <div className={`player-card ${roomState?.turn === "yellow" && !gameFinished ? "active" : ""} ${roomState?.winner === "yellow" ? "winner" : ""}`}>
            <div className="connect4-piece yellow small" />
            <div className="player-info">
              <span className="player-name">{yellowPlayer?.displayName || (room?.mode === "AI" ? "Computer" : "Waiting...")}</span>
              <span className="player-label">Yellow</span>
            </div>
          </div>
        </div>
        <div className="turn-indicator">{getTurnMessage()}</div>
      </section>

      <section className="connect4-board-container">
        <div className="column-indicators">
          {renderColumnIndicators()}
        </div>
        <div className="connect4-board">
          {renderBoard()}
        </div>
      </section>

      <section className="actions connect4-actions">
        {gameFinished ? (
          <button className="button connect4-button" onClick={playAgain}>Play Again</button>
        ) : (
          <button className="button secondary connect4-button" onClick={copyLink}>Share Link</button>
        )}
        <button className="button ghost connect4-button" onClick={leaveGame}>Leave Game</button>
      </section>

      {toast ? <div className="toast connect4-toast">{toast}</div> : null}
    </div>
  );
}
