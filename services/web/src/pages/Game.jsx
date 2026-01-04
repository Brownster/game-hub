import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ensureSession } from "../state/session.js";
import { getSocket } from "../state/socket.js";
import { playSound, unlockAudio } from "../state/sounds.js";

export default function Game() {
  const { code } = useParams();
  const navigate = useNavigate();
  const joinCode = useMemo(() => String(code || "").toUpperCase(), [code]);
  const session = useMemo(() => ensureSession(), []);
  const [room, setRoom] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const socket = getSocket();

    const handleState = (payload) => {
      setRoom(payload.room);
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
      const winnerLabel = payload.winner === "DRAW" ? "Draw" : payload.winner === "B" ? "Black wins" : "White wins";
      setToast(`${winnerLabel} (${payload.counts?.B ?? 0} - ${payload.counts?.W ?? 0})`);
      setTimeout(() => setToast(""), 3000);
    };

    socket.on("room:state", handleState);
    socket.on("game:toast", handleToast);
    socket.on("room:error", handleError);
    socket.on("game:ended", handleEnd);

    socket.emit("room:join", { joinCode });

    return () => {
      socket.off("room:state", handleState);
      socket.off("game:toast", handleToast);
      socket.off("room:error", handleError);
      socket.off("game:ended", handleEnd);
    };
  }, [joinCode]);

  const roomState = room?.state;
  const board = roomState?.board || [];
  const legalMoves = new Set((roomState?.legalMoves || []).map((move) => `${move.r}-${move.c}`));

  const blackPlayer = room?.players?.black && room.players.black !== "AI" ? room.players.black : null;
  const whitePlayer = room?.players?.white && room.players.white !== "AI" ? room.players.white : null;

  const playerSide =
    blackPlayer?.playerId === session.playerId ? "B" :
    whitePlayer?.playerId === session.playerId ? "W" :
    null;

  const isYourTurn = playerSide && roomState?.turn === playerSide;

  const handleMove = (r, c) => {
    if (!room?.roomId || !roomState) return;
    if (!isYourTurn) return;
    if (!legalMoves.has(`${r}-${c}`)) return;

    unlockAudio();
    playSound("place");
    const socket = getSocket();
    socket.emit("game:action", {
      roomId: room.roomId,
      action: { type: "MOVE", payload: { row: r, col: c } }
    });
  };

  const leaveToHub = () => {
    unlockAudio();
    playSound("beep");
    if (room?.roomId) {
      const socket = getSocket();
      socket.emit("room:leave", { roomId: room.roomId });
    }
    navigate("/");
  };

  const shareUrl = `${window.location.origin}/lobby/${joinCode}`;
  const copyLink = async () => {
    try {
      unlockAudio();
      playSound("beep");
      await navigator.clipboard.writeText(shareUrl);
      setToast("Link copied!");
      setTimeout(() => setToast(""), 2000);
    } catch {
      setToast("Copy failed. Tap and hold to copy.");
      setTimeout(() => setToast(""), 2200);
    }
  };

  return (
    <div className="app-shell">
      <header className="reversi-title">
        {"REVERSI".split("").map((letter, idx) => (
          <span key={letter + idx} className={idx % 2 === 0 ? "dark" : "light"}>
            {letter}
          </span>
        ))}
      </header>

      <section className="panel">
        <div className="scoreboard">
          <div className={`score-card ${roomState?.turn === "B" ? "active" : ""}`}>
            <div>
              <div className="score-name">Black</div>
              <div className="score-name">{blackPlayer?.displayName || (room?.mode === "AI" ? "You" : "Waiting...")}</div>
            </div>
            <div className="score-count">{roomState?.counts?.B ?? 0}</div>
            <div className="piece black" />
          </div>
          <div className={`score-card ${roomState?.turn === "W" ? "active" : ""}`}>
            <div>
              <div className="score-name">White</div>
              <div className="score-name">{whitePlayer?.displayName || (room?.mode === "AI" ? "Computer" : "Waiting...")}</div>
            </div>
            <div className="score-count">{roomState?.counts?.W ?? 0}</div>
            <div className="piece white" />
          </div>
        </div>
        <div className="subtle">
          {roomState?.status === "FINISHED"
            ? "Game complete"
            : isYourTurn
              ? "Your turn"
              : "Waiting for opponent"}
        </div>
      </section>

      <section className="board-frame">
        <div className="board">
          {board.map((row, r) =>
            row.map((cell, c) => {
              const key = `${r}-${c}`;
              const isLegal = isYourTurn && legalMoves.has(key);
              const isLast = roomState?.lastMove?.r === r && roomState?.lastMove?.c === c;

              return (
                <div
                  key={key}
                  className={`cell ${isLegal ? "legal" : ""} ${!isYourTurn ? "disabled" : ""} ${isLast ? "last-move" : ""}`}
                  onClick={() => handleMove(r, c)}
                >
                  {cell === "B" ? <div className="piece black" /> : null}
                  {cell === "W" ? <div className="piece white" /> : null}
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="actions">
        <button className="button secondary" onClick={copyLink}>Share Link</button>
        <button className="button" onClick={leaveToHub}>Back to Hub</button>
      </section>

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}
