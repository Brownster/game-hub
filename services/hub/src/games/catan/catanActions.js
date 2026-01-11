// Catan action handlers

import { ACTIONS, PHASES, BUILDING_COSTS, STARTING_PIECES, RESOURCES } from "./catanConstants.js";
import {
  canPlaceSettlement,
  canPlaceRoad,
  canPlaceCity,
  moveRobber,
  getValidRobberTiles,
  getPlayersOnTile,
} from "./catanBoard.js";
import {
  canAfford,
  deductResources,
  addResources,
  distributeResources,
  getInitialResources,
  executeBankTrade,
  executePlayerTrade,
  validateTradeOffer,
  mustDiscard,
  getDiscardCount,
  validateDiscard,
  executeDiscard,
  stealRandomResource,
  applyMonopoly,
  applyYearOfPlenty,
  getTotalResources,
} from "./catanResources.js";
import {
  buyDevCard,
  playKnight,
  playRoadBuilding,
  playYearOfPlenty,
  playMonopoly,
  clearBoughtThisTurn,
} from "./catanDevCards.js";
import { updateLongestRoad, checkVictory } from "./catanScoring.js";

/**
 * Roll two dice
 */
function rollDice() {
  const die1 = Math.floor(Math.random() * 6) + 1;
  const die2 = Math.floor(Math.random() * 6) + 1;
  return { die1, die2, total: die1 + die2 };
}

/**
 * Get current player
 */
function getCurrentPlayer(state) {
  return state.players[state.turnIndex];
}

/**
 * Advance to next player
 */
function advanceTurn(state) {
  state.turnIndex = (state.turnIndex + 1) % state.players.length;
}

/**
 * Reverse turn order (for setup phase 2)
 */
function reverseTurn(state) {
  state.turnIndex = (state.turnIndex - 1 + state.players.length) % state.players.length;
}

/**
 * Action: Place settlement during setup
 */
export function handlePlaceSettlement(state, playerId, { cornerId }) {
  const player = state.players.find((p) => p.playerId === playerId);
  if (!player) return { ok: false, error: "PLAYER_NOT_FOUND" };

  const currentPlayer = getCurrentPlayer(state);
  if (currentPlayer.playerId !== playerId) {
    return { ok: false, error: "NOT_YOUR_TURN" };
  }

  if (
    state.phase !== PHASES.SETUP_SETTLEMENT_1 &&
    state.phase !== PHASES.SETUP_SETTLEMENT_2
  ) {
    return { ok: false, error: "WRONG_PHASE" };
  }

  const canPlace = canPlaceSettlement(state.board, cornerId, playerId, true);
  if (!canPlace.ok) return canPlace;

  // Place the settlement
  const corner = state.board.corners.find((c) => c.id === cornerId);
  corner.building = "settlement";
  corner.playerId = playerId;
  player.settlements -= 1;

  // Store for road placement reference
  state.pendingAction = { type: "SETUP_ROAD", cornerId };

  // During second setup, give initial resources
  if (state.phase === PHASES.SETUP_SETTLEMENT_2) {
    const resources = getInitialResources(state.board, cornerId);
    addResources(player, resources);
  }

  // Advance to road phase
  if (state.phase === PHASES.SETUP_SETTLEMENT_1) {
    state.phase = PHASES.SETUP_ROAD_1;
  } else {
    state.phase = PHASES.SETUP_ROAD_2;
  }

  return { ok: true, cornerId };
}

/**
 * Action: Place road during setup
 */
