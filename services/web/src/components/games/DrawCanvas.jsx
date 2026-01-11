import React, { useEffect, useRef, useState } from "react";
import { playSound, unlockAudio } from "../../state/sounds.js";

const COLORS = ["#101820", "#F94144", "#F3722C", "#F9C74F", "#43AA8B", "#577590", "#4D4DFF"];

export default function DrawCanvas({
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
  socketRef,
}) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);

  const [guess, setGuess] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(6);

  const isDrawer = gameState?.drawerId === session.playerId;
  const phase = gameState?.phase || "LOBBY";
  const wordHint = phase === "REVEAL" || isDrawer ? gameState?.word : null;

  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket) return;

    const handleStroke = (stroke) => {
      drawStroke(stroke);
    };

    const handleClear = () => {
      clearCanvas();
    };

    socket.on("game:stroke", handleStroke);
    socket.on("game:clear", handleClear);

    return () => {
      socket.off("game:stroke", handleStroke);
      socket.off("game:clear", handleClear);
    };
  }, [socketRef]);

  useEffect(() => {
    if (gameState?.strokes) {
      redrawCanvas(gameState.strokes);
    }
  }, [gameState?.round]);

  const getCanvasPoint = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const drawStroke = (stroke) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { points, color: strokeColor, size: strokeSize } = stroke;
    if (!points || points.length < 2) return;

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeSize;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    ctx.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const redrawCanvas = (strokes) => {
    clearCanvas();
    strokes.forEach(drawStroke);
  };

  const handlePointerDown = (event) => {
    if (!isDrawer || phase !== "DRAWING") return;
    drawingRef.current = true;
    lastPointRef.current = getCanvasPoint(event);
  };

  const handlePointerMove = (event) => {
    if (!drawingRef.current || !isDrawer) return;
    const nextPoint = getCanvasPoint(event);
    const stroke = {
      points: [lastPointRef.current, nextPoint],
      color,
      size,
    };
    lastPointRef.current = nextPoint;
    drawStroke(stroke);
    onAction({ type: "STROKE", payload: stroke });
  };

  const handlePointerUp = () => {
    drawingRef.current = false;
    lastPointRef.current = null;
  };

  const submitGuess = () => {
    const trimmed = guess.trim();
    if (!trimmed) return;
    unlockAudio();
    playSound("beep");
    onAction({ type: "GUESS", payload: trimmed });
    setGuess("");
  };


  const drawPlayers = gameState?.players || [];

  return (
    <div className="draw-game-area">
      <div className="draw-header">
        <div className="draw-info">
          <span className="draw-round">Round {gameState?.round || 0}</span>
          <span className="draw-phase">{phase}</span>
          {timeLeft > 0 && <span className="draw-timer">{timeLeft}s</span>}
        </div>
        {wordHint && <div className="draw-word">{wordHint}</div>}
        {!wordHint && phase === "DRAWING" && <div className="draw-word-hidden">????</div>}
      </div>

      <div className="draw-content">
        <div className="draw-player-sidebar">
          <div className="draw-panel-title">Scores</div>
          {drawPlayers.map((player) => (
            <div
              key={player.playerId}
              className={`draw-player-item ${player.playerId === gameState?.drawerId ? "active" : ""}`}
            >
              <span className="draw-player-name">{player.displayName}</span>
              <span className="draw-player-score">{gameState?.scores?.[player.playerId] || 0}</span>
            </div>
          ))}
        </div>

        <div className="draw-main">
          {phase === "LOBBY" ? (
            <div className="draw-lobby">
              <h3>Draw & Guess</h3>
              <p>{drawPlayers.length} players ready</p>
              <p className="draw-waiting">
                {isHost
                  ? (drawPlayers.length >= 2 ? "Use the Start Game button in the sidebar" : "Need at least 2 players")
                  : "Waiting for host to start..."}
              </p>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              className="draw-canvas"
              width={800}
              height={500}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
          )}

          {isDrawer && phase === "DRAWING" && (
            <div className="draw-tools">
              <div className="draw-colors">
                {COLORS.map((swatch) => (
                  <button
                    key={swatch}
                    className={`draw-swatch ${swatch === color ? "active" : ""}`}
                    style={{ backgroundColor: swatch }}
                    onClick={() => setColor(swatch)}
                  />
                ))}
              </div>
              <label className="draw-size">
                <span>Brush</span>
                <input
                  type="range"
                  min="2"
                  max="16"
                  value={size}
                  onChange={(event) => setSize(Number(event.target.value))}
                />
              </label>
            </div>
          )}
        </div>

        <div className="draw-feed-sidebar">
          <div className="draw-panel-title">Guesses</div>
          <div className="draw-feed">
            {(gameState?.feed || []).map((entry, idx) => (
              <div key={`${entry.timestamp}-${idx}`} className={`draw-feed-item ${entry.type}`}>
                {entry.message}
              </div>
            ))}
          </div>
          {!isDrawer && phase === "DRAWING" && (
            <div className="draw-guess-input">
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
          )}
          {isDrawer && phase === "DRAWING" && (
            <div className="draw-drawer-msg">You are drawing!</div>
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
