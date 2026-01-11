/**
 * Wordle Room Service - Room-based wrapper for Wordle VS functionality
 * Integrates the standalone Wordle VS mode into the gamehub room framework.
 */

import {
  MAX_GUESSES,
  WORD_LENGTH,
  checkGuess,
  isValidWord,
  normalizeGuess,
  pickRandomWord,
} from "./wordleUtils.js";

export const PHASES = {
  LOBBY: "LOBBY",
  READY: "READY",
  PLAYING: "PLAYING",
  ROUND_END: "ROUND_END",
  GAME_END: "GAME_END",
};

export const SETTINGS = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 8,
  DEFAULT_ROUNDS: 3,
  ROUND_TIME_MS: 180000, // 3 minutes per round
};

export function createWordleInitialState(players = [], mode = "STANDARD") {
  const rounds = mode === "QUICK" ? 1 : mode === "LONG" ? 5 : SETTINGS.DEFAULT_ROUNDS;

  const state = {
    phase: PHASES.LOBBY,
    round: 0,
    totalRounds: rounds,
    currentWord: null,
    roundStartedAt: null,
    roundEndsAt: null,
    players: [],
    playerStates: {}, // playerId -> { guesses, results, status, finishedAt }
    scores: {},       // playerId -> total score across rounds
    ready: {},        // playerId -> boolean
    roundWinner: null,
    history: [],      // Past rounds: [{ round, word, results: { playerId: { guesses, status } } }]
    hostId: null,
  };

  // Initialize players if provided
  players.forEach((p) => {
    addPlayer(state, { playerId: p.playerId, displayName: p.displayName });
    if (p.isHost) {
      state.hostId = p.playerId;
    }
  });

  return state;
}

export function addPlayer(state, player) {
  if (state.players.some((p) => p.playerId === player.playerId)) return;

  state.players.push({
    playerId: player.playerId,
    displayName: player.displayName,
  });
  state.scores[player.playerId] = state.scores[player.playerId] || 0;
  state.ready[player.playerId] = false;
  state.playerStates[player.playerId] = createEmptyPlayerState();
}

export function removePlayer(state, playerId) {
  const idx = state.players.findIndex((p) => p.playerId === playerId);
  if (idx === -1) return;
  state.players.splice(idx, 1);
  delete state.ready[playerId];
  // Keep scores and playerStates for history
}

function createEmptyPlayerState() {
  return {
    guesses: [],
    results: [],
    status: "WAITING", // WAITING, IN_PROGRESS, WIN, LOSE
    finishedAt: null,
  };
}

export function setReady(state, playerId) {
  if (state.phase !== PHASES.LOBBY && state.phase !== PHASES.ROUND_END) {
    return { ok: false, error: "WRONG_PHASE" };
  }
  state.ready[playerId] = true;
  return { ok: true };
}

export function allReady(state) {
  const playerIds = state.players.map((p) => p.playerId);
  return playerIds.length >= SETTINGS.MIN_PLAYERS &&
    playerIds.every((id) => state.ready[id]);
}

export function startRound(state) {
  if (state.players.length < SETTINGS.MIN_PLAYERS) {
    return { ok: false, error: "NOT_ENOUGH_PLAYERS" };
  }

  state.round += 1;
  state.currentWord = pickRandomWord();
  state.roundStartedAt = Date.now();
  state.roundEndsAt = Date.now() + SETTINGS.ROUND_TIME_MS;
  state.roundWinner = null;
  state.phase = PHASES.PLAYING;

  // Reset player states for new round
  state.players.forEach((p) => {
    state.playerStates[p.playerId] = {
      guesses: [],
      results: [],
      status: "IN_PROGRESS",
      finishedAt: null,
    };
    state.ready[p.playerId] = false;
  });

  return { ok: true };
}

export function submitGuess(state, playerId, guess) {
  if (state.phase !== PHASES.PLAYING) {
    return { ok: false, error: "WRONG_PHASE" };
  }

  const playerState = state.playerStates[playerId];
  if (!playerState) {
    return { ok: false, error: "NOT_IN_GAME" };
  }

  if (playerState.status !== "IN_PROGRESS") {
    return { ok: false, error: "ALREADY_FINISHED" };
  }

  const normalized = normalizeGuess(guess);
  if (normalized.length !== WORD_LENGTH) {
    return { ok: false, error: "INVALID_LENGTH" };
  }

  if (!isValidWord(normalized)) {
    return { ok: false, error: "INVALID_WORD" };
  }

  const result = checkGuess(normalized, state.currentWord);
  playerState.guesses.push(normalized);
  playerState.results.push(result);

  // Check if player won
  if (normalized === state.currentWord) {
    playerState.status = "WIN";
    playerState.finishedAt = Date.now();

    // First player to win is round winner
    if (!state.roundWinner) {
      state.roundWinner = playerId;
    }
  } else if (playerState.guesses.length >= MAX_GUESSES) {
    // Out of guesses
    playerState.status = "LOSE";
    playerState.finishedAt = Date.now();
  }

  // Check if round is over (all players finished)
  if (roundFinished(state)) {
    finalizeRound(state);
  }

  return { ok: true, result };
}

