// Catan game service - main entry point

import {
  PHASES,
  PLAYER_COLORS,
  STARTING_PIECES,
  RESOURCES,
  DEFAULT_TARGET_VP,
  ACTIONS,
} from "./catanConstants.js";
import {
  generateStandardBoard,
  canPlaceSettlement,
  canPlaceRoad,
  canPlaceCity,
  getValidRobberTiles,
  getPlayersOnTile,
  getBestTradeRatio,
} from "./catanBoard.js";
import { createResourceBundle, canAfford, getTotalResources, canBankTrade } from "./catanResources.js";
import { createDevCardDeck, getPlayableCards, canBuyDevCard } from "./catanDevCards.js";
import { calculateVictoryPoints, getPublicScore } from "./catanScoring.js";
import { executeAction } from "./catanActions.js";

/**
 * Create initial game state
 * @param {Array} players - Array of { odRoomId, odPlayerId, odDisplayName }
 * @param {string} mode - "3P" or "4P"
 */
export function createCatanInitialState(players, mode = "4P") {
  const requiredPlayers = mode === "3P" ? 3 : 4;
  const numPlayers = Math.min(players.length, requiredPlayers);

  // Take only required number of players
  const gamePlayers = players.slice(0, numPlayers);

  // Assign colors and create player state
  const playerStates = gamePlayers.map((p, i) => ({
    odRoomId: p.odRoomId,
    odPlayerId: p.odPlayerId,
    playerId: p.odPlayerId,
    displayName: p.odDisplayName,
    color: PLAYER_COLORS[i],
    resources: createResourceBundle(),
    devCards: [],
    devCardsPlayed: [],
    settlements: STARTING_PIECES.settlements,
    cities: STARTING_PIECES.cities,
    roads: STARTING_PIECES.roads,
    knightsPlayed: 0,
    longestRoad: 0,
  }));

  // Shuffle player order
  for (let i = playerStates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [playerStates[i], playerStates[j]] = [playerStates[j], playerStates[i]];
  }

  // Generate board
  const board = generateStandardBoard();

  return {
    phase: PHASES.LOBBY,
    board,
    players: playerStates,
    turnIndex: 0,
    roundNumber: 0,
    lastRoll: null,
    largestArmy: null,
    longestRoadHolder: null,
    devCardDeck: createDevCardDeck(),
    devCardPlayedThisTurn: false,
    pendingAction: null,
    pendingDiscards: null,
    tradeOffer: null,
    robberReturnPhase: PHASES.MAIN,
    targetVP: DEFAULT_TARGET_VP,
  };
}

/**
 * Get available actions for a player in current state
 */