export function handlePlaceRoad(state, playerId, { edgeId }) {
  const player = state.players.find((p) => p.playerId === playerId);
  if (!player) return { ok: false, error: "PLAYER_NOT_FOUND" };

  const currentPlayer = getCurrentPlayer(state);
  if (currentPlayer.playerId !== playerId) {
    return { ok: false, error: "NOT_YOUR_TURN" };
  }

  if (state.phase !== PHASES.SETUP_ROAD_1 && state.phase !== PHASES.SETUP_ROAD_2) {
    return { ok: false, error: "WRONG_PHASE" };
  }

  const setupCornerId = state.pendingAction?.cornerId;
  const canPlace = canPlaceRoad(state.board, edgeId, playerId, true, setupCornerId);
  if (!canPlace.ok) return canPlace;

  // Place the road
  const edge = state.board.edges.find((e) => e.id === edgeId);
  edge.road = true;
  edge.playerId = playerId;
  player.roads -= 1;

  state.pendingAction = null;

  // Determine next phase/player
  if (state.phase === PHASES.SETUP_ROAD_1) {
    // First round: advance to next player or start reverse
    if (state.turnIndex === state.players.length - 1) {
      // Last player in first round, start second settlement
      state.phase = PHASES.SETUP_SETTLEMENT_2;
    } else {
      advanceTurn(state);
      state.phase = PHASES.SETUP_SETTLEMENT_1;
    }
  } else {
    // Second round: reverse order
    if (state.turnIndex === 0) {
      // First player done, setup complete - start main game
      state.phase = PHASES.ROLL;
      state.roundNumber = 1;
    } else {
      reverseTurn(state);
      state.phase = PHASES.SETUP_SETTLEMENT_2;
    }
  }

  return { ok: true, edgeId };
}

/**
 * Action: Roll dice
 */
export function handleRollDice(state, playerId) {
  const currentPlayer = getCurrentPlayer(state);
  if (currentPlayer.playerId !== playerId) {
    return { ok: false, error: "NOT_YOUR_TURN" };
  }

  if (state.phase !== PHASES.ROLL) {
    return { ok: false, error: "WRONG_PHASE" };
  }

  const roll = rollDice();
  state.lastRoll = roll;

  if (roll.total === 7) {
    // Check who needs to discard
    const playersToDiscard = state.players.filter((p) => mustDiscard(p));
    state.robberReturnPhase = PHASES.MAIN;

    if (playersToDiscard.length > 0) {
      state.pendingDiscards = playersToDiscard.map((p) => p.playerId);
      state.phase = PHASES.DISCARD;
    } else {
      state.phase = PHASES.ROBBER_MOVE;
    }

    return { ok: true, roll, robber: true };
  }

  // Distribute resources
  const distribution = distributeResources(state, roll.total);
  state.phase = PHASES.MAIN;

  return { ok: true, roll, distribution };
}

/**
 * Action: Discard resources (when 7 is rolled and player has >7 cards)
 */
export function handleDiscardResources(state, playerId, { resources }) {
  if (state.phase !== PHASES.DISCARD) {
    return { ok: false, error: "WRONG_PHASE" };
  }

  if (!state.pendingDiscards?.includes(playerId)) {
    return { ok: false, error: "NOT_REQUIRED_TO_DISCARD" };
  }

  const player = state.players.find((p) => p.playerId === playerId);
  if (!player) return { ok: false, error: "PLAYER_NOT_FOUND" };

  const validation = validateDiscard(player, resources);
  if (!validation.ok) return validation;

  executeDiscard(player, resources);

  // Remove from pending list
  state.pendingDiscards = state.pendingDiscards.filter((id) => id !== playerId);

  // If all done discarding, move to robber
  if (state.pendingDiscards.length === 0) {
    state.robberReturnPhase = PHASES.MAIN;
    state.phase = PHASES.ROBBER_MOVE;
  }

  return { ok: true, discarded: resources };
}

/**
 * Action: Move robber
 */
export function handleMoveRobber(state, playerId, { tileId }) {
  const currentPlayer = getCurrentPlayer(state);
  if (currentPlayer.playerId !== playerId) {
    return { ok: false, error: "NOT_YOUR_TURN" };
  }

  if (state.phase !== PHASES.ROBBER_MOVE) {
    return { ok: false, error: "WRONG_PHASE" };
  }

  const validTiles = getValidRobberTiles(state.board);
  if (!validTiles.includes(tileId)) {
    return { ok: false, error: "INVALID_ROBBER_TILE" };
  }

  moveRobber(state.board, tileId);

  // Check for players to steal from
  const playersOnTile = getPlayersOnTile(state.board, tileId).filter(
    (id) => id !== playerId
  );

  if (playersOnTile.length === 0) {
    // No one to steal from, go to main phase
    state.phase = state.robberReturnPhase || PHASES.MAIN;
    state.robberReturnPhase = PHASES.MAIN;
    return { ok: true, tileId, canStealFrom: [] };
  }

  // Filter to players who have resources
  const playersWithResources = playersOnTile.filter((id) => {
    const p = state.players.find((x) => x.playerId === id);
    return p && getTotalResources(p.resources) > 0;
  });

  if (playersWithResources.length === 0) {
    state.phase = state.robberReturnPhase || PHASES.MAIN;
    state.robberReturnPhase = PHASES.MAIN;
    return { ok: true, tileId, canStealFrom: [] };
  }

  state.pendingAction = { type: "STEAL", targets: playersWithResources };
  state.phase = PHASES.ROBBER_STEAL;

  return { ok: true, tileId, canStealFrom: playersWithResources };
}

