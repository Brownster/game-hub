// Generic board game state utilities
// Can be used by Catan and other tile-based board games

/**
 * Create a board state from configuration
 * @param {Object} config - Board configuration
 * @param {Array} config.tiles - Array of tile definitions
 * @param {Array} config.corners - Array of corner definitions
 * @param {Array} config.edges - Array of edge definitions
 * @returns {Object} Initialized board state
 */
export function createBoardState(config) {
  return {
    tiles: new Map(config.tiles.map((t) => [t.id, { ...t }])),
    corners: new Map(config.corners.map((c) => [c.id, { ...c, building: null, playerId: null }])),
    edges: new Map(config.edges.map((e) => [e.id, { ...e, road: false, playerId: null }])),
  };
}

/**
 * Get a tile by ID
 */
export function getTile(board, tileId) {
  return board.tiles.get(tileId);
}

/**
 * Get a corner by ID
 */
export function getCorner(board, cornerId) {
  return board.corners.get(cornerId);
}

/**
 * Get an edge by ID
 */
export function getEdge(board, edgeId) {
  return board.edges.get(edgeId);
}

/**
 * Get all tiles as array
 */
export function getAllTiles(board) {
  return Array.from(board.tiles.values());
}

/**
 * Get all corners as array
 */
export function getAllCorners(board) {
  return Array.from(board.corners.values());
}

/**
 * Get all edges as array
 */
export function getAllEdges(board) {
  return Array.from(board.edges.values());
}

/**
 * Find corners adjacent to a tile
 * @param {Object} board - Board state
 * @param {string} tileId - Tile ID
 * @param {Function} cornerIdFn - Function to generate corner IDs from tile
 * @returns {Array} Adjacent corners
 */
export function getTileCorners(board, tileId, cornerIdFn) {
  const tile = board.tiles.get(tileId);
  if (!tile) return [];

  const cornerIds = cornerIdFn(tile);
  return cornerIds.map((id) => board.corners.get(id)).filter(Boolean);
}

/**
 * Find tiles adjacent to a corner
 * @param {Object} board - Board state
 * @param {string} cornerId - Corner ID
 * @param {Function} tileIdFn - Function to get tile IDs from corner
 * @returns {Array} Adjacent tiles
 */
export function getCornerTiles(board, cornerId, tileIdFn) {
  const corner = board.corners.get(cornerId);
  if (!corner) return [];

  const tileIds = tileIdFn(corner);
  return tileIds.map((id) => board.tiles.get(id)).filter(Boolean);
}

/**
 * Find edges adjacent to a corner
 * @param {Object} board - Board state
 * @param {string} cornerId - Corner ID
 * @param {Function} edgeIdFn - Function to get edge IDs from corner
 * @returns {Array} Adjacent edges
 */
export function getCornerAdjacentEdges(board, cornerId, edgeIdFn) {
  const corner = board.corners.get(cornerId);
  if (!corner) return [];

  const edgeIds = edgeIdFn(corner);
  return edgeIds.map((id) => board.edges.get(id)).filter(Boolean);
}

/**
 * Find corners adjacent to a corner (connected by edges)
 */
export function getAdjacentCorners(board, cornerId, adjacencyFn) {
  const corner = board.corners.get(cornerId);
  if (!corner) return [];

  const adjacentIds = adjacencyFn(corner);
  return adjacentIds.map((id) => board.corners.get(id)).filter(Boolean);
}

/**
 * Place a building on a corner
 */
export function placeBuilding(board, cornerId, building, playerId) {
  const corner = board.corners.get(cornerId);
  if (!corner) return false;

  corner.building = building;
  corner.playerId = playerId;
  return true;
}

/**
 * Place a road on an edge
 */
export function placeRoad(board, edgeId, playerId) {
  const edge = board.edges.get(edgeId);
  if (!edge) return false;

  edge.road = true;
  edge.playerId = playerId;
  return true;
}

/**
 * Check if a corner is occupied
 */
export function isCornerOccupied(board, cornerId) {
  const corner = board.corners.get(cornerId);
  return corner?.building !== null;
}

/**
 * Check if an edge has a road
 */
export function isEdgeOccupied(board, edgeId) {
  const edge = board.edges.get(edgeId);
  return edge?.road === true;
}

/**
 * Get all buildings for a player
 */
export function getPlayerBuildings(board, playerId) {
  return Array.from(board.corners.values()).filter(
    (corner) => corner.playerId === playerId && corner.building
  );
}

/**
 * Get all roads for a player
 */
export function getPlayerRoads(board, playerId) {
  return Array.from(board.edges.values()).filter(
    (edge) => edge.playerId === playerId && edge.road
  );
}

/**
 * Find longest connected path of roads for a player using DFS
 * @param {Object} board - Board state
 * @param {string} playerId - Player ID
 * @param {Function} getEdgeCornersFn - Function to get corner IDs from edge
 * @param {Function} getCornerEdgesFn - Function to get edge IDs from corner
 * @returns {number} Length of longest road
 */
export function findLongestPath(board, playerId, getEdgeCornersFn, getCornerEdgesFn) {
  const playerEdges = getPlayerRoads(board, playerId);
  if (playerEdges.length === 0) return 0;

  let maxLength = 0;

  // Try starting from each edge
  for (const startEdge of playerEdges) {
    const visited = new Set();
    const length = dfsPath(board, startEdge.id, playerId, visited, getEdgeCornersFn, getCornerEdgesFn);
    maxLength = Math.max(maxLength, length);
  }

  return maxLength;
}

function dfsPath(board, edgeId, playerId, visited, getEdgeCornersFn, getCornerEdgesFn) {
  if (visited.has(edgeId)) return 0;

  const edge = board.edges.get(edgeId);
  if (!edge || edge.playerId !== playerId) return 0;

  visited.add(edgeId);

  let maxContinuation = 0;
  const cornerIds = getEdgeCornersFn(edge);

  for (const cornerId of cornerIds) {
    const corner = board.corners.get(cornerId);
    if (!corner) continue;

    // Check if path is blocked by opponent's building
    if (corner.building && corner.playerId !== playerId) continue;

    const adjacentEdgeIds = getCornerEdgesFn(corner);
    for (const nextEdgeId of adjacentEdgeIds) {
      if (nextEdgeId !== edgeId) {
        const continuation = dfsPath(board, nextEdgeId, playerId, new Set(visited), getEdgeCornersFn, getCornerEdgesFn);
        maxContinuation = Math.max(maxContinuation, continuation);
      }
    }
  }

  return 1 + maxContinuation;
}

/**
 * Serialize board state for transmission
 */
export function serializeBoard(board) {
  return {
    tiles: Array.from(board.tiles.values()),
    corners: Array.from(board.corners.values()),
    edges: Array.from(board.edges.values()),
  };
}

/**
 * Deserialize board state from transmission format
 */
export function deserializeBoard(data) {
  return {
    tiles: new Map(data.tiles.map((t) => [t.id, t])),
    corners: new Map(data.corners.map((c) => [c.id, c])),
    edges: new Map(data.edges.map((e) => [e.id, e])),
  };
}
