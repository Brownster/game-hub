import { Chess } from "chess.js";

export const PHASES = {
  LOBBY: "LOBBY",
  TURN: "TURN",
  FINISHED: "FINISHED",
};

export const ACTIONS = {
  MOVE: "MOVE",
  RESIGN: "RESIGN",
  OFFER_DRAW: "OFFER_DRAW",
  ACCEPT_DRAW: "ACCEPT_DRAW",
  DECLINE_DRAW: "DECLINE_DRAW",
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

function createPlayerState(player, index) {
  const color = index === 0 ? "w" : "b";
  return {
    playerId: player.odPlayerId ?? player.playerId,
    displayName: player.odDisplayName ?? player.displayName,
    isHost: Boolean(player.isHost),
    color,
  };
}

function getPlayerColor(state, playerId) {
  const playerColor = state.players.find((p) => p.playerId === playerId)?.color;
  if (playerColor) return playerColor;
  if (state.ai?.enabled && state.ai.playerId === playerId) return state.ai.side;
  return null;
}

function getOpponentColor(color) {
  return color === "w" ? "b" : "w";
}

function getBoardSnapshot(fen) {
  const chess = new Chess(fen);
  const board = chess.board();
  return board.map((row, rowIndex) =>
    row.map((piece, colIndex) => {
      if (!piece) return null;
      return {
        type: piece.type,
        color: piece.color,
        square: `${FILES[colIndex]}${RANKS[rowIndex]}`,
      };
    })
  );
}

function getDrawReason(chess) {
  if (chess.isStalemate()) return "stalemate";
  if (chess.isThreefoldRepetition()) return "threefold";
  if (chess.isInsufficientMaterial()) return "insufficient";
  if (chess.isDraw()) return "draw";
  return null;
}

export function createChessInitialState(players = [], mode = "PVP") {
  const playerStates = players.slice(0, 2).map(createPlayerState);
  const hostId = playerStates.find((p) => p.isHost)?.playerId || playerStates[0]?.playerId || null;

  return {
    phase: PHASES.LOBBY,
    mode,
    players: playerStates,
    fen: null,
    moves: [],
    turn: "w",
    winnerColor: null,
    drawReason: null,
    drawOfferBy: null,
    hostId,
    lastMove: null,
    ai: {
      enabled: mode === "AI",
      side: "b",
      playerId: "AI",
      level: "MEDIUM",
    },
  };
}

export function startChessGame(state) {
  if (state.phase !== PHASES.LOBBY) {
    return { ok: false, error: "ALREADY_STARTED" };
  }

  const minPlayers = state.ai?.enabled ? 1 : 2;
  if (state.players.length < minPlayers) {
    return { ok: false, error: "NOT_ENOUGH_PLAYERS" };
  }

  const chess = new Chess();
  state.phase = PHASES.TURN;
  state.fen = chess.fen();
  state.moves = [];
  state.turn = chess.turn();
  state.winnerColor = null;
  state.drawReason = null;
  state.drawOfferBy = null;
  state.lastMove = null;

  return { ok: true };
}

export function sanitizeState(state, playerId) {
  const sanitized = {
    phase: state.phase,
    mode: state.mode,
    players: state.players,
    fen: state.fen,
    board: state.fen ? getBoardSnapshot(state.fen) : null,
    moves: state.moves,
    turn: state.turn,
    winnerColor: state.winnerColor,
    drawReason: state.drawReason,
    drawOfferBy: state.drawOfferBy,
    hostId: state.hostId,
    lastMove: state.lastMove,
    ai: state.ai,
  };

  if (playerId) {
    sanitized.myColor = getPlayerColor(state, playerId);
  }

  return sanitized;
}

export function processAction(state, playerId, action) {
  if (!action?.type) return { ok: false, error: "INVALID_ACTION" };

  if (state.phase === PHASES.FINISHED) {
    return { ok: false, error: "GAME_FINISHED" };
  }

  const playerColor = getPlayerColor(state, playerId);
  if (!playerColor) return { ok: false, error: "PLAYER_NOT_FOUND" };

  if (action.type === ACTIONS.RESIGN) {
    state.phase = PHASES.FINISHED;
    state.winnerColor = getOpponentColor(playerColor);
    state.drawReason = "resign";
    return { ok: true };
  }

  if (action.type === ACTIONS.OFFER_DRAW) {
    state.drawOfferBy = playerId;
    return { ok: true };
  }

  if (action.type === ACTIONS.ACCEPT_DRAW) {
    if (!state.drawOfferBy || state.drawOfferBy === playerId) {
      return { ok: false, error: "NO_DRAW_OFFER" };
    }
    state.phase = PHASES.FINISHED;
    state.winnerColor = null;
    state.drawReason = "draw_agreed";
    return { ok: true };
  }

  if (action.type === ACTIONS.DECLINE_DRAW) {
    if (!state.drawOfferBy || state.drawOfferBy === playerId) {
      return { ok: false, error: "NO_DRAW_OFFER" };
    }
    state.drawOfferBy = null;
    return { ok: true };
  }

  if (action.type !== ACTIONS.MOVE) {
    return { ok: false, error: "UNKNOWN_ACTION" };
  }

  if (state.phase !== PHASES.TURN || !state.fen) {
    return { ok: false, error: "GAME_NOT_STARTED" };
  }

  if (state.turn !== playerColor) {
    return { ok: false, error: "NOT_YOUR_TURN" };
  }

  const chess = new Chess(state.fen);
  const { from, to, promotion } = action;
  if (!from || !to) return { ok: false, error: "INVALID_MOVE" };

  const moveOptions = chess.moves({ verbose: true }).filter((m) => m.from === from && m.to === to);
  if (moveOptions.length === 0) {
    return { ok: false, error: "INVALID_MOVE" };
  }

  const requiresPromotion = moveOptions.some((m) => m.flags.includes("p"));
  if (requiresPromotion && !promotion) {
    return { ok: false, error: "PROMOTION_REQUIRED" };
  }

  const move = chess.move({ from, to, promotion });
  if (!move) return { ok: false, error: "INVALID_MOVE" };

  state.fen = chess.fen();
  state.turn = chess.turn();
  state.moves = chess.history({ verbose: true }).map((m) => m.san);
  state.lastMove = { from: move.from, to: move.to, san: move.san };
  state.drawOfferBy = null;

  if (chess.isCheckmate()) {
    state.phase = PHASES.FINISHED;
    state.winnerColor = playerColor;
    state.drawReason = "checkmate";
  } else if (chess.isDraw()) {
    state.phase = PHASES.FINISHED;
    state.winnerColor = null;
    state.drawReason = getDrawReason(chess);
  }

  return { ok: true };
}
