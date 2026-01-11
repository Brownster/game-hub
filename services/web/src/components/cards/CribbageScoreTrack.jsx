import React from "react";

// Cribbage board with 121 holes (0-120, with finish hole at 121)
// Layout: 3 rows of 30 holes going up, 3 rows of 30 going down, plus start/finish
export default function CribbageScoreTrack({
  scores = [0, 0],
  previousScores = [0, 0],
  playerNames = ["Player 1", "Player 2"],
  targetScore = 121,
  compact = false,
}) {
  // Player colors
  const playerColors = ["#3b82f6", "#ef4444"]; // Blue, Red

  // Render a single track (one player's scoring lane)
  const renderTrack = (playerIndex) => {
    const score = Math.min(scores[playerIndex], targetScore);
    const prevScore = Math.min(previousScores[playerIndex], targetScore);
    const color = playerColors[playerIndex];

    // Create holes array - 121 holes (0-120) plus finish at 121
    const holes = [];
    for (let i = 0; i <= targetScore; i++) {
      const isFrontPeg = i === score && score > 0;
      const isBackPeg = i === prevScore && prevScore > 0 && prevScore !== score;

      holes.push(
        <div
          key={i}
          className={`score-track__hole ${i % 5 === 0 ? "score-track__hole--fifth" : ""}`}
          title={`${i}`}
        >
          {(isFrontPeg || isBackPeg) && (
            <div
              className={`score-track__peg ${isFrontPeg ? "score-track__peg--front" : "score-track__peg--back"}`}
              style={{ backgroundColor: color }}
            />
          )}
        </div>
      );
    }

    return holes;
  };

  // Render score display
  const renderScoreDisplay = (playerIndex) => {
    const score = scores[playerIndex];
    const toGo = Math.max(0, targetScore - score);
    const color = playerColors[playerIndex];

    return (
      <div className="score-track__player-score">
        <div
          className="score-track__player-badge"
          style={{ backgroundColor: color }}
        >
          <span className="score-track__player-initial">
            {playerNames[playerIndex]?.[0]?.toUpperCase() || (playerIndex + 1)}
          </span>
        </div>
        <div className="score-track__score-info">
          <div className="score-track__score-value">{score}</div>
          {toGo > 0 && (
            <div className="score-track__to-go">{toGo} to go</div>
          )}
          {toGo === 0 && (
            <div className="score-track__winner">Winner!</div>
          )}
        </div>
      </div>
    );
  };

  if (compact) {
    // Compact mode: just show scores with small progress bars
    return (
      <div className="score-track score-track--compact">
        {[0, 1].map((playerIndex) => (
          <div key={playerIndex} className="score-track__compact-row">
            <div
              className="score-track__compact-badge"
              style={{ backgroundColor: playerColors[playerIndex] }}
            >
              {playerNames[playerIndex]?.[0]?.toUpperCase() || (playerIndex + 1)}
            </div>
            <div className="score-track__compact-bar">
              <div
                className="score-track__compact-fill"
                style={{
                  width: `${(scores[playerIndex] / targetScore) * 100}%`,
                  backgroundColor: playerColors[playerIndex],
                }}
              />
            </div>
            <div className="score-track__compact-score">
              {scores[playerIndex]}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="score-track">
      <div className="score-track__header">
        {renderScoreDisplay(0)}
        <div className="score-track__vs">vs</div>
        {renderScoreDisplay(1)}
      </div>

      <div className="score-track__board">
        <div className="score-track__lane score-track__lane--1">
          {renderTrack(0)}
        </div>
        <div className="score-track__lane score-track__lane--2">
          {renderTrack(1)}
        </div>
      </div>

      <div className="score-track__labels">
        <span>0</span>
        <span>30</span>
        <span>60</span>
        <span>90</span>
        <span>121</span>
      </div>
    </div>
  );
}
