// Hex grid utilities for board games
// Uses axial coordinates (q, r) based on Red Blob Games
// https://www.redblobgames.com/grids/hexagons/

const SQRT3 = Math.sqrt(3);

// Direction vectors for hex neighbors (pointy-top orientation)
const HEX_DIRECTIONS = [
  { q: 1, r: 0 },   // E
  { q: 1, r: -1 },  // NE
  { q: 0, r: -1 },  // NW
  { q: -1, r: 0 },  // W
  { q: -1, r: 1 },  // SW
  { q: 0, r: 1 },   // SE
];

// Corner directions relative to hex center (0-5, starting E going CCW)
const CORNER_ANGLES = [0, 60, 120, 180, 240, 300];

/**
 * Create a hex grid with given radius (number of rings around center)
 * @param {number} radius - Number of rings (0 = just center, 2 = standard Catan)
 * @returns {Array<{q: number, r: number}>} Array of hex coordinates
 */
export function createHexGrid(radius) {
  const hexes = [];
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      hexes.push({ q, r });
    }
  }
  return hexes;
}

/**
 * Convert hex coordinates to pixel position (pointy-top orientation)
 * @param {number} q - Axial q coordinate
 * @param {number} r - Axial r coordinate
 * @param {number} size - Hex size (center to corner)
 * @returns {{x: number, y: number}} Pixel coordinates
 */
export function hexToPixel(q, r, size) {
  const x = size * (SQRT3 * q + (SQRT3 / 2) * r);
  const y = size * (1.5 * r);
  return { x, y };
}

/**
 * Convert pixel position to nearest hex coordinates
 * @param {number} x - Pixel x coordinate
 * @param {number} y - Pixel y coordinate
 * @param {number} size - Hex size
 * @returns {{q: number, r: number}} Hex coordinates (rounded)
 */
export function pixelToHex(x, y, size) {
  const q = ((SQRT3 / 3) * x - (1 / 3) * y) / size;
  const r = ((2 / 3) * y) / size;
  return hexRound(q, r);
}

/**
 * Round fractional hex coordinates to nearest hex
 */
export function hexRound(q, r) {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);

  const qDiff = Math.abs(rq - q);
  const rDiff = Math.abs(rr - r);
  const sDiff = Math.abs(rs - s);

  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  }

  return { q: rq, r: rr };
}

/**
 * Get the 6 neighboring hex coordinates
 * @param {number} q - Axial q coordinate
 * @param {number} r - Axial r coordinate
 * @returns {Array<{q: number, r: number}>} Array of neighbor coordinates
 */
export function getHexNeighbors(q, r) {
  return HEX_DIRECTIONS.map((dir) => ({
    q: q + dir.q,
    r: r + dir.r,
  }));
}

/**
 * Get a specific hex neighbor by direction (0-5)
 */
export function getHexNeighbor(q, r, direction) {
  const dir = HEX_DIRECTIONS[direction];
  return { q: q + dir.q, r: r + dir.r };
}

/**
 * Get pixel positions of the 6 corners of a hex
 * @param {number} q - Hex q coordinate
 * @param {number} r - Hex r coordinate
 * @param {number} size - Hex size
 * @returns {Array<{x: number, y: number, direction: number}>}
 */
export function getHexCornerPositions(q, r, size) {
  const center = hexToPixel(q, r, size);
  return CORNER_ANGLES.map((angle, direction) => {
    const rad = (Math.PI / 180) * (angle - 30); // -30 for pointy-top
    return {
      x: center.x + size * Math.cos(rad),
      y: center.y + size * Math.sin(rad),
      direction,
    };
  });
}

/**
 * Get pixel positions of the 6 edge midpoints of a hex
 * @param {number} q - Hex q coordinate
 * @param {number} r - Hex r coordinate
 * @param {number} size - Hex size
 * @returns {Array<{x: number, y: number, direction: number}>}
 */
export function getHexEdgePositions(q, r, size) {
  const corners = getHexCornerPositions(q, r, size);
  return corners.map((corner, i) => {
    const nextCorner = corners[(i + 1) % 6];
    return {
      x: (corner.x + nextCorner.x) / 2,
      y: (corner.y + nextCorner.y) / 2,
      direction: i,
    };
  });
}

