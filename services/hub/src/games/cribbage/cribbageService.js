// Cribbage game service
// Handles state management, phase transitions, and game logic

import { createShuffledDeck, deal, draw, cardsValue, getLegalPlays, sortCards } from "../cards/cardUtils.js";
import { scoreHand, scorePegging, isHisHeels } from "../cards/scoringUtils.js";

// Game phases
export const PHASES = {
  LOBBY: "LOBBY",
  DEAL: "DEAL",
  DISCARD: "DISCARD",
  CUT: "CUT",
  PEGGING: "PEGGING",
  SHOW: "SHOW",
  CRIB_SHOW: "CRIB_SHOW",
  ROUND_END: "ROUND_END",
  GAME_END: "GAME_END",
};

// Game configuration by player count
const CONFIG = {
  2: { cardsPerHand: 6, discardCount: 2 },
  3: { cardsPerHand: 5, discardCount: 1 },
  4: { cardsPerHand: 5, discardCount: 1 },
};

/**
 * Create initial cribbage game state
 * @param {string} mode - Game mode ("2P", "3P", "4P")
 * @returns {object} Initial game state
 */
export function createCribbageInitialState(mode = "2P") {
  const playerCount = parseInt(mode[0], 10) || 2;
  const config = CONFIG[playerCount] || CONFIG[2];

  return {
    phase: PHASES.LOBBY,
    round: 0,
    dealerIndex: 0,
    turnIndex: 0,
    playerCount,

    players: [],
    hands: [],
    crib: [],
    deck: [],
    starter: null,

    // Pegging state
    playStack: [],
    playCount: 0,
    goFlags: [],
    pegHands: [], // Cards remaining for pegging (separate from show hands)
    lastPlayer: null,

    // Scoring
    scores: [],
    previousScores: [], // For peg animation (back peg position)
    pendingPoints: null,
    lastScoring: null, // Last scoring breakdown for display

    // Config
    targetScore: 121,
    ...config,

    // History for display
    feed: [],
  };
}

/**
 * Add a player to the game
 * @param {object} state - Game state
 * @param {{ playerId: string, displayName: string }} player - Player to add
 */
export function addPlayer(state, player) {
  if (state.phase !== PHASES.LOBBY) return;
  if (state.players.find((p) => p.playerId === player.playerId)) return;
  if (state.players.length >= state.playerCount) return;

  state.players.push({
    playerId: player.playerId,
    displayName: player.displayName,
  });
  state.hands.push([]);
  state.pegHands.push([]);
  state.scores.push(0);
  state.previousScores.push(0);
  state.goFlags.push(false);
}

/**
 * Remove a player from the game
 * @param {object} state - Game state
 * @param {string} playerId - Player ID to remove
 */
export function removePlayer(state, playerId) {
  const index = state.players.findIndex((p) => p.playerId === playerId);
  if (index === -1) return;

  state.players.splice(index, 1);
  state.hands.splice(index, 1);
  state.pegHands.splice(index, 1);
  state.scores.splice(index, 1);
  state.previousScores.splice(index, 1);
  state.goFlags.splice(index, 1);

  // Adjust dealer/turn indices if needed
  if (state.dealerIndex >= state.players.length) {
    state.dealerIndex = 0;
  }
  if (state.turnIndex >= state.players.length) {
    state.turnIndex = 0;
  }
}

/**
 * Start a new round (deal cards)
 * @param {object} state - Game state
 */
export function startRound(state) {
  if (state.players.length < 2) return;

  state.round++;
  state.phase = PHASES.DEAL;

  // Create and shuffle deck
  state.deck = createShuffledDeck();

  // Clear round state
  state.crib = [];
  state.starter = null;
  state.playStack = [];
  state.playCount = 0;
  state.lastPlayer = null;
  state.pendingPoints = null;
  state.lastScoring = null;

  // Reset go flags
  for (let i = 0; i < state.players.length; i++) {
    state.goFlags[i] = false;
  }

  // Deal cards
  for (let i = 0; i < state.players.length; i++) {
    state.hands[i] = sortCards(deal(state.deck, state.cardsPerHand));
    state.pegHands[i] = [];
  }

  // For 3-player, add one card to crib from deck
  if (state.playerCount === 3) {
    state.crib.push(draw(state.deck));
  }

  // For 4-player, no extra card needed (4 players × 1 discard = 4 cards)

  // Set turn to player after dealer (for discard, everyone discards simultaneously but we track for UI)
  state.turnIndex = (state.dealerIndex + 1) % state.players.length;

  // Move to discard phase
  state.phase = PHASES.DISCARD;

  addFeed(state, { type: "system", message: `Round ${state.round} - ${state.players[state.dealerIndex].displayName}'s crib` });
}

