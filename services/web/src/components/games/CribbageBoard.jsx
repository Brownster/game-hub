import React, { useState, useMemo } from "react";
import TableSurface from "../cards/TableSurface";
import Card from "../cards/Card";
import Hand from "../cards/Hand";
import CardStack from "../cards/CardStack";
import CribbageScoreTrack from "../cards/CribbageScoreTrack";

export default function CribbageBoard({
  gameState,
  playerId,
  players,
  onAction,
  isHost,
}) {
  const [selectedCards, setSelectedCards] = useState([]);

  const {
    phase = "LOBBY",
    round = 0,
    dealerIndex = 0,
    turnIndex = 0,
    hands = [],
    pegHands = [],
    crib = [],
    starter = null,
    playStack = [],
    playCount = 0,
    goFlags = [],
    scores = [0, 0],
    previousScores = [0, 0],
    targetScore = 121,
    lastPeggingScore = null,
    showingHand = null,
    discardedFlags = [],
  } = gameState || {};

  // Find current player's index in game
  const myIndex = players.findIndex((p) => p.playerId === playerId);
  const opponentIndex = myIndex === 0 ? 1 : 0;

  // Get player names
  const playerNames = [
    players[0]?.displayName || "Player 1",
    players[1]?.displayName || "Player 2",
  ];

  // Get my hand (sanitized state means I only see my own cards)
  const myHand = hands[myIndex] || [];
  const myPegHand = pegHands[myIndex] || [];
  const opponentHandCount = hands[opponentIndex]?.length || 0;
  const opponentPegHandCount = pegHands[opponentIndex]?.length || 0;

  // Check if it's my turn
  const isMyTurn = turnIndex === myIndex;
  const isDealer = dealerIndex === myIndex;

  // Determine playable cards during pegging
  const playableCards = useMemo(() => {
    if (phase !== "PEGGING" || !isMyTurn) return [];
    return myPegHand.filter((cardId) => {
      // Card value calculation
      const rank = cardId.slice(0, -1);
      const value = ["J", "Q", "K"].includes(rank) ? 10 : rank === "A" ? 1 : parseInt(rank);
      return playCount + value <= 31;
    });
  }, [phase, isMyTurn, myPegHand, playCount]);

  const canSayGo = phase === "PEGGING" && isMyTurn && playableCards.length === 0 && myPegHand.length > 0;

  // Handle card selection for discard
  const handleCardClick = (cardId) => {
    if (phase !== "DISCARD") return;
    if (discardedFlags?.[myIndex]) return;

    setSelectedCards((prev) => {
      if (prev.includes(cardId)) {
        return prev.filter((id) => id !== cardId);
      }
      if (prev.length >= 2) {
        return prev;
      }
      return [...prev, cardId];
    });
  };

  // Handle discard action
  const handleDiscard = () => {
    if (selectedCards.length !== 2) return;
    onAction({ type: "DISCARD", payload: { cardIds: selectedCards } });
    setSelectedCards([]);
  };

  // Handle cut action
  const handleCut = () => {
    onAction({ type: "CUT" });
  };

  // Handle play card during pegging
  const handlePlayCard = (cardId) => {
    if (!playableCards.includes(cardId)) return;
    onAction({ type: "PLAY_CARD", payload: { cardId } });
  };

  // Handle Go during pegging
  const handleGo = () => {
    onAction({ type: "GO" });
  };

  // Handle confirm show
  const handleConfirmShow = () => {
    onAction({ type: "CONFIRM_SHOW" });
  };

  // Handle next round
  const handleNextRound = () => {
    onAction({ type: "NEXT_ROUND" });
  };

  // Render phase-specific content
  const renderPhaseContent = () => {
    switch (phase) {
      case "LOBBY":
        return (
          <div className="cribbage__lobby">
            <h2>Cribbage</h2>
            <p>Waiting for players...</p>
            <p>{players.length}/2 players</p>
            {isHost && players.length >= 2 && (
              <p className="cribbage__hint">Press Start Game when ready</p>
            )}
          </div>
        );

      case "DEAL":
        return (
          <div className="cribbage__dealing">
            <h3>Dealing cards...</h3>
            <p>Round {round}</p>
            <p>{playerNames[dealerIndex]} is dealing</p>
          </div>
        );

      case "DISCARD":
        return (
          <div className="cribbage__discard-phase">
            <div className="cribbage__phase-info">
              <h3>Discard Phase</h3>
              <p>
                Select 2 cards to discard to {isDealer ? "your" : `${playerNames[dealerIndex]}'s`} crib
              </p>
            </div>

            {discardedFlags?.[myIndex] ? (
              <p className="cribbage__waiting">Waiting for opponent to discard...</p>
            ) : (
              <button
                className="cribbage__action-btn"
                onClick={handleDiscard}
                disabled={selectedCards.length !== 2}
              >
                Discard ({selectedCards.length}/2)
              </button>
            )}
          </div>
        );

      case "CUT":
        return (
          <div className="cribbage__cut-phase">
            <h3>Cut the Deck</h3>
            {!isDealer ? (
              <button className="cribbage__action-btn" onClick={handleCut}>
                Cut Deck
              </button>
            ) : (
              <p className="cribbage__waiting">Waiting for opponent to cut...</p>
            )}
          </div>
        );

      case "PEGGING":
        return (
          <div className="cribbage__pegging-phase">
            <div className="cribbage__phase-info">
              <h3>Pegging - Count: {playCount}</h3>
              {isMyTurn ? (
                playableCards.length > 0 ? (
                  <p>Play a card (click one below)</p>
                ) : canSayGo ? (
                  <p>No playable cards - say "Go"</p>
                ) : (
                  <p>Calculating...</p>
                )
              ) : (
                <p>Waiting for {playerNames[opponentIndex]}...</p>
              )}
            </div>

            {canSayGo && (
              <button className="cribbage__action-btn cribbage__go-btn" onClick={handleGo}>
                Go!
              </button>
            )}

            {lastPeggingScore && (
              <div className="cribbage__pegging-score">
                +{lastPeggingScore.points} ({lastPeggingScore.reason})
              </div>
            )}
          </div>
        );

      case "SHOW":
        return (
          <div className="cribbage__show-phase">
            <h3>Showing Hands</h3>
            {showingHand !== null && (
              <p>{playerNames[showingHand]} is showing their hand</p>
            )}
            <button className="cribbage__action-btn" onClick={handleConfirmShow}>
              Continue
            </button>
          </div>
        );

      case "CRIB_SHOW":
        return (
          <div className="cribbage__crib-show-phase">
            <h3>Counting the Crib</h3>
            <p>{playerNames[dealerIndex]}'s crib</p>
            <button className="cribbage__action-btn" onClick={handleConfirmShow}>
              Continue
            </button>
          </div>
        );

      case "ROUND_END":
        return (
          <div className="cribbage__round-end">
            <h3>Round {round} Complete!</h3>
            <div className="cribbage__round-scores">
              <p>{playerNames[0]}: {scores[0]} points</p>
              <p>{playerNames[1]}: {scores[1]} points</p>
            </div>
            {isHost && (
              <button className="cribbage__action-btn" onClick={handleNextRound}>
                Next Round
              </button>
            )}
          </div>
        );

      case "GAME_END":
        const winner = scores[0] >= targetScore ? 0 : 1;
        const isWinner = winner === myIndex;
        return (
          <div className="cribbage__game-end">
            <h2>{isWinner ? "You Win!" : "You Lose"}</h2>
            <p>{playerNames[winner]} wins with {scores[winner]} points!</p>
            <div className="cribbage__final-scores">
              <p>{playerNames[0]}: {scores[0]}</p>
              <p>{playerNames[1]}: {scores[1]}</p>
            </div>
          </div>
        );

      default:
        return <div>Unknown phase: {phase}</div>;
    }
  };

  // Render opponent's area
  const renderOpponentArea = () => {
    const cardCount = phase === "PEGGING" ? opponentPegHandCount : opponentHandCount;

    return (
      <div className="cribbage__opponent-area">
        <div className="cribbage__opponent-info">
          <span className="cribbage__player-name">{playerNames[opponentIndex]}</span>
          {dealerIndex === opponentIndex && <span className="cribbage__dealer-badge">Dealer</span>}
          {turnIndex === opponentIndex && phase === "PEGGING" && (
            <span className="cribbage__turn-indicator">Their turn</span>
          )}
        </div>
        <div className="cribbage__opponent-hand">
          {Array.from({ length: cardCount }).map((_, i) => (
            <Card key={i} faceUp={false} size="sm" />
          ))}
        </div>
      </div>
    );
  };

  // Render play area (center table)
  const renderPlayArea = () => {
    return (
      <div className="cribbage__play-area">
        {/* Crib */}
        <div className="cribbage__crib-area">
          <CardStack
            cards={phase === "CRIB_SHOW" ? crib : Array(crib.length).fill(null)}
            faceUp={phase === "CRIB_SHOW"}
            size="sm"
            label={`Crib (${isDealer ? "yours" : "theirs"})`}
          />
        </div>

        {/* Starter card */}
        <div className="cribbage__starter-area">
          {starter ? (
            <Card cardId={starter} faceUp={true} size="md" />
          ) : (
            <div className="cribbage__deck-placeholder">
              <Card faceUp={false} size="md" />
            </div>
          )}
          {starter && <div className="cribbage__starter-label">Starter</div>}
        </div>

        {/* Play stack during pegging */}
        {phase === "PEGGING" && playStack.length > 0 && (
          <div className="cribbage__play-stack">
            <Hand
              cards={playStack}
              faceUp={true}
              size="sm"
              overlap={0.3}
            />
            <div className="cribbage__count-display">Count: {playCount}</div>
          </div>
        )}
      </div>
    );
  };

  // Render my hand area
  const renderMyArea = () => {
    const cardsToShow = phase === "PEGGING" ? myPegHand : myHand;
    const disabledCards = phase === "PEGGING"
      ? cardsToShow.filter((c) => !playableCards.includes(c))
      : [];

    return (
      <div className="cribbage__my-area">
        <div className="cribbage__my-info">
          <span className="cribbage__player-name">{playerNames[myIndex]} (You)</span>
          {isDealer && <span className="cribbage__dealer-badge">Dealer</span>}
          {isMyTurn && phase === "PEGGING" && (
            <span className="cribbage__turn-indicator">Your turn</span>
          )}
        </div>
        <div className="cribbage__my-hand">
          <Hand
            cards={cardsToShow}
            faceUp={true}
            selectedIds={phase === "DISCARD" ? selectedCards : []}
            onCardClick={phase === "DISCARD" ? handleCardClick : phase === "PEGGING" && isMyTurn ? handlePlayCard : undefined}
            disabledIds={disabledCards}
            size="lg"
            overlap={0.4}
          />
        </div>
      </div>
    );
  };

  return (
    <TableSurface className="cribbage">
      <div className="cribbage__layout">
        {/* Score track sidebar */}
        <div className="cribbage__sidebar">
          <CribbageScoreTrack
            scores={scores}
            previousScores={previousScores}
            playerNames={playerNames}
            targetScore={targetScore}
            compact={true}
          />
        </div>

        {/* Main game area */}
        <div className="cribbage__main">
          {renderOpponentArea()}
          {renderPlayArea()}
          {renderPhaseContent()}
          {renderMyArea()}
        </div>
      </div>
    </TableSurface>
  );
}
