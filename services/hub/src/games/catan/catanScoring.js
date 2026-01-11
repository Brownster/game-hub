// Catan scoring - VP calculation, longest road, largest army

import { VP_VALUES, MIN_LONGEST_ROAD, DEV_CARDS } from "./catanConstants.js";
import { edgeKey, cornerKey, getCornerEdges, getEdgeCorners } from "../board/hexUtils.js";

/**
 * Calculate total victory points for a player
 */
export function calculateVictoryPoints(state, playerId) {
  const player = state.players.find((p) => p.playerId === playerId);
  if (!player) return 0;

  let vp = 0;

  // Points from settlements
  const settlements = state.board.corners.filter(
    (c) => c.playerId === playerId && c.building === "settlement"
  );
  vp += settlements.length * VP_VALUES.settlement;

  // Points from cities
  const cities = state.board.corners.filter(
    (c) => c.playerId === playerId && c.building === "city"
  );
  vp += cities.length * VP_VALUES.city;

  // Longest road bonus
  if (state.longestRoadHolder === playerId) {
    vp += VP_VALUES.longestRoad;
  }

  // Largest army bonus
  if (state.largestArmy === playerId) {
    vp += VP_VALUES.largestArmy;
  }

  // Victory point development cards
  const vpCards = player.devCards.filter((c) => c.type === DEV_CARDS.VICTORY_POINT);
  vp += vpCards.length * VP_VALUES.devCardVP;

  return vp;
}

/**
 * Calculate longest road length for a player using DFS
 */
export function calculateLongestRoad(state, playerId) {
  const playerEdges = state.board.edges.filter(
    (e) => e.playerId === playerId && e.road
  );

  if (playerEdges.length === 0) return 0;

  let maxLength = 0;

  // Build adjacency map for faster lookup
  const edgeMap = new Map();
  for (const edge of state.board.edges) {
    edgeMap.set(edge.id, edge);
  }

  const cornerMap = new Map();
  for (const corner of state.board.corners) {
    cornerMap.set(corner.id, corner);
  }

  // Try starting from each of the player's roads
  for (const startEdge of playerEdges) {
    // Try both directions from each road
    for (const startCornerId of startEdge.corners) {
      const visited = new Set();
      const length = dfsRoad(
        startEdge.id,
        startCornerId,
        playerId,
        visited,
        edgeMap,
        cornerMap
      );
      maxLength = Math.max(maxLength, length);
    }
  }

  return maxLength;
}

/**
 * DFS to find longest continuous road
 */
function dfsRoad(edgeId, fromCornerId, playerId, visited, edgeMap, cornerMap) {
  if (visited.has(edgeId)) return 0;

  const edge = edgeMap.get(edgeId);
  if (!edge || !edge.road || edge.playerId !== playerId) return 0;

  visited.add(edgeId);

  // Find the other corner of this edge
  const toCornerId = edge.corners.find((c) => c !== fromCornerId);
  const toCorner = cornerMap.get(toCornerId);

  // Check if path is blocked by opponent's building
  if (toCorner?.building && toCorner.playerId !== playerId) {
    return 1; // This road counts, but can't continue
  }

  // Find connecting roads at the destination corner
  let maxContinuation = 0;

  // Get edges connected to the destination corner
  const cornerData = parseCornerKey(toCornerId);
  if (cornerData) {
    const connectedEdgeData = getCornerEdges(cornerData.q, cornerData.r, cornerData.dir);
    for (const edgeData of connectedEdgeData) {
      const nextEdgeId = edgeKey(edgeData.q, edgeData.r, edgeData.dir);
      if (nextEdgeId !== edgeId && !visited.has(nextEdgeId)) {
        const continuation = dfsRoad(
          nextEdgeId,
          toCornerId,
          playerId,
          new Set(visited),
          edgeMap,
          cornerMap
        );
        maxContinuation = Math.max(maxContinuation, continuation);
      }
    }
  }

  return 1 + maxContinuation;
}

/**
 * Parse corner key back to coordinates
 */
function parseCornerKey(key) {
  // Format: "C:q,r,dir"
  const match = key.match(/^C:(-?\d+),(-?\d+),(\d+)$/);
  if (!match) return null;
  return {
    q: parseInt(match[1]),
    r: parseInt(match[2]),
    dir: parseInt(match[3]),
  };
}