export function getAvailableActions(state, playerId) {
  const actions = [];
  const player = state.players.find((p) => p.playerId === playerId);
  if (!player) return actions;

  const isCurrentPlayer = state.players[state.turnIndex].playerId === playerId;

  switch (state.phase) {
    case PHASES.LOBBY:
      // Wait for host to start
      break;
    case PHASES.SETUP_SETTLEMENT_1:
    case PHASES.SETUP_SETTLEMENT_2:
      if (isCurrentPlayer) {
        // Find valid settlement spots
        const validCorners = state.board.corners
          .filter((c) => canPlaceSettlement(state.board, c.id, playerId, true).ok)
          .map((c) => c.id);
        if (validCorners.length > 0) {
          actions.push({ type: ACTIONS.PLACE_SETTLEMENT, validCorners });
        }
      }
      break;

    case PHASES.SETUP_ROAD_1:
    case PHASES.SETUP_ROAD_2:
      if (isCurrentPlayer && state.pendingAction?.cornerId) {
        // Find valid road spots connected to settlement
        const validEdges = state.board.edges
          .filter((e) =>
            canPlaceRoad(state.board, e.id, playerId, true, state.pendingAction.cornerId).ok
          )
          .map((e) => e.id);
        if (validEdges.length > 0) {
          actions.push({ type: ACTIONS.PLACE_ROAD, validEdges });
        }
      }
      break;

    case PHASES.ROLL:
      if (isCurrentPlayer) {
        actions.push({ type: ACTIONS.ROLL_DICE });

        // Can play dev cards before rolling
        const playableCards = getPlayableCards(state, playerId);
        if (playableCards.length > 0) {
          actions.push({ type: ACTIONS.PLAY_DEV_CARD, cards: playableCards });
        }
      }
      break;

    case PHASES.DISCARD:
      if (state.pendingDiscards?.includes(playerId)) {
        const discardCount = Math.floor(getTotalResources(player.resources) / 2);
        actions.push({ type: ACTIONS.DISCARD_RESOURCES, count: discardCount });
      }
      break;

    case PHASES.ROBBER_MOVE:
      if (isCurrentPlayer) {
        const validTiles = getValidRobberTiles(state.board);
        actions.push({ type: ACTIONS.MOVE_ROBBER, validTiles });
      }
      break;

    case PHASES.ROBBER_STEAL:
      if (isCurrentPlayer && state.pendingAction?.targets) {
        actions.push({
          type: ACTIONS.STEAL_RESOURCE,
          targets: state.pendingAction.targets,
        });
      }
      break;

    case PHASES.MAIN:
      if (isCurrentPlayer) {
        // Check for pending actions first
        if (state.pendingAction?.type === "ROAD_BUILDING") {
          const validEdges = state.board.edges
            .filter((e) => canPlaceRoad(state.board, e.id, playerId, false).ok)
            .map((e) => e.id);
          if (validEdges.length > 0) {
            actions.push({
              type: ACTIONS.BUILD_ROAD,
              validEdges,
              free: true,
              remaining: state.pendingAction.roadsToPlace - state.pendingAction.roadsPlaced,
            });
          }
          // Can end turn to skip remaining roads
          actions.push({ type: ACTIONS.END_TURN });
          break;
        }

        if (state.pendingAction?.type === "YEAR_OF_PLENTY") {
          actions.push({
            type: ACTIONS.SELECT_RESOURCES,
            count: 2,
            resources: Object.values(RESOURCES),
          });
          break;
        }

        if (state.pendingAction?.type === "MONOPOLY") {
          actions.push({
            type: ACTIONS.SELECT_RESOURCE_TYPE,
            resources: Object.values(RESOURCES),
          });
          break;
        }

        // Building actions
        if (player.roads > 0 && canAfford(player, "road")) {
          const validEdges = state.board.edges
            .filter((e) => canPlaceRoad(state.board, e.id, playerId, false).ok)
            .map((e) => e.id);
          if (validEdges.length > 0) {
            actions.push({ type: ACTIONS.BUILD_ROAD, validEdges });
          }
        }

        if (player.settlements > 0 && canAfford(player, "settlement")) {
          const validCorners = state.board.corners
            .filter((c) => canPlaceSettlement(state.board, c.id, playerId, false).ok)
            .map((c) => c.id);
          if (validCorners.length > 0) {
            actions.push({ type: ACTIONS.BUILD_SETTLEMENT, validCorners });
          }
        }

        if (player.cities > 0 && canAfford(player, "city")) {
          const validCorners = state.board.corners
            .filter((c) => canPlaceCity(state.board, c.id, playerId).ok)
            .map((c) => c.id);
          if (validCorners.length > 0) {
            actions.push({ type: ACTIONS.BUILD_CITY, validCorners });
          }
        }

        // Buy dev card
        if (canBuyDevCard(state, playerId).ok) {
          actions.push({ type: ACTIONS.BUY_DEV_CARD });
        }

        // Play dev cards
        const playableCards = getPlayableCards(state, playerId);
        if (playableCards.length > 0) {
          actions.push({ type: ACTIONS.PLAY_DEV_CARD, cards: playableCards });
        }

        // Bank trading
        const bankTrades = [];
        for (const giveResource of Object.values(RESOURCES)) {
          const ratio = getBestTradeRatio(state.board, playerId, giveResource);
          if (player.resources[giveResource] >= ratio) {
            for (const receiveResource of Object.values(RESOURCES)) {
              if (giveResource !== receiveResource) {
                bankTrades.push({ give: giveResource, receive: receiveResource, ratio });
              }
            }
          }
        }
        if (bankTrades.length > 0) {
          actions.push({ type: ACTIONS.BANK_TRADE, trades: bankTrades });
        }

        // Player trading
        const otherPlayers = state.players
          .filter((p) => p.playerId !== playerId)
          .map((p) => ({ playerId: p.playerId, displayName: p.displayName }));
        if (otherPlayers.length > 0) {
          actions.push({ type: ACTIONS.PROPOSE_TRADE, targets: otherPlayers });
        }

        // End turn
        if (!state.pendingAction) {
          actions.push({ type: ACTIONS.END_TURN });
        }
      } else {
        // Non-current player can respond to trades
        if (state.tradeOffer?.to === playerId) {
          actions.push({
            type: ACTIONS.ACCEPT_TRADE,
            tradeId: state.tradeOffer.id,
          });
          actions.push({
            type: ACTIONS.REJECT_TRADE,
            tradeId: state.tradeOffer.id,
          });
        }
      }
      break;

    case PHASES.FINISHED:
      // No actions in finished state
      break;
  }

  return actions;
}