/**
 * Action: Steal resource after robber move
 */
export function handleStealResource(state, playerId, { targetPlayerId }) {
  const currentPlayer = getCurrentPlayer(state);
  if (currentPlayer.playerId !== playerId) {
    return { ok: false, error: "NOT_YOUR_TURN" };
  }

  if (state.phase !== PHASES.ROBBER_STEAL) {
    return { ok: false, error: "WRONG_PHASE" };
  }

  if (!state.pendingAction?.targets?.includes(targetPlayerId)) {
    return { ok: false, error: "INVALID_STEAL_TARGET" };
  }

  const fromPlayer = state.players.find((p) => p.playerId === targetPlayerId);
  const toPlayer = state.players.find((p) => p.playerId === playerId);

  const result = stealRandomResource(fromPlayer, toPlayer);
  state.pendingAction = null;
  state.phase = state.robberReturnPhase || PHASES.MAIN;
  state.robberReturnPhase = PHASES.MAIN;

  return { ok: true, stolen: result.stolen, from: targetPlayerId };
}

/**
 * Action: Build road during main phase
 */
export function handleBuildRoad(state, playerId, { edgeId }) {
  const player = state.players.find((p) => p.playerId === playerId);
  if (!player) return { ok: false, error: "PLAYER_NOT_FOUND" };

  const currentPlayer = getCurrentPlayer(state);
  if (currentPlayer.playerId !== playerId) {
    return { ok: false, error: "NOT_YOUR_TURN" };
  }

  if (state.phase !== PHASES.MAIN) {
    return { ok: false, error: "WRONG_PHASE" };
  }

  if (player.roads <= 0) {
    return { ok: false, error: "NO_ROADS_LEFT" };
  }

  // Check if this is a free road from Road Building card
  const isFreeRoad = state.pendingAction?.type === "ROAD_BUILDING";

  if (!isFreeRoad && !canAfford(player, "road")) {
    return { ok: false, error: "NOT_ENOUGH_RESOURCES" };
  }

  const canPlace = canPlaceRoad(state.board, edgeId, playerId, false);
  if (!canPlace.ok) return canPlace;

  // Pay cost (if not free)
  if (!isFreeRoad) {
    deductResources(player, BUILDING_COSTS.road);
  }

  // Place the road
  const edge = state.board.edges.find((e) => e.id === edgeId);
  edge.road = true;
  edge.playerId = playerId;
  player.roads -= 1;

  // Update longest road
  const roadUpdate = updateLongestRoad(state);
  const victory = checkVictory(state);

  // Handle Road Building card progress
  if (isFreeRoad) {
    state.pendingAction.roadsPlaced += 1;
    if (state.pendingAction.roadsPlaced >= state.pendingAction.roadsToPlace) {
      state.pendingAction = null;
    }
  }

  return { ok: true, edgeId, roadUpdate, victory };
}

/**
 * Action: Build settlement during main phase
 */
export function handleBuildSettlement(state, playerId, { cornerId }) {
  const player = state.players.find((p) => p.playerId === playerId);
  if (!player) return { ok: false, error: "PLAYER_NOT_FOUND" };

  const currentPlayer = getCurrentPlayer(state);
  if (currentPlayer.playerId !== playerId) {
    return { ok: false, error: "NOT_YOUR_TURN" };
  }

  if (state.phase !== PHASES.MAIN) {
    return { ok: false, error: "WRONG_PHASE" };
  }

  if (player.settlements <= 0) {
    return { ok: false, error: "NO_SETTLEMENTS_LEFT" };
  }

  if (!canAfford(player, "settlement")) {
    return { ok: false, error: "NOT_ENOUGH_RESOURCES" };
  }

  const canPlace = canPlaceSettlement(state.board, cornerId, playerId, false);
  if (!canPlace.ok) return canPlace;

  // Pay cost
  deductResources(player, BUILDING_COSTS.settlement);

  // Place settlement
  const corner = state.board.corners.find((c) => c.id === cornerId);
  corner.building = "settlement";
  corner.playerId = playerId;
  player.settlements -= 1;

  // Check if this breaks another player's road
  const roadUpdate = updateLongestRoad(state);

  // Check victory
  const victory = checkVictory(state);

  return { ok: true, cornerId, roadUpdate, victory };
}