/**
 * Update longest road holder after road placement
 */
export function updateLongestRoad(state) {
  let maxLength = MIN_LONGEST_ROAD - 1;
  let newHolder = null;

  // Calculate road length for all players
  const lengths = {};
  for (const player of state.players) {
    const length = calculateLongestRoad(state, player.playerId);
    lengths[player.playerId] = length;
    player.longestRoad = length;

    if (length > maxLength) {
      maxLength = length;
      newHolder = player.playerId;
    } else if (length === maxLength && length >= MIN_LONGEST_ROAD) {
      // Tie - current holder keeps it if they're tied
      if (state.longestRoadHolder && lengths[state.longestRoadHolder] === length) {
        newHolder = state.longestRoadHolder;
      } else if (!newHolder) {
        // No one had it before, first to reach keeps it
        newHolder = player.playerId;
      }
    }
  }

  // Only award if someone meets minimum
  if (maxLength >= MIN_LONGEST_ROAD) {
    // If current holder loses their roads (e.g., broken by opponent building),
    // check if anyone else qualifies
    if (state.longestRoadHolder && lengths[state.longestRoadHolder] < MIN_LONGEST_ROAD) {
      // Current holder no longer qualifies
      state.longestRoadHolder = newHolder;
      return { changed: true, holder: newHolder, length: maxLength };
    }

    if (newHolder !== state.longestRoadHolder) {
      // New holder must strictly beat the current one
      if (!state.longestRoadHolder || maxLength > lengths[state.longestRoadHolder]) {
        state.longestRoadHolder = newHolder;
        return { changed: true, holder: newHolder, length: maxLength };
      }
    }
  } else {
    // No one qualifies
    if (state.longestRoadHolder) {
      state.longestRoadHolder = null;
      return { changed: true, holder: null, length: 0 };
    }
  }

  return { changed: false };
}

/**
 * Check if a player has won
 */
export function checkVictory(state, targetVP = 10) {
  for (const player of state.players) {
    const vp = calculateVictoryPoints(state, player.playerId);
    if (vp >= targetVP) {
      return { won: true, winner: player.playerId, vp };
    }
  }
  return { won: false };
}

/**
 * Get detailed VP breakdown for a player
 */
export function getVPBreakdown(state, playerId) {
  const player = state.players.find((p) => p.playerId === playerId);
  if (!player) return null;

  const settlements = state.board.corners.filter(
    (c) => c.playerId === playerId && c.building === "settlement"
  ).length;

  const cities = state.board.corners.filter(
    (c) => c.playerId === playerId && c.building === "city"
  ).length;

  const vpCards = player.devCards.filter(
    (c) => c.type === DEV_CARDS.VICTORY_POINT
  ).length;

  const hasLongestRoad = state.longestRoadHolder === playerId;
  const hasLargestArmy = state.largestArmy === playerId;

  return {
    settlements: {
      count: settlements,
      points: settlements * VP_VALUES.settlement,
    },
    cities: {
      count: cities,
      points: cities * VP_VALUES.city,
    },
    longestRoad: {
      has: hasLongestRoad,
      length: player.longestRoad,
      points: hasLongestRoad ? VP_VALUES.longestRoad : 0,
    },
    largestArmy: {
      has: hasLargestArmy,
      knights: player.knightsPlayed,
      points: hasLargestArmy ? VP_VALUES.largestArmy : 0,
    },
    vpCards: {
      count: vpCards,
      points: vpCards * VP_VALUES.devCardVP,
    },
    total: calculateVictoryPoints(state, playerId),
  };
}

/**
 * Get public score info (without revealing VP cards)
 */
export function getPublicScore(state, playerId) {
  const breakdown = getVPBreakdown(state, playerId);
  if (!breakdown) return null;

  // Public VP doesn't include VP cards
  return {
    settlements: breakdown.settlements,
    cities: breakdown.cities,
    longestRoad: breakdown.longestRoad,
    largestArmy: breakdown.largestArmy,
    publicTotal:
      breakdown.settlements.points +
      breakdown.cities.points +
      breakdown.longestRoad.points +
      breakdown.largestArmy.points,
  };
}
