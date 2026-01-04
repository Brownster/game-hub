import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { isSoundEnabled, playSound, setSoundEnabled, unlockAudio } from "../state/sounds.js";

const DEFAULT_GAME_STATE = { players: [], food: [] };

export default function Slither() {
  const navigate = useNavigate();
  const [started, setStarted] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [score, setScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [deathScore, setDeathScore] = useState(null);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());

  const canvasRef = useRef(null);
  const cursorRef = useRef(null);
  const socketRef = useRef(null);
  const playerIdRef = useRef(null);
  const mapSizeRef = useRef(3000);
  const gameStateRef = useRef(DEFAULT_GAME_STATE);
  const cameraRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const animationRef = useRef(null);
  const playerDeadRef = useRef(false);

  useEffect(() => {
    document.body.classList.add("slither-mode");
    return () => {
      document.body.classList.remove("slither-mode");
    };
  }, []);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return undefined;

    const handlePointer = (event) => {
      if (event.pointerType === "touch") return;
      cursor.style.left = `${event.clientX}px`;
      cursor.style.top = `${event.clientY}px`;
    };

    const handleDown = (event) => {
      if (event.pointerType === "touch") return;
      cursor.classList.add("active");
    };

    const handleUp = (event) => {
      if (event.pointerType === "touch") return;
      cursor.classList.remove("active");
    };

    document.addEventListener("pointermove", handlePointer);
    document.addEventListener("pointerdown", handleDown);
    document.addEventListener("pointerup", handleUp);
    return () => {
      document.removeEventListener("pointermove", handlePointer);
      document.removeEventListener("pointerdown", handleDown);
      document.removeEventListener("pointerup", handleUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const playerId = playerIdRef.current;
      const gameState = gameStateRef.current;
      const player = gameState.players.find((p) => p.id === playerId);

      if (player && player.segments.length > 0) {
        const head = player.segments[0];
        cameraRef.current.x = head.x;
        cameraRef.current.y = head.y;
        const targetZoom = Math.max(0.5, 1 - player.score / 500);
        zoomRef.current += (targetZoom - zoomRef.current) * 0.05;
      }

      const camera = cameraRef.current;
      const zoom = zoomRef.current;

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-camera.x, -camera.y);

      drawGrid(ctx, camera, zoom, canvas, mapSizeRef.current);

      gameState.food.forEach((f) => {
        ctx.fillStyle = f.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = f.color;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      gameState.players.forEach((p) => {
        if (p.dead) return;

        for (let i = p.segments.length - 1; i >= 0; i -= 1) {
          const segment = p.segments[i];
          const size = i === 0 ? p.headSize : 10;
          const alpha = i === 0 ? 1 : 0.8;

          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha;

          if (i === 0) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = p.color;
            ctx.beginPath();
            ctx.arc(segment.x, segment.y, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            const nextSeg = p.segments[1] || segment;
            const angle = Math.atan2(segment.y - nextSeg.y, segment.x - nextSeg.x);

            ctx.fillStyle = "#000";
            ctx.beginPath();
            ctx.arc(
              segment.x + Math.cos(angle + 0.3) * size * 0.4,
              segment.y + Math.sin(angle + 0.3) * size * 0.4,
              size * 0.3,
              0,
              Math.PI * 2
            );
            ctx.fill();

            ctx.beginPath();
            ctx.arc(
              segment.x + Math.cos(angle - 0.3) * size * 0.4,
              segment.y + Math.sin(angle - 0.3) * size * 0.4,
              size * 0.3,
              0,
              Math.PI * 2
            );
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.arc(segment.x, segment.y, size, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.globalAlpha = 1;

        if (p.segments.length > 0) {
          const head = p.segments[0];
          ctx.fillStyle = "#00ffff";
          ctx.font = "bold 16px Rajdhani";
          ctx.textAlign = "center";
          ctx.strokeStyle = "#000";
          ctx.lineWidth = 3;
          ctx.strokeText(p.name, head.x, head.y - 25);
          ctx.fillText(p.name, head.x, head.y - 25);
        }
      });

      ctx.restore();

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener("resize", resize);
    };
  }, []);

  const startGame = () => {
    if (started) return;

    const name = playerName.trim() || "Anonymous";
    setPlayerName(name);
    setStarted(true);
    setDeathScore(null);
    playerDeadRef.current = false;
    unlockAudio();
    playSound("beep");

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io("/slither", { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join", name);
    });

    socket.on("init", (data) => {
      playerIdRef.current = data.id;
      mapSizeRef.current = data.mapSize;
    });

    socket.on("gameState", (state) => {
      gameStateRef.current = state;
      updateLeaderboardState(state, playerIdRef.current, setLeaderboard, setScore, setDeathScore);

      const you = state.players.find((p) => p.id === playerIdRef.current);
      if (you?.dead && !playerDeadRef.current) {
        playSound("invalid");
        playerDeadRef.current = true;
      } else if (!you?.dead && playerDeadRef.current) {
        playerDeadRef.current = false;
      }
    });
  };

  const respawn = () => {
    const socket = socketRef.current;
    if (!socket) return;
    unlockAudio();
    playSound("place");
    setDeathScore(null);
    socket.emit("respawn", playerName || "Anonymous");
  };

  const handlePointerMove = (event) => {
    const socket = socketRef.current;
    if (!socket || !playerIdRef.current) return;

    const canvas = canvasRef.current;
    const gameState = gameStateRef.current;
    if (!canvas || !gameState) return;

    const player = gameState.players.find((p) => p.id === playerIdRef.current);
    if (!player || player.dead) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = event.clientX ?? (event.touches && event.touches[0]?.clientX);
    const clientY = event.clientY ?? (event.touches && event.touches[0]?.clientY);

    if (clientX == null || clientY == null) return;

    const worldX = (clientX - rect.left - canvas.width / 2) / zoomRef.current + cameraRef.current.x;
    const worldY = (clientY - rect.top - canvas.height / 2) / zoomRef.current + cameraRef.current.y;

    const head = player.segments[0];
    const dx = worldX - head.x;
    const dy = worldY - head.y;
    const angle = Math.atan2(dy, dx);

    socket.emit("updateAngle", angle);
  };

  const leaveArena = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    playSound("beep");
    navigate("/");
  };

  const toggleSound = () => {
    unlockAudio();
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return (
    <div className="slither-root">
      <div className="slither-cursor" ref={cursorRef} />
      <canvas
        ref={canvasRef}
        className="slither-canvas"
        onPointerMove={handlePointerMove}
        onTouchMove={handlePointerMove}
      />

      {!started && (
        <div className="slither-start">
          <h1>SERPENT.IO</h1>
          <div className="slither-input">
            <input
              type="text"
              value={playerName}
              onChange={(event) => setPlayerName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") startGame();
              }}
              placeholder="ENTER NAME"
              maxLength={15}
            />
          </div>
          <div className="slither-start-actions">
            <button className="slither-button" onClick={startGame}>INITIALIZE</button>
            <button className="slither-button alt" onClick={leaveArena}>EXIT</button>
          </div>
        </div>
      )}

      {started && (
        <div className="slither-hud">
          <div className="slither-leaderboard">
            <h3>TOP SERPENTS</h3>
            <div className="slither-leaderboard-list">
              {leaderboard.map((entry) => (
                <div key={entry.id} className={`slither-leaderboard-entry ${entry.isYou ? "you" : ""}`}>
                  <span>{entry.rank}. {entry.name}</span>
                  <span>{entry.score}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="slither-hud-section">
            <div className="slither-player-name">{playerName || "Anonymous"}</div>
            <div className="slither-score">{score}</div>
          </div>
          <div className="slither-controls">
            <button className="slither-exit" onClick={leaveArena}>Exit</button>
            <button className="slither-exit alt" onClick={toggleSound}>
              Sound: {soundOn ? "On" : "Off"}
            </button>
          </div>
        </div>
      )}

      {deathScore != null && (
        <div className="slither-death">
          <h2>TERMINATED</h2>
          <div className="slither-final-score">FINAL SCORE: {deathScore}</div>
          <button className="slither-button" onClick={respawn}>RESPAWN</button>
        </div>
      )}
    </div>
  );
}

function updateLeaderboardState(state, playerId, setLeaderboard, setScore, setDeathScore) {
  const players = state.players || [];
  const activePlayers = players.filter((p) => !p.dead);
  const sorted = activePlayers.sort((a, b) => b.score - a.score).slice(0, 10);

  const entries = sorted.map((player, index) => ({
    id: player.id,
    rank: index + 1,
    name: player.name,
    score: player.score,
    isYou: player.id === playerId
  }));

  setLeaderboard(entries);

  const you = players.find((p) => p.id === playerId);
  if (you) {
    setScore(you.score);
    if (you.dead) {
      setDeathScore(you.score);
    }
  }
}

function drawGrid(ctx, camera, zoom, canvas, mapSize) {
  const gridSize = 50;
  const startX = Math.floor((camera.x - canvas.width / (2 * zoom)) / gridSize) * gridSize;
  const startY = Math.floor((camera.y - canvas.height / (2 * zoom)) / gridSize) * gridSize;
  const endX = camera.x + canvas.width / (2 * zoom);
  const endY = camera.y + canvas.height / (2 * zoom);

  ctx.strokeStyle = "rgba(0, 255, 255, 0.05)";
  ctx.lineWidth = 1;

  for (let x = startX; x < endX; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
    ctx.stroke();
  }

  for (let y = startY; y < endY; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255, 0, 255, 0.5)";
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, mapSize, mapSize);
}