/**
 * Action: Upgrade settlement to city
 */
export function handleBuildCity(state, playerId, { cornerId }) {
  const player = state.players.find((p) => p.playerId === playerId);
  if (!player) return { ok: false, error: "PLAYER_NOT_FOUND" };

  const currentPlayer = getCurrentPlayer(state);
  if (currentPlayer.playerId !== playerId) {
    return { ok: false, error: "NOT_YOUR_TURN" };
  }

  if (state.phase !== PHASES.MAIN) {
    return { ok: false, error: "WRONG_PHASE" };
  }

  if (player.cities <= 0) {
    return { ok: false, error: "NO_CITIES_LEFT" };
  }

  if (!canAfford(player, "city")) {
    return { ok: false, error: "NOT_ENOUGH_RESOURCES" };
  }

  const canPlace = canPlaceCity(state.board, cornerId, playerId);
  if (!canPlace.ok) return canPlace;

  // Pay cost
  deductResources(player, BUILDING_COSTS.city);

  // Upgrade to city
  const corner = state.board.corners.find((c) => c.id === cornerId);
  corner.building = "city";
  player.cities -= 1;
  player.settlements += 1; // Return settlement piece

  // Check victory
  const victory = checkVictory(state);

  return { ok: true, cornerId, victory };
}

/**
 * Action: Buy development card
 */
export function handleBuyDevCard(state, playerId) {
  const currentPlayer = getCurrentPlayer(state);
  if (currentPlayer.playerId !== playerId) {
    return { ok: false, error: "NOT_YOUR_TURN" };
  }

  if (state.phase !== PHASES.MAIN) {
    return { ok: false, error: "WRONG_PHASE" };
  }

  const result = buyDevCard(state, playerId);
  if (!result.ok) return result;

  // Check victory (might have gotten a VP card)
  const victory = checkVictory(state);

  return { ok: true, card: result.card, victory };
}

/**
 * Action: Play development card
 */
export function handlePlayDevCard(state, playerId, { cardType }) {
  const currentPlayer = getCurrentPlayer(state);
  if (currentPlayer.playerId !== playerId) {
    return { ok: false, error: "NOT_YOUR_TURN" };
  }

  // Can play dev cards before rolling (except during setup)
  if (
    state.phase !== PHASES.MAIN &&
    state.phase !== PHASES.ROLL
  ) {
    return { ok: false, error: "WRONG_PHASE" };
  }

  switch (cardType) {
    case "knight": {
      const result = playKnight(state, playerId);
      if (!result.ok) return result;
      state.robberReturnPhase = state.phase === PHASES.ROLL ? PHASES.ROLL : PHASES.MAIN;
      state.phase = PHASES.ROBBER_MOVE;
      const victory = checkVictory(state);
      return { ok: true, cardType, requiresRobberMove: true, victory };
    }

    case "roadBuilding": {
      const result = playRoadBuilding(state, playerId);
      if (!result.ok) return result;
      state.pendingAction = {
        type: "ROAD_BUILDING",
        roadsToPlace: result.roadsToPlace,
        roadsPlaced: 0,
      };
      return { ok: true, cardType, roadsToPlace: result.roadsToPlace };
    }

    case "yearOfPlenty": {
      const result = playYearOfPlenty(state, playerId);
      if (!result.ok) return result;
      state.pendingAction = { type: "YEAR_OF_PLENTY" };
      return { ok: true, cardType, requiresResourceSelection: true };
    }

    case "monopoly": {
      const result = playMonopoly(state, playerId);
      if (!result.ok) return result;
      state.pendingAction = { type: "MONOPOLY" };
      return { ok: true, cardType, requiresMonopolySelection: true };
    }

    default:
      return { ok: false, error: "UNKNOWN_CARD_TYPE" };
  }
}

