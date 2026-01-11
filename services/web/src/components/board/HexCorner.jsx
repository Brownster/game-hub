import { getPlayerColor } from "../../utils/hexMath";

export default function HexCorner({
  x,
  y,
  building,
  playerColor,
  onClick,
  highlight,
  size = 10,
}) {
  const color = playerColor ? getPlayerColor(playerColor) : "#888";

  if (!building && !highlight) {
    return null;
  }

  // Highlight for valid placement
  if (!building && highlight) {
    return (
      <circle
        cx={x}
        cy={y}
        r={size * 0.8}
        fill="rgba(255, 255, 255, 0.3)"
        stroke="#fff"
        strokeWidth={2}
        strokeDasharray="4 2"
        className="hex-corner highlight"
        onClick={onClick}
        style={{ cursor: "pointer" }}
      />
    );
  }

  // Settlement - house shape
  if (building === "settlement") {
    const w = size * 1.5;
    const h = size * 1.2;
    return (
      <g
        className="hex-corner settlement"
        onClick={onClick}
        style={{ cursor: onClick ? "pointer" : "default" }}
      >
        <path
          d={`M ${x} ${y - h} L ${x + w / 2} ${y - h / 2} L ${x + w / 2} ${y + h / 2} L ${x - w / 2} ${y + h / 2} L ${x - w / 2} ${y - h / 2} Z`}
          fill={color}
          stroke="#333"
          strokeWidth={1.5}
        />
      </g>
    );
  }

  // City - larger house with tower
  if (building === "city") {
    const w = size * 2;
    const h = size * 1.5;
    return (
      <g
        className="hex-corner city"
        onClick={onClick}
        style={{ cursor: onClick ? "pointer" : "default" }}
      >
        {/* Main building */}
        <rect
          x={x - w / 2}
          y={y - h / 3}
          width={w}
          height={h * 0.8}
          fill={color}
          stroke="#333"
          strokeWidth={1.5}
        />
        {/* Tower */}
        <rect
          x={x - w / 4}
          y={y - h}
          width={w / 2}
          height={h * 0.7}
          fill={color}
          stroke="#333"
          strokeWidth={1.5}
        />
        {/* Tower top */}
        <polygon
          points={`${x - w / 4},${y - h} ${x},${y - h - size * 0.4} ${x + w / 4},${y - h}`}
          fill={color}
          stroke="#333"
          strokeWidth={1.5}
        />
      </g>
    );
  }

  return null;
}
