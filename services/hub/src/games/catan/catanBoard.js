// Catan board generation and placement validation

import {
  createHexGrid,
  hexKey,
  cornerKey,
  edgeKey,
  getHexNeighbors,
  getCornerHexes,
  getCornerEdges,
  getEdgeCorners,
  isHexInGrid,
} from "../board/hexUtils.js";

import {
  STANDARD_TERRAIN,
  STANDARD_NUMBERS,
  STANDARD_PORTS,
  TERRAIN,
  TERRAIN_RESOURCE,
  PORTS,
  PORT_RATIOS,
} from "./catanConstants.js";

/**
 * Generate a standard Catan board
 * @returns {Object} Board state with tiles, corners, edges, ports
 */
export function generateStandardBoard() {
  const radius = 2;
  const hexes = createHexGrid(radius);

  // Assign terrain and numbers to tiles
  const tiles = [];
  let terrainIndex = 0;
  let numberIndex = 0;

  // Order hexes from center outward in spiral
  const orderedHexes = orderHexesSpiral(hexes);

  for (const hex of orderedHexes) {
    const terrain = STANDARD_TERRAIN[terrainIndex++];
    const number = terrain === TERRAIN.DESERT ? null : STANDARD_NUMBERS[numberIndex++];

    tiles.push({
      id: hexKey(hex.q, hex.r),
      q: hex.q,
      r: hex.r,
      terrain,
      resource: TERRAIN_RESOURCE[terrain],
      number,
      hasRobber: terrain === TERRAIN.DESERT, // Robber starts on desert
    });
  }

  // Generate all unique corners
  const corners = generateCorners(hexes, radius);

  // Generate all unique edges
  const edges = generateEdges(hexes, radius);

  // Assign ports to coastal corners
  const ports = assignPorts(corners, radius);

  return {
    tiles,
    corners,
    edges,
    ports,
    robberTile: tiles.find((t) => t.hasRobber)?.id || null,
  };
}

/**
 * Order hexes in spiral from center outward
 */
function orderHexesSpiral(hexes) {
  // Group by ring (distance from center)
  const rings = new Map();
  for (const hex of hexes) {
    const dist = Math.max(Math.abs(hex.q), Math.abs(hex.r), Math.abs(-hex.q - hex.r));
    if (!rings.has(dist)) rings.set(dist, []);
    rings.get(dist).push(hex);
  }

  // Sort each ring clockwise
  const result = [];
  for (let ring = 0; ring <= 2; ring++) {
    const ringHexes = rings.get(ring) || [];
    // Sort by angle from center
    ringHexes.sort((a, b) => {
      const angleA = Math.atan2(a.r, a.q);
      const angleB = Math.atan2(b.r, b.q);
      return angleA - angleB;
    });
    result.push(...ringHexes);
  }

  return result;
}

/**
 * Generate all unique corners for the board
 */
function generateCorners(hexes, radius) {
  const cornerSet = new Set();
  const corners = [];

  for (const hex of hexes) {
    for (let dir = 0; dir < 6; dir++) {
      const key = cornerKey(hex.q, hex.r, dir);
      if (!cornerSet.has(key)) {
        cornerSet.add(key);

        // Get the tiles this corner touches
        const touchingHexes = getCornerHexes(hex.q, hex.r, dir);
        const touchingTiles = touchingHexes
          .filter((h) => isHexInGrid(h.q, h.r, radius))
          .map((h) => hexKey(h.q, h.r));

        corners.push({
          id: key,
          q: hex.q,
          r: hex.r,
          direction: dir,
          building: null,
          playerId: null,
          touchingTiles,
          port: null, // Will be assigned later
        });
      }
    }
  }

  return corners;
}

/**
 * Generate all unique edges for the board
 */
function generateEdges(hexes, radius) {
  const edgeSet = new Set();
  const edges = [];

  for (const hex of hexes) {
    for (let dir = 0; dir < 6; dir++) {
      const key = edgeKey(hex.q, hex.r, dir);
      if (!edgeSet.has(key)) {
        edgeSet.add(key);

        // Get the two corners at the ends of this edge
        const edgeCornerData = getEdgeCorners(hex.q, hex.r, dir);
        const cornerIds = edgeCornerData.map((c) => cornerKey(c.q, c.r, c.dir));

        edges.push({
          id: key,
          q: hex.q,
          r: hex.r,
          direction: dir,
          road: false,
          playerId: null,
          corners: cornerIds,
        });
      }
    }
  }

  return edges;
}

