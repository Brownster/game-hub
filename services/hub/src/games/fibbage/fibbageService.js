import { PHASES, SCORING, SETTINGS, TRUTH_MARKER } from "./fibbageConstants.js";
import { getRandomQuestion, matchesAnswer } from "./questions.js";

// Fisher-Yates shuffle
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Generate unique choice ID
function generateChoiceId() {
  return `c_${Math.random().toString(36).substr(2, 9)}`;
}

export function createFibbageInitialState() {
  return {
    phase: PHASES.LOBBY,
    round: 0,
    totalRounds: SETTINGS.ROUNDS_DEFAULT,
    currentQuestion: null,
    questionIndex: null,
    usedQuestions: [],
    lies: {},           // playerId -> { text, choiceId }
    choices: [],        // [{ id, text, ownerId }] ownerId is TRUTH_MARKER for truth
    votes: {},          // playerId -> choiceId
    roundScores: {},    // playerId -> points earned this round
    scores: {},         // playerId -> total points
    players: [],
    phaseEndsAt: null,
    revealIndex: 0,     // For staggered reveal animation
  };
}

export function addPlayer(state, player) {
  if (state.players.some((p) => p.playerId === player.playerId)) return;
  state.players.push({
    playerId: player.playerId,
    displayName: player.displayName,
  });
  state.scores[player.playerId] = state.scores[player.playerId] || 0;
}

export function removePlayer(state, playerId) {
  const idx = state.players.findIndex((p) => p.playerId === playerId);
  if (idx === -1) return;
  state.players.splice(idx, 1);
}

export function startRound(state) {
  if (state.players.length < SETTINGS.MIN_PLAYERS) {
    state.phase = PHASES.LOBBY;
    return false;
  }

  // Get new question
  const usedSet = new Set(state.usedQuestions);
  const { question, questionIndex } = getRandomQuestion(usedSet);

  state.round += 1;
  state.currentQuestion = question;
  state.questionIndex = questionIndex;
  state.usedQuestions.push(questionIndex);
  state.lies = {};
  state.choices = [];
  state.votes = {};
  state.roundScores = {};
  state.revealIndex = 0;
  state.phase = PHASES.SUBMIT_LIES;
  state.phaseEndsAt = Date.now() + SETTINGS.SUBMIT_TIME_MS;

  return true;
}

export function submitLie(state, playerId, text) {
  if (state.phase !== PHASES.SUBMIT_LIES) {
    return { ok: false, error: "WRONG_PHASE" };
  }

  // Check if player already submitted
  if (state.lies[playerId]) {
    return { ok: false, error: "ALREADY_SUBMITTED" };
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: "EMPTY_LIE" };
  }

  // Check if lie matches the truth
  if (matchesAnswer(trimmed, state.currentQuestion)) {
    return { ok: false, error: "LIE_MATCHES_TRUTH" };
  }

  // Check for duplicate lies
  const normalizedNew = trimmed.toLowerCase();
  for (const existingLie of Object.values(state.lies)) {
    if (existingLie.text.toLowerCase() === normalizedNew) {
      return { ok: false, error: "DUPLICATE_LIE" };
    }
  }

  const choiceId = generateChoiceId();
  state.lies[playerId] = { text: trimmed, choiceId };

  // Check if all players have submitted
  const submittedCount = Object.keys(state.lies).length;
  if (submittedCount >= state.players.length) {
    advanceToVoting(state);
  }

  return { ok: true };
}

export function advanceToVoting(state) {
  // Build choices array with lies and truth
  const choices = [];

  // Add all player lies
  for (const [playerId, lie] of Object.entries(state.lies)) {
    choices.push({
      id: lie.choiceId,
      text: lie.text,
      ownerId: playerId,
    });
  }

  // Add the truth
  const truthId = generateChoiceId();
  choices.push({
    id: truthId,
    text: state.currentQuestion.answer,
    ownerId: TRUTH_MARKER,
  });

  // Shuffle choices
  state.choices = shuffle(choices);
  state.votes = {};
  state.phase = PHASES.VOTE;
  state.phaseEndsAt = Date.now() + SETTINGS.VOTE_TIME_MS;
}

export function submitVote(state, playerId, choiceId) {
  if (state.phase !== PHASES.VOTE) {
    return { ok: false, error: "WRONG_PHASE" };
  }

  // Check if player already voted
  if (state.votes[playerId]) {
    return { ok: false, error: "ALREADY_VOTED" };
  }

  // Only players who submitted lies can vote
  if (!state.lies[playerId]) {
    return { ok: false, error: "VOTE_NOT_ALLOWED" };
  }

  // Validate choice exists
  const choice = state.choices.find((c) => c.id === choiceId);
  if (!choice) {
    return { ok: false, error: "INVALID_CHOICE" };
  }

  // Players can't vote for their own lie
  if (choice.ownerId === playerId) {
    return { ok: false, error: "CANT_VOTE_OWN_LIE" };
  }

  state.votes[playerId] = choiceId;

  // Check if all players (who submitted lies) have voted
  const playersWhoSubmitted = Object.keys(state.lies);
  const votedCount = Object.keys(state.votes).length;
  if (votedCount >= playersWhoSubmitted.length) {
    advanceToReveal(state);
  }

  return { ok: true };
}

