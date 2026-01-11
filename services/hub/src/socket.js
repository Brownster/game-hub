import crypto from "crypto";
import { Server } from "socket.io";
import {
  getRoomByCode,
  getRoom,
  saveRoom,
  addPlayer,
  removePlayer,
  addChatMessage,
  startGame,
  resetGame,
  endCurrentGame,
  clearCurrentGame,
  getHost,
  isPlayerInRoom,
  isRoomReady,
} from "./rooms/roomService.js";
import { createInitialState } from "./games/registry.js";
import { registerSlitherNamespace } from "./games/slither/slitherSocket.js";

// Game-specific imports for handling actions
import * as reversiService from "./games/reversi/reversiService.js";
import * as connect4Service from "./games/connect4/connect4Service.js";
import * as drawService from "./games/draw/drawService.js";
import * as charadesService from "./games/charades/charadesService.js";
import * as cribbageService from "./games/cribbage/cribbageService.js";
import * as catanService from "./games/catan/catanService.js";
import * as unoService from "./games/uno/unoService.js";
import * as fibbageService from "./games/fibbage/fibbageService.js";
import * as crazyEightsService from "./games/crazy_eights/crazyEightsService.js";
import * as chessService from "./games/chess/chessService.js";
import { pickAiMove } from "./games/chess/chessAi.js";
import * as wordleRoomService from "./games/wordle/wordleRoomService.js";

function roomChannel(roomId) {
  return `room:${roomId}`;
}

// Game configurations
const GAME_CONFIG = {
  reversi: {
    minPlayers: 2,
    maxPlayers: 2,
    modes: ["PVP", "AI"],
    defaultMode: "PVP",
  },
  connect4: {
    minPlayers: 2,
    maxPlayers: 2,
    modes: ["PVP", "AI"],
    defaultMode: "PVP",
  },
  draw: {
    minPlayers: 2,
    maxPlayers: 12,
    modes: ["PARTY"],
    defaultMode: "PARTY",
  },
  charades: {
    minPlayers: 2,
    maxPlayers: 12,
    modes: ["PARTY"],
    defaultMode: "PARTY",
  },
  cribbage: {
    minPlayers: 2,
    maxPlayers: 2,
    modes: ["2P"],
    defaultMode: "2P",
  },
  catan: {
    minPlayers: 3,
    maxPlayers: 4,
    modes: ["3P", "4P"],
    defaultMode: "4P",
  },
  uno: {
    minPlayers: 2,
    maxPlayers: 8,
    modes: ["STANDARD"],
    defaultMode: "STANDARD",
  },
  crazy_eights: {
    minPlayers: 2,
    maxPlayers: 6,
    modes: ["STANDARD"],
    defaultMode: "STANDARD",
  },
  chess: {
    minPlayers: 2,
    maxPlayers: 2,
    modes: ["PVP", "AI"],
    defaultMode: "PVP",
  },
  fibbage: {
    minPlayers: 3,
    maxPlayers: 8,
    modes: ["PARTY"],
    defaultMode: "PARTY",
  },
  wordle: {
    minPlayers: 2,
    maxPlayers: 8,
    modes: ["STANDARD", "QUICK", "LONG"],
    defaultMode: "STANDARD",
  },
};