/**
 * Assign ports to coastal corners
 */
function assignPorts(corners, radius) {
  // Find coastal corners (corners that don't touch 3 land tiles)
  const coastalCorners = corners.filter((c) => c.touchingTiles.length < 3);

  // Group coastal corners by their position around the board
  // For standard board, we have 9 port positions
  const portPositions = identifyPortPositions(coastalCorners);

  const ports = [];
  for (let i = 0; i < STANDARD_PORTS.length && i < portPositions.length; i++) {
    const portConfig = STANDARD_PORTS[i];
    const position = portPositions[i];

    ports.push({
      id: `port-${i}`,
      type: portConfig.type,
      ratio: PORT_RATIOS[portConfig.type],
      corners: position.corners,
    });

    // Mark corners as having this port
    for (const cornerId of position.corners) {
      const corner = corners.find((c) => c.id === cornerId);
      if (corner) {
        corner.port = {
          type: portConfig.type,
          ratio: PORT_RATIOS[portConfig.type],
        };
      }
    }
  }

  return ports;
}

/**
 * Identify port positions (pairs of adjacent coastal corners)
 */
function identifyPortPositions(coastalCorners) {
  // Group coastal corners and find pairs that share an edge
  // This is simplified - in a real implementation you'd calculate
  // the exact positions based on the hex grid
  const positions = [];
  const used = new Set();

  for (const corner of coastalCorners) {
    if (used.has(corner.id)) continue;

    // Find adjacent corner that's also coastal
    const edgeData = getCornerEdges(corner.q, corner.r, corner.direction);
    for (const edgeInfo of edgeData) {
      const edgeCornerData = getEdgeCorners(edgeInfo.q, edgeInfo.r, edgeInfo.dir);
      for (const c of edgeCornerData) {
        const otherId = cornerKey(c.q, c.r, c.dir);
        if (otherId !== corner.id && !used.has(otherId)) {
          const other = coastalCorners.find((x) => x.id === otherId);
          if (other) {
            positions.push({ corners: [corner.id, otherId] });
            used.add(corner.id);
            used.add(otherId);
            break;
          }
        }
      }
      if (used.has(corner.id)) break;
    }
  }

  return positions.slice(0, 9); // Standard board has 9 ports
}

/**
 * Check if a settlement can be placed at a corner
 */
export function canPlaceSettlement(board, cornerId, playerId, isSetup = false) {
  const corner = board.corners.find((c) => c.id === cornerId);
  if (!corner) return { ok: false, error: "INVALID_CORNER" };

  // Corner must be empty
  if (corner.building) return { ok: false, error: "CORNER_OCCUPIED" };

  // Check distance rule: no adjacent settlements
  const adjacentCornerIds = getAdjacentCornerIds(corner);
  for (const adjId of adjacentCornerIds) {
    const adjCorner = board.corners.find((c) => c.id === adjId);
    if (adjCorner?.building) {
      return { ok: false, error: "TOO_CLOSE_TO_BUILDING" };
    }
  }

  // During setup, no road requirement
  if (isSetup) return { ok: true };

  // After setup, must be connected to player's road
  const connectedEdges = getConnectedEdgeIds(corner);
  const hasRoad = connectedEdges.some((edgeId) => {
    const edge = board.edges.find((e) => e.id === edgeId);
    return edge?.road && edge.playerId === playerId;
  });

  if (!hasRoad) return { ok: false, error: "NOT_CONNECTED_TO_ROAD" };

  return { ok: true };
}

/**
 * Check if a city can be placed at a corner
 */
export function canPlaceCity(board, cornerId, playerId) {
  const corner = board.corners.find((c) => c.id === cornerId);
  if (!corner) return { ok: false, error: "INVALID_CORNER" };

  // Must have player's settlement there
  if (corner.building !== "settlement" || corner.playerId !== playerId) {
    return { ok: false, error: "NO_SETTLEMENT_HERE" };
  }

  return { ok: true };
}

/**
 * Check if a road can be placed on an edge
 */