/**
 * Handle player discarding cards to crib
 * @param {object} state - Game state
 * @param {string} playerId - Player ID
 * @param {string[]} cardIds - Cards to discard
 * @returns {{ ok: boolean, error?: string }}
 */
export function discardToCrib(state, playerId, cardIds) {
  if (state.phase !== PHASES.DISCARD) {
    return { ok: false, error: "NOT_DISCARD_PHASE" };
  }

  const playerIndex = state.players.findIndex((p) => p.playerId === playerId);
  if (playerIndex === -1) {
    return { ok: false, error: "PLAYER_NOT_FOUND" };
  }

  // Check correct number of cards
  if (cardIds.length !== state.discardCount) {
    return { ok: false, error: "WRONG_DISCARD_COUNT" };
  }

  // Check player has these cards
  const hand = state.hands[playerIndex];
  for (const cardId of cardIds) {
    if (!hand.includes(cardId)) {
      return { ok: false, error: "CARD_NOT_IN_HAND" };
    }
  }

  // Check player hasn't already discarded
  const expectedHandSize = state.cardsPerHand - state.discardCount;
  if (hand.length <= expectedHandSize) {
    return { ok: false, error: "ALREADY_DISCARDED" };
  }

  // Remove cards from hand and add to crib
  for (const cardId of cardIds) {
    const idx = hand.indexOf(cardId);
    hand.splice(idx, 1);
    state.crib.push(cardId);
  }

  // Re-sort hand
  state.hands[playerIndex] = sortCards(hand);

  // Check if all players have discarded
  const allDiscarded = state.hands.every((h) => h.length === 4);
  if (allDiscarded) {
    // Copy hands to pegHands for pegging phase
    for (let i = 0; i < state.players.length; i++) {
      state.pegHands[i] = [...state.hands[i]];
    }
    state.phase = PHASES.CUT;
    addFeed(state, { type: "system", message: "All players discarded. Cut the deck!" });
  }

  return { ok: true };
}

/**
 * Cut the deck to reveal starter card
 * @param {object} state - Game state
 * @param {string} playerId - Player ID (should be non-dealer)
 * @returns {{ ok: boolean, error?: string, heels?: boolean }}
 */
export function cutDeck(state, playerId) {
  if (state.phase !== PHASES.CUT) {
    return { ok: false, error: "NOT_CUT_PHASE" };
  }

  // Draw starter card
  state.starter = draw(state.deck);

  addFeed(state, { type: "system", message: `Starter card: ${state.starter}` });

  // Check for "his heels" - Jack as starter
  let heels = false;
  if (isHisHeels(state.starter)) {
    heels = true;
    const dealerIndex = state.dealerIndex;
    awardPoints(state, dealerIndex, 2, "His heels (Jack starter)");
  }

  // Check for game win after heels
  if (checkGameEnd(state)) {
    return { ok: true, heels };
  }

  // Move to pegging phase
  state.phase = PHASES.PEGGING;
  state.turnIndex = (state.dealerIndex + 1) % state.players.length;
  state.playCount = 0;
  state.playStack = [];

  return { ok: true, heels };
}

/**
 * Play a card during pegging
 * @param {object} state - Game state
 * @param {string} playerId - Player ID
 * @param {string} cardId - Card to play
 * @returns {{ ok: boolean, error?: string, points?: number }}
 */
export function playCard(state, playerId, cardId) {
  if (state.phase !== PHASES.PEGGING) {
    return { ok: false, error: "NOT_PEGGING_PHASE" };
  }

  const playerIndex = state.players.findIndex((p) => p.playerId === playerId);
  if (playerIndex === -1) {
    return { ok: false, error: "PLAYER_NOT_FOUND" };
  }

  if (playerIndex !== state.turnIndex) {
    return { ok: false, error: "NOT_YOUR_TURN" };
  }

  const pegHand = state.pegHands[playerIndex];
  if (!pegHand.includes(cardId)) {
    return { ok: false, error: "CARD_NOT_IN_HAND" };
  }

  // Check if play is legal (doesn't exceed 31)
  const cardPoints = cardsValue([cardId]);
  if (state.playCount + cardPoints > 31) {
    return { ok: false, error: "EXCEEDS_31" };
  }

  // Play the card
  const idx = pegHand.indexOf(cardId);
  pegHand.splice(idx, 1);
  state.playStack.push(cardId);
  state.playCount += cardPoints;
  state.lastPlayer = playerIndex;

  // Reset go flags when a card is played
  for (let i = 0; i < state.goFlags.length; i++) {
    state.goFlags[i] = false;
  }

  addFeed(state, {
    type: "play",
    message: `${state.players[playerIndex].displayName} plays ${cardId} (${state.playCount})`,
  });

  // Score the play
  const scoring = scorePegging(state.playStack);
  if (scoring.total > 0) {
    awardPoints(state, playerIndex, scoring.total, scoring.breakdown.map((b) => b.type).join(", "));
    state.lastScoring = scoring;
  }

  // Check for game win
  if (checkGameEnd(state)) {
    return { ok: true, points: scoring.total };
  }

  // Check if count is 31 - reset
  if (state.playCount === 31) {
    resetPlayStack(state);
  }

  // Advance turn
  advancePeggingTurn(state);

  return { ok: true, points: scoring.total };
}

