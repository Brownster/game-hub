import {
  newBoard,
  dropPiece as dropPieceInternal,
  getLegalMoves as getLegalMovesInternal,
  checkWinner as checkWinnerInternal,
  isBoardFull as isBoardFullInternal,
  countPieces as countPiecesInternal,
} from "./connect4Rules.js";
import { pickMove as pickMoveInternal } from "./connect4AI.js";
import { getRoom, saveRoom } from "../../rooms/roomService.js";

// Re-export for unified socket handler
export {
  dropPieceInternal as dropPiece,
  getLegalMovesInternal as getLegalMoves,
  checkWinnerInternal as checkWinner,
  isBoardFullInternal as isBoardFull,
  countPiecesInternal as countPieces,
  pickMoveInternal as pickMove,
};

const AI_DELAY_MS = Number(process.env.AI_DELAY_MS || 500);
const pendingAi = new Set();

export function createConnect4InitialState(mode) {
  const board = newBoard();
  const turn = "red"; // Red always goes first

  return {
    board,
    turn,
    legalMoves: getLegalMovesInternal(board),
    counts: { red: 0, yellow: 0 },
    status: "IN_PROGRESS",
    winner: null,
    winningCells: null,
    lastMove: null,
    ai:
      mode === "AI"
        ? { enabled: true, side: "yellow", level: "MEDIUM" }
        : { enabled: false, side: "yellow", level: "MEDIUM" },
  };
}

export function assignPlayersAndMaybeStart(room, player) {
  const alreadyRed =
    room.players.red !== "AI" && room.players.red?.playerId === player.playerId;
  const alreadyYellow =
    room.players.yellow !== "AI" &&
    room.players.yellow?.playerId === player.playerId;

  if (alreadyRed || alreadyYellow) {
    return { ok: true, started: room.status === "IN_PROGRESS" };
  }

  if (room.mode === "PVP") {
    if (!room.players.red) {
      room.players.red = player;
    } else if (!room.players.yellow) {
      room.players.yellow = player;
    } else {
      return { ok: false, error: "ROOM_FULL" };
    }

    if (room.players.red && room.players.yellow) {
      room.status = "IN_PROGRESS";
    }

    return { ok: true, started: room.status === "IN_PROGRESS" };
  }

  // AI mode
  if (!room.players.red) {
    room.players.red = player;
    room.players.yellow = "AI";
    room.status = "IN_PROGRESS";
    return { ok: true, started: true };
  }

  return { ok: false, error: "ROOM_FULL" };
}

export async function handleMove(roomId, playerColor, col) {
  const room = await getRoom(roomId);
  if (!room) throw new Error("ROOM_NOT_FOUND");
  if (room.status !== "IN_PROGRESS") throw new Error("GAME_NOT_IN_PROGRESS");
  if (room.gameKey !== "connect4") throw new Error("INVALID_GAME");

  const state = room.state;
  if (state.turn !== playerColor) throw new Error("NOT_YOUR_TURN");

  const result = dropPieceInternal(state.board, col, playerColor);
  if (!result) throw new Error("INVALID_MOVE");

  state.board = result.board;
  state.lastMove = { col: result.col, row: result.row };
  state.counts = countPiecesInternal(state.board);

  // Check for winner
  const winResult = checkWinnerInternal(state.board, result.col, result.row);
  if (winResult) {
    state.winner = winResult.winner;
    state.winningCells = winResult.winningCells;
    state.status = "FINISHED";
    room.status = "FINISHED";
  } else if (isBoardFullInternal(state.board)) {
    state.winner = "draw";
    state.status = "FINISHED";
    room.status = "FINISHED";
  } else {
    // Switch turn
    state.turn = playerColor === "red" ? "yellow" : "red";
    state.legalMoves = getLegalMovesInternal(state.board);
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

      const col = pickMoveInternal(latestState);
      if (col === null) return;

      const result = dropPieceInternal(latestState.board, col, latestState.ai.side);
      if (!result) return;

      latestState.board = result.board;
      latestState.lastMove = { col: result.col, row: result.row };
      latestState.counts = countPiecesInternal(latestState.board);

      const winResult = checkWinnerInternal(latestState.board, result.col, result.row);
      if (winResult) {
        latestState.winner = winResult.winner;
        latestState.winningCells = winResult.winningCells;
        latestState.status = "FINISHED";
        latest.status = "FINISHED";
      } else if (isBoardFullInternal(latestState.board)) {
        latestState.winner = "draw";
        latestState.status = "FINISHED";
        latest.status = "FINISHED";
      } else {
        latestState.turn = "red";
        latestState.legalMoves = getLegalMovesInternal(latestState.board);
      }

      await saveRoom(latest);

      io.to(`room:${latest.roomId}`).emit("room:state", {
        room: latest,
        gameState: latestState,
      });

      if (latest.status === "FINISHED") {
        io.to(`room:${latest.roomId}`).emit("game:ended", {
          winner: latestState.winner,
          winningCells: latestState.winningCells,
          counts: latestState.counts,
        });
      }
    } finally {
      pendingAi.delete(roomId);
    }
  }, AI_DELAY_MS);
}
