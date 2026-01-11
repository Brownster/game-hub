import { createShuffledDeck, deal, draw, parseCard, sortCards, shuffle } from "../cards/cardUtils.js";

export const PHASES = {
  LOBBY: "LOBBY",
  TURN: "TURN",
  FINISHED: "FINISHED",
};

export const ACTIONS = {
  PLAY_CARD: "PLAY_CARD",
  DRAW_CARD: "DRAW_CARD",
  PASS: "PASS",
};

const SUITS = ["C", "D", "H", "S"];

function createPlayerState(player) {
  return {
    playerId: player.odPlayerId ?? player.playerId,
    displayName: player.odDisplayName ?? player.displayName,
    isHost: Boolean(player.isHost),
  };
}

function getTopCard(state) {
  return state.discardPile[state.discardPile.length - 1] || null;
}

function getPlayableCards(state, hand) {
  const topCard = getTopCard(state);
  if (!topCard) return [];

  const topRank = parseCard(topCard).rank;
  return hand.filter((cardId) => {
    const { rank, suit } = parseCard(cardId);
    if (rank === "8") return true;
    if (rank === topRank) return true;
    if (suit === state.currentSuit) return true;
    return false;
  });
}

function drawFromPile(state) {
  if (state.drawPile.length === 0) {
    if (state.discardPile.length <= 1) return null;
    const top = state.discardPile.pop();
    state.drawPile = shuffle([...state.discardPile]);
    state.discardPile = [top];
  }

  return draw(state.drawPile);
}

function canDraw(state) {
  return state.drawPile.length > 0 || state.discardPile.length > 1;
}

function advanceTurn(state) {
  state.turnIndex = (state.turnIndex + 1) % state.players.length;
  state.lastDrawnCardId = null;
}

export function createCrazyEightsInitialState(players = []) {
  const playerStates = players.map(createPlayerState);
  const hostId = playerStates.find((p) => p.isHost)?.playerId || playerStates[0]?.playerId || null;

  return {
    phase: PHASES.LOBBY,
    players: playerStates,
    hands: {},
    drawPile: [],
    discardPile: [],
    currentSuit: null,
    turnIndex: 0,
    winner: null,
    hostId,
    lastDrawnCardId: null,
  };
}

export function startCrazyEightsGame(state) {
  if (state.phase !== PHASES.LOBBY) {
    return { ok: false, error: "ALREADY_STARTED" };
  }

  if (state.players.length < 2) {
    return { ok: false, error: "NOT_ENOUGH_PLAYERS" };
  }

  const deck = createShuffledDeck();
  const hands = {};
  const handSize = state.players.length <= 2 ? 7 : 5;

  for (const player of state.players) {
    hands[player.playerId] = sortCards(deal(deck, handSize));
  }

  const starter = draw(deck);
  if (!starter) {
    return { ok: false, error: "NO_START_CARD" };
  }

  const starterSuit = parseCard(starter).suit;

  state.phase = PHASES.TURN;
  state.hands = hands;
  state.drawPile = deck;
  state.discardPile = [starter];
  state.currentSuit = starterSuit;
  state.turnIndex = 0;
  state.winner = null;
  state.lastDrawnCardId = null;

  return { ok: true };
}

export function getAvailableActions(state, playerId) {
  if (state.phase !== PHASES.TURN) return [];
  const currentPlayer = state.players[state.turnIndex]?.playerId;
  if (currentPlayer !== playerId) return [];

  const hand = state.hands[playerId] || [];
  const playable = getPlayableCards(state, hand);
  if (playable.length > 0) {
    return [{ type: ACTIONS.PLAY_CARD, playable }];
  }

  if (canDraw(state)) {
    return [{ type: ACTIONS.DRAW_CARD }];
  }

  return [{ type: ACTIONS.PASS }];
}

export function sanitizeState(state, playerId) {
  const sanitized = {
    phase: state.phase,
    players: state.players.map((p) => ({
      playerId: p.playerId,
      displayName: p.displayName,
      handCount: (state.hands[p.playerId] || []).length,
    })),
    turnIndex: state.turnIndex,
    currentPlayer: state.players[state.turnIndex]?.playerId || null,
    discardTop: getTopCard(state),
    drawCount: state.drawPile.length,
    currentSuit: state.currentSuit,
    winner: state.winner,
    hostId: state.hostId,
    lastDrawnCardId: state.lastDrawnCardId,
  };

  if (playerId) {
    sanitized.hand = state.hands[playerId] || [];
    sanitized.availableActions = getAvailableActions(state, playerId);
  }

  return sanitized;
}

export function processAction(state, playerId, action) {
  if (!action?.type) return { ok: false, error: "INVALID_ACTION" };

  if (state.phase === PHASES.FINISHED) {
    return { ok: false, error: "GAME_FINISHED" };
  }

  if (state.phase !== PHASES.TURN) {
    return { ok: false, error: "GAME_NOT_STARTED" };
  }

  const currentPlayer = state.players[state.turnIndex]?.playerId;
  if (currentPlayer !== playerId) {
    return { ok: false, error: "NOT_YOUR_TURN" };
  }

  const hand = state.hands[playerId] || [];
  const playable = getPlayableCards(state, hand);

  if (action.type === ACTIONS.PLAY_CARD) {
    const cardId = action.cardId;
    if (!cardId || !hand.includes(cardId)) return { ok: false, error: "CARD_NOT_IN_HAND" };
    if (!playable.includes(cardId)) return { ok: false, error: "CARD_NOT_PLAYABLE" };

    const { rank, suit } = parseCard(cardId);
    if (rank === "8") {
      if (!SUITS.includes(action.declaredSuit)) {
        return { ok: false, error: "DECLARED_SUIT_REQUIRED" };
      }
      state.currentSuit = action.declaredSuit;
    } else {
      state.currentSuit = suit;
    }

    hand.splice(hand.indexOf(cardId), 1);
    state.discardPile.push(cardId);
    state.lastDrawnCardId = null;

    if (hand.length === 0) {
      state.phase = PHASES.FINISHED;
      state.winner = playerId;
      return { ok: true };
    }

    advanceTurn(state);
    return { ok: true };
  }

  if (action.type === ACTIONS.DRAW_CARD) {
    if (playable.length > 0) return { ok: false, error: "MUST_PLAY" };
    if (!canDraw(state)) return { ok: false, error: "NO_CARDS" };

    const drawn = drawFromPile(state);
    if (!drawn) return { ok: false, error: "NO_CARDS" };

    hand.push(drawn);
    state.lastDrawnCardId = drawn;
    return { ok: true };
  }

  if (action.type === ACTIONS.PASS) {
    if (playable.length > 0) return { ok: false, error: "MUST_PLAY" };
    if (canDraw(state)) return { ok: false, error: "MUST_DRAW" };

    advanceTurn(state);
    return { ok: true };
  }

  return { ok: false, error: "UNKNOWN_ACTION" };
}