/**
 * Start the game from lobby state
 */
export function startCatanGame(state) {
  if (state.phase !== PHASES.LOBBY) {
    return { ok: false, error: "ALREADY_STARTED" };
  }

  if (state.players.length < 3) {
    return { ok: false, error: "NOT_ENOUGH_PLAYERS" };
  }

  state.phase = PHASES.SETUP_SETTLEMENT_1;
  state.turnIndex = 0;
  state.roundNumber = 0;
  state.lastRoll = null;
  state.pendingAction = null;
  state.pendingDiscards = null;
  state.tradeOffer = null;
  state.robberReturnPhase = PHASES.MAIN;
  state.winner = null;

  return { ok: true };
}

/**
 * Sanitize state for a specific player (hide opponent info)
 */
export function sanitizeState(state, playerId) {
  const sanitized = {
    phase: state.phase,
    board: state.board,
    turnIndex: state.turnIndex,
    roundNumber: state.roundNumber,
    lastRoll: state.lastRoll,
    largestArmy: state.largestArmy,
    longestRoadHolder: state.longestRoadHolder,
    devCardsRemaining: state.devCardDeck.length,
    pendingAction: state.pendingAction,
    pendingDiscards: state.pendingDiscards,
    tradeOffer: state.tradeOffer,
    targetVP: state.targetVP,
    currentPlayer: state.players[state.turnIndex]?.playerId,
    players: [],
  };

  // Sanitize player info
  for (const player of state.players) {
    const isMe = player.playerId === playerId;

    const playerInfo = {
      playerId: player.playerId,
      displayName: player.displayName,
      color: player.color,
      settlements: player.settlements,
      cities: player.cities,
      roads: player.roads,
      knightsPlayed: player.knightsPlayed,
      longestRoad: player.longestRoad,
      devCardsPlayedCount: player.devCardsPlayed.length,
    };

    if (isMe) {
      // Show own resources and dev cards
      playerInfo.resources = player.resources;
      playerInfo.devCards = player.devCards;
      playerInfo.publicScore = getPublicScore(state, playerId);
      playerInfo.totalVP = calculateVictoryPoints(state, playerId);
    } else {
      // Hide opponent resources and dev cards
      playerInfo.resourceCount = getTotalResources(player.resources);
      playerInfo.devCardCount = player.devCards.length;
      playerInfo.publicScore = getPublicScore(state, player.playerId);
      // Don't show total VP (includes hidden VP cards)
    }

    sanitized.players.push(playerInfo);
  }

  // Add available actions for this player
  sanitized.availableActions = getAvailableActions(state, playerId);

  return sanitized;
}

/**
 * Process a game action
 */
export function processAction(state, playerId, action) {
  const result = executeAction(state, playerId, action);

  if (result.ok && result.victory?.won) {
    state.phase = PHASES.FINISHED;
    state.winner = result.victory.winner;
  }

  return result;
}

/**
 * Check if game is finished
 */
export function isGameFinished(state) {
  return state.phase === PHASES.FINISHED;
}

/**
 * Get game results
 */
export function getGameResults(state) {
  if (!isGameFinished(state)) return null;

  const results = state.players.map((player) => ({
    playerId: player.playerId,
    displayName: player.displayName,
    color: player.color,
    victoryPoints: calculateVictoryPoints(state, player.playerId),
    isWinner: player.playerId === state.winner,
  }));

  results.sort((a, b) => b.victoryPoints - a.victoryPoints);

  return {
    winner: state.winner,
    winnerName: state.players.find((p) => p.playerId === state.winner)?.displayName,
    standings: results,
  };
}

// Export all for convenience
export { PHASES, ACTIONS, RESOURCES, PLAYER_COLORS } from "./catanConstants.js";