/**
 * Say "GO" when unable to play
 * @param {object} state - Game state
 * @param {string} playerId - Player ID
 * @returns {{ ok: boolean, error?: string }}
 */
export function sayGo(state, playerId) {
  if (state.phase !== PHASES.PEGGING) {
    return { ok: false, error: "NOT_PEGGING_PHASE" };
  }

  const playerIndex = state.players.findIndex((p) => p.playerId === playerId);
  if (playerIndex === -1) {
    return { ok: false, error: "PLAYER_NOT_FOUND" };
  }

  if (playerIndex !== state.turnIndex) {
    return { ok: false, error: "NOT_YOUR_TURN" };
  }

  // Check player actually can't play
  const legalPlays = getLegalPlays(state.pegHands[playerIndex], state.playCount);
  if (legalPlays.length > 0) {
    return { ok: false, error: "CAN_STILL_PLAY" };
  }

  state.goFlags[playerIndex] = true;

  addFeed(state, { type: "go", message: `${state.players[playerIndex].displayName} says GO` });

  // Check if all players have said go or can't play
  const allGo = state.players.every((_, i) => {
    return state.goFlags[i] || getLegalPlays(state.pegHands[i], state.playCount).length === 0;
  });

  if (allGo) {
    // Award 1 point to last player (or 2 if exactly 31, but that's handled in playCard)
    if (state.playCount < 31 && state.lastPlayer !== null) {
      awardPoints(state, state.lastPlayer, 1, "Go");
    }

    // Check for game win
    if (checkGameEnd(state)) {
      return { ok: true };
    }

    resetPlayStack(state);
  }

  advancePeggingTurn(state);

  return { ok: true };
}

/**
 * Reset the play stack for a new count
 */
function resetPlayStack(state) {
  state.playStack = [];
  state.playCount = 0;
  for (let i = 0; i < state.goFlags.length; i++) {
    state.goFlags[i] = false;
  }

  // Check if pegging is complete (all hands empty)
  const allEmpty = state.pegHands.every((h) => h.length === 0);
  if (allEmpty) {
    // Award last card point
    if (state.lastPlayer !== null) {
      awardPoints(state, state.lastPlayer, 1, "Last card");
    }

    // Check for game win
    if (!checkGameEnd(state)) {
      // Move to show phase
      state.phase = PHASES.SHOW;
      state.turnIndex = (state.dealerIndex + 1) % state.players.length;
      addFeed(state, { type: "system", message: "Pegging complete. Show hands!" });
    }
  }
}

/**
 * Advance turn during pegging
 */
function advancePeggingTurn(state) {
  const startTurn = state.turnIndex;
  let attempts = 0;

  do {
    state.turnIndex = (state.turnIndex + 1) % state.players.length;
    attempts++;

    // Check if this player can play or hasn't said go
    const canPlay = getLegalPlays(state.pegHands[state.turnIndex], state.playCount).length > 0;
    const hasCards = state.pegHands[state.turnIndex].length > 0;

    if (hasCards && (canPlay || !state.goFlags[state.turnIndex])) {
      break;
    }
  } while (state.turnIndex !== startTurn && attempts < state.players.length * 2);
}

/**
 * Confirm hand showing (score the hand)
 * @param {object} state - Game state
 * @param {string} playerId - Player ID
 * @returns {{ ok: boolean, error?: string, scoring?: object }}
 */
