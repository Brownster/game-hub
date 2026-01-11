import { useMemo } from "react";
import {
  hexToPixel,
  cornerPosition,
  edgePosition,
  parseCornerKey,
  parseEdgeKey,
  parseHexKey,
  calculateViewBox,
} from "../../utils/hexMath";
import HexTile from "./HexTile";
import HexCorner from "./HexCorner";
import HexEdge from "./HexEdge";

export default function HexGrid({
  tiles,
  corners,
  edges,
  hexSize = 50,
  onTileClick,
  onCornerClick,
  onEdgeClick,
  highlightTiles = [],
  highlightCorners = [],
  highlightEdges = [],
  className = "",
}) {
  // Calculate viewBox
  const viewBox = useMemo(() => {
    const vb = calculateViewBox(2, hexSize, 60);
    return `${vb.minX} ${vb.minY} ${vb.width} ${vb.height}`;
  }, [hexSize]);

  // Process corners with positions
  const processedCorners = useMemo(() => {
    return corners.map((corner) => {
      const parsed = parseCornerKey(corner.id);
      if (!parsed) return { ...corner, x: 0, y: 0 };

      const pos = cornerPosition(parsed.q, parsed.r, parsed.dir, hexSize);
      return { ...corner, ...pos };
    });
  }, [corners, hexSize]);

  // Process edges with positions
  const processedEdges = useMemo(() => {
    return edges.map((edge) => {
      const parsed = parseEdgeKey(edge.id);
      if (!parsed) return { ...edge, x: 0, y: 0, angle: 0 };

      const pos = edgePosition(parsed.q, parsed.r, parsed.dir, hexSize);
      return { ...edge, ...pos };
    });
  }, [edges, hexSize]);

  return (
    <svg
      className={`hex-grid ${className}`}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Water background */}
      <defs>
        <pattern id="water-pattern" patternUnits="userSpaceOnUse" width="20" height="20">
          <rect width="20" height="20" fill="#4169e1" />
          <path d="M0 10 Q5 5, 10 10 T20 10" stroke="#5179f1" strokeWidth="2" fill="none" />
        </pattern>
      </defs>
      <rect x="-500" y="-500" width="1000" height="1000" fill="url(#water-pattern)" />

      {/* Tiles layer */}
      <g className="tiles-layer">
        {tiles.map((tile) => {
          const parsed = parseHexKey(tile.id);
          if (!parsed) return null;

          return (
            <HexTile
              key={tile.id}
              q={parsed.q}
              r={parsed.r}
              size={hexSize}
              terrain={tile.terrain}
              number={tile.number}
              hasRobber={tile.hasRobber}
              onClick={onTileClick ? () => onTileClick(tile.id) : null}
              highlight={highlightTiles.includes(tile.id)}
            />
          );
        })}
      </g>

      {/* Edges layer (roads) */}
      <g className="edges-layer">
        {processedEdges.map((edge) => (
          <HexEdge
            key={edge.id}
            x={edge.x}
            y={edge.y}
            angle={edge.angle}
            road={edge.road}
            playerColor={edge.playerId ? corners.find(c => c.playerId === edge.playerId)?.color || getEdgePlayerColor(edge, corners) : null}
            onClick={onEdgeClick ? () => onEdgeClick(edge.id) : null}
            highlight={highlightEdges.includes(edge.id)}
            size={hexSize * 0.15}
          />
        ))}
      </g>

      {/* Corners layer (settlements/cities) */}
      <g className="corners-layer">
        {processedCorners.map((corner) => (
          <HexCorner
            key={corner.id}
            x={corner.x}
            y={corner.y}
            building={corner.building}
            playerColor={corner.playerId ? getCornerPlayerColor(corner) : null}
            onClick={onCornerClick ? () => onCornerClick(corner.id) : null}
            highlight={highlightCorners.includes(corner.id)}
            size={hexSize * 0.2}
          />
        ))}
      </g>
    </svg>
  );
}

// Helper to get player color from corner data
function getCornerPlayerColor(corner) {
  // The corner object should have a color property from the player
  // This is set during sanitization/state prep
  return corner.color || null;
}

// Helper to get player color for edges
function getEdgePlayerColor(edge, corners) {
  // Find the player's color from their buildings
  return edge.color || null;
}
