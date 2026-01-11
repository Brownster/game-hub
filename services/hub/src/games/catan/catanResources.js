// Catan resource management - distribution, trading, costs

import { RESOURCES, RESOURCE_LIST, BUILDING_COSTS, DEFAULT_TRADE_RATIO } from "./catanConstants.js";
import { getTileCorners, getBestTradeRatio } from "./catanBoard.js";

/**
 * Create an empty resource bundle
 */
export function createResourceBundle() {
  return {
    [RESOURCES.WOOD]: 0,
    [RESOURCES.BRICK]: 0,
    [RESOURCES.SHEEP]: 0,
    [RESOURCES.WHEAT]: 0,
    [RESOURCES.ORE]: 0,
  };
}

/**
 * Get total number of resources in a bundle
 */
export function getTotalResources(bundle) {
  return RESOURCE_LIST.reduce((sum, r) => sum + (bundle[r] || 0), 0);
}

/**
 * Check if a player has enough resources
 */
export function hasResources(playerResources, cost) {
  for (const [resource, amount] of Object.entries(cost)) {
    if ((playerResources[resource] || 0) < amount) {
      return false;
    }
  }
  return true;
}

/**
 * Check if player can afford a building
 */
export function canAfford(player, buildingType) {
  const cost = BUILDING_COSTS[buildingType];
  if (!cost) return false;
  return hasResources(player.resources, cost);
}

/**
 * Deduct resources from a player
 */
export function deductResources(player, cost) {
  for (const [resource, amount] of Object.entries(cost)) {
    player.resources[resource] = (player.resources[resource] || 0) - amount;
  }
}

/**
 * Add resources to a player
 */
export function addResources(player, resources) {
  for (const [resource, amount] of Object.entries(resources)) {
    player.resources[resource] = (player.resources[resource] || 0) + amount;
  }
}

/**
 * Distribute resources based on dice roll
 * @param {Object} state - Game state
 * @param {number} roll - Dice roll (2-12)
 * @returns {Object} Distribution: { playerId: { resource: amount } }
 */
export function distributeResources(state, roll) {
  const distribution = {};

  // Find tiles with this number (excluding robber)
  const producingTiles = state.board.tiles.filter(
    (t) => t.number === roll && !t.hasRobber && t.resource
  );

  for (const tile of producingTiles) {
    const corners = getTileCorners(state.board, tile.id);

    for (const corner of corners) {
      if (!corner.building || !corner.playerId) continue;

      const playerId = corner.playerId;
      const amount = corner.building === "city" ? 2 : 1;

      if (!distribution[playerId]) {
        distribution[playerId] = createResourceBundle();
      }
      distribution[playerId][tile.resource] += amount;
    }
  }

  // Apply distribution to players
  for (const [playerId, resources] of Object.entries(distribution)) {
    const player = state.players.find((p) => p.playerId === playerId);
    if (player) {
      addResources(player, resources);
    }
  }

  return distribution;
}

/**
 * Get initial resources for second settlement placement
 * Player receives one of each resource from adjacent tiles
 */
export function getInitialResources(board, cornerId) {
  const resources = createResourceBundle();
  const corner = board.corners.find((c) => c.id === cornerId);

  if (!corner) return resources;

  for (const tileId of corner.touchingTiles) {
    const tile = board.tiles.find((t) => t.id === tileId);
    if (tile?.resource) {
      resources[tile.resource] += 1;
    }
  }

  return resources;
}

/**
 * Check if a bank trade is valid
 */
export function canBankTrade(state, playerId, giveResource, receiveResource) {
  const player = state.players.find((p) => p.playerId === playerId);
  if (!player) return { ok: false, error: "PLAYER_NOT_FOUND" };

  if (giveResource === receiveResource) {
    return { ok: false, error: "SAME_RESOURCE" };
  }

  const ratio = getBestTradeRatio(state.board, playerId, giveResource);
  const playerHas = player.resources[giveResource] || 0;

  if (playerHas < ratio) {
    return { ok: false, error: "NOT_ENOUGH_RESOURCES" };
  }

  return { ok: true, ratio };
}

/**
 * Execute a bank trade
 */
export function executeBankTrade(state, playerId, giveResource, receiveResource) {
  const check = canBankTrade(state, playerId, giveResource, receiveResource);
  if (!check.ok) return check;

  const player = state.players.find((p) => p.playerId === playerId);
  player.resources[giveResource] -= check.ratio;
  player.resources[receiveResource] += 1;

  return { ok: true, ratio: check.ratio };
}

/**
 * Validate a player trade offer
 */