export function confirmShow(state, playerId) {
  if (state.phase !== PHASES.SHOW && state.phase !== PHASES.CRIB_SHOW) {
    return { ok: false, error: "NOT_SHOW_PHASE" };
  }

  const playerIndex = state.players.findIndex((p) => p.playerId === playerId);
  if (playerIndex === -1) {
    return { ok: false, error: "PLAYER_NOT_FOUND" };
  }

  if (state.phase === PHASES.SHOW) {
    if (playerIndex !== state.turnIndex) {
      return { ok: false, error: "NOT_YOUR_TURN" };
    }

    // Score this player's hand
    const scoring = scoreHand(state.hands[playerIndex], state.starter, false);
    awardPoints(state, playerIndex, scoring.total, `Hand: ${scoring.total} points`);
    state.lastScoring = scoring;

    addFeed(state, {
      type: "score",
      message: `${state.players[playerIndex].displayName} scores ${scoring.total} for hand`,
    });

    // Check for game win
    if (checkGameEnd(state)) {
      return { ok: true, scoring };
    }

    // Advance to next player or crib
    state.turnIndex = (state.turnIndex + 1) % state.players.length;

    // Check if we've gone around to dealer (crib owner)
    if (state.turnIndex === state.dealerIndex) {
      state.phase = PHASES.CRIB_SHOW;
      addFeed(state, { type: "system", message: "Time to count the crib!" });
    }

    return { ok: true, scoring };
  }

  // CRIB_SHOW phase - only dealer can confirm
  if (playerIndex !== state.dealerIndex) {
    return { ok: false, error: "NOT_DEALER" };
  }

  // Score the crib
  const scoring = scoreHand(state.crib, state.starter, true);
  awardPoints(state, state.dealerIndex, scoring.total, `Crib: ${scoring.total} points`);
  state.lastScoring = scoring;

  addFeed(state, {
    type: "score",
    message: `${state.players[state.dealerIndex].displayName} scores ${scoring.total} for crib`,
  });

  // Check for game win
  if (checkGameEnd(state)) {
    return { ok: true, scoring };
  }

  // Move to round end
  state.phase = PHASES.ROUND_END;

  return { ok: true, scoring };
}

/**
 * Start next round
 * @param {object} state - Game state
 * @param {string} playerId - Player ID (should be host or any player)
 * @returns {{ ok: boolean, error?: string }}
 */
export function nextRound(state, playerId) {
  if (state.phase !== PHASES.ROUND_END) {
    return { ok: false, error: "NOT_ROUND_END" };
  }

  // Rotate dealer
  state.dealerIndex = (state.dealerIndex + 1) % state.players.length;

  // Start new round
  startRound(state);

  return { ok: true };
}

/**
 * Award points to a player
 */
function awardPoints(state, playerIndex, points, reason) {
  state.previousScores[playerIndex] = state.scores[playerIndex];
  state.scores[playerIndex] += points;
  state.pendingPoints = {
    playerIndex,
    playerId: state.players[playerIndex].playerId,
    points,
    reason,
    newScore: state.scores[playerIndex],
  };
}

/**
 * Check if game has ended (someone reached target score)
 */
function checkGameEnd(state) {
  for (let i = 0; i < state.scores.length; i++) {
    if (state.scores[i] >= state.targetScore) {
      state.phase = PHASES.GAME_END;
      addFeed(state, {
        type: "winner",
        message: `${state.players[i].displayName} wins with ${state.scores[i]} points!`,
      });
      return true;
    }
  }
  return false;
}

/**
 * Add entry to game feed
 */
function addFeed(state, entry) {
  state.feed.push({
    ...entry,
    timestamp: Date.now(),
  });
  // Keep last 50 entries
  if (state.feed.length > 50) {
    state.feed.shift();
  }
}

/**
 * Sanitize state for a specific player (hide other players' hands)
 * @param {object} state - Full game state
 * @param {string|null} playerId - Viewing player ID (null for spectator)
 * @returns {object} Sanitized state
 */
export function sanitizeState(state, playerId) {
  const playerIndex = state.players.findIndex((p) => p.playerId === playerId);

  const sanitized = {
    ...state,
    deck: undefined, // Never expose deck
    hands: state.hands.map((hand, i) => {
      // Player sees their own hand
      if (i === playerIndex) return hand;
      // Others see card count only
      return { count: hand.length };
    }),
    pegHands: state.pegHands.map((hand, i) => {
      // Player sees their own peg hand
      if (i === playerIndex) return hand;
      // Others see card count only
      return { count: hand.length };
    }),
    crib: state.phase === PHASES.CRIB_SHOW || state.phase === PHASES.ROUND_END || state.phase === PHASES.GAME_END
      ? state.crib
      : { count: state.crib.length },
    starter: state.phase === PHASES.DISCARD || state.phase === PHASES.DEAL || state.phase === PHASES.LOBBY
      ? null
      : state.starter,
  };

  return sanitized;
}

/**
 * Get player index from ID
 */
export function getPlayerIndex(state, playerId) {
  return state.players.findIndex((p) => p.playerId === playerId);
}

/**
 * Check if it's a player's turn
 */
export function isPlayerTurn(state, playerId) {
  const playerIndex = getPlayerIndex(state, playerId);
  return playerIndex === state.turnIndex;
}
