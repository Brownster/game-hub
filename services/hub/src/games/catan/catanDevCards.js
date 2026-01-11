// Catan development card logic

import { DEV_CARDS, DEV_CARD_COUNTS, BUILDING_COSTS, MIN_LARGEST_ARMY } from "./catanConstants.js";
import { canAfford, deductResources } from "./catanResources.js";

/**
 * Create a shuffled development card deck
 */
export function createDevCardDeck() {
  const deck = [];

  for (const [cardType, count] of Object.entries(DEV_CARD_COUNTS)) {
    for (let i = 0; i < count; i++) {
      deck.push({
        type: cardType,
        id: `${cardType}-${i}`,
      });
    }
  }

  // Shuffle using Fisher-Yates
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

/**
 * Check if player can buy a development card
 */
export function canBuyDevCard(state, playerId) {
  const player = state.players.find((p) => p.playerId === playerId);
  if (!player) return { ok: false, error: "PLAYER_NOT_FOUND" };

  if (state.devCardDeck.length === 0) {
    return { ok: false, error: "NO_CARDS_LEFT" };
  }

  if (!canAfford(player, "devCard")) {
    return { ok: false, error: "NOT_ENOUGH_RESOURCES" };
  }

  return { ok: true };
}

/**
 * Buy a development card
 */
export function buyDevCard(state, playerId) {
  const check = canBuyDevCard(state, playerId);
  if (!check.ok) return check;

  const player = state.players.find((p) => p.playerId === playerId);

  // Pay the cost
  deductResources(player, BUILDING_COSTS.devCard);

  // Draw from deck
  const card = state.devCardDeck.pop();

  // Add to player's hand (marked as bought this turn)
  player.devCards.push({
    ...card,
    boughtThisTurn: true,
  });

  return { ok: true, card };
}

/**
 * Check if player can play a development card
 */
export function canPlayDevCard(state, playerId, cardType) {
  const player = state.players.find((p) => p.playerId === playerId);
  if (!player) return { ok: false, error: "PLAYER_NOT_FOUND" };

  // Can't play VP cards - they're automatic
  if (cardType === DEV_CARDS.VICTORY_POINT) {
    return { ok: false, error: "VP_CARDS_ARE_AUTOMATIC" };
  }

  // Find an eligible card (not bought this turn)
  const card = player.devCards.find(
    (c) => c.type === cardType && !c.boughtThisTurn
  );

  if (!card) {
    return { ok: false, error: "NO_ELIGIBLE_CARD" };
  }

  // Can only play one dev card per turn (except VP which is automatic)
  if (state.devCardPlayedThisTurn) {
    return { ok: false, error: "ALREADY_PLAYED_CARD" };
  }

  return { ok: true, card };
}

/**
 * Play a knight card
 * Returns state requiring ROBBER_MOVE phase
 */
export function playKnight(state, playerId) {
  const check = canPlayDevCard(state, playerId, DEV_CARDS.KNIGHT);
  if (!check.ok) return check;

  const player = state.players.find((p) => p.playerId === playerId);

  // Remove card from hand
  const cardIndex = player.devCards.findIndex(
    (c) => c.id === check.card.id
  );
  player.devCards.splice(cardIndex, 1);

  // Track played cards
  player.devCardsPlayed.push(check.card);
  player.knightsPlayed += 1;

  state.devCardPlayedThisTurn = true;

  // Check for largest army
  updateLargestArmy(state);

  return { ok: true, requiresRobberMove: true };
}

/**
 * Play a road building card
 * Returns state requiring 2 road placements
 */
export function playRoadBuilding(state, playerId) {
  const check = canPlayDevCard(state, playerId, DEV_CARDS.ROAD_BUILDING);
  if (!check.ok) return check;

  const player = state.players.find((p) => p.playerId === playerId);

  // Remove card from hand
  const cardIndex = player.devCards.findIndex(
    (c) => c.id === check.card.id
  );
  player.devCards.splice(cardIndex, 1);

  player.devCardsPlayed.push(check.card);
  state.devCardPlayedThisTurn = true;

  // Player can place 0-2 roads depending on available pieces
  const roadsToPlace = Math.min(2, player.roads);

  return { ok: true, roadsToPlace };
}

/**
 * Play a year of plenty card
 * Returns state requiring resource selection
 */
export function playYearOfPlenty(state, playerId) {
  const check = canPlayDevCard(state, playerId, DEV_CARDS.YEAR_OF_PLENTY);
  if (!check.ok) return check;

  const player = state.players.find((p) => p.playerId === playerId);

  // Remove card from hand
  const cardIndex = player.devCards.findIndex(
    (c) => c.id === check.card.id
  );
  player.devCards.splice(cardIndex, 1);

  player.devCardsPlayed.push(check.card);
  state.devCardPlayedThisTurn = true;

  return { ok: true, requiresResourceSelection: true, count: 2 };
}

/**
 * Play a monopoly card
 * Returns state requiring resource type selection
 */
export function playMonopoly(state, playerId) {
  const check = canPlayDevCard(state, playerId, DEV_CARDS.MONOPOLY);
  if (!check.ok) return check;

  const player = state.players.find((p) => p.playerId === playerId);

  // Remove card from hand
  const cardIndex = player.devCards.findIndex(
    (c) => c.id === check.card.id
  );
  player.devCards.splice(cardIndex, 1);

  player.devCardsPlayed.push(check.card);
  state.devCardPlayedThisTurn = true;

  return { ok: true, requiresMonopolySelection: true };
}

/**
 * Update largest army holder
 */
export function updateLargestArmy(state) {
  let maxKnights = MIN_LARGEST_ARMY - 1;
  let holder = null;

  for (const player of state.players) {
    if (player.knightsPlayed > maxKnights) {
      maxKnights = player.knightsPlayed;
      holder = player.playerId;
    }
  }

  // Only change if someone qualifies
  if (holder && holder !== state.largestArmy) {
    state.largestArmy = holder;
    return { changed: true, holder };
  }

  return { changed: false };
}

/**
 * Count victory point cards in hand
 */
export function countVPCards(player) {
  return player.devCards.filter((c) => c.type === DEV_CARDS.VICTORY_POINT).length;
}

/**
 * Clear "bought this turn" flag at end of turn
 */
export function clearBoughtThisTurn(player) {
  for (const card of player.devCards) {
    card.boughtThisTurn = false;
  }
}

/**
 * Get playable cards for a player
 */
export function getPlayableCards(state, playerId) {
  const player = state.players.find((p) => p.playerId === playerId);
  if (!player) return [];

  if (state.devCardPlayedThisTurn) return [];

  const playable = [];
  const seen = new Set();

  for (const card of player.devCards) {
    // Skip VP cards and cards bought this turn
    if (card.type === DEV_CARDS.VICTORY_POINT) continue;
    if (card.boughtThisTurn) continue;

    // Only show each type once
    if (seen.has(card.type)) continue;
    seen.add(card.type);

    playable.push(card.type);
  }

  return playable;
}