/**
 * Action: Select resources for Year of Plenty
 */
export function handleSelectResources(state, playerId, { resource1, resource2 }) {
  const currentPlayer = getCurrentPlayer(state);
  if (currentPlayer.playerId !== playerId) {
    return { ok: false, error: "NOT_YOUR_TURN" };
  }

  if (state.pendingAction?.type !== "YEAR_OF_PLENTY") {
    return { ok: false, error: "NO_PENDING_YEAR_OF_PLENTY" };
  }

  if (!Object.values(RESOURCES).includes(resource1) || !Object.values(RESOURCES).includes(resource2)) {
    return { ok: false, error: "INVALID_RESOURCE" };
  }

  applyYearOfPlenty(state, playerId, resource1, resource2);
  state.pendingAction = null;

  return { ok: true, resources: [resource1, resource2] };
}

/**
 * Action: Select resource type for Monopoly
 */
export function handleSelectResourceType(state, playerId, { resourceType }) {
  const currentPlayer = getCurrentPlayer(state);
  if (currentPlayer.playerId !== playerId) {
    return { ok: false, error: "NOT_YOUR_TURN" };
  }

  if (state.pendingAction?.type !== "MONOPOLY") {
    return { ok: false, error: "NO_PENDING_MONOPOLY" };
  }

  if (!Object.values(RESOURCES).includes(resourceType)) {
    return { ok: false, error: "INVALID_RESOURCE" };
  }

  const result = applyMonopoly(state, playerId, resourceType);
  state.pendingAction = null;

  return { ok: true, resourceType, stolen: result.stolen };
}

/**
 * Action: Propose trade to another player
 */
export function handleProposeTrade(state, playerId, { toPlayerId, offer, request }) {
  const currentPlayer = getCurrentPlayer(state);
  if (currentPlayer.playerId !== playerId) {
    return { ok: false, error: "NOT_YOUR_TURN" };
  }

  if (state.phase !== PHASES.MAIN) {
    return { ok: false, error: "WRONG_PHASE" };
  }

  const validation = validateTradeOffer(state, playerId, toPlayerId, offer, request);
  if (!validation.ok) return validation;

  state.tradeOffer = {
    id: `trade-${Date.now()}`,
    from: playerId,
    to: toPlayerId,
    offer,
    request,
    status: "pending",
  };

  return { ok: true, tradeOffer: state.tradeOffer };
}

/**
 * Action: Accept a trade offer
 */
export function handleAcceptTrade(state, playerId, { tradeId }) {
  if (!state.tradeOffer || state.tradeOffer.id !== tradeId) {
    return { ok: false, error: "NO_SUCH_TRADE" };
  }

  if (state.tradeOffer.to !== playerId) {
    return { ok: false, error: "NOT_TRADE_TARGET" };
  }

  const result = executePlayerTrade(
    state,
    state.tradeOffer.from,
    state.tradeOffer.to,
    state.tradeOffer.offer,
    state.tradeOffer.request
  );

  if (!result.ok) {
    state.tradeOffer = null;
    return result;
  }

  const completedTrade = { ...state.tradeOffer, status: "accepted" };
  state.tradeOffer = null;

  return { ok: true, trade: completedTrade };
}

/**
 * Action: Reject a trade offer
 */
export function handleRejectTrade(state, playerId, { tradeId }) {
  if (!state.tradeOffer || state.tradeOffer.id !== tradeId) {
    return { ok: false, error: "NO_SUCH_TRADE" };
  }

  if (state.tradeOffer.to !== playerId) {
    return { ok: false, error: "NOT_TRADE_TARGET" };
  }

  const rejectedTrade = { ...state.tradeOffer, status: "rejected" };
  state.tradeOffer = null;

  return { ok: true, trade: rejectedTrade };
}

/**
 * Action: Cancel own trade offer
 */
