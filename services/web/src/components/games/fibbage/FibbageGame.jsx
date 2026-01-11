import { useState, useEffect } from "react";

const PHASES = {
  LOBBY: "LOBBY",
  SUBMIT_LIES: "SUBMIT_LIES",
  VOTE: "VOTE",
  REVEAL: "REVEAL",
  SCORE: "SCORE",
  GAME_END: "GAME_END",
};

export default function FibbageGame({
  gameState,
  session,
  players,
  isHost,
  gameFinished,
  onAction,
  onRematch,
  onSwitchGame,
  timeLeft,
}) {
  const [lieText, setLieText] = useState("");
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [error, setError] = useState("");

  const playerId = session?.playerId;
  const phase = gameState?.phase || PHASES.LOBBY;
  const round = gameState?.round || 0;
  const totalRounds = gameState?.totalRounds || 8;
  const question = gameState?.currentQuestion;
  const choices = gameState?.choices || [];
  const lies = gameState?.lies || {};
  const votes = gameState?.votes || {};
  const scores = gameState?.scores || {};
  const roundScores = gameState?.roundScores || {};

  // Check if current player has submitted/voted
  const hasSubmitted = !!lies[playerId]?.submitted;
  const hasVoted = !!votes[playerId]?.voted;

  // Get player name by ID
  const getPlayerName = (pid) => {
    const player = players.find((p) => p.playerId === pid);
    return player?.displayName || "Unknown";
  };

  // Reset inputs when phase changes
  useEffect(() => {
    setLieText("");
    setSelectedChoice(null);
    setError("");
  }, [phase]);

  const handleSubmitLie = () => {
    if (!lieText.trim()) {
      setError("Enter a fake answer!");
      return;
    }
    setError("");
    onAction({ type: "SUBMIT_LIE", payload: { text: lieText.trim() } });
  };

  const handleSubmitVote = () => {
    if (!selectedChoice) {
      setError("Select an answer!");
      return;
    }
    setError("");
    onAction({ type: "SUBMIT_VOTE", payload: { choiceId: selectedChoice } });
  };

  const handleNextRound = () => {
    onAction({ type: "NEXT_ROUND" });
  };

  const handleContinue = () => {
    onAction({ type: "CONTINUE" });
  };

  // Render question with blank highlighted
  const renderQuestion = () => {
    if (!question?.question) return null;
    const parts = question.question.split("<BLANK>");
    return (
      <div className="fibbage-question">
        {parts[0]}
        <span className="fibbage-blank">______</span>
        {parts[1]}
      </div>
    );
  };

  // Sorted leaderboard
  const leaderboard = [...players]
    .map((p) => ({ ...p, score: scores[p.playerId] || 0 }))
    .sort((a, b) => b.score - a.score);

  // Render based on phase
  const renderContent = () => {
    switch (phase) {
      case PHASES.LOBBY:
        return (
          <div className="fibbage-lobby">
            <h2>Fibbage</h2>
            <p className="fibbage-description">
              Write fake answers to fool other players. Pick the truth from the lies!
            </p>
            <div className="fibbage-players">
              <h3>Players ({players.length})</h3>
              {players.map((p) => (
                <div key={p.playerId} className="fibbage-player-item">
                  {p.displayName}
                  {p.playerId === playerId && " (You)"}
                </div>
              ))}
            </div>
            {players.length < 3 && (
              <p className="fibbage-warning">Need at least 3 players to start</p>
            )}
          </div>
        );

      case PHASES.SUBMIT_LIES:
        return (
          <div className="fibbage-submit">
            <div className="fibbage-round">Round {round} / {totalRounds}</div>
            {renderQuestion()}

            {hasSubmitted ? (
              <div className="fibbage-waiting">
                <p>Lie submitted! Waiting for others...</p>
                <div className="fibbage-submit-status">
                  {Object.keys(lies).length} / {players.length} submitted
                </div>
              </div>
            ) : (
              <div className="fibbage-input-area">
                <input
                  type="text"
                  className="fibbage-input"
                  placeholder="Enter your fake answer..."
                  value={lieText}
                  onChange={(e) => setLieText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmitLie()}
                  maxLength={100}
                  autoFocus
                />
                <button className="fibbage-btn primary" onClick={handleSubmitLie}>
                  Submit Lie
                </button>
                {error && <div className="fibbage-error">{error}</div>}
              </div>
            )}

            {timeLeft > 0 && (
              <div className="fibbage-timer">{timeLeft}s remaining</div>
            )}
          </div>
        );

      case PHASES.VOTE:
        return (
          <div className="fibbage-vote">
            <div className="fibbage-round">Round {round} / {totalRounds}</div>
            {renderQuestion()}
            <p className="fibbage-instruction">Pick the TRUTH!</p>

            {hasVoted ? (
              <div className="fibbage-waiting">
                <p>Vote submitted! Waiting for others...</p>
                <div className="fibbage-submit-status">
                  {Object.keys(votes).length} / {Object.keys(lies).length} voted
                </div>
              </div>
            ) : (
              <div className="fibbage-choices">
                {choices.map((choice) => (
                  <button
                    key={choice.id}
                    className={`fibbage-choice ${selectedChoice === choice.id ? "selected" : ""}`}
                    onClick={() => setSelectedChoice(choice.id)}
                  >
                    {choice.text}
                  </button>
                ))}
                <button
                  className="fibbage-btn primary"
                  onClick={handleSubmitVote}
                  disabled={!selectedChoice}
                >
                  Lock In Answer
                </button>
                {error && <div className="fibbage-error">{error}</div>}
              </div>
            )}

            {timeLeft > 0 && (
              <div className="fibbage-timer">{timeLeft}s remaining</div>
            )}
          </div>
        );

      case PHASES.REVEAL:
        return (
          <div className="fibbage-reveal">
            <div className="fibbage-round">Round {round} / {totalRounds}</div>
            {renderQuestion()}
            <div className="fibbage-reveal-list">
              {choices.map((choice) => {
                const isTruth = choice.ownerId === "__TRUTH__";
                const ownerName = isTruth ? "THE TRUTH" : getPlayerName(choice.ownerId);
                const votersForThis = Object.entries(votes)
                  .filter(([, choiceId]) => choiceId === choice.id)
                  .map(([voterId]) => getPlayerName(voterId));

                return (
                  <div
                    key={choice.id}
                    className={`fibbage-reveal-choice ${isTruth ? "truth" : "lie"}`}
                  >
                    <div className="fibbage-reveal-text">{choice.text}</div>
                    <div className="fibbage-reveal-owner">
                      {isTruth ? "THE TRUTH!" : `Written by: ${ownerName}`}
                    </div>
                    {votersForThis.length > 0 && (
                      <div className="fibbage-reveal-voters">
                        Fooled: {votersForThis.join(", ")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {isHost && (
              <button className="fibbage-btn primary" onClick={handleContinue}>
                Continue
              </button>
            )}
          </div>
        );

      case PHASES.SCORE:
        return (
          <div className="fibbage-score">
            <h2>Round {round} Results</h2>
            <div className="fibbage-round-scores">
              {leaderboard.map((p, idx) => {
                const roundPts = roundScores[p.playerId] || 0;
                return (
                  <div key={p.playerId} className="fibbage-score-row">
                    <span className="fibbage-rank">#{idx + 1}</span>
                    <span className="fibbage-name">{p.displayName}</span>
                    <span className="fibbage-round-pts">+{roundPts}</span>
                    <span className="fibbage-total-pts">{p.score} pts</span>
                  </div>
                );
              })}
            </div>
            {isHost && (
              <button className="fibbage-btn primary" onClick={handleNextRound}>
                {round >= totalRounds ? "Final Results" : "Next Round"}
              </button>
            )}
          </div>
        );

      case PHASES.GAME_END:
        const winner = leaderboard[0];
        return (
          <div className="fibbage-end">
            <h2>Game Over!</h2>
            <div className="fibbage-winner">
              {winner?.displayName} wins with {winner?.score} points!
            </div>
            <div className="fibbage-final-scores">
              {leaderboard.map((p, idx) => (
                <div key={p.playerId} className="fibbage-score-row final">
                  <span className="fibbage-rank">#{idx + 1}</span>
                  <span className="fibbage-name">{p.displayName}</span>
                  <span className="fibbage-total-pts">{p.score} pts</span>
                </div>
              ))}
            </div>
            {isHost && (
              <div className="fibbage-end-actions">
                <button className="fibbage-btn primary" onClick={onRematch}>
                  Play Again
                </button>
                <button className="fibbage-btn secondary" onClick={onSwitchGame}>
                  Switch Game
                </button>
              </div>
            )}
          </div>
        );

      default:
        return <div>Unknown phase: {phase}</div>;
    }
  };

  return (
    <div className="fibbage-game">
      {phase !== PHASES.LOBBY && phase !== PHASES.GAME_END && (
        <div className="fibbage-scoreboard">
          {leaderboard.slice(0, 4).map((p) => (
            <div
              key={p.playerId}
              className={`fibbage-scoreboard-item ${p.playerId === playerId ? "you" : ""}`}
            >
              <span className="name">{p.displayName}</span>
              <span className="pts">{p.score}</span>
            </div>
          ))}
        </div>
      )}
      {renderContent()}
    </div>
  );
}
