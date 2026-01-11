import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ensureSession } from "../state/session.js";
import { getSocket } from "../state/socket.js";
import { playSound, unlockAudio } from "../state/sounds.js";
import useVoice from "../hooks/useVoice.js";
import ChatPanel from "../components/ChatPanel.jsx";
import GameSelector from "../components/GameSelector.jsx";
import VoicePanel from "../components/VoicePanel.jsx";
import ReversiBoard from "../components/games/ReversiBoard.jsx";
import Connect4Board from "../components/games/Connect4Board.jsx";
import DrawCanvas from "../components/games/DrawCanvas.jsx";
import CharadesArea from "../components/games/CharadesArea.jsx";
import CribbageBoard from "../components/games/CribbageBoard.jsx";
import CatanBoard from "../components/games/catan/CatanBoard.jsx";
import UnoBoard from "../components/games/uno/UnoBoard.jsx";
import FibbageGame from "../components/games/fibbage/FibbageGame.jsx";
import CrazyEightsBoard from "../components/games/crazy_eights/CrazyEightsBoard.jsx";
import ChessBoard from "../components/games/chess/ChessBoard.jsx";
import WordleBoard from "../components/games/wordle/WordleBoard.jsx";

export default function Room() {
  const navigate = useNavigate();
  const { code } = useParams();
  const session = useMemo(() => ensureSession(), []);
  const joinCode = String(code || "").toUpperCase();
  const socketRef = useRef(null);

  const [room, setRoom] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [typingUsers, setTypingUsers] = useState(new Map());
  const typingTimeoutsRef = useRef(new Map());

  const voice = useVoice(socketRef, session);

  const players = room?.players || [];
  const currentGame = room?.currentGame;
  const gameKey = currentGame?.gameKey;
  const gameState = currentGame?.state;
  const isHost = players.find((p) => p.isHost)?.playerId === session.playerId;
  const gameFinished = currentGame?.status === "FINISHED";

  useEffect(() => {
    document.body.classList.add("room-mode");
    return () => document.body.classList.remove("room-mode");
  }, []);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const handleState = (payload) => {
      setRoom(payload);

      // Update timer for timed games
      const state = payload?.currentGame?.state;
      const endsAt = state?.roundEndsAt || state?.phaseEndsAt;
      if (endsAt) {
        const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
        setTimeLeft(remaining);
      }
    };

    const handleChatMessage = (message) => {
      playSound("beep");
    };

    const handleError = (payload) => {
      playSound("invalid");
      showToast(payload?.message || payload?.code || "Error");
    };

    const handleGameEnded = (payload) => {
      showToast("Game finished!");
    };

    const handleTyping = ({ playerId, displayName }) => {
      // Clear existing timeout for this player
      const existingTimeout = typingTimeoutsRef.current.get(playerId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Add user to typing set
      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.set(playerId, displayName);
        return next;
      });

      // Set timeout to remove after 3 seconds
      const timeout = setTimeout(() => {
        setTypingUsers((prev) => {
          const next = new Map(prev);
          next.delete(playerId);
          return next;
        });
        typingTimeoutsRef.current.delete(playerId);
      }, 3000);
      typingTimeoutsRef.current.set(playerId, timeout);
    };

    socket.on("room:state", handleState);
    socket.on("room:chatMessage", handleChatMessage);
    socket.on("room:error", handleError);
    socket.on("game:error", handleError);
    socket.on("game:ended", handleGameEnded);
    socket.on("room:typing", handleTyping);

    socket.emit("room:join", { joinCode });

    return () => {
      socket.off("room:state", handleState);
      socket.off("room:chatMessage", handleChatMessage);
      socket.off("room:error", handleError);
      socket.off("game:error", handleError);
      socket.off("game:ended", handleGameEnded);
      socket.off("room:typing", handleTyping);
      // Clear all typing timeouts
      typingTimeoutsRef.current.forEach((t) => clearTimeout(t));
      typingTimeoutsRef.current.clear();
    };
  }, [joinCode]);

  // Timer countdown for timed games
  useEffect(() => {
    const endsAt = gameState?.roundEndsAt || gameState?.phaseEndsAt;
    if (!endsAt) {
      setTimeLeft(0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    }, 500);

    return () => clearInterval(interval);
  }, [gameState?.roundEndsAt, gameState?.phaseEndsAt, gameState?.phase]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const sendChat = (message) => {
    const socket = socketRef.current;
    if (!socket || !message.trim()) return;
    socket.emit("room:chat", { message });
  };

  const selectGame = (gameKey, mode) => {
    unlockAudio();
    playSound("beep");
    const socket = socketRef.current;
    socket.emit("room:selectGame", { gameKey, mode });
  };

  const startGame = () => {
    unlockAudio();
    playSound("beep");
    const socket = socketRef.current;
    socket.emit("room:startGame");
  };

  const rematch = () => {
    unlockAudio();
    playSound("beep");
    const socket = socketRef.current;
    socket.emit("room:rematch");
  };

  const switchGame = () => {
    unlockAudio();
    playSound("beep");
    const socket = socketRef.current;
    socket.emit("room:switchGame");
  };

  const sendAction = (action) => {
    const socket = socketRef.current;
    socket.emit("game:action", { action });
  };

  const leaveRoom = () => {
    unlockAudio();
    playSound("beep");
    const socket = socketRef.current;
    socket.emit("room:leave");
    navigate("/");
  };

  const copyLink = async () => {
    try {
      unlockAudio();
      playSound("beep");
      await navigator.clipboard.writeText(`${window.location.origin}/room/${joinCode}`);
      showToast("Link copied!");
    } catch {
      showToast("Copy failed");
    }
  };

  const renderGameArea = () => {
    if (!currentGame) {
      return (
        <GameSelector
          onSelect={selectGame}
          playerCount={players.length}
          isHost={isHost}
        />
      );
    }

    const commonProps = {
      room,
      gameState,
      session,
      players,
      isHost,
      gameFinished,
      onAction: sendAction,
      onRematch: rematch,
      onSwitchGame: switchGame,
      timeLeft,
    };

    switch (gameKey) {
      case "reversi":
        return <ReversiBoard {...commonProps} />;
      case "connect4":
        return <Connect4Board {...commonProps} />;
      case "draw":
        return <DrawCanvas {...commonProps} socketRef={socketRef} />;
      case "charades":
        return <CharadesArea {...commonProps} />;
      case "cribbage":
        return (
          <CribbageBoard
            gameState={gameState}
            playerId={session.playerId}
            players={players}
            onAction={sendAction}
            isHost={isHost}
          />
        );
      case "catan":
        return (
          <CatanBoard
            state={gameState}
            playerId={session.playerId}
            onAction={sendAction}
          />
        );
      case "uno":
        return (
          <UnoBoard
            state={gameState}
            playerId={session.playerId}
            onAction={sendAction}
            isHost={isHost}
          />
        );
      case "crazy_eights":
        return (
          <CrazyEightsBoard
            state={gameState}
            playerId={session.playerId}
            onAction={sendAction}
          />
        );
      case "chess":
        return (
          <ChessBoard
            state={gameState}
            playerId={session.playerId}
            onAction={sendAction}
          />
        );
      case "fibbage":
        return <FibbageGame {...commonProps} />;
      case "wordle":
        return (
          <WordleBoard
            state={gameState}
            playerId={session.playerId}
            onAction={sendAction}
            isHost={isHost}
          />
        );
      default:
        return <div className="room-message">Unknown game: {gameKey}</div>;
    }
  };

  const canStart = players.length >= 2 && isHost && currentGame && !gameFinished && gameState?.phase === "LOBBY";

  return (
    <div className="room-shell">
      <header className="room-header">
        <div className="room-title">
          <span className="room-code">Room {joinCode}</span>
          {gameKey && <span className="room-game-badge">{gameKey.toUpperCase()}</span>}
        </div>
        <div className="room-header-actions">
          {timeLeft > 0 && <div className="room-timer">{timeLeft}s</div>}
          <button className="room-btn ghost" onClick={copyLink}>Share</button>
          <button className="room-btn ghost" onClick={() => setChatOpen(!chatOpen)}>
            Chat {chatOpen ? "▼" : "▲"}
          </button>
          <button className="room-btn ghost" onClick={leaveRoom}>Leave</button>
        </div>
      </header>

      <div className="room-body">
        <aside className="room-sidebar">
          <div className="room-panel">
            <div className="room-panel-title">Players ({players.length})</div>
            <div className="room-player-list">
              {players.map((player) => (
                <div
                  key={player.playerId}
                  className={`room-player ${player.playerId === session.playerId ? "you" : ""} ${player.isHost ? "host" : ""}`}
                >
                  <span className="player-name">{player.displayName}</span>
                  {player.isHost && <span className="host-badge">HOST</span>}
                  {gameState?.scores?.[player.playerId] !== undefined && (
                    <span className="player-score">{gameState.scores[player.playerId]}</span>
                  )}
                </div>
              ))}
              {players.length === 0 && <div className="room-empty">No players yet</div>}
            </div>
          </div>

          <VoicePanel
            isInVoice={voice.isInVoice}
            isMuted={voice.isMuted}
            voicePeers={voice.voicePeers}
            error={voice.error}
            onJoin={voice.joinVoice}
            onLeave={voice.leaveVoice}
            onToggleMute={voice.toggleMute}
            players={players}
            session={session}
          />

          {isHost && currentGame && (
            <div className="room-panel host-controls">
              <div className="room-panel-title">Host Controls</div>
              {canStart && (
                <button className="room-btn primary" onClick={startGame}>Start Game</button>
              )}
              {gameFinished && (
                <button className="room-btn primary" onClick={rematch}>Play Again</button>
              )}
              <button className="room-btn secondary" onClick={switchGame}>Switch Game</button>
            </div>
          )}
        </aside>

        <main className="room-main">
          {renderGameArea()}
        </main>

        <ChatPanel
          open={chatOpen}
          messages={room?.chat || []}
          onSend={sendChat}
          session={session}
          socketRef={socketRef}
          typingUsers={typingUsers}
        />
      </div>

      {toast && <div className="room-toast">{toast}</div>}
    </div>
  );
}
