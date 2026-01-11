import { hexToPixel, hexPolygonPoints, getTerrainColor } from "../../utils/hexMath";

export default function HexTile({
  q,
  r,
  size,
  terrain,
  number,
  hasRobber,
  onClick,
  highlight,
  disabled,
}) {
  const { x, y } = hexToPixel(q, r, size);
  const points = hexPolygonPoints(x, y, size);
  const color = getTerrainColor(terrain);

  // Number probability dots (2,12=1 dot, 3,11=2 dots, etc)
  const getDots = (num) => {
    if (!num) return 0;
    return 6 - Math.abs(num - 7);
  };

  const isRedNumber = number === 6 || number === 8;

  return (
    <g
      className={`hex-tile ${highlight ? "highlight" : ""} ${disabled ? "disabled" : ""}`}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      {/* Hex shape */}
      <polygon
        points={points}
        fill={color}
        stroke="#5c4033"
        strokeWidth={2}
        className="hex-polygon"
      />

      {/* Number token (not on desert) */}
      {number && (
        <g>
          <circle cx={x} cy={y} r={size * 0.35} fill="#f5f0e1" stroke="#5c4033" strokeWidth={1} />
          <text
            x={x}
            y={y + 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={size * 0.35}
            fontWeight="bold"
            fill={isRedNumber ? "#dc2626" : "#333"}
          >
            {number}
          </text>
          {/* Probability dots */}
          <g>
            {Array.from({ length: getDots(number) }).map((_, i) => (
              <circle
                key={i}
                cx={x - ((getDots(number) - 1) * 4) / 2 + i * 4}
                cy={y + size * 0.22}
                r={1.5}
                fill={isRedNumber ? "#dc2626" : "#333"}
              />
            ))}
          </g>
        </g>
      )}

      {/* Robber */}
      {hasRobber && (
        <g transform={`translate(${x}, ${y})`}>
          <ellipse cx={0} cy={5} rx={size * 0.15} ry={size * 0.08} fill="rgba(0,0,0,0.3)" />
          <ellipse cx={0} cy={0} rx={size * 0.12} ry={size * 0.25} fill="#1a1a1a" />
          <circle cx={0} cy={-size * 0.2} r={size * 0.1} fill="#1a1a1a" />
        </g>
      )}
    </g>
  );
}