/**
 * Calculate distance between two hexes
 * @returns {number} Distance in hex steps
 */
export function hexDistance(q1, r1, q2, r2) {
  const s1 = -q1 - r1;
  const s2 = -q2 - r2;
  return Math.max(Math.abs(q1 - q2), Math.abs(r1 - r2), Math.abs(s1 - s2));
}

/**
 * Check if hex is within grid radius
 */
export function isHexInGrid(q, r, radius) {
  const s = -q - r;
  return Math.abs(q) <= radius && Math.abs(r) <= radius && Math.abs(s) <= radius;
}

/**
 * Get all hexes within range of a center hex
 */
export function getHexesInRange(centerQ, centerR, range) {
  const results = [];
  for (let q = -range; q <= range; q++) {
    for (let r = Math.max(-range, -q - range); r <= Math.min(range, -q + range); r++) {
      results.push({ q: centerQ + q, r: centerR + r });
    }
  }
  return results;
}

/**
 * Create a unique string key for a hex coordinate
 */
export function hexKey(q, r) {
  return `${q},${r}`;
}

/**
 * Parse a hex key back to coordinates
 */
export function parseHexKey(key) {
  const [q, r] = key.split(",").map(Number);
  return { q, r };
}

/**
 * Create a unique key for a corner (shared between up to 3 hexes)
 * Uses the "canonical" hex and direction to identify corners uniquely
 */
export function cornerKey(q, r, direction) {
  // Normalize to canonical representation
  // Each corner is shared by 3 hexes, we pick the one with smallest coords
  const corners = getCornerHexes(q, r, direction);
  corners.sort((a, b) => a.q !== b.q ? a.q - b.q : a.r - b.r);
  const canonical = corners[0];
  return `C:${canonical.q},${canonical.r},${canonical.dir}`;
}

/**
 * Get the 3 hexes that share a corner
 */
export function getCornerHexes(q, r, direction) {
  // A corner at direction d of hex (q,r) is also:
  // - direction (d+2)%6 of neighbor at direction (d+1)%6
  // - direction (d+4)%6 of neighbor at direction d
  const n1 = getHexNeighbor(q, r, direction);
  const n2 = getHexNeighbor(q, r, (direction + 5) % 6);
  return [
    { q, r, dir: direction },
    { q: n1.q, r: n1.r, dir: (direction + 4) % 6 },
    { q: n2.q, r: n2.r, dir: (direction + 2) % 6 },
  ];
}

/**
 * Create a unique key for an edge (shared between 2 hexes)
 */
export function edgeKey(q, r, direction) {
  // Normalize: edge at direction d of hex (q,r) is also
  // direction (d+3)%6 of the neighbor in direction d
  const neighbor = getHexNeighbor(q, r, direction);
  // Pick canonical: smaller hex coords
  if (q < neighbor.q || (q === neighbor.q && r < neighbor.r)) {
    return `E:${q},${r},${direction}`;
  }
  return `E:${neighbor.q},${neighbor.r},${(direction + 3) % 6}`;
}

/**
 * Get the 2 hexes that share an edge
 */
export function getEdgeHexes(q, r, direction) {
  const neighbor = getHexNeighbor(q, r, direction);
  return [
    { q, r, dir: direction },
    { q: neighbor.q, r: neighbor.r, dir: (direction + 3) % 6 },
  ];
}

/**
 * Get the 2 corners at the ends of an edge
 */
export function getEdgeCorners(q, r, direction) {
  return [
    { q, r, dir: direction },
    { q, r, dir: (direction + 1) % 6 },
  ];
}

/**
 * Get all edges connected to a corner
 */
export function getCornerEdges(q, r, direction) {
  // A corner has 3 edges radiating from it
  const prevDir = (direction + 5) % 6;
  const neighbor = getHexNeighbor(q, r, prevDir);
  return [
    { q, r, dir: prevDir },
    { q, r, dir: direction },
    { q: neighbor.q, r: neighbor.r, dir: (prevDir + 2) % 6 },
  ];
}

export { SQRT3, HEX_DIRECTIONS };
