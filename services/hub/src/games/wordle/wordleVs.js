import { MAX_GUESSES, WORD_LENGTH, checkGuess, isValidWord, normalizeGuess, pickRandomWord } from "./wordleUtils.js";

export function createVsState(rounds = 3) {
  return {
    rounds,
    currentRound: 1,
    roundWord: pickRandomWord(),
    roundStatus: "READY",
    roundStart: Date.now(),
    roundWinner: null,
    countdownEndsAt: null,
    players: {},
    scores: {},
    ready: {},
    history: []
  };
}

export function ensurePlayerState(state, playerId) {
  if (!state.players[playerId]) {
    state.players[playerId] = {
      guesses: [],
      results: [],
      status: "IN_PROGRESS",
      finishedAt: null
    };
    state.scores[playerId] = state.scores[playerId] || 0;
  }
  if (state.ready[playerId] === undefined) {
    state.ready[playerId] = false;
  }
}

export function assignWordlePlayer(room, player) {
  const alreadyBlack = room.players.black && room.players.black.playerId === player.playerId;
  const alreadyWhite = room.players.white && room.players.white.playerId === player.playerId;

  if (alreadyBlack || alreadyWhite) {
    return { ok: true };
  }

  if (!room.players.black) {
    room.players.black = player;
    return { ok: true };
  }

  if (!room.players.white) {
    room.players.white = player;
    return { ok: true };
  }

  return { ok: false, error: "ROOM_FULL" };
}

export function startRound(room) {
  room.status = "IN_PROGRESS";
  room.state.roundStatus = "IN_PROGRESS";
  room.state.roundStart = Date.now();
  room.state.roundWord = pickRandomWord();
  room.state.roundWinner = null;
  room.state.countdownEndsAt = null;

  Object.values(room.state.players).forEach((playerState) => {
    playerState.guesses = [];
    playerState.results = [];
    playerState.status = "IN_PROGRESS";
    playerState.finishedAt = null;
  });

  resetReady(room.state);
}

export function applyVsGuess(room, playerId, guess) {
  const state = room.state;
  const playerState = state.players[playerId];

  if (!playerState || playerState.status !== "IN_PROGRESS") {
    throw new Error("NOT_ACTIVE");
  }

  if (state.roundStatus !== "IN_PROGRESS") {
    throw new Error("ROUND_NOT_ACTIVE");
  }

  const normalized = normalizeGuess(guess);
  if (normalized.length !== WORD_LENGTH) {
    throw new Error("INVALID_LENGTH");
  }
  if (!isValidWord(normalized)) {
    throw new Error("INVALID_WORD");
  }

  const result = checkGuess(normalized, state.roundWord);
  playerState.guesses.push(normalized);
  playerState.results.push(result);

  if (normalized === state.roundWord) {
    playerState.status = "WIN";
    playerState.finishedAt = Date.now();
    if (!state.roundWinner) {
      state.roundWinner = playerId;
    }
  } else if (playerState.guesses.length >= MAX_GUESSES) {
    playerState.status = "LOSE";
    playerState.finishedAt = Date.now();
  }

  return result;
}

export function roundFinished(state) {
  return Object.values(state.players).every((playerState) => playerState.status !== "IN_PROGRESS");
}

export function finalizeRound(room) {
  const state = room.state;
  const roundNumber = state.currentRound;
  let winnerId = state.roundWinner;

  if (!winnerId) {
    const winners = Object.entries(state.players)
      .filter(([, p]) => p.status === "WIN")
      .sort((a, b) => a[1].finishedAt - b[1].finishedAt);
    if (winners.length) {
      winnerId = winners[0][0];
      state.roundWinner = winnerId;
    }
  }

  if (winnerId) {
    state.scores[winnerId] = (state.scores[winnerId] || 0) + 1;
  }

  state.history.push({
    round: roundNumber,
    word: state.roundWord,
    winnerId: winnerId || null,
    results: Object.fromEntries(
      Object.entries(state.players).map(([id, p]) => [
        id,
        {
          guesses: p.guesses,
          status: p.status,
          finishedAt: p.finishedAt
        }
      ])
    )
  });

  state.roundStatus = "FINISHED";
  return winnerId || null;
}

export function prepareNextRound(room) {
  const state = room.state;
  if (state.currentRound >= state.rounds) {
    room.status = "FINISHED";
    return;
  }

  state.currentRound += 1;
  state.roundStatus = "READY";
  state.countdownEndsAt = null;
  resetReady(state);
}

export function sanitizeWordleState(state) {
  const { roundWord, ...rest } = state;
  return rest;
}

export function setReady(state, playerId) {
  state.ready[playerId] = true;
}

export function allReady(state) {
  return Object.values(state.ready).length > 0 && Object.values(state.ready).every(Boolean);
}

export function resetReady(state) {
  Object.keys(state.ready).forEach((key) => {
    state.ready[key] = false;
  });
}
