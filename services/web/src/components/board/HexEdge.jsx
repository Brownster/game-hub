import { getPlayerColor } from "../../utils/hexMath";

export default function HexEdge({
  x,
  y,
  angle,
  road,
  playerColor,
  onClick,
  highlight,
  size = 8,
}) {
  const color = playerColor ? getPlayerColor(playerColor) : "#888";

  if (!road && !highlight) {
    return null;
  }

  // Highlight for valid placement
  if (!road && highlight) {
    return (
      <g transform={`translate(${x}, ${y}) rotate(${angle})`}>
        <rect
          x={-size * 2}
          y={-size / 2}
          width={size * 4}
          height={size}
          fill="rgba(255, 255, 255, 0.3)"
          stroke="#fff"
          strokeWidth={2}
          strokeDasharray="4 2"
          rx={2}
          className="hex-edge highlight"
          onClick={onClick}
          style={{ cursor: "pointer" }}
        />
      </g>
    );
  }

  // Road
  if (road) {
    return (
      <g
        transform={`translate(${x}, ${y}) rotate(${angle})`}
        className="hex-edge road"
        onClick={onClick}
        style={{ cursor: onClick ? "pointer" : "default" }}
      >
        <rect
          x={-size * 2}
          y={-size / 2}
          width={size * 4}
          height={size}
          fill={color}
          stroke="#333"
          strokeWidth={1}
          rx={2}
        />
      </g>
    );
  }

  return null;
}