function roundFinished(state) {
  return state.players.every((p) => {
    const ps = state.playerStates[p.playerId];
    return ps && ps.status !== "IN_PROGRESS";
  });
}

function finalizeRound(state) {
  // Calculate scores
  // Winner gets 3 points
  // Anyone who solved gets 1 point
  // Fastest solver (if multiple) gets bonus
  const winners = state.players
    .filter((p) => state.playerStates[p.playerId]?.status === "WIN")
    .sort((a, b) => {
      const aTime = state.playerStates[a.playerId]?.finishedAt || Infinity;
      const bTime = state.playerStates[b.playerId]?.finishedAt || Infinity;
      return aTime - bTime;
    });

  if (winners.length > 0) {
    // First place gets 3 points
    const firstPlace = winners[0].playerId;
    state.scores[firstPlace] = (state.scores[firstPlace] || 0) + 3;

    // Others who solved get 1 point
    for (let i = 1; i < winners.length; i++) {
      const pid = winners[i].playerId;
      state.scores[pid] = (state.scores[pid] || 0) + 1;
    }

    // Update round winner to fastest
    if (!state.roundWinner) {
      state.roundWinner = firstPlace;
    }
  }

  // Save to history
  state.history.push({
    round: state.round,
    word: state.currentWord,
    winnerId: state.roundWinner,
    results: Object.fromEntries(
      state.players.map((p) => [
        p.playerId,
        {
          guesses: state.playerStates[p.playerId]?.guesses || [],
          status: state.playerStates[p.playerId]?.status || "LOSE",
          finishedAt: state.playerStates[p.playerId]?.finishedAt,
        },
      ])
    ),
  });

  state.phase = PHASES.ROUND_END;
}

export function forceEndRound(state) {
  // Force all in-progress players to LOSE
  state.players.forEach((p) => {
    const ps = state.playerStates[p.playerId];
    if (ps && ps.status === "IN_PROGRESS") {
      ps.status = "LOSE";
      ps.finishedAt = Date.now();
    }
  });

  finalizeRound(state);
}

export function advanceToNextRound(state) {
  if (state.round >= state.totalRounds) {
    state.phase = PHASES.GAME_END;
    return { ok: true, finished: true };
  }

  // Reset ready state
  state.players.forEach((p) => {
    state.ready[p.playerId] = false;
  });

  return { ok: true, finished: false };
}

export function sanitizeState(state, playerId) {
  // Hide the current word during play
  const sanitized = {
    phase: state.phase,
    round: state.round,
    totalRounds: state.totalRounds,
    roundStartedAt: state.roundStartedAt,
    roundEndsAt: state.roundEndsAt,
    players: state.players,
    scores: state.scores,
    ready: state.ready,
    roundWinner: state.roundWinner,
    history: state.history,
    hostId: state.hostId,
  };

  // Only show word when round is over
  if (state.phase === PHASES.ROUND_END || state.phase === PHASES.GAME_END) {
    sanitized.currentWord = state.currentWord;
  }

  // Show all player states but filter guesses/results for other players during play
  sanitized.playerStates = {};
  for (const p of state.players) {
    const ps = state.playerStates[p.playerId];
    if (!ps) {
      sanitized.playerStates[p.playerId] = createEmptyPlayerState();
      continue;
    }

    if (state.phase === PHASES.PLAYING && p.playerId !== playerId) {
      // During play, only show guess count and status for opponents
      sanitized.playerStates[p.playerId] = {
        guessCount: ps.guesses.length,
        status: ps.status,
        finishedAt: ps.finishedAt,
      };
    } else {
      // Show full state for self or after round ends
      sanitized.playerStates[p.playerId] = { ...ps };
    }
  }

  return sanitized;
}

export function isGameFinished(state) {
  return state.phase === PHASES.GAME_END;
}

export function processAction(state, playerId, action) {
  const { type, payload } = action;

  switch (type) {
    case "READY":
      return setReady(state, playerId);

    case "GUESS":
      return submitGuess(state, playerId, payload?.guess || "");

    case "NEXT_ROUND":
      if (state.phase !== PHASES.ROUND_END) {
        return { ok: false, error: "WRONG_PHASE" };
      }
      return advanceToNextRound(state);

    default:
      return { ok: false, error: "UNKNOWN_ACTION" };
  }
}