export function advanceToReveal(state) {
  calculateRoundScores(state);
  state.phase = PHASES.REVEAL;
  state.phaseEndsAt = Date.now() + SETTINGS.REVEAL_TIME_MS;
  state.revealIndex = 0;
}

function calculateRoundScores(state) {
  state.roundScores = {};

  // Initialize round scores
  for (const player of state.players) {
    state.roundScores[player.playerId] = 0;
  }

  // Find truth choice
  const truthChoice = state.choices.find((c) => c.ownerId === TRUTH_MARKER);
  let anyoneCorrect = false;

  // Calculate scores for each vote
  for (const [voterId, choiceId] of Object.entries(state.votes)) {
    const choice = state.choices.find((c) => c.id === choiceId);
    if (!choice) continue;

    if (choice.ownerId === TRUTH_MARKER) {
      // Voter picked the truth
      state.roundScores[voterId] += SCORING.CORRECT_ANSWER;
      anyoneCorrect = true;
    } else {
      // Voter was fooled by someone's lie
      state.roundScores[choice.ownerId] += SCORING.FOOLED_PLAYER;
    }
  }

  // Optional: bonus if no one got it right
  // (Commented out by default, uncomment if desired)
  // if (!anyoneCorrect) {
  //   for (const playerId of Object.keys(state.lies)) {
  //     state.roundScores[playerId] += SCORING.NO_ONE_CORRECT;
  //   }
  // }

  // Add round scores to total
  for (const [playerId, points] of Object.entries(state.roundScores)) {
    state.scores[playerId] = (state.scores[playerId] || 0) + points;
  }
}

export function advanceToScore(state) {
  state.phase = PHASES.SCORE;
  state.phaseEndsAt = Date.now() + SETTINGS.SCORE_TIME_MS;
}

export function advanceToNextRound(state) {
  if (state.round >= state.totalRounds) {
    state.phase = PHASES.GAME_END;
    state.phaseEndsAt = null;
    return { finished: true };
  }

  startRound(state);
  return { finished: false };
}

export function forceAdvancePhase(state) {
  // Called by timer when phase times out
  switch (state.phase) {
    case PHASES.SUBMIT_LIES:
      // Advance to voting even if some players didn't submit
      advanceToVoting(state);
      break;
    case PHASES.VOTE:
      // Players who didn't vote just don't get points
      advanceToReveal(state);
      break;
    case PHASES.REVEAL:
      advanceToScore(state);
      break;
    case PHASES.SCORE:
      advanceToNextRound(state);
      break;
  }
}

export function sanitizeState(state, playerId) {
  const safe = { ...state };

  // Hide current question answer until reveal/score/game_end
  if (state.phase === PHASES.SUBMIT_LIES || state.phase === PHASES.VOTE) {
    safe.currentQuestion = state.currentQuestion
      ? {
          category: state.currentQuestion.category,
          question: state.currentQuestion.question,
          // Hide answer
        }
      : null;
  }

  // Hide who wrote which lie until reveal
  if (state.phase === PHASES.SUBMIT_LIES || state.phase === PHASES.VOTE) {
    // Show choices without owner info (except truth marker)
    safe.choices = state.choices.map((c) => ({
      id: c.id,
      text: c.text,
      // Don't expose ownerId until reveal
    }));

    // Show which players have submitted (but not their lies)
    safe.lies = {};
    for (const pid of Object.keys(state.lies)) {
      safe.lies[pid] = { submitted: true };
    }

    // Show which players have voted (but not what they voted for)
    safe.votes = {};
    for (const pid of Object.keys(state.votes)) {
      safe.votes[pid] = { voted: true };
    }
  }

  // Don't expose usedQuestions array (internal tracking)
  delete safe.usedQuestions;

  return safe;
}

export function isGameFinished(state) {
  return state.phase === PHASES.GAME_END;
}

export function processAction(state, playerId, action) {
  const { type, payload } = action;

  switch (type) {
    case "SUBMIT_LIE":
      return submitLie(state, playerId, payload?.text || "");

    case "SUBMIT_VOTE":
      return submitVote(state, playerId, payload?.choiceId);

    case "NEXT_ROUND":
      if (state.phase !== PHASES.SCORE && state.phase !== PHASES.REVEAL) {
        return { ok: false, error: "WRONG_PHASE" };
      }
      return advanceToNextRound(state);

    case "CONTINUE":
      // Host can force advance through phases
      forceAdvancePhase(state);
      return { ok: true };

    default:
      return { ok: false, error: "UNKNOWN_ACTION" };
  }
}