export function canPlaceRoad(board, edgeId, playerId, isSetup = false, setupCornerId = null) {
  const edge = board.edges.find((e) => e.id === edgeId);
  if (!edge) return { ok: false, error: "INVALID_EDGE" };

  // Edge must be empty
  if (edge.road) return { ok: false, error: "EDGE_OCCUPIED" };

  // During setup, road must connect to just-placed settlement
  if (isSetup && setupCornerId) {
    if (!edge.corners.includes(setupCornerId)) {
      return { ok: false, error: "MUST_CONNECT_TO_SETTLEMENT" };
    }
    return { ok: true };
  }

  // After setup, must connect to player's road or building
  const hasConnection = edge.corners.some((cornerId) => {
    const corner = board.corners.find((c) => c.id === cornerId);

    // Connected to own building
    if (corner?.building && corner.playerId === playerId) return true;

    // Connected to own road (not blocked by opponent building)
    if (corner?.building && corner.playerId !== playerId) return false;

    const connectedEdges = getConnectedEdgeIds(corner);
    return connectedEdges.some((eId) => {
      const e = board.edges.find((x) => x.id === eId);
      return e?.road && e.playerId === playerId && e.id !== edgeId;
    });
  });

  if (!hasConnection) return { ok: false, error: "NOT_CONNECTED" };

  return { ok: true };
}

/**
 * Get IDs of corners adjacent to a corner (connected by edges)
 */
function getAdjacentCornerIds(corner) {
  const edgeData = getCornerEdges(corner.q, corner.r, corner.direction);
  const adjacentIds = [];

  for (const edge of edgeData) {
    const edgeCornerData = getEdgeCorners(edge.q, edge.r, edge.dir);
    for (const c of edgeCornerData) {
      const id = cornerKey(c.q, c.r, c.dir);
      if (id !== corner.id) {
        adjacentIds.push(id);
      }
    }
  }

  return adjacentIds;
}

/**
 * Get IDs of edges connected to a corner
 */
function getConnectedEdgeIds(corner) {
  const edgeData = getCornerEdges(corner.q, corner.r, corner.direction);
  return edgeData.map((e) => edgeKey(e.q, e.r, e.dir));
}

/**
 * Get tiles adjacent to a corner
 */
export function getCornerTiles(board, cornerId) {
  const corner = board.corners.find((c) => c.id === cornerId);
  if (!corner) return [];

  return corner.touchingTiles
    .map((tileId) => board.tiles.find((t) => t.id === tileId))
    .filter(Boolean);
}

/**
 * Get corners adjacent to a tile
 */
export function getTileCorners(board, tileId) {
  return board.corners.filter((c) => c.touchingTiles.includes(tileId));
}

/**
 * Get players with buildings on a tile
 */
export function getPlayersOnTile(board, tileId) {
  const corners = getTileCorners(board, tileId);
  const players = new Set();

  for (const corner of corners) {
    if (corner.building && corner.playerId) {
      players.add(corner.playerId);
    }
  }

  return Array.from(players);
}

/**
 * Move robber to a new tile
 */
export function moveRobber(board, newTileId) {
  // Remove from current tile
  const currentTile = board.tiles.find((t) => t.hasRobber);
  if (currentTile) {
    currentTile.hasRobber = false;
  }

  // Place on new tile
  const newTile = board.tiles.find((t) => t.id === newTileId);
  if (newTile) {
    newTile.hasRobber = true;
    board.robberTile = newTileId;
    return true;
  }

  return false;
}

/**
 * Get tiles that can receive the robber
 */
export function getValidRobberTiles(board) {
  return board.tiles
    .filter((t) => !t.hasRobber)
    .map((t) => t.id);
}

/**
 * Check if player has a port of given type
 */
export function getPlayerPorts(board, playerId) {
  const ports = [];

  for (const corner of board.corners) {
    if (corner.building && corner.playerId === playerId && corner.port) {
      if (!ports.some((p) => p.type === corner.port.type)) {
        ports.push(corner.port);
      }
    }
  }

  return ports;
}

/**
 * Get the best trade ratio for a resource
 */
export function getBestTradeRatio(board, playerId, resource) {
  const ports = getPlayerPorts(board, playerId);

  // Check for specific resource port (2:1)
  const specificPort = ports.find((p) => p.type === resource);
  if (specificPort) return 2;

  // Check for generic port (3:1)
  const genericPort = ports.find((p) => p.type === PORTS.GENERIC);
  if (genericPort) return 3;

  // Default ratio (4:1)
  return 4;
}
