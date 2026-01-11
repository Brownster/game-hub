import React, { useMemo, useState } from "react";
import TableSurface from "../../cards/TableSurface.jsx";
import Card from "../../cards/Card.jsx";
import Hand from "../../cards/Hand.jsx";

const SUIT_LABELS = {
  C: "Clubs",
  D: "Diamonds",
  H: "Hearts",
  S: "Spades",
};

function parseCardId(cardId) {
  const suit = cardId.slice(-1);
  const rank = cardId.slice(0, -1);
  return { suit, rank };
}

export default function CrazyEightsBoard({ state, playerId, onAction }) {
  const [pendingEight, setPendingEight] = useState(null);
  const me = state.players.find((p) => p.playerId === playerId);
  const myHand = state.hand || [];
  const isMyTurn = state.phase === "TURN" && state.currentPlayer === playerId;

  const playableAction = state.availableActions?.find((a) => a.type === "PLAY_CARD");
  const drawAction = state.availableActions?.find((a) => a.type === "DRAW_CARD");
  const passAction = state.availableActions?.find((a) => a.type === "PASS");
  const playableIds = playableAction?.playable || [];

  const disabledIds = useMemo(() => {
    if (!isMyTurn) return myHand;
    if (playableIds.length === 0) return [];
    return myHand.filter((cardId) => !playableIds.includes(cardId));
  }, [isMyTurn, myHand, playableIds]);

  const opponents = state.players.filter((p) => p.playerId !== playerId);
  const winner = state.winner
    ? state.players.find((p) => p.playerId === state.winner)
    : null;

  const handleCardClick = (cardId) => {
    if (!isMyTurn) return;
    if (playableIds.length > 0 && !playableIds.includes(cardId)) return;

    const { rank } = parseCardId(cardId);
    if (rank === "8") {
      setPendingEight(cardId);
      return;
    }

    onAction({ type: "PLAY_CARD", cardId });
  };

  const handleSuitChoice = (suit) => {
    if (!pendingEight) return;
    onAction({ type: "PLAY_CARD", cardId: pendingEight, declaredSuit: suit });
    setPendingEight(null);
  };

  return (
    <TableSurface className="crazy-eights">
      <div className="crazy-eights__layout">
        <header className="crazy-eights__header">
          <div className="crazy-eights__title">Crazy Eights</div>
          <div className="crazy-eights__status">
            <span className={`crazy-eights__suit suit-${state.currentSuit || "none"}`}>
              Current suit: {SUIT_LABELS[state.currentSuit] || "None"}
            </span>
            {isMyTurn ? <span className="crazy-eights__turn you">Your turn</span> : (
              <span className="crazy-eights__turn">Waiting...</span>
            )}
          </div>
        </header>

        <section className="crazy-eights__opponents">
          {opponents.map((p) => (
            <div
              key={p.playerId}
              className={`crazy-eights__opponent ${state.currentPlayer === p.playerId ? "active" : ""}`}
            >
              <div className="crazy-eights__opponent-name">{p.displayName}</div>
              <div className="crazy-eights__opponent-count">{p.handCount} cards</div>
            </div>
          ))}
        </section>

        <section className="crazy-eights__table">
          <div className="crazy-eights__pile">
            <div className="crazy-eights__pile-label">Draw</div>
            <Card faceUp={false} size="md" />
            <div className="crazy-eights__pile-count">{state.drawCount} cards</div>
          </div>

          <div className="crazy-eights__pile">
            <div className="crazy-eights__pile-label">Discard</div>
            {state.discardTop ? (
              <Card cardId={state.discardTop} size="md" />
            ) : (
              <div className="crazy-eights__empty-pile">Empty</div>
            )}
          </div>
        </section>

        <section className="crazy-eights__actions">
          <button
            className="crazy-eights__btn"
            onClick={() => onAction({ type: "DRAW_CARD" })}
            disabled={!drawAction || !isMyTurn}
          >
            Draw Card
          </button>
          <button
            className="crazy-eights__btn secondary"
            onClick={() => onAction({ type: "PASS" })}
            disabled={!passAction || !isMyTurn}
          >
            Pass
          </button>
        </section>

        {pendingEight && (
          <section className="crazy-eights__suit-picker">
            <div className="crazy-eights__suit-title">Choose a suit</div>
            <div className="crazy-eights__suit-options">
              {Object.entries(SUIT_LABELS).map(([suit, label]) => (
                <button
                  key={suit}
                  className={`crazy-eights__suit-btn suit-${suit}`}
                  onClick={() => handleSuitChoice(suit)}
                >
                  {label}
                </button>
              ))}
              <button
                className="crazy-eights__suit-btn cancel"
                onClick={() => setPendingEight(null)}
              >
                Cancel
              </button>
            </div>
          </section>
        )}

        <section className="crazy-eights__hand">
          <div className="crazy-eights__hand-label">{me?.displayName || "You"}</div>
          {myHand.length === 0 ? (
            <div className="crazy-eights__hand-empty">No cards</div>
          ) : (
            <Hand
              cards={myHand}
              faceUp
              onCardClick={handleCardClick}
              disabledIds={disabledIds}
              overlap={0.35}
              fanAngle={12}
              size="md"
            />
          )}
        </section>
      </div>

      {state.phase === "FINISHED" && winner && (
        <div className="crazy-eights__winner">
          <div className="crazy-eights__winner-card">
            <div className="crazy-eights__winner-title">Game Over</div>
            <div className="crazy-eights__winner-name">{winner.displayName} wins!</div>
          </div>
        </div>
      )}
    </TableSurface>
  );
}
