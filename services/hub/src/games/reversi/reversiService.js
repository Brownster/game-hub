import { applyMove, countDiscs, getLegalMoves, newBoard } from "./reversiRules.js";
import { pickMove } from "./reversiAI.js";
import { getRoom, saveRoom } from "../../rooms/roomService.js";

const AI_DELAY_MS = Number(process.env.AI_DELAY_MS || 300);
const pendingAi = new Set();

export function createReversiInitialState(mode) {
  const board = newBoard();
  const counts = countDiscs(board);
  const turn = "B";
  const legalMoves = getLegalMoves(board, turn);

  return {
    board,
    turn,
    legalMoves,
    counts,
    status: "IN_PROGRESS",
    winner: undefined,
    lastMove: undefined,
    ai:
      mode === "AI"
        ? { enabled: true, side: "W", level: "EASY" }
        : { enabled: false, side: "W", level: "EASY" }
  };
}

export function assignPlayersAndMaybeStart(room, player) {
  const alreadyBlack = room.players.black !== "AI" && room.players.black?.playerId === player.playerId;
  const alreadyWhite = room.players.white !== "AI" && room.players.white?.playerId === player.playerId;

  if (alreadyBlack || alreadyWhite) {
    return { ok: true, started: room.status === "IN_PROGRESS" };
  }

  if (room.mode === "PVP") {
    if (!room.players.black) {
      room.players.black = player;
    } else if (!room.players.white) {
      room.players.white = player;
    } else {
      return { ok: false, error: "ROOM_FULL" };
    }

    if (room.players.black && room.players.white) {
      room.status = "IN_PROGRESS";
    }

    return { ok: true, started: room.status === "IN_PROGRESS" };
  }

  if (!room.players.black) {
    room.players.black = player;
    room.players.white = "AI";
    room.status = "IN_PROGRESS";
    return { ok: true, started: true };
  }

  return { ok: false, error: "ROOM_FULL" };
}

export async function handleMove(roomId, side, r, c) {
  const room = await getRoom(roomId);
  if (!room) throw new Error("ROOM_NOT_FOUND");
  if (room.status !== "IN_PROGRESS") throw new Error("GAME_NOT_IN_PROGRESS");
  if (room.gameKey !== "reversi") throw new Error("INVALID_GAME");

  const nextState = applyMove(room.state, side, r, c);
  room.state = nextState;

  if (nextState.status === "FINISHED") {
    room.status = "FINISHED";
  }

  await saveRoom(room);
  return room;
}

export async function scheduleAiIfNeeded(roomId, io) {
  if (pendingAi.has(roomId)) return;

  const room = await getRoom(roomId);
  if (!room) return;

  const state = room.state;
  if (!state?.ai?.enabled) return;
  if (room.status !== "IN_PROGRESS") return;
  if (state.turn !== state.ai.side) return;

  pendingAi.add(roomId);

  setTimeout(async () => {
    try {
      const latest = await getRoom(roomId);
      if (!latest) return;

      const latestState = latest.state;
      if (!latestState?.ai?.enabled) return;
      if (latest.status !== "IN_PROGRESS") return;
      if (latestState.turn !== latestState.ai.side) return;

      const move = pickMove(latestState);
      if (!move) return;

      const updatedState = applyMove(latestState, latestState.turn, move.r, move.c);
      latest.state = updatedState;
      if (updatedState.status === "FINISHED") {
        latest.status = "FINISHED";
      }

      await saveRoom(latest);

      io.to(`room:${roomId}`).emit("room:state", { room: latest, gameState: latest.state });
      if (latest.status === "FINISHED") {
        io.to(`room:${roomId}`).emit("game:ended", {
          winner: latest.state.winner,
          counts: latest.state.counts
        });
      }
    } finally {
      pendingAi.delete(roomId);
    }
  }, AI_DELAY_MS);
}