export function validateTradeOffer(state, fromPlayerId, toPlayerId, offer, request) {
  const fromPlayer = state.players.find((p) => p.playerId === fromPlayerId);
  const toPlayer = state.players.find((p) => p.playerId === toPlayerId);

  if (!fromPlayer || !toPlayer) {
    return { ok: false, error: "PLAYER_NOT_FOUND" };
  }

  if (fromPlayerId === toPlayerId) {
    return { ok: false, error: "CANNOT_TRADE_WITH_SELF" };
  }

  // Check if offering player has the resources
  if (!hasResources(fromPlayer.resources, offer)) {
    return { ok: false, error: "OFFERER_LACKS_RESOURCES" };
  }

  // Check if target player has the resources
  if (!hasResources(toPlayer.resources, request)) {
    return { ok: false, error: "TARGET_LACKS_RESOURCES" };
  }

  // Ensure something is being traded
  const offerTotal = getTotalResources(offer);
  const requestTotal = getTotalResources(request);

  if (offerTotal === 0 || requestTotal === 0) {
    return { ok: false, error: "EMPTY_TRADE" };
  }

  return { ok: true };
}

/**
 * Execute a player trade
 */
export function executePlayerTrade(state, fromPlayerId, toPlayerId, offer, request) {
  const validation = validateTradeOffer(state, fromPlayerId, toPlayerId, offer, request);
  if (!validation.ok) return validation;

  const fromPlayer = state.players.find((p) => p.playerId === fromPlayerId);
  const toPlayer = state.players.find((p) => p.playerId === toPlayerId);

  // Transfer resources
  deductResources(fromPlayer, offer);
  addResources(toPlayer, offer);

  deductResources(toPlayer, request);
  addResources(fromPlayer, request);

  return { ok: true };
}

/**
 * Check if player must discard (more than 7 cards on a 7 roll)
 */
export function mustDiscard(player, maxCards = 7) {
  const total = getTotalResources(player.resources);
  return total > maxCards;
}

/**
 * Get number of cards to discard
 */
export function getDiscardCount(player, maxCards = 7) {
  const total = getTotalResources(player.resources);
  if (total <= maxCards) return 0;
  return Math.floor(total / 2);
}

/**
 * Validate a discard selection
 */
export function validateDiscard(player, discardBundle, maxCards = 7) {
  const requiredDiscard = getDiscardCount(player, maxCards);
  const discardTotal = getTotalResources(discardBundle);

  if (discardTotal !== requiredDiscard) {
    return { ok: false, error: "WRONG_DISCARD_COUNT", required: requiredDiscard };
  }

  // Check player has the resources to discard
  if (!hasResources(player.resources, discardBundle)) {
    return { ok: false, error: "NOT_ENOUGH_RESOURCES" };
  }

  return { ok: true };
}

/**
 * Execute a discard
 */
export function executeDiscard(player, discardBundle) {
  deductResources(player, discardBundle);
  return { ok: true };
}

/**
 * Steal a random resource from a player
 */
export function stealRandomResource(fromPlayer, toPlayer) {
  const available = [];

  for (const resource of RESOURCE_LIST) {
    const count = fromPlayer.resources[resource] || 0;
    for (let i = 0; i < count; i++) {
      available.push(resource);
    }
  }

  if (available.length === 0) {
    return { ok: true, stolen: null };
  }

  // Pick random resource
  const stolen = available[Math.floor(Math.random() * available.length)];

  fromPlayer.resources[stolen] -= 1;
  toPlayer.resources[stolen] += 1;

  return { ok: true, stolen };
}

/**
 * Apply monopoly - take all of one resource type from all players
 */
export function applyMonopoly(state, playerId, resourceType) {
  const player = state.players.find((p) => p.playerId === playerId);
  if (!player) return { ok: false, error: "PLAYER_NOT_FOUND" };

  let totalStolen = 0;

  for (const otherPlayer of state.players) {
    if (otherPlayer.playerId === playerId) continue;

    const amount = otherPlayer.resources[resourceType] || 0;
    if (amount > 0) {
      otherPlayer.resources[resourceType] = 0;
      totalStolen += amount;
    }
  }

  player.resources[resourceType] += totalStolen;

  return { ok: true, stolen: totalStolen };
}

/**
 * Apply Year of Plenty - give player 2 resources of choice
 */
export function applyYearOfPlenty(state, playerId, resource1, resource2) {
  const player = state.players.find((p) => p.playerId === playerId);
  if (!player) return { ok: false, error: "PLAYER_NOT_FOUND" };

  player.resources[resource1] += 1;
  player.resources[resource2] += 1;

  return { ok: true };
}
