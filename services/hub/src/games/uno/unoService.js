// UNO game service

import { ACTIONS, CARD_TYPES, COLORS, DEFAULT_HAND_SIZE, DEFAULT_RULES, PHASES } from "./unoConstants.js";
import { buildDeck, drawCard, shuffle } from "./unoDeck.js";

function getCurrentPlayer(state) {
  return state.players[state.turnIndex];
}

function nextIndex(state, steps = 1) {
  const total = state.players.length;
  const dir = state.direction;
  return (state.turnIndex + dir * steps + total * steps) % total;
}

function advanceTurn(state, steps = 1) {
  state.turnIndex = nextIndex(state, steps);
}

function findCard(hand, cardId) {
  return hand.find((card) => card.id === cardId) || null;
}

function removeCard(hand, cardId) {
  const idx = hand.findIndex((card) => card.id === cardId);
  if (idx === -1) return null;
  const [card] = hand.splice(idx, 1);
  return card;
}

function isPlayable(card, state) {
  if (!card) return false;
  if (card.type === CARD_TYPES.WILD || card.type === CARD_TYPES.DRAW4) return true;
  if (card.color === state.currentColor) return true;
  if (state.currentValue && card.value === state.currentValue) return true;
  return false;
}

function refillDrawPile(state) {
  if (state.drawPile.length > 0) return;
  if (state.discardPile.length <= 1) return;

  const top = state.discardPile.pop();
  state.drawPile = shuffle(state.discardPile);
  state.discardPile = [top];
}

function drawFromPile(state, count = 1) {
  const drawn = [];
  for (let i = 0; i < count; i += 1) {
    refillDrawPile(state);
    const card = drawCard(state.drawPile);
    if (card) drawn.push(card);
  }
  return drawn;
}

function createPlayerState(p) {
  return {
    playerId: p.odPlayerId ?? p.playerId,
    displayName: p.odDisplayName ?? p.displayName,
    isHost: Boolean(p.isHost),
  };
}

export function createUnoInitialState(players) {
  const playerStates = players.map(createPlayerState);
  const hostId = playerStates.find((p) => p.isHost)?.playerId || playerStates[0]?.playerId || null;

  return {
    phase: PHASES.LOBBY,
    players: playerStates,
    hands: {},
    drawPile: [],
    discardPile: [],
    turnIndex: 0,
    direction: 1,
    currentColor: null,
    currentValue: null,
    pendingDraw: 0,
    pendingDrawType: null,
    pendingDrawTargetId: null,
    pendingColorChoiceFor: null,
    drawnCardId: null,
    drawnPlayerId: null,
    unoPendingPlayerId: null,
    hostId,
    rules: { ...DEFAULT_RULES },
    winner: null,
  };
}

export function startUnoGame(state) {
  if (state.phase !== PHASES.LOBBY) {
    return { ok: false, error: "ALREADY_STARTED" };
  }

  if (state.players.length < 2) {
    return { ok: false, error: "NOT_ENOUGH_PLAYERS" };
  }

  const deck = shuffle(buildDeck());
  const hands = {};

  for (const player of state.players) {
    hands[player.playerId] = [];
    for (let i = 0; i < DEFAULT_HAND_SIZE; i += 1) {
      hands[player.playerId].push(deck.pop());
    }
  }

  // Flip initial card - avoid wild/draw4 for v1
  let starter = null;
  const setAside = [];
  while (deck.length > 0) {
    const candidate = deck.pop();
    if (candidate.type === CARD_TYPES.WILD || candidate.type === CARD_TYPES.DRAW4) {
      setAside.push(candidate);
      continue;
    }
    starter = candidate;
    break;
  }
  deck.push(...setAside);
  shuffle(deck);

  if (!starter) {
    return { ok: false, error: "NO_START_CARD" };
  }

  state.phase = PHASES.TURN;
  state.hands = hands;
  state.drawPile = deck;
  state.discardPile = [starter];
  state.turnIndex = 0;
  state.direction = 1;
  state.currentColor = starter.color;
  state.currentValue = starter.value;
  state.pendingDraw = 0;
  state.pendingDrawType = null;
  state.pendingDrawTargetId = null;
  state.pendingColorChoiceFor = null;
  state.drawnCardId = null;
  state.drawnPlayerId = null;
  state.unoPendingPlayerId = null;
  state.winner = null;

  // Handle starting action card effects (per official UNO rules)
  if (starter.type === CARD_TYPES.SKIP) {
    // First player is skipped
    state.turnIndex = 1 % state.players.length;
  } else if (starter.type === CARD_TYPES.REVERSE) {
    // Reverse direction; in 2-player game, dealer plays first
    if (state.players.length === 2) {
      state.turnIndex = 1;
    } else {
      state.direction = -1;
      // Play passes to dealer's right (last player in reverse direction)
      state.turnIndex = state.players.length - 1;
    }
  } else if (starter.type === CARD_TYPES.DRAW2) {
    // First player must draw 2
    state.pendingDraw = 2;
    state.pendingDrawType = CARD_TYPES.DRAW2;
    state.pendingDrawTargetId = state.players[0].playerId;
  }

  return { ok: true };
}

