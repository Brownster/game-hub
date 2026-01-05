import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ensureSession } from "../state/session.js";
import { getSocket } from "../state/socket.js";
import { playSound, unlockAudio } from "../state/sounds.js";

const COLORS = ["#101820", "#F94144", "#F3722C", "#F9C74F", "#43AA8B", "#577590", "#4D4DFF"];

export default function DrawGame() {
  const navigate = useNavigate();
  const { code } = useParams();
  const session = useMemo(() => ensureSession(), []);
  const joinCode = String(code || "").toUpperCase();

  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const socketRef = useRef(null);

  const [state, setState] = useState(null);
  const [guess, setGuess] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(6);
  const [timeLeft, setTimeLeft] = useState(0);

  const isDrawer = state?.drawerId === session.playerId;

  useEffect(() => {
    document.body.classList.add("draw-mode");
    return () => document.body.classList.remove("draw-mode");
  }, []);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const handleState = (payload) => {
      setState({ ...payload.state, roomId: payload.roomId });
      if (payload.state?.roundEndsAt) {
        const remaining = Math.max(0, Math.ceil((payload.state.roundEndsAt - Date.now()) / 1000));
        setTimeLeft(remaining);
      }
      if (payload.state?.strokes) {
        redrawCanvas(payload.state.strokes);
      }
    };

    const handleStroke = (stroke) => {
      drawStroke(stroke);
    };

    const handleClear = () => {
      clearCanvas();
    };

    socket.on("draw:state", handleState);
    socket.on("draw:stroke", handleStroke);
    socket.on("draw:clear", handleClear);

    socket.emit("draw:join", { joinCode });

    return () => {
      socket.off("draw:state", handleState);
      socket.off("draw:stroke", handleStroke);
      socket.off("draw:clear", handleClear);
    };
  }, [joinCode]);

  useEffect(() => {
    if (!state?.roundEndsAt || state.phase !== "DRAWING") {
      setTimeLeft(0);
      return undefined;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((state.roundEndsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    }, 500);

    return () => clearInterval(interval);
  }, [state?.roundEndsAt, state?.phase]);

  const handlePointerDown = (event) => {
    if (!isDrawer || state?.phase !== "DRAWING") return;
    drawingRef.current = true;
    lastPointRef.current = getCanvasPoint(event);
  };

  const handlePointerMove = (event) => {
    if (!drawingRef.current || !isDrawer) return;
    const nextPoint = getCanvasPoint(event);
    const stroke = {
      points: [lastPointRef.current, nextPoint],
      color,
      size
    };
    lastPointRef.current = nextPoint;
    drawStroke(stroke);
    const socket = socketRef.current;
    if (socket && state?.phase === "DRAWING") {
      socket.emit("draw:stroke", { roomId: state?.roomId, stroke });
    }
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
    const socket = socketRef.current;
    socket.emit("draw:guess", { roomId: state?.roomId, guess: trimmed });
    setGuess("");
  };

  const leaveRoom = () => {
    unlockAudio();
    playSound("beep");
    const socket = socketRef.current;
    if (socket && state?.roomId) {
      socket.emit("draw:leave", { roomId: state.roomId });
    }
    navigate("/draw");
  };

  const players = state?.players || [];
  const wordHint = state?.word ? state.word : state?.phase === "REVEAL" ? state.word : "????";

  return (
    <div className="draw-root">
      <div className="draw-bg" />
      <div className="draw-arena">
        <header className="draw-top">
          <div>
            <h2>Draw & Guess</h2>
            <p>Room {joinCode}</p>
          </div>
          <div className="draw-timer">{timeLeft ? `${timeLeft}s` : "--"}</div>
          <button className="draw-button ghost" onClick={leaveRoom}>Back</button>
        </header>

        <div className="draw-body">
          <section className="draw-sidebar">
            <div className="draw-panel-title">Players</div>
            <div className="draw-player-list">
              {players.map((player) => (
                <div key={player.playerId} className={`draw-player ${player.playerId === state?.drawerId ? "active" : ""}`}>
                  <span>{player.displayName}</span>
                  <span>{state?.scores?.[player.playerId] || 0}</span>
                </div>
              ))}
            </div>
            <div className="draw-panel-title">Word</div>
            <div className="draw-word">{wordHint || "WAIT"}</div>
            <div className="draw-phase">{state?.phase || "LOBBY"}</div>
          </section>

          <section className="draw-canvas-wrap">
            <canvas
              ref={canvasRef}
              className="draw-canvas"
              width={900}
              height={600}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
          </section>

          <section className="draw-guess-panel">
            <div className="draw-panel-title">Guesses</div>
            <div className="draw-feed">
              {(state?.feed || []).map((entry, idx) => (
                <div key={`${entry.timestamp}-${idx}`} className={`draw-feed-item ${entry.type}`}>
                  {entry.message}
                </div>
              ))}
            </div>
            {!isDrawer ? (
              <div className="draw-guess-input">
                <input
                  value={guess}
                  onChange={(event) => setGuess(event.target.value)}
                  placeholder="Type your guess"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") submitGuess();
                  }}
                />
                <button className="draw-button" onClick={submitGuess}>Guess</button>
              </div>
            ) : (
              <div className="draw-guess-input muted">You are drawing…</div>
            )}
            {isDrawer ? (
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
                  Brush
                  <input
                    type="range"
                    min="2"
                    max="16"
                    value={size}
                    onChange={(event) => setSize(Number(event.target.value))}
                  />
                </label>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );

  function getCanvasPoint(event) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height
    };
  }

  function drawStroke(stroke) {
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
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function redrawCanvas(strokes) {
    clearCanvas();
    strokes.forEach(drawStroke);
  }
}