export function registerSocketHandlers(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  registerSlitherNamespace(io);

  // Timer tracking for time-based games
  const gameTimers = new Map(); // roomId -> { type, timeoutId }
  const playerSockets = new Map(); // playerId -> Set<socketId>
  const voicePeers = new Map(); // roomId -> Set<playerId>

  // Generate time-limited TURN credentials using shared secret
  function generateTurnCredentials(playerId) {
    const turnSecret = process.env.TURN_SECRET || "gamehub-turn-secret";
    const turnServer = process.env.TURN_SERVER || "turn:localhost:3478";

    // Credentials valid for 24 hours
    const ttl = 86400;
    const timestamp = Math.floor(Date.now() / 1000) + ttl;
    const username = `${timestamp}:${playerId}`;
    const credential = crypto
      .createHmac("sha1", turnSecret)
      .update(username)
      .digest("base64");

    return {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        {
          urls: turnServer,
          username,
          credential,
        },
      ],
    };
  }

  // ===== Helper Functions =====

  function emitToPlayer(playerId, event, payload) {
    const sockets = playerSockets.get(playerId);
    if (!sockets) return;
    sockets.forEach((socketId) => {
      io.to(socketId).emit(event, payload);
    });
  }

  function broadcastRoomState(room) {
    const gameKey = room.currentGame?.gameKey;
    let sanitizedRoom = { ...room };

    // Sanitize game state based on game type
    if (room.currentGame && gameKey) {
      const state = room.currentGame.state;

      if (gameKey === "draw" && drawService.sanitizeState) {
        // Send hidden state to all, full state to drawer
        const hiddenState = drawService.sanitizeState(state, null);
        sanitizedRoom = { ...room, currentGame: { ...room.currentGame, state: hiddenState } };
        io.to(roomChannel(room.roomId)).emit("room:state", sanitizedRoom);

        if (state.drawerId) {
          const fullState = drawService.sanitizeState(state, state.drawerId);
          const drawerRoom = { ...room, currentGame: { ...room.currentGame, state: fullState } };
          emitToPlayer(state.drawerId, "room:state", drawerRoom);
        }
        return;
      }

      if (gameKey === "charades" && charadesService.sanitizeState) {
        // Send hidden state to all, full state to performer
        const hiddenState = charadesService.sanitizeState(state, null);
        sanitizedRoom = { ...room, currentGame: { ...room.currentGame, state: hiddenState } };
        io.to(roomChannel(room.roomId)).emit("room:state", sanitizedRoom);

        if (state.performerId) {
          const fullState = charadesService.sanitizeState(state, state.performerId);
          const performerRoom = { ...room, currentGame: { ...room.currentGame, state: fullState } };
          emitToPlayer(state.performerId, "room:state", performerRoom);
        }
        return;
      }

      if (gameKey === "cribbage" && cribbageService.sanitizeState) {
        // Each player sees only their own hand - send personalized state to each
        for (const player of room.players) {
          const playerState = cribbageService.sanitizeState(state, player.playerId);
          const playerRoom = { ...room, currentGame: { ...room.currentGame, state: playerState } };
          emitToPlayer(player.playerId, "room:state", playerRoom);
        }
        return;
      }

      if (gameKey === "catan" && catanService.sanitizeState) {
        // Each player sees only their own resources/dev cards - send personalized state to each
        for (const player of room.players) {
          const playerState = catanService.sanitizeState(state, player.playerId);
          const playerRoom = { ...room, currentGame: { ...room.currentGame, state: playerState } };
          emitToPlayer(player.playerId, "room:state", playerRoom);
        }
        return;
      }

      if (gameKey === "uno" && unoService.sanitizeState) {
        // Each player sees only their own hand - send personalized state to each
        for (const player of room.players) {
          const playerState = unoService.sanitizeState(state, player.playerId);
          const playerRoom = { ...room, currentGame: { ...room.currentGame, state: playerState } };
          emitToPlayer(player.playerId, "room:state", playerRoom);
        }
        return;
      }

      if (gameKey === "crazy_eights" && crazyEightsService.sanitizeState) {
        // Each player sees only their own hand - send personalized state to each
        for (const player of room.players) {
          const playerState = crazyEightsService.sanitizeState(state, player.playerId);
          const playerRoom = { ...room, currentGame: { ...room.currentGame, state: playerState } };
          emitToPlayer(player.playerId, "room:state", playerRoom);
        }
        return;
      }

      if (gameKey === "chess" && chessService.sanitizeState) {
        for (const player of room.players) {
          const playerState = chessService.sanitizeState(state, player.playerId);
          const playerRoom = { ...room, currentGame: { ...room.currentGame, state: playerState } };
          emitToPlayer(player.playerId, "room:state", playerRoom);
        }
        return;
      }

      if (gameKey === "fibbage" && fibbageService.sanitizeState) {
        // Same sanitized state for all players (hides lie ownership until reveal)
        const sanitizedState = fibbageService.sanitizeState(state, null);
        sanitizedRoom = { ...room, currentGame: { ...room.currentGame, state: sanitizedState } };
        io.to(roomChannel(room.roomId)).emit("room:state", sanitizedRoom);
        return;
      }

      if (gameKey === "wordle" && wordleRoomService.sanitizeState) {
        // Each player sees their own guesses, but opponents only see guess count during play
        for (const player of room.players) {
          const playerState = wordleRoomService.sanitizeState(state, player.playerId);
          const playerRoom = { ...room, currentGame: { ...room.currentGame, state: playerState } };
          emitToPlayer(player.playerId, "room:state", playerRoom);
        }
        return;
      }
    }

    io.to(roomChannel(room.roomId)).emit("room:state", sanitizedRoom);
  }

  function clearGameTimer(roomId) {
    const timer = gameTimers.get(roomId);
    if (timer) {
      clearTimeout(timer.timeoutId);
      gameTimers.delete(roomId);
    }
  }

  function scheduleGameTimer(roomId, type, ms, callback) {
    clearGameTimer(roomId);
    const timeoutId = setTimeout(callback, ms);
    gameTimers.set(roomId, { type, timeoutId });
  }

  // ===== Game Action Handlers =====

  async function handleGameAction(room, playerId, action) {
    const gameKey = room.currentGame?.gameKey;
    if (!gameKey) return { ok: false, error: "NO_GAME" };

    const state = room.currentGame.state;

    switch (gameKey) {
      case "reversi":
        return handleReversiAction(room, playerId, action);
      case "connect4":
        return handleConnect4Action(room, playerId, action);
      case "draw":
        return handleDrawAction(room, playerId, action);
      case "charades":
        return handleCharadesAction(room, playerId, action);
      case "cribbage":
        return handleCribbageAction(room, playerId, action);
      case "catan":
        return handleCatanAction(room, playerId, action);
      case "uno":
        return handleUnoAction(room, playerId, action);
      case "crazy_eights":
        return handleCrazyEightsAction(room, playerId, action);
      case "chess":
        return handleChessAction(room, playerId, action);
      case "fibbage":
        return handleFibbageAction(room, playerId, action);
      case "wordle":
        return handleWordleAction(room, playerId, action);
      default:
        return { ok: false, error: "UNKNOWN_GAME" };
    }
  }

  function handleReversiAction(room, playerId, action) {
    const state = room.currentGame.state;
    const players = room.players;

    // Determine player side (first player = black, second = yellow for AI or white)
    const playerIndex = players.findIndex((p) => p.playerId === playerId);
    const side = playerIndex === 0 ? "B" : playerIndex === 1 ? "W" : null;

    if (!side) return { ok: false, error: "NOT_IN_GAME" };
    if (state.turn !== side) return { ok: false, error: "NOT_YOUR_TURN" };

    if (action.type === "MOVE") {
      const { row, col } = action.payload || {};
      const nextState = reversiService.applyMove
        ? reversiService.applyMove(state, side, row, col)
        : null;

      if (!nextState) return { ok: false, error: "INVALID_MOVE" };

      room.currentGame.state = nextState;

      if (nextState.status === "FINISHED") {
        room.currentGame.status = "FINISHED";
      }

      return { ok: true, scheduleAi: state.ai?.enabled && nextState.turn === state.ai?.side };
    }

    return { ok: false, error: "UNKNOWN_ACTION" };
  }

  function handleConnect4Action(room, playerId, action) {
    const state = room.currentGame.state;
    const players = room.players;

    const playerIndex = players.findIndex((p) => p.playerId === playerId);
    const playerColor = playerIndex === 0 ? "red" : playerIndex === 1 ? "yellow" : null;

    if (!playerColor) return { ok: false, error: "NOT_IN_GAME" };
    if (state.turn !== playerColor) return { ok: false, error: "NOT_YOUR_TURN" };

    if (action.type === "MOVE") {
      const { col } = action.payload || {};
      const result = connect4Service.dropPiece
        ? connect4Service.dropPiece(state.board, col, playerColor)
        : null;

      if (!result) return { ok: false, error: "INVALID_MOVE" };

      state.board = result.board;
      state.lastMove = { col: result.col, row: result.row };
      state.counts = connect4Service.countPieces(state.board);

      const winResult = connect4Service.checkWinner(state.board, result.col, result.row);
      if (winResult) {
        state.winner = winResult.winner;
        state.winningCells = winResult.winningCells;
        state.status = "FINISHED";
        room.currentGame.status = "FINISHED";
      } else if (connect4Service.isBoardFull(state.board)) {
        state.winner = "draw";
        state.status = "FINISHED";
        room.currentGame.status = "FINISHED";
      } else {
        state.turn = playerColor === "red" ? "yellow" : "red";
        state.legalMoves = connect4Service.getLegalMoves(state.board);
      }

      return { ok: true, scheduleAi: state.ai?.enabled && state.turn === state.ai?.side };
    }

    return { ok: false, error: "UNKNOWN_ACTION" };
  }

  function handleDrawAction(room, playerId, action) {
    const state = room.currentGame.state;

    if (action.type === "STROKE") {
      if (state.phase !== "DRAWING") return { ok: false, error: "NOT_DRAWING" };
      if (state.drawerId !== playerId) return { ok: false, error: "NOT_DRAWER" };

      drawService.addStroke(state, action.payload);
      return { ok: true, broadcast: "stroke", stroke: action.payload };
    }

    if (action.type === "GUESS") {
      if (state.phase !== "DRAWING") return { ok: false, error: "NOT_DRAWING" };

      const outcome = drawService.applyGuess(state, playerId, action.payload);

      if (outcome.correct) {
        clearGameTimer(room.roomId);
        scheduleRevealTimer(room.roomId, state, "draw");
      }

      return { ok: true };
    }

    return { ok: false, error: "UNKNOWN_ACTION" };
  }

  function handleCharadesAction(room, playerId, action) {
    const state = room.currentGame.state;

    if (action.type === "GUESS") {
      if (state.phase !== "PERFORMING") return { ok: false, error: "NOT_PERFORMING" };

      const outcome = charadesService.applyGuess(state, playerId, action.payload);

      if (outcome.correct) {
        clearGameTimer(room.roomId);
        scheduleRevealTimer(room.roomId, state, "charades");
      }

      return { ok: true };
    }

    return { ok: false, error: "UNKNOWN_ACTION" };
  }

  function handleCribbageAction(room, playerId, action) {
    const state = room.currentGame.state;

    // Find player index
    const playerIndex = state.players.findIndex((p) => p.playerId === playerId);
    if (playerIndex === -1) return { ok: false, error: "NOT_IN_GAME" };

    if (action.type === "DISCARD") {
      if (state.phase !== "DISCARD") return { ok: false, error: "WRONG_PHASE" };

      const { cardIds } = action.payload || {};
      if (!cardIds || !Array.isArray(cardIds)) return { ok: false, error: "INVALID_CARDS" };

      const result = cribbageService.discardToCrib(state, playerIndex, cardIds);
      if (!result.ok) return { ok: false, error: result.error };

      // Check if all players have discarded
      if (state.phase === "CUT") {
        // Phase advanced automatically by discardToCrib
      }

      return { ok: true };
    }

    if (action.type === "CUT") {
      if (state.phase !== "CUT") return { ok: false, error: "WRONG_PHASE" };

      // Non-dealer cuts
      const nonDealerIndex = state.dealerIndex === 0 ? 1 : 0;
      if (playerIndex !== nonDealerIndex) return { ok: false, error: "NOT_YOUR_TURN" };

      const result = cribbageService.cutDeck(state);
      if (!result.ok) return { ok: false, error: result.error };

      return { ok: true };
    }

    if (action.type === "PLAY_CARD") {
      if (state.phase !== "PEGGING") return { ok: false, error: "WRONG_PHASE" };
      if (state.turnIndex !== playerIndex) return { ok: false, error: "NOT_YOUR_TURN" };

      const { cardId } = action.payload || {};
      if (!cardId) return { ok: false, error: "INVALID_CARD" };

      const result = cribbageService.playCard(state, playerIndex, cardId);
      if (!result.ok) return { ok: false, error: result.error };

      // Check for game end
      if (state.phase === "GAME_END") {
        room.currentGame.status = "FINISHED";
      }

      return { ok: true };
    }

    if (action.type === "GO") {
      if (state.phase !== "PEGGING") return { ok: false, error: "WRONG_PHASE" };
      if (state.turnIndex !== playerIndex) return { ok: false, error: "NOT_YOUR_TURN" };

      const result = cribbageService.sayGo(state, playerIndex);
      if (!result.ok) return { ok: false, error: result.error };

      // Check for game end
      if (state.phase === "GAME_END") {
        room.currentGame.status = "FINISHED";
      }

      return { ok: true };
    }

    if (action.type === "CONFIRM_SHOW") {
      if (state.phase !== "SHOW" && state.phase !== "CRIB_SHOW") {
        return { ok: false, error: "WRONG_PHASE" };
      }

      const result = cribbageService.confirmShow(state, playerIndex);
      if (!result.ok) return { ok: false, error: result.error };

      // Check for game end
      if (state.phase === "GAME_END") {
        room.currentGame.status = "FINISHED";
      }

      return { ok: true };
    }

    if (action.type === "NEXT_ROUND") {
      if (state.phase !== "ROUND_END") return { ok: false, error: "WRONG_PHASE" };

      const result = cribbageService.nextRound(state);
      if (!result.ok) return { ok: false, error: result.error };

      return { ok: true };
    }

    return { ok: false, error: "UNKNOWN_ACTION" };
  }

  function handleCatanAction(room, playerId, action) {
    const state = room.currentGame.state;

    const result = catanService.processAction(state, playerId, action);
    if (!result.ok) return result;

    // Check for game end
    if (catanService.isGameFinished(state)) {
      room.currentGame.status = "FINISHED";
    }

    return { ok: true };
  }

  function handleUnoAction(room, playerId, action) {
    const state = room.currentGame.state;
    const result = unoService.processAction(state, playerId, action);
    if (!result.ok) return result;

    if (state.phase === unoService.PHASES.FINISHED) {
      room.currentGame.status = "FINISHED";
    }

    return { ok: true };
  }

  function handleCrazyEightsAction(room, playerId, action) {
    const state = room.currentGame.state;
    const result = crazyEightsService.processAction(state, playerId, action);
    if (!result.ok) return result;

    if (state.phase === crazyEightsService.PHASES.FINISHED) {
      room.currentGame.status = "FINISHED";
    }

    return { ok: true };
  }

  function handleChessAction(room, playerId, action) {
    const state = room.currentGame.state;
    const result = chessService.processAction(state, playerId, action);
    if (!result.ok) return result;

    if (state.phase === chessService.PHASES.FINISHED) {
      room.currentGame.status = "FINISHED";
    }

    const scheduleAi =
      state.ai?.enabled &&
      state.phase === chessService.PHASES.TURN &&
      state.turn === state.ai.side;

    return { ok: true, scheduleAi };
  }

  function handleFibbageAction(room, playerId, action) {
    const state = room.currentGame.state;
    if (action?.type === fibbageService.ACTIONS?.CONTINUE) {
      const host = getHost(room);
      if (!host || host.playerId !== playerId) {
        return { ok: false, error: "NOT_HOST" };
      }
      if (![fibbageService.PHASES.REVEAL, fibbageService.PHASES.SCORE].includes(state.phase)) {
        return { ok: false, error: "WRONG_PHASE" };
      }
    }

    const result = fibbageService.processAction(state, playerId, action);
    if (!result.ok) return result;

    // Schedule timer for new phase if needed
    if (state.phaseEndsAt) {
      scheduleFibbageTimer(room.roomId, state);
    }

    if (fibbageService.isGameFinished(state)) {
      room.currentGame.status = "FINISHED";
    }

    return { ok: true };
  }

  function handleWordleAction(room, playerId, action) {
    const state = room.currentGame.state;

    // Handle NEXT_ROUND action - only host can advance
    if (action?.type === "NEXT_ROUND") {
      const host = getHost(room);
      if (!host || host.playerId !== playerId) {
        return { ok: false, error: "NOT_HOST" };
      }
    }

    const result = wordleRoomService.processAction(state, playerId, action);
    if (!result.ok) return result;

    // Check if all players ready and should auto-start next round
    if (action?.type === "READY" && wordleRoomService.allReady(state)) {
      if (state.phase === wordleRoomService.PHASES.LOBBY || state.phase === wordleRoomService.PHASES.ROUND_END) {
        wordleRoomService.startRound(state);
        scheduleWordleRoundTimer(room.roomId, state);
      }
    }

    if (wordleRoomService.isGameFinished(state)) {
      room.currentGame.status = "FINISHED";
    }

    return { ok: true };
  }

  // ===== Timer Schedulers =====

  function scheduleRoundTimer(roomId, state, gameKey) {
    const ms = Math.max(0, state.roundEndsAt - Date.now());

    scheduleGameTimer(roomId, "round", ms, async () => {
      const room = await getRoom(roomId);
      if (!room || !room.currentGame) return;

      const currentState = room.currentGame.state;

      if (gameKey === "draw" && currentState.phase === "DRAWING") {
        drawService.endRound(currentState, "timeout");
        await saveRoom(room);
        broadcastRoomState(room);
        scheduleRevealTimer(roomId, currentState, gameKey);
      } else if (gameKey === "charades" && currentState.phase === "PERFORMING") {
        charadesService.endRound(currentState, "timeout");
        await saveRoom(room);
        broadcastRoomState(room);
        scheduleRevealTimer(roomId, currentState, gameKey);
      }
    });
  }

  function scheduleRevealTimer(roomId, state, gameKey) {
    const ms = Math.max(0, state.revealEndsAt - Date.now());

    scheduleGameTimer(roomId, "reveal", ms, async () => {
      const room = await getRoom(roomId);
      if (!room || !room.currentGame) return;

      const currentState = room.currentGame.state;

      if (gameKey === "draw" && currentState.phase === "REVEAL") {
        drawService.advanceTurn(currentState);
        drawService.startRound(currentState);
        if (currentState.phase === "DRAWING") {
          scheduleRoundTimer(roomId, currentState, gameKey);
        }
        await saveRoom(room);
        broadcastRoomState(room);
        io.to(roomChannel(roomId)).emit("game:clear"); // Clear canvas
      } else if (gameKey === "charades" && currentState.phase === "REVEAL") {
        charadesService.advanceTurn(currentState);
        charadesService.startRound(currentState);
        if (currentState.phase === "PERFORMING") {
          scheduleRoundTimer(roomId, currentState, gameKey);
        }
        await saveRoom(room);
        broadcastRoomState(room);
      }
    });
  }

  function scheduleFibbageTimer(roomId, state) {
    if (!state.phaseEndsAt) return;

    const ms = Math.max(0, state.phaseEndsAt - Date.now());

    scheduleGameTimer(roomId, "fibbage", ms, async () => {
      const room = await getRoom(roomId);
      if (!room || !room.currentGame) return;
      if (room.currentGame.gameKey !== "fibbage") return;

      const currentState = room.currentGame.state;

      // Force advance to next phase
      fibbageService.forceAdvancePhase(currentState);

      // Schedule next timer if there's a new phase with timer
      if (currentState.phaseEndsAt) {
        scheduleFibbageTimer(roomId, currentState);
      }

      // Check for game end
      if (fibbageService.isGameFinished(currentState)) {
        room.currentGame.status = "FINISHED";
      }

      await saveRoom(room);
      broadcastRoomState(room);
    });
  }

  function scheduleWordleRoundTimer(roomId, state) {
    if (!state.roundEndsAt) return;

    const ms = Math.max(0, state.roundEndsAt - Date.now());

    scheduleGameTimer(roomId, "wordle", ms, async () => {
      const room = await getRoom(roomId);
      if (!room || !room.currentGame) return;
      if (room.currentGame.gameKey !== "wordle") return;

      const currentState = room.currentGame.state;

      if (currentState.phase === wordleRoomService.PHASES.PLAYING) {
        // Force end the round - mark remaining players as lost
        wordleRoomService.forceEndRound(currentState);
      }

      // Check for game end
      if (wordleRoomService.isGameFinished(currentState)) {
        room.currentGame.status = "FINISHED";
      }

      await saveRoom(room);
      broadcastRoomState(room);
    });
  }

  async function scheduleAiMove(roomId, gameKey) {
    const room = await getRoom(roomId);
    if (!room || !room.currentGame) return;

    const state = room.currentGame.state;
    if (!state.ai?.enabled) return;
    if (room.currentGame.status !== "PLAYING") return;

    const delay = gameKey === "reversi" ? 300 : 500;

    setTimeout(async () => {
      const latest = await getRoom(roomId);
      if (!latest || !latest.currentGame) return;

      const latestState = latest.currentGame.state;
      if (!latestState.ai?.enabled) return;
      if (latest.currentGame.status !== "PLAYING") return;

      if (gameKey === "reversi" && latestState.turn === latestState.ai.side) {
        const move = reversiService.pickMove?.(latestState);
        if (move) {
          const nextState = reversiService.applyMove(latestState, latestState.turn, move.r, move.c);
          latest.currentGame.state = nextState;
          if (nextState.status === "FINISHED") {
            latest.currentGame.status = "FINISHED";
          }
          await saveRoom(latest);
          broadcastRoomState(latest);
        }
      } else if (gameKey === "connect4" && latestState.turn === latestState.ai.side) {
        const col = connect4Service.pickMove?.(latestState);
        if (col !== null) {
          const result = connect4Service.dropPiece(latestState.board, col, latestState.ai.side);
          if (result) {
            latestState.board = result.board;
            latestState.lastMove = { col: result.col, row: result.row };
            latestState.counts = connect4Service.countPieces(latestState.board);

            const winResult = connect4Service.checkWinner(latestState.board, result.col, result.row);
            if (winResult) {
              latestState.winner = winResult.winner;
              latestState.winningCells = winResult.winningCells;
              latestState.status = "FINISHED";
              latest.currentGame.status = "FINISHED";
            } else if (connect4Service.isBoardFull(latestState.board)) {
              latestState.winner = "draw";
              latestState.status = "FINISHED";
              latest.currentGame.status = "FINISHED";
            } else {
              latestState.turn = "red";
              latestState.legalMoves = connect4Service.getLegalMoves(latestState.board);
            }

            await saveRoom(latest);
            broadcastRoomState(latest);
          }
        }
      } else if (gameKey === "chess" && latestState.turn === latestState.ai.side) {
        const depth = Number(process.env.CHESS_AI_DEPTH || 2);
        const aiMove = pickAiMove(latestState.fen, depth);
        if (aiMove) {
          const result = chessService.processAction(latestState, latestState.ai.playerId, {
            type: chessService.ACTIONS.MOVE,
            from: aiMove.from,
            to: aiMove.to,
            promotion: aiMove.promotion,
          });
          if (result.ok && latestState.phase === chessService.PHASES.FINISHED) {
            latest.currentGame.status = "FINISHED";
          }
          await saveRoom(latest);
          broadcastRoomState(latest);
        }
      }
    }, delay);
  }

  // ===== Socket Connection Handler =====

  io.on("connection", (socket) => {
    let session = null;
    let currentRoomId = null;

    // Session establishment
    socket.on("session:hello", (payload) => {
      if (!payload?.playerId || !payload?.displayName) return;
      session = { playerId: payload.playerId, displayName: payload.displayName };

      const existing = playerSockets.get(session.playerId) || new Set();
      existing.add(socket.id);
      playerSockets.set(session.playerId, existing);
    });

    // ===== Room Events =====

    socket.on("room:join", async ({ joinCode }) => {
      if (!session) {
        return socket.emit("room:error", { code: "NO_SESSION", message: "Session required" });
      }

      const room = await getRoomByCode(String(joinCode || "").toUpperCase());
      if (!room) {
        return socket.emit("room:error", { code: "ROOM_NOT_FOUND", message: "Room not found" });
      }

      const result = addPlayer(room, session);
      if (!result.ok) {
        return socket.emit("room:error", { code: result.error, message: result.error });
      }

      await saveRoom(room);

      currentRoomId = room.roomId;
      socket.join(roomChannel(room.roomId));

      // Notify others
      if (result.isNew) {
        socket.to(roomChannel(room.roomId)).emit("room:playerJoined", {
          player: { playerId: session.playerId, displayName: session.displayName },
        });
      }

      broadcastRoomState(room);
    });

    socket.on("room:leave", async () => {
      if (!currentRoomId) return;

      const room = await getRoom(currentRoomId);
      if (room && session) {
        removePlayer(room, session.playerId);

        // Handle party game player removal
        if (room.currentGame) {
          const gameKey = room.currentGame.gameKey;
          const state = room.currentGame.state;

          if (gameKey === "draw") {
            drawService.removePlayer(state, session.playerId);
            if (state.players.length < 2) {
              state.phase = "LOBBY";
              clearGameTimer(room.roomId);
            }
          } else if (gameKey === "charades") {
            charadesService.removePlayer(state, session.playerId);
            if (state.players.length < 2) {
              state.phase = "LOBBY";
              clearGameTimer(room.roomId);
            }
          } else if (gameKey === "cribbage") {
            cribbageService.removePlayer(state, session.playerId);
            if (state.players.length < 2) {
              state.phase = "LOBBY";
            }
          } else if (gameKey === "fibbage") {
            fibbageService.removePlayer(state, session.playerId);
            if (state.players.length < 3) {
              state.phase = "LOBBY";
              clearGameTimer(room.roomId);
            }
          } else if (gameKey === "wordle") {
            wordleRoomService.removePlayer(state, session.playerId);
            if (state.players.length < 2) {
              state.phase = wordleRoomService.PHASES.LOBBY;
              clearGameTimer(room.roomId);
            }
          }
        }

        await saveRoom(room);

        socket.to(roomChannel(room.roomId)).emit("room:playerLeft", {
          playerId: session.playerId,
        });

        broadcastRoomState(room);
      }

      socket.leave(roomChannel(currentRoomId));
      currentRoomId = null;
    });

    socket.on("room:chat", async ({ message }) => {
      if (!session || !currentRoomId || !message) return;

      const room = await getRoom(currentRoomId);
      if (!room) return;

      const chatMessage = addChatMessage(room, session.playerId, message);
      if (!chatMessage) return;

      await saveRoom(room);

      io.to(roomChannel(room.roomId)).emit("room:chatMessage", chatMessage);
    });

    socket.on("room:typing", () => {
      if (!session || !currentRoomId) return;

      // Broadcast to room except sender
      socket.to(roomChannel(currentRoomId)).emit("room:typing", {
        playerId: session.playerId,
        displayName: session.displayName,
      });
    });

    // ===== Voice Chat Events =====

    socket.on("voice:get-ice-servers", () => {
      if (!session) return;
      socket.emit("voice:ice-servers", generateTurnCredentials(session.playerId));
    });

    socket.on("voice:join", async () => {
      if (!session || !currentRoomId) return;

      const room = await getRoom(currentRoomId);
      if (!room) return;

      // Get or create peer set for this room
      let peers = voicePeers.get(currentRoomId);
      if (!peers) {
        peers = new Set();
        voicePeers.set(currentRoomId, peers);
      }

      // Check if already in voice
      if (peers.has(session.playerId)) return;

      // Get existing peers before adding new one
      const existingPeers = Array.from(peers).map((peerId) => {
        const player = room.players.find((p) => p.playerId === peerId);
        return { playerId: peerId, displayName: player?.displayName || "Unknown" };
      });

      // Add to voice peers
      peers.add(session.playerId);

      // Notify existing peers that a new peer joined (they should create offers)
      existingPeers.forEach((peer) => {
        emitToPlayer(peer.playerId, "voice:peer-joined", {
          playerId: session.playerId,
          displayName: session.displayName,
        });
      });

      // Send current peer list to all in room
      const allPeers = Array.from(peers).map((peerId) => {
        const player = room.players.find((p) => p.playerId === peerId);
        return { playerId: peerId, displayName: player?.displayName || "Unknown" };
      });

      io.to(roomChannel(currentRoomId)).emit("voice:peers", { peers: allPeers });
    });

    socket.on("voice:leave", () => {
      if (!session || !currentRoomId) return;

      const peers = voicePeers.get(currentRoomId);
      if (!peers) return;

      peers.delete(session.playerId);

      // Notify others that peer left
      io.to(roomChannel(currentRoomId)).emit("voice:peer-left", {
        playerId: session.playerId,
      });

      // Send updated peer list
      const remainingPeers = Array.from(peers).map((peerId) => {
        return { playerId: peerId, displayName: "Unknown" }; // Will be enriched client-side
      });

      io.to(roomChannel(currentRoomId)).emit("voice:peers", { peers: remainingPeers });

      // Clean up empty set
      if (peers.size === 0) {
        voicePeers.delete(currentRoomId);
      }
    });

    socket.on("voice:offer", ({ targetPlayerId, sdp }) => {
      if (!session || !currentRoomId) return;

      emitToPlayer(targetPlayerId, "voice:offer", {
        fromPlayerId: session.playerId,
        sdp,
      });
    });

    socket.on("voice:answer", ({ targetPlayerId, sdp }) => {
      if (!session || !currentRoomId) return;

      emitToPlayer(targetPlayerId, "voice:answer", {
        fromPlayerId: session.playerId,
        sdp,
      });
    });

    socket.on("voice:ice-candidate", ({ targetPlayerId, candidate }) => {
      if (!session || !currentRoomId) return;

      emitToPlayer(targetPlayerId, "voice:ice-candidate", {
        fromPlayerId: session.playerId,
        candidate,
      });
    });

    socket.on("room:selectGame", async ({ gameKey, mode }) => {
      if (!session || !currentRoomId) return;

      const room = await getRoom(currentRoomId);
      if (!room) return;

      // Only host can select game
      const host = getHost(room);
      if (!host || host.playerId !== session.playerId) {
        return socket.emit("room:error", { code: "NOT_HOST", message: "Only host can select game" });
      }

      const config = GAME_CONFIG[gameKey];
      if (!config) {
        return socket.emit("room:error", { code: "UNKNOWN_GAME", message: "Unknown game" });
      }

      const safeMode = config.modes.includes(mode) ? mode : config.defaultMode;

      // Update room max players based on game
      room.maxPlayers = config.maxPlayers;

      // Prepare player info for games that need it at initialization
      const playerInfo = room.players.map((p) => ({
        odRoomId: room.roomId,
        odPlayerId: p.playerId,
        odDisplayName: p.displayName,
        isHost: p.isHost,
      }));

      // Initialize game state
      const initialState = createInitialState(gameKey, safeMode, playerInfo);

      // Sync players to game state (for games that add players after init)
      if (gameKey === "draw" || gameKey === "charades" || gameKey === "cribbage" || gameKey === "fibbage" || gameKey === "wordle") {
        room.players.forEach((p) => {
          if (gameKey === "draw") {
            drawService.addPlayer(initialState, { playerId: p.playerId, displayName: p.displayName });
          } else if (gameKey === "charades") {
            charadesService.addPlayer(initialState, { playerId: p.playerId, displayName: p.displayName });
          } else if (gameKey === "cribbage") {
            cribbageService.addPlayer(initialState, { playerId: p.playerId, displayName: p.displayName });
          } else if (gameKey === "fibbage") {
            fibbageService.addPlayer(initialState, { playerId: p.playerId, displayName: p.displayName });
          } else if (gameKey === "wordle") {
            wordleRoomService.addPlayer(initialState, { playerId: p.playerId, displayName: p.displayName });
          }
        });
      }

      startGame(room, gameKey, safeMode, initialState);
      await saveRoom(room);

      io.to(roomChannel(room.roomId)).emit("room:gameSelected", {
        gameKey,
        mode: safeMode,
      });

      broadcastRoomState(room);
    });

    socket.on("room:startGame", async () => {
      if (!session || !currentRoomId) return;

      const room = await getRoom(currentRoomId);
      if (!room || !room.currentGame) return;

      const host = getHost(room);
      if (!host || host.playerId !== session.playerId) {
        return socket.emit("room:error", { code: "NOT_HOST", message: "Only host can start game" });
      }

      const gameKey = room.currentGame.gameKey;
      const config = GAME_CONFIG[gameKey];
      let minPlayers = config?.minPlayers ?? 2;
      if (gameKey === "chess" && room.currentGame.mode === "AI") {
        minPlayers = 1;
      }
      if (room.players.length < minPlayers) {
        return socket.emit("room:error", {
          code: "NOT_READY",
          message: `Need at least ${minPlayers} players`,
        });
      }

      const state = room.currentGame.state;

      // Start party games
      if (gameKey === "draw") {
        drawService.startRound(state);
        if (state.phase === "DRAWING") {
          scheduleRoundTimer(room.roomId, state, gameKey);
        }
      } else if (gameKey === "charades") {
        charadesService.startRound(state);
        if (state.phase === "PERFORMING") {
          scheduleRoundTimer(room.roomId, state, gameKey);
        }
      } else if (gameKey === "cribbage") {
        cribbageService.startRound(state);
      } else if (gameKey === "catan") {
        const started = catanService.startCatanGame(state);
        if (!started.ok) {
          return socket.emit("room:error", {
            code: started.error || "START_FAILED",
            message: started.error || "Unable to start game",
          });
        }
      } else if (gameKey === "uno") {
        const started = unoService.startUnoGame(state);
        if (!started.ok) {
          return socket.emit("room:error", {
            code: started.error || "START_FAILED",
            message: started.error || "Unable to start game",
          });
        }
      } else if (gameKey === "crazy_eights") {
        const started = crazyEightsService.startCrazyEightsGame(state);
        if (!started.ok) {
          return socket.emit("room:error", {
            code: started.error || "START_FAILED",
            message: started.error || "Unable to start game",
          });
        }
      } else if (gameKey === "chess") {
        const started = chessService.startChessGame(state);
        if (!started.ok) {
          return socket.emit("room:error", {
            code: started.error || "START_FAILED",
            message: started.error || "Unable to start game",
          });
        }
      } else if (gameKey === "fibbage") {
        const started = fibbageService.startRound(state);
        if (!started) {
          return socket.emit("room:error", {
            code: "NOT_ENOUGH_PLAYERS",
            message: "Need at least 3 players",
          });
        }
        // Schedule timer for submit lies phase
        scheduleFibbageTimer(room.roomId, state);
      } else if (gameKey === "wordle") {
        const started = wordleRoomService.startRound(state);
        if (!started.ok) {
          return socket.emit("room:error", {
            code: started.error || "NOT_ENOUGH_PLAYERS",
            message: started.error || "Need at least 2 players",
          });
        }
        // Schedule timer for round
        scheduleWordleRoundTimer(room.roomId, state);
      }

      await saveRoom(room);
      broadcastRoomState(room);
    });

    socket.on("room:rematch", async () => {
      if (!session || !currentRoomId) return;

      const room = await getRoom(currentRoomId);
      if (!room || !room.currentGame) return;

      const host = getHost(room);
      if (!host || host.playerId !== session.playerId) {
        return socket.emit("room:error", { code: "NOT_HOST", message: "Only host can start rematch" });
      }

      const gameKey = room.currentGame.gameKey;
      const mode = room.currentGame.mode;

      // Prepare player info for games that need it at initialization
      const playerInfo = room.players.map((p) => ({
        odRoomId: room.roomId,
        odPlayerId: p.playerId,
        odDisplayName: p.displayName,
      }));

      // Create fresh game state
      const initialState = createInitialState(gameKey, mode, playerInfo);

      // Sync players to game state (for games that add players after init)
      if (gameKey === "draw" || gameKey === "charades" || gameKey === "cribbage" || gameKey === "fibbage" || gameKey === "wordle") {
        room.players.forEach((p) => {
          if (gameKey === "draw") {
            drawService.addPlayer(initialState, { playerId: p.playerId, displayName: p.displayName });
          } else if (gameKey === "charades") {
            charadesService.addPlayer(initialState, { playerId: p.playerId, displayName: p.displayName });
          } else if (gameKey === "cribbage") {
            cribbageService.addPlayer(initialState, { playerId: p.playerId, displayName: p.displayName });
          } else if (gameKey === "fibbage") {
            fibbageService.addPlayer(initialState, { playerId: p.playerId, displayName: p.displayName });
          } else if (gameKey === "wordle") {
            wordleRoomService.addPlayer(initialState, { playerId: p.playerId, displayName: p.displayName });
          }
        });
      }

      resetGame(room, initialState);
      clearGameTimer(room.roomId);

      await saveRoom(room);

      io.to(roomChannel(room.roomId)).emit("room:rematch");
      broadcastRoomState(room);
    });

    socket.on("room:switchGame", async () => {
      if (!session || !currentRoomId) return;

      const room = await getRoom(currentRoomId);
      if (!room) return;

      const host = getHost(room);
      if (!host || host.playerId !== session.playerId) {
        return socket.emit("room:error", { code: "NOT_HOST", message: "Only host can switch games" });
      }

      clearGameTimer(room.roomId);
      clearCurrentGame(room);

      await saveRoom(room);

      io.to(roomChannel(room.roomId)).emit("room:gameCleared");
      broadcastRoomState(room);
    });

    // ===== Game Action Events =====

    socket.on("game:action", async ({ action }) => {
      if (!session || !currentRoomId || !action) return;

      const room = await getRoom(currentRoomId);
      if (!room || !room.currentGame) return;
      if (room.currentGame.status !== "PLAYING") return;

      const result = await handleGameAction(room, session.playerId, action);

      if (!result.ok) {
        return socket.emit("game:error", { code: result.error, message: result.error });
      }

      await saveRoom(room);

      // Handle special broadcasts
      if (result.broadcast === "stroke") {
        socket.to(roomChannel(room.roomId)).emit("game:stroke", result.stroke);
      }

      broadcastRoomState(room);

      // Schedule AI if needed
      if (result.scheduleAi) {
        scheduleAiMove(room.roomId, room.currentGame.gameKey);
      }

      // Check for game end
      if (room.currentGame.status === "FINISHED") {
        io.to(roomChannel(room.roomId)).emit("game:ended", {
          gameKey: room.currentGame.gameKey,
          state: room.currentGame.state,
        });
      }
    });

    // ===== Disconnect Handler =====

    socket.on("disconnect", async () => {
      if (session?.playerId) {
        const set = playerSockets.get(session.playerId);
        if (set) {
          set.delete(socket.id);
          if (set.size === 0) {
            playerSockets.delete(session.playerId);

            // Clean up voice state when all sockets for player disconnect
            if (currentRoomId) {
              const peers = voicePeers.get(currentRoomId);
              if (peers && peers.has(session.playerId)) {
                peers.delete(session.playerId);

                // Notify others that peer left
                io.to(roomChannel(currentRoomId)).emit("voice:peer-left", {
                  playerId: session.playerId,
                });

                // Send updated peer list
                const remainingPeers = Array.from(peers).map((peerId) => {
                  return { playerId: peerId, displayName: "Unknown" };
                });
                io.to(roomChannel(currentRoomId)).emit("voice:peers", { peers: remainingPeers });

                // Clean up empty set
                if (peers.size === 0) {
                  voicePeers.delete(currentRoomId);
                }
              }
            }
          }
        }
      }
    });
  });

  return io;
}