export function getAvailableActions(state, playerId) {
  const actions = [];
  if (state.phase === PHASES.FINISHED) return actions;

  if (state.phase === PHASES.COLOR_CHOICE) {
    if (state.pendingColorChoiceFor === playerId) {
      actions.push({ type: ACTIONS.CHOOSE_COLOR, colors: COLORS });
    }
    return actions;
  }

  if (state.rules.unoCall && state.unoPendingPlayerId === playerId) {
    actions.push({ type: ACTIONS.CALL_UNO });
  }

  const currentPlayer = getCurrentPlayer(state);
  if (!currentPlayer || currentPlayer.playerId !== playerId) return actions;

  if (state.pendingDraw > 0) {
    if (state.rules.stacking && state.pendingDrawType) {
      const hand = state.hands[playerId] || [];
      const stackable = hand
        .filter((card) => card.type === state.pendingDrawType)
        .map((card) => card.id);
      if (stackable.length > 0) {
        actions.push({ type: ACTIONS.PLAY_CARD, playable: stackable });
      }
    }
    actions.push({ type: ACTIONS.DRAW_CARD, count: state.pendingDraw });
    return actions;
  }

  const hand = state.hands[playerId] || [];
  let playable = hand.filter((card) => isPlayable(card, state)).map((card) => card.id);

  if (state.drawnPlayerId === playerId && state.drawnCardId) {
    const drawnCard = hand.find((card) => card.id === state.drawnCardId);
    if (state.rules.drawThenPlay && drawnCard && isPlayable(drawnCard, state)) {
      playable = [state.drawnCardId];
    } else {
      playable = [];
    }
  }

  if (playable.length > 0) {
    actions.push({ type: ACTIONS.PLAY_CARD, playable });
  }

  if (state.drawnPlayerId === playerId && state.drawnCardId) {
    actions.push({ type: ACTIONS.PASS });
  } else if (playable.length === 0) {
    actions.push({ type: ACTIONS.DRAW_CARD, count: 1 });
  }

  return actions;
}

