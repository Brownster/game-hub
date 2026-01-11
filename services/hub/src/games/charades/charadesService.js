import { getRandomPrompt, getCategoryName } from "./prompts.js";

const ROUND_LENGTH_MS = 60_000; // 60 seconds per round
const REVEAL_LENGTH_MS = 5_000; // 5 seconds to show answer
const MAX_FEED_SIZE = 50;

export function createCharadesInitialState() {
  return {
    phase: "LOBBY", // LOBBY, PERFORMING, REVEAL
    round: 0,
    roundLengthMs: ROUND_LENGTH_MS,
    roundEndsAt: null,
    revealEndsAt: null,
    performerId: null,
    prompt: null, // { text, category, difficulty }
    usedPrompts: [],
    turnOrder: [], // Shuffled player order
    turnIndex: 0,
    players: [], // { playerId, displayName, score }
    scores: {},
    guesses: [], // Wrong guesses shown to all: { playerId, displayName, text, timestamp }
    feed: [], // System messages and correct guess announcements
  };
}

export function addPlayer(state, player) {
  const exists = state.players.find((p) => p.playerId === player.playerId);
  if (exists) {
    exists.displayName = player.displayName;
    return;
  }

  state.players.push({
    playerId: player.playerId,
    displayName: player.displayName,
    score: state.scores[player.playerId] || 0,
  });
  state.scores[player.playerId] = state.scores[player.playerId] || 0;
}

export function removePlayer(state, playerId) {
  const idx = state.players.findIndex((p) => p.playerId === playerId);
  if (idx === -1) return;

  state.players.splice(idx, 1);

  // Remove from turn order
  const turnIdx = state.turnOrder.indexOf(playerId);
  if (turnIdx !== -1) {
    state.turnOrder.splice(turnIdx, 1);
    if (state.turnIndex >= state.turnOrder.length) {
      state.turnIndex = 0;
    }
  }

  // If performer left, end round early
  if (state.performerId === playerId && state.phase === "PERFORMING") {
    endRound(state, "performer_left");
  }

  // If less than 2 players, go back to lobby
  if (state.players.length < 2) {
    state.phase = "LOBBY";
    state.performerId = null;
    state.prompt = null;
  }
}

export function shuffleTurnOrder(state) {
  // Create shuffled copy of player IDs
  const playerIds = state.players.map((p) => p.playerId);
  for (let i = playerIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [playerIds[i], playerIds[j]] = [playerIds[j], playerIds[i]];
  }
  state.turnOrder = playerIds;
  state.turnIndex = 0;
}

export function advanceTurn(state) {
  if (state.turnOrder.length === 0) {
    shuffleTurnOrder(state);
  }

  state.turnIndex = (state.turnIndex + 1) % state.turnOrder.length;

  // If we've gone through everyone, reshuffle
  if (state.turnIndex === 0) {
    shuffleTurnOrder(state);
  }

  state.performerId = state.turnOrder[state.turnIndex] || null;
}

export function startRound(state) {
  if (state.players.length < 2) return false;

  // First round - shuffle turn order
  if (state.turnOrder.length === 0) {
    shuffleTurnOrder(state);
  }

  state.round += 1;
  state.phase = "PERFORMING";
  state.performerId = state.turnOrder[state.turnIndex];
  state.prompt = getRandomPrompt(state.usedPrompts);
  state.usedPrompts.push(state.prompt.text);
  state.roundEndsAt = Date.now() + ROUND_LENGTH_MS;
  state.guesses = [];

  const performer = state.players.find((p) => p.playerId === state.performerId);
  const performerName = performer?.displayName || "Someone";
  const categoryName = getCategoryName(state.prompt.category);

  addFeed(state, {
    type: "system",
    message: `Round ${state.round}: ${performerName} is performing! (${categoryName})`,
  });

  return true;
}

export function endRound(state, reason, solvedById = null, remainingMs = 0) {
  state.phase = "REVEAL";
  state.revealEndsAt = Date.now() + REVEAL_LENGTH_MS;

  if (reason === "solved" && solvedById) {
    // Calculate bonus based on remaining time (max ~12 bonus points)
    const bonus = Math.max(0, Math.floor(remainingMs / 5000));
    const guesserPoints = 10 + bonus;
    const performerPoints = 5;

    state.scores[solvedById] = (state.scores[solvedById] || 0) + guesserPoints;
    state.scores[state.performerId] = (state.scores[state.performerId] || 0) + performerPoints;

    // Update player objects
    const guesser = state.players.find((p) => p.playerId === solvedById);
    const performer = state.players.find((p) => p.playerId === state.performerId);
    if (guesser) guesser.score = state.scores[solvedById];
    if (performer) performer.score = state.scores[state.performerId];

    const guesserName = guesser?.displayName || "Someone";
    addFeed(state, {
      type: "correct",
      message: `${guesserName} got it! "${state.prompt.text}" +${guesserPoints} pts`,
    });
  } else if (reason === "timeout") {
    addFeed(state, {
      type: "system",
      message: `Time's up! The answer was "${state.prompt.text}"`,
    });
  } else if (reason === "performer_left") {
    addFeed(state, {
      type: "system",
      message: `Performer left. The answer was "${state.prompt.text}"`,
    });
  }
}

export function applyGuess(state, playerId, guessText) {
  if (state.phase !== "PERFORMING") {
    return { correct: false, error: "NOT_PERFORMING" };
  }

  if (playerId === state.performerId) {
    return { correct: false, error: "PERFORMER_CANNOT_GUESS" };
  }

  const trimmed = guessText.trim();
  if (!trimmed) {
    return { correct: false, error: "EMPTY_GUESS" };
  }

  const player = state.players.find((p) => p.playerId === playerId);
  const playerName = player?.displayName || "Someone";

  // Check if correct (case-insensitive)
  const normalizedGuess = trimmed.toLowerCase();
  const normalizedAnswer = state.prompt.text.toLowerCase();

  if (normalizedGuess === normalizedAnswer) {
    const remainingMs = Math.max(0, state.roundEndsAt - Date.now());
    endRound(state, "solved", playerId, remainingMs);
    return { correct: true };
  }

  // Wrong guess - add to guesses list (visible to all)
  state.guesses.push({
    playerId,
    displayName: playerName,
    text: trimmed,
    timestamp: Date.now(),
  });

  // Keep guesses list manageable
  if (state.guesses.length > 20) {
    state.guesses = state.guesses.slice(-20);
  }

  return { correct: false };
}

export function addFeed(state, entry) {
  state.feed.push({
    ...entry,
    timestamp: Date.now(),
  });

  if (state.feed.length > MAX_FEED_SIZE) {
    state.feed = state.feed.slice(-MAX_FEED_SIZE);
  }
}

export function sanitizeState(state, playerId) {
  // Hide the prompt from everyone except the performer during PERFORMING phase
  const sanitized = { ...state };

  if (state.phase === "PERFORMING" && playerId !== state.performerId) {
    sanitized.prompt = {
      category: state.prompt?.category,
      difficulty: state.prompt?.difficulty,
      // Hide the actual text
      text: null,
    };
  }

  // Don't expose usedPrompts to clients
  delete sanitized.usedPrompts;

  return sanitized;
}
