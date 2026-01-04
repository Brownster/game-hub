import { Server } from "socket.io";
import { getRoomByCode, getRoom, saveRoom } from "./rooms/roomService.js";
import { assignPlayersAndMaybeStart, handleMove, scheduleAiIfNeeded } from "./games/reversi/reversiService.js";
import { registerSlitherNamespace } from "./games/slither/slitherSocket.js";
import { allReady, applyVsGuess, assignWordlePlayer, ensurePlayerState, finalizeRound, prepareNextRound, roundFinished, sanitizeWordleState, setReady, startRound } from "./games/wordle/wordleVs.js";

function roomChannel(roomId) {
  return `room:${roomId}`;
}

export function registerSocketHandlers(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  registerSlitherNamespace(io);
  const wordleCountdowns = new Map();

  async function scheduleWordleCountdown(roomId) {
    if (wordleCountdowns.has(roomId)) return;

    const room = await getRoom(roomId);
    if (!room || room.gameKey !== "wordle") return;

    room.state.roundStatus = "COUNTDOWN";
    room.state.countdownEndsAt = Date.now() + 3000;
    await saveRoom(room);
    const safeRoom = { ...room, state: sanitizeWordleState(room.state) };
    io.to(roomChannel(roomId)).emit("wordle:state", { room: safeRoom, state: safeRoom.state });

    const timeoutId = setTimeout(async () => {
      try {
        const latest = await getRoom(roomId);
        if (!latest || latest.gameKey !== "wordle") return;
        if (latest.state.roundStatus !== "COUNTDOWN") return;

        startRound(latest);
        await saveRoom(latest);
        const safeLatest = { ...latest, state: sanitizeWordleState(latest.state) };
        io.to(roomChannel(roomId)).emit("wordle:state", { room: safeLatest, state: safeLatest.state });
      } finally {
        wordleCountdowns.delete(roomId);
      }
    }, 3000);

    wordleCountdowns.set(roomId, timeoutId);
  }

  io.on("connection", (socket) => {
    let session = null;
    let currentRoomId = null;
    let currentWordleRoomId = null;

    socket.on("session:hello", (payload) => {
      if (!payload?.playerId || !payload?.displayName) return;
      session = { playerId: payload.playerId, displayName: payload.displayName };
    });

    socket.on("room:join", async ({ joinCode }) => {
      if (!session) {
        return socket.emit("room:error", { code: "NO_SESSION", message: "Session required" });
      }

      const room = await getRoomByCode(String(joinCode || "").toUpperCase());
      if (!room) {
        return socket.emit("room:error", { code: "ROOM_NOT_FOUND", message: "Room not found" });
      }

      if (room.gameKey === "reversi") {
        const result = assignPlayersAndMaybeStart(room, session);
        if (!result.ok) {
          return socket.emit("room:error", { code: result.error, message: result.error });
        }
      }

      await saveRoom(room);

      currentRoomId = room.roomId;
      socket.join(roomChannel(room.roomId));

      socket.emit("room:state", { room, gameState: room.state });
      socket.to(roomChannel(room.roomId)).emit("game:toast", { message: `${session.displayName} joined` });
      io.to(roomChannel(room.roomId)).emit("room:state", { room, gameState: room.state });

      await scheduleAiIfNeeded(room.roomId, io);
    });

    socket.on("wordle:join", async ({ joinCode }) => {
      if (!session) {
        return socket.emit("wordle:error", { code: "NO_SESSION", message: "Session required" });
      }

      const room = await getRoomByCode(String(joinCode || "").toUpperCase());
      if (!room || room.gameKey !== "wordle") {
        return socket.emit("wordle:error", { code: "ROOM_NOT_FOUND", message: "Room not found" });
      }

      const result = assignWordlePlayer(room, session);
      if (!result.ok) {
        return socket.emit("wordle:error", { code: result.error, message: result.error });
      }

      ensurePlayerState(room.state, session.playerId);

      if (room.players.black && room.players.white) {
        room.status = "IN_PROGRESS";
        room.state.roundStatus = "READY";
      }

      await saveRoom(room);

      currentWordleRoomId = room.roomId;
      socket.join(roomChannel(room.roomId));
      const safeRoom = { ...room, state: sanitizeWordleState(room.state) };
      io.to(roomChannel(room.roomId)).emit("wordle:state", { room: safeRoom, state: safeRoom.state });
    });

    socket.on("wordle:ready", async ({ roomId }) => {
      if (!session || !roomId) return;
      if (currentWordleRoomId !== roomId) return;

      const room = await getRoom(roomId);
      if (!room || room.gameKey !== "wordle") return;
      if (room.status !== "IN_PROGRESS") return;

      setReady(room.state, session.playerId);

      if (allReady(room.state)) {
        scheduleWordleCountdown(roomId);
      }

      await saveRoom(room);
      const safeRoom = { ...room, state: sanitizeWordleState(room.state) };
      io.to(roomChannel(roomId)).emit("wordle:state", { room: safeRoom, state: safeRoom.state });
    });

    socket.on("wordle:guess", async ({ roomId, guess }) => {
      if (!session || !roomId || !guess) return;
      if (currentWordleRoomId !== roomId) return;

      const room = await getRoom(roomId);
      if (!room || room.gameKey !== "wordle") return;
      if (room.status !== "IN_PROGRESS") return;

      try {
        applyVsGuess(room, session.playerId, guess);

        if (roundFinished(room.state)) {
          const winnerId = finalizeRound(room);
          io.to(roomChannel(roomId)).emit("wordle:roundEnd", {
            word: room.state.history.at(-1)?.word,
            winnerId
          });

          if (room.status !== "FINISHED") {
            prepareNextRound(room);
          }
        }

        await saveRoom(room);
        const safeRoom = { ...room, state: sanitizeWordleState(room.state) };
        io.to(roomChannel(roomId)).emit("wordle:state", { room: safeRoom, state: safeRoom.state });
      } catch (err) {
        const code = err?.message || "INVALID_GUESS";
        socket.emit("wordle:error", { code, message: code });
      }
    });

    socket.on("game:action", async ({ roomId, action }) => {
      if (!session || !roomId || !action) return;
      if (currentRoomId !== roomId) return;

      const room = await getRoom(roomId);
      if (!room) return;
      if (room.gameKey !== "reversi") return;

      const black = room.players.black !== "AI" ? room.players.black : null;
      const white = room.players.white !== "AI" ? room.players.white : null;

      const side =
        black?.playerId === session.playerId ? "B" :
        white?.playerId === session.playerId ? "W" :
        null;

      if (!side) {
        return socket.emit("room:error", { code: "PLAYER_NOT_IN_ROOM", message: "Not in room" });
      }

      if (action.type === "MOVE") {
        const { row, col } = action.payload || {};
        if (room.state.turn !== side) {
          return socket.emit("room:error", { code: "NOT_YOUR_TURN", message: "Not your turn" });
        }

        try {
          const updated = await handleMove(roomId, side, row, col);
          io.to(roomChannel(roomId)).emit("room:state", { room: updated, gameState: updated.state });

          if (updated.status === "FINISHED") {
            io.to(roomChannel(roomId)).emit("game:ended", {
              winner: updated.state.winner,
              counts: updated.state.counts
            });
          }

          await scheduleAiIfNeeded(roomId, io);
        } catch (err) {
          const code = err?.message || "INVALID_MOVE";
          socket.emit("room:error", { code, message: code });
        }
      }
    });

    socket.on("room:leave", async ({ roomId }) => {
      if (!roomId) return;
      if (currentRoomId === roomId) {
        socket.leave(roomChannel(roomId));
        currentRoomId = null;
      }
    });
  });

  return io;
}