export function sanitizeState(state, playerId) {
  const sanitized = {
    phase: state.phase,
    players: state.players.map((p) => ({
      playerId: p.playerId,
      displayName: p.displayName,
      handCount: (state.hands[p.playerId] || []).length,
      hasUno: (state.hands[p.playerId] || []).length === 1,
    })),
    turnIndex: state.turnIndex,
    currentPlayer: state.players[state.turnIndex]?.playerId || null,
    direction: state.direction,
    currentColor: state.currentColor,
    currentValue: state.currentValue,
    discardTop: state.discardPile[state.discardPile.length - 1] || null,
    drawCount: state.drawPile.length,
    pendingDraw: state.pendingDraw,
    pendingDrawType: state.pendingDrawType,
    pendingColorChoiceFor: state.pendingColorChoiceFor,
    winner: state.winner,
    rules: state.rules,
    hostId: state.hostId,
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

  if (action.type === ACTIONS.SET_RULES) {
    if (state.phase !== PHASES.LOBBY) return { ok: false, error: "GAME_ALREADY_STARTED" };
    if (state.hostId && state.hostId !== playerId) return { ok: false, error: "NOT_HOST" };
    if (!action.rules || typeof action.rules !== "object") return { ok: false, error: "INVALID_RULES" };

    state.rules = {
      ...state.rules,
      drawThenPlay: Boolean(action.rules.drawThenPlay),
      stacking: Boolean(action.rules.stacking),
      unoCall: Boolean(action.rules.unoCall),
      challengeDraw4: Boolean(action.rules.challengeDraw4),
    };
    return { ok: true };
  }

  if (state.rules.unoCall && state.unoPendingPlayerId && state.unoPendingPlayerId !== playerId) {
    if (action.type !== ACTIONS.CALL_UNO) {
      const targetHand = state.hands[state.unoPendingPlayerId] || [];
      const penalty = drawFromPile(state, 2);
      targetHand.push(...penalty);
      state.unoPendingPlayerId = null;
    }
  }

  if (state.phase === PHASES.COLOR_CHOICE) {
    if (action.type !== ACTIONS.CHOOSE_COLOR) return { ok: false, error: "COLOR_REQUIRED" };
    if (state.pendingColorChoiceFor !== playerId) return { ok: false, error: "NOT_YOUR_TURN" };
    if (!COLORS.includes(action.color)) return { ok: false, error: "INVALID_COLOR" };

    state.currentColor = action.color;
    state.currentValue = null;
    state.pendingColorChoiceFor = null;

    if (state.pendingDrawTargetId) {
      const targetIndex = state.players.findIndex((p) => p.playerId === state.pendingDrawTargetId);
      state.turnIndex = targetIndex >= 0 ? targetIndex : state.turnIndex;
      state.pendingDrawTargetId = null;
    } else {
      advanceTurn(state, 1);
    }

    state.phase = PHASES.TURN;
    return { ok: true };
  }

  const currentPlayer = getCurrentPlayer(state);
  if (!currentPlayer || currentPlayer.playerId !== playerId) {
    return { ok: false, error: "NOT_YOUR_TURN" };
  }

  if (action.type === ACTIONS.CALL_UNO) {
    if (state.unoPendingPlayerId !== playerId) {
      return { ok: false, error: "NO_UNO_PENDING" };
    }
    state.unoPendingPlayerId = null;
    return { ok: true };
  }

  if (state.pendingDraw > 0) {
    if (action.type === ACTIONS.PLAY_CARD && state.rules.stacking) {
      const hand = state.hands[playerId] || [];
      const card = findCard(hand, action.cardId);
      if (!card) return { ok: false, error: "CARD_NOT_FOUND" };
      if (card.type !== state.pendingDrawType) return { ok: false, error: "CARD_NOT_PLAYABLE" };

      removeCard(hand, action.cardId);
      state.discardPile.push(card);
      state.drawnCardId = null;
      state.drawnPlayerId = null;

      if (card.type === CARD_TYPES.DRAW2) {
        state.pendingDraw += 2;
        state.pendingDrawType = CARD_TYPES.DRAW2;
        state.currentColor = card.color;
        state.currentValue = card.value;
        advanceTurn(state, 1);
        return { ok: true };
      }

      if (card.type === CARD_TYPES.DRAW4) {
        state.pendingDraw += 4;
        state.pendingDrawType = CARD_TYPES.DRAW4;
        state.pendingDrawTargetId = state.players[nextIndex(state, 1)]?.playerId || null;
        state.phase = PHASES.COLOR_CHOICE;
        state.pendingColorChoiceFor = playerId;
        state.currentColor = null;
        state.currentValue = null;
        return { ok: true };
      }
    }

    if (action.type !== ACTIONS.DRAW_CARD) return { ok: false, error: "DRAW_REQUIRED" };
    const drawn = drawFromPile(state, state.pendingDraw);
    state.hands[playerId].push(...drawn);
    state.pendingDraw = 0;
    state.pendingDrawType = null;
    state.pendingDrawTargetId = null;
    advanceTurn(state, 1);
    return { ok: true, drawn: drawn.length };
  }

  if (action.type === ACTIONS.DRAW_CARD) {
    const hand = state.hands[playerId] || [];
    const playable = hand.some((card) => isPlayable(card, state));
    if (playable) return { ok: false, error: "PLAYABLE_CARD_AVAILABLE" };

    const drawn = drawFromPile(state, 1);
    if (drawn.length === 0) return { ok: false, error: "DRAW_EMPTY" };

    const drawnCard = drawn[0];
    state.hands[playerId].push(drawnCard);
    state.drawnCardId = drawnCard.id;
    state.drawnPlayerId = playerId;
    return { ok: true, drawn: drawnCard };
  }

  if (action.type === ACTIONS.PASS) {
    if (state.drawnPlayerId !== playerId || !state.drawnCardId) {
      return { ok: false, error: "CANNOT_PASS" };
    }

    state.drawnCardId = null;
    state.drawnPlayerId = null;
    advanceTurn(state, 1);
    return { ok: true };
  }

  if (action.type === ACTIONS.PLAY_CARD) {
    const hand = state.hands[playerId] || [];
    const card = findCard(hand, action.cardId);
    if (!card) return { ok: false, error: "CARD_NOT_FOUND" };
    if (!isPlayable(card, state)) return { ok: false, error: "CARD_NOT_PLAYABLE" };
    if (state.drawnPlayerId === playerId && state.drawnCardId && action.cardId !== state.drawnCardId) {
      return { ok: false, error: "DRAWN_CARD_ONLY" };
    }

    removeCard(hand, action.cardId);
    state.discardPile.push(card);
    state.drawnCardId = null;
    state.drawnPlayerId = null;

    if (hand.length === 0) {
      state.phase = PHASES.FINISHED;
      state.winner = playerId;
      return { ok: true, winner: playerId };
    }

    if (state.rules.unoCall && hand.length === 1) {
      state.unoPendingPlayerId = playerId;
    }

    state.currentColor = card.color;
    state.currentValue = card.value;

    if (card.type === CARD_TYPES.SKIP) {
      advanceTurn(state, 2);
      return { ok: true };
    }

    if (card.type === CARD_TYPES.REVERSE) {
      if (state.players.length === 2) {
        advanceTurn(state, 2);
      } else {
        state.direction *= -1;
        advanceTurn(state, 1);
      }
      return { ok: true };
    }

    if (card.type === CARD_TYPES.DRAW2) {
      state.pendingDraw = 2;
      state.pendingDrawType = CARD_TYPES.DRAW2;
      state.pendingDrawTargetId = state.players[nextIndex(state, 1)]?.playerId || null;
      advanceTurn(state, 1);
      return { ok: true };
    }

    if (card.type === CARD_TYPES.WILD) {
      state.phase = PHASES.COLOR_CHOICE;
      state.pendingColorChoiceFor = playerId;
      state.currentColor = null;
      state.currentValue = null;
      return { ok: true };
    }

    if (card.type === CARD_TYPES.DRAW4) {
      state.pendingDraw = 4;
      state.pendingDrawType = CARD_TYPES.DRAW4;
      state.pendingDrawTargetId = state.players[nextIndex(state, 1)]?.playerId || null;
      state.phase = PHASES.COLOR_CHOICE;
      state.pendingColorChoiceFor = playerId;
      state.currentColor = null;
      state.currentValue = null;
      return { ok: true };
    }

    advanceTurn(state, 1);
    return { ok: true };
  }

  return { ok: false, error: "UNKNOWN_ACTION" };
}

export { PHASES, ACTIONS };
