export default function CatanDice({ roll }) {
  if (!roll) return null;

  const { die1, die2, total } = roll;

  return (
    <div className="catan-dice">
      <Die value={die1} />
      <Die value={die2} />
      <span className={`dice-total ${total === 7 ? "robber" : ""}`}>
        = {total}
        {total === 7 && " (Robber!)"}
      </span>
    </div>
  );
}

function Die({ value }) {
  // Render die face dots
  const dotPositions = {
    1: [[50, 50]],
    2: [
      [25, 25],
      [75, 75],
    ],
    3: [
      [25, 25],
      [50, 50],
      [75, 75],
    ],
    4: [
      [25, 25],
      [75, 25],
      [25, 75],
      [75, 75],
    ],
    5: [
      [25, 25],
      [75, 25],
      [50, 50],
      [25, 75],
      [75, 75],
    ],
    6: [
      [25, 25],
      [75, 25],
      [25, 50],
      [75, 50],
      [25, 75],
      [75, 75],
    ],
  };

  const dots = dotPositions[value] || [];

  return (
    <svg className="die" viewBox="0 0 100 100" width="40" height="40">
      <rect x="5" y="5" width="90" height="90" rx="10" fill="#f5f0e1" stroke="#5c4033" strokeWidth="3" />
      {dots.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="10" fill="#333" />
      ))}
    </svg>
  );
}
