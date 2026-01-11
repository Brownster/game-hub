// Hex grid math utilities for frontend rendering
// Based on Red Blob Games pointy-top hex grid formulas

const SQRT3 = Math.sqrt(3);

/**
 * Convert axial hex coordinates to pixel position (center of hex)
 * @param {number} q - Axial q coordinate
 * @param {number} r - Axial r coordinate
 * @param {number} size - Hex size (radius from center to corner)
 * @returns {{ x: number, y: number }}
 */
export function hexToPixel(q, r, size) {
  const x = size * (SQRT3 * q + (SQRT3 / 2) * r);
  const y = size * ((3 / 2) * r);
  return { x, y };
}

/**
 * Get the 6 corner positions of a hex (for drawing the hex polygon)
 * @param {number} centerX - Center X position
 * @param {number} centerY - Center Y position
 * @param {number} size - Hex size
 * @returns {Array<{ x: number, y: number }>}
 */
export function getHexCornerPositions(centerX, centerY, size) {
  const corners = [];
  for (let i = 0; i < 6; i++) {
    // Pointy-top: start at 30 degrees
    const angleDeg = 60 * i - 30;
    const angleRad = (Math.PI / 180) * angleDeg;
    corners.push({
      x: centerX + size * Math.cos(angleRad),
      y: centerY + size * Math.sin(angleRad),
    });
  }
  return corners;
}

/**
 * Generate SVG polygon points string for a hex
 * @param {number} centerX - Center X position
 * @param {number} centerY - Center Y position
 * @param {number} size - Hex size
 * @returns {string}
 */
export function hexPolygonPoints(centerX, centerY, size) {
  const corners = getHexCornerPositions(centerX, centerY, size);
  return corners.map((c) => `${c.x},${c.y}`).join(" ");
}

/**
 * Get position of a corner node (settlement/city placement)
 * Corner direction: 0-5 starting from top-right, going clockwise
 * @param {number} q - Hex q coordinate
 * @param {number} r - Hex r coordinate
 * @param {number} dir - Corner direction (0-5)
 * @param {number} size - Hex size
 * @returns {{ x: number, y: number }}
 */
export function cornerPosition(q, r, dir, size) {
  const { x: centerX, y: centerY } = hexToPixel(q, r, size);
  // Pointy-top corners are at 30, 90, 150, 210, 270, 330 degrees
  const angleDeg = 60 * dir - 30;
  const angleRad = (Math.PI / 180) * angleDeg;
  return {
    x: centerX + size * Math.cos(angleRad),
    y: centerY + size * Math.sin(angleRad),
  };
}

/**
 * Get position of an edge (road placement) - midpoint between two corners
 * Edge direction: 0-5, edge i connects corner i and corner (i+1)%6
 * @param {number} q - Hex q coordinate
 * @param {number} r - Hex r coordinate
 * @param {number} dir - Edge direction (0-5)
 * @param {number} size - Hex size
 * @returns {{ x: number, y: number, angle: number }}
 */
export function edgePosition(q, r, dir, size) {
  const corner1 = cornerPosition(q, r, dir, size);
  const corner2 = cornerPosition(q, r, (dir + 1) % 6, size);

  const x = (corner1.x + corner2.x) / 2;
  const y = (corner1.y + corner2.y) / 2;

  // Calculate angle for road rotation
  const angle = Math.atan2(corner2.y - corner1.y, corner2.x - corner1.x) * (180 / Math.PI);

  return { x, y, angle };
}

/**
 * Parse corner key to get coordinates and direction
 * Format: "C:q,r,dir"
 * @param {string} key
 * @returns {{ q: number, r: number, dir: number } | null}
 */
export function parseCornerKey(key) {
  const match = key.match(/^C:(-?\d+),(-?\d+),(\d+)$/);
  if (!match) return null;
  return {
    q: parseInt(match[1]),
    r: parseInt(match[2]),
    dir: parseInt(match[3]),
  };
}

/**
 * Parse edge key to get coordinates and direction
 * Format: "E:q,r,dir"
 * @param {string} key
 * @returns {{ q: number, r: number, dir: number } | null}
 */
export function parseEdgeKey(key) {
  const match = key.match(/^E:(-?\d+),(-?\d+),(\d+)$/);
  if (!match) return null;
  return {
    q: parseInt(match[1]),
    r: parseInt(match[2]),
    dir: parseInt(match[3]),
  };
}

/**
 * Parse hex key to get coordinates
 * Format: "H:q,r"
 * @param {string} key
 * @returns {{ q: number, r: number } | null}
 */
export function parseHexKey(key) {
  const match = key.match(/^H:(-?\d+),(-?\d+)$/);
  if (!match) return null;
  return {
    q: parseInt(match[1]),
    r: parseInt(match[2]),
  };
}

/**
 * Calculate SVG viewBox for a hex grid
 * @param {number} radius - Grid radius (0 = just center, 2 = standard Catan)
 * @param {number} hexSize - Hex size
 * @param {number} padding - Extra padding around the board
 * @returns {{ minX: number, minY: number, width: number, height: number }}
 */
export function calculateViewBox(radius, hexSize, padding = 50) {
  // For a hex grid of given radius, calculate bounding box
  const maxQ = radius;
  const maxR = radius;

  // Get extreme positions
  const topLeft = hexToPixel(-maxQ, -maxR, hexSize);
  const bottomRight = hexToPixel(maxQ, maxR, hexSize);

  // Add hex size for the actual hex drawing
  const minX = topLeft.x - hexSize - padding;
  const minY = topLeft.y - hexSize - padding;
  const maxX = bottomRight.x + hexSize + padding;
  const maxY = bottomRight.y + hexSize + padding;

  return {
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Get terrain color for a tile type
 * @param {string} terrain
 * @returns {string}
 */
export function getTerrainColor(terrain) {
  const colors = {
    forest: "#228b22",
    hills: "#cd853f",
    pasture: "#90ee90",
    fields: "#ffd700",
    mountains: "#708090",
    desert: "#f4a460",
  };
  return colors[terrain] || "#ccc";
}

/**
 * Get player color
 * @param {string} color
 * @returns {string}
 */
export function getPlayerColor(color) {
  const colors = {
    red: "#dc2626",
    blue: "#2563eb",
    orange: "#ea580c",
    white: "#f5f5f5",
  };
  return colors[color] || "#888";
}

/**
 * Get resource icon path
 * @param {string} resource
 * @returns {string}
 */
export function getResourceIcon(resource) {
  return `/catan/icons/icon-${resource}.svg`;
}