export function handleCancelTrade(state, playerId, { tradeId }) {
  if (!state.tradeOffer || state.tradeOffer.id !== tradeId) {
    return { ok: false, error: "NO_SUCH_TRADE" };
  }

  if (state.tradeOffer.from !== playerId) {
    return { ok: false, error: "NOT_TRADE_OWNER" };
  }

  const cancelledTrade = { ...state.tradeOffer, status: "cancelled" };
  state.tradeOffer = null;

  return { ok: true, trade: cancelledTrade };
}

/**
 * Action: Trade with the bank
 */
export function handleBankTrade(state, playerId, { giveResource, receiveResource }) {
  const currentPlayer = getCurrentPlayer(state);
  if (currentPlayer.playerId !== playerId) {
    return { ok: false, error: "NOT_YOUR_TURN" };
  }

  if (state.phase !== PHASES.MAIN) {
    return { ok: false, error: "WRONG_PHASE" };
  }

  const result = executeBankTrade(state, playerId, giveResource, receiveResource);
  return result;
}

/**
 * Action: End turn
 */
export function handleEndTurn(state, playerId) {
  const currentPlayer = getCurrentPlayer(state);
  if (currentPlayer.playerId !== playerId) {
    return { ok: false, error: "NOT_YOUR_TURN" };
  }

  if (state.phase !== PHASES.MAIN) {
    return { ok: false, error: "WRONG_PHASE" };
  }

  // Check for pending actions
  if (state.pendingAction) {
    // Road Building: allow ending turn if no valid placements
    if (state.pendingAction.type === "ROAD_BUILDING") {
      state.pendingAction = null;
    } else {
      return { ok: false, error: "PENDING_ACTION_REQUIRED" };
    }
  }

  // Clear trade offer
  state.tradeOffer = null;

  // Clear dev card flags
  state.devCardPlayedThisTurn = false;
  clearBoughtThisTurn(currentPlayer);
  state.robberReturnPhase = PHASES.MAIN;

  // Advance turn
  advanceTurn(state);
  state.roundNumber += 1;
  state.phase = PHASES.ROLL;
  state.lastRoll = null;

  return { ok: true, nextPlayer: getCurrentPlayer(state).playerId };
}

/**
 * Main action dispatcher
 */
export function executeAction(state, playerId, action) {
  const { type, ...payload } = action;

  switch (type) {
    case ACTIONS.PLACE_SETTLEMENT:
      return handlePlaceSettlement(state, playerId, payload);

    case ACTIONS.PLACE_ROAD:
      return handlePlaceRoad(state, playerId, payload);

    case ACTIONS.ROLL_DICE:
      return handleRollDice(state, playerId);

    case ACTIONS.DISCARD_RESOURCES:
      return handleDiscardResources(state, playerId, payload);

    case ACTIONS.MOVE_ROBBER:
      return handleMoveRobber(state, playerId, payload);

    case ACTIONS.STEAL_RESOURCE:
      return handleStealResource(state, playerId, payload);

    case ACTIONS.BUILD_ROAD:
      return handleBuildRoad(state, playerId, payload);

    case ACTIONS.BUILD_SETTLEMENT:
      return handleBuildSettlement(state, playerId, payload);

    case ACTIONS.BUILD_CITY:
      return handleBuildCity(state, playerId, payload);

    case ACTIONS.BUY_DEV_CARD:
      return handleBuyDevCard(state, playerId);

    case ACTIONS.PLAY_DEV_CARD:
      return handlePlayDevCard(state, playerId, payload);

    case ACTIONS.SELECT_RESOURCES:
      return handleSelectResources(state, playerId, payload);

    case ACTIONS.SELECT_RESOURCE_TYPE:
      return handleSelectResourceType(state, playerId, payload);

    case ACTIONS.PROPOSE_TRADE:
      return handleProposeTrade(state, playerId, payload);

    case ACTIONS.ACCEPT_TRADE:
      return handleAcceptTrade(state, playerId, payload);

    case ACTIONS.REJECT_TRADE:
      return handleRejectTrade(state, playerId, payload);

    case ACTIONS.CANCEL_TRADE:
      return handleCancelTrade(state, playerId, payload);

    case ACTIONS.BANK_TRADE:
      return handleBankTrade(state, playerId, payload);

    case ACTIONS.END_TURN:
      return handleEndTurn(state, playerId);

    default:
      return { ok: false, error: "UNKNOWN_ACTION" };
  }
}
