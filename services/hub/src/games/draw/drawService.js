import { WORDS } from "./words.js";

const ROUND_LENGTH_MS = 90_000;
const REVEAL_LENGTH_MS = 5_000;

function pickWord() {
  const idx = Math.floor(Math.random() * WORDS.length);
  return WORDS[idx];
}

export function createDrawInitialState() {
  return {
    phase: "LOBBY",
    round: 0,
    roundLengthMs: ROUND_LENGTH_MS,
    roundEndsAt: null,
    revealEndsAt: null,
    drawerId: null,
    word: null,
    turnIndex: 0,
    players: [],
    scores: {},
    strokes: [],
    feed: []
  };
}

export function addPlayer(state, player) {
  if (state.players.some((p) => p.playerId === player.playerId)) return;
  state.players.push({
    playerId: player.playerId,
    displayName: player.displayName,
    score: state.scores[player.playerId] || 0
  });
  state.scores[player.playerId] = state.scores[player.playerId] || 0;
}

export function removePlayer(state, playerId) {
  const idx = state.players.findIndex((p) => p.playerId === playerId);
  if (idx === -1) return;

  state.players.splice(idx, 1);
  if (state.turnIndex >= state.players.length) {
    state.turnIndex = 0;
  }

  if (state.drawerId === playerId) {
    state.drawerId = state.players[state.turnIndex]?.playerId || null;
  }
}

export function startRound(state) {
  if (state.players.length < 2) {
    state.phase = "LOBBY";
    return false;
  }

  state.phase = "DRAWING";
  state.round += 1;
  state.word = pickWord();
  state.roundEndsAt = Date.now() + state.roundLengthMs;
  state.revealEndsAt = null;
  state.strokes = [];
  state.feed = [];

  if (!state.drawerId) {
    state.drawerId = state.players[state.turnIndex]?.playerId || null;
  }

  const drawerName = state.players.find((p) => p.playerId === state.drawerId)?.displayName || "Someone";
  addFeed(state, {
    type: "system",
    message: `Round ${state.round}: ${drawerName} is drawing.`,
    timestamp: Date.now()
  });

  return true;
}

export function endRound(state, reason, solvedById = null, remainingMs = 0) {
  state.phase = "REVEAL";
  state.revealEndsAt = Date.now() + REVEAL_LENGTH_MS;

  if (solvedById && solvedById !== state.drawerId) {
    const bonus = Math.max(0, Math.floor(remainingMs / 5000));
    state.scores[solvedById] = (state.scores[solvedById] || 0) + 10 + bonus;
    if (state.drawerId) {
      state.scores[state.drawerId] = (state.scores[state.drawerId] || 0) + 5;
    }
  }

  addFeed(state, {
    type: "system",
    message: reason === "guessed" ? "Word guessed!" : "Time's up!",
    timestamp: Date.now()
  });
}

export function advanceTurn(state) {
  if (state.players.length === 0) return;
  state.turnIndex = (state.turnIndex + 1) % state.players.length;
  state.drawerId = state.players[state.turnIndex]?.playerId || null;
}

export function addStroke(state, stroke) {
  state.strokes.push(stroke);
  if (state.strokes.length > 500) {
    state.strokes.shift();
  }
}

export function addFeed(state, entry) {
  state.feed.push(entry);
  if (state.feed.length > 50) {
    state.feed.shift();
  }
}

export function applyGuess(state, playerId, guess) {
  const normalized = String(guess || "").trim().toUpperCase();
  if (!normalized) return { correct: false };

  const playerName = state.players.find((p) => p.playerId === playerId)?.displayName || "Someone";

  if (normalized === state.word && playerId !== state.drawerId && state.phase === "DRAWING") {
    const remainingMs = Math.max(0, state.roundEndsAt - Date.now());
    addFeed(state, {
      type: "guess",
      playerId,
      message: `${playerName} guessed ${normalized} ✅`,
      timestamp: Date.now()
    });
    endRound(state, "guessed", playerId, remainingMs);
    return { correct: true };
  }

  addFeed(state, {
    type: "guess",
    playerId,
    message: `${playerName}: ${normalized}`,
    timestamp: Date.now()
  });

  return { correct: false };
}

export function sanitizeState(state, playerId) {
  const safe = {
    ...state,
    word: state.phase === "REVEAL" || state.drawerId === playerId ? state.word : null
  };
  return safe;
}
