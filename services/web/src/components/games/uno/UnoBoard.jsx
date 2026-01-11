import { useEffect, useMemo, useState } from "react";

const COLOR_LABELS = {
  red: "Red",
  yellow: "Yellow",
  green: "Green",
  blue: "Blue",
  wild: "Wild",
};

const COLOR_CLASSES = {
  red: "uno-color-red",
  yellow: "uno-color-yellow",
  green: "uno-color-green",
  blue: "uno-color-blue",
};

export default function UnoBoard({ state, playerId, onAction, isHost }) {
  const currentPlayerId = state.currentPlayer;
  const isMyTurn = currentPlayerId === playerId;

  const playableAction = state.availableActions?.find((a) => a.type === "PLAY_CARD");
  const playableSet = useMemo(
    () => new Set(playableAction?.playable || []),
    [playableAction]
  );

  const drawAction = state.availableActions?.find((a) => a.type === "DRAW_CARD");
  const passAction = state.availableActions?.find((a) => a.type === "PASS");
  const chooseColorAction = state.availableActions?.find((a) => a.type === "CHOOSE_COLOR");
  const unoAction = state.availableActions?.find((a) => a.type === "CALL_UNO");

  const [rulesDraft, setRulesDraft] = useState(() => ({
    drawThenPlay: state.rules?.drawThenPlay ?? true,
    stacking: state.rules?.stacking ?? false,
    unoCall: state.rules?.unoCall ?? true,
    challengeDraw4: state.rules?.challengeDraw4 ?? false,
  }));

  useEffect(() => {
    if (state.rules) {
      setRulesDraft({
        drawThenPlay: state.rules.drawThenPlay ?? true,
        stacking: state.rules.stacking ?? false,
        unoCall: state.rules.unoCall ?? true,
        challengeDraw4: state.rules.challengeDraw4 ?? false,
      });
    }
  }, [state.rules]);

  const handlePlayCard = (cardId) => {
    if (!playableSet.has(cardId)) return;
    onAction({ type: "PLAY_CARD", cardId });
  };

  // Get turn status message
  const getTurnMessage = () => {
    if (state.phase === "COLOR_CHOICE") {
      const chooser = getPlayerName(state, state.pendingColorChoiceFor);
      if (state.pendingColorChoiceFor === playerId) {
        return "Choose a color!";
      }
      return `${chooser} is choosing a color...`;
    }
    if (state.phase === "FINISHED") {
      return state.winner === playerId ? "You won!" : `${getPlayerName(state, state.winner)} wins!`;
    }
    if (isMyTurn) {
      if (state.pendingDraw > 0) {
        return `You must draw ${state.pendingDraw} cards!`;
      }
      return "Your turn";
    }
    return `Waiting for ${getPlayerName(state, currentPlayerId)}`;
  };

  // Check if any opponent has UNO
  const opponentsWithUno = state.players.filter(
    (p) => p.playerId !== playerId && p.hasUno
  );

  return (
    <div className="uno-board">
      {/* Winner overlay */}
      {state.phase === "FINISHED" && state.winner && (
        <div className="uno-winner-overlay">
          <div className="uno-winner-modal">
            <div className="uno-winner-title">
              {state.winner === playerId ? "You Win!" : `${getPlayerName(state, state.winner)} Wins!`}
            </div>
            <div className="uno-winner-subtitle">Game Over</div>
          </div>
        </div>
      )}

      {/* Header with turn info, direction, and current color */}
      <div className="uno-header">
        <div className="uno-status">
          <div className={`uno-turn-msg ${isMyTurn ? "your-turn" : ""}`}>
            {getTurnMessage()}
          </div>
          {state.phase !== "LOBBY" && state.phase !== "FINISHED" && (
            <div className="uno-direction">
              <span className="uno-direction-label">Direction:</span>
              <span className={`uno-direction-arrow ${state.direction === 1 ? "cw" : "ccw"}`}>
                {state.direction === 1 ? "Clockwise" : "Counter-clockwise"}
              </span>
            </div>
          )}
        </div>
        {state.currentColor && (
          <div className={`uno-current-color ${COLOR_CLASSES[state.currentColor] || ""}`}>
            {COLOR_LABELS[state.currentColor]}
          </div>
        )}
      </div>

      {/* Pending draw indicator */}
      {state.pendingDraw > 0 && state.phase !== "LOBBY" && (
        <div className="uno-pending-draw">
          <span className="uno-pending-icon">+{state.pendingDraw}</span>
          <span className="uno-pending-text">
            {state.pendingDrawType === "draw4" ? "Wild Draw Four" : "Draw Two"} Stack
          </span>
        </div>
      )}

      <div className="uno-table">
        {/* Lobby rules configuration */}
        {state.phase === "LOBBY" && (
          <div className="uno-rules">
            <div className="uno-rules-title">House Rules</div>
            <label className="uno-rule">
              <input
                type="checkbox"
                checked={rulesDraft.drawThenPlay}
                onChange={(e) => setRulesDraft({ ...rulesDraft, drawThenPlay: e.target.checked })}
                disabled={!isHost}
              />
              Draw then play (if playable)
            </label>
            <label className="uno-rule">
              <input
                type="checkbox"
                checked={rulesDraft.stacking}
                onChange={(e) => setRulesDraft({ ...rulesDraft, stacking: e.target.checked })}
                disabled={!isHost}
              />
              Stacking Draw 2 / Draw 4
            </label>
            <label className="uno-rule">
              <input
                type="checkbox"
                checked={rulesDraft.unoCall}
                onChange={(e) => setRulesDraft({ ...rulesDraft, unoCall: e.target.checked })}
                disabled={!isHost}
              />
              UNO call required
            </label>
            <label className="uno-rule disabled-rule">
              <input
                type="checkbox"
                checked={rulesDraft.challengeDraw4}
                onChange={(e) => setRulesDraft({ ...rulesDraft, challengeDraw4: e.target.checked })}
                disabled
              />
              Wild Draw 4 challenge (coming soon)
            </label>
            {isHost && (
              <button
                className="uno-btn uno-btn-rules"
                onClick={() => onAction({ type: "SET_RULES", rules: rulesDraft })}
              >
                Update Rules
              </button>
            )}
          </div>
        )}

        {/* Opponents display */}
        <div className="uno-opponents">
          {state.players
            .filter((p) => p.playerId !== playerId)
            .map((p) => (
              <div
                key={p.playerId}
                className={`uno-opponent ${p.playerId === currentPlayerId ? "active" : ""}`}
              >
                <div className="uno-opponent-info">
                  <span className="uno-opponent-name">{p.displayName}</span>
                  <span className="uno-opponent-count">{p.handCount} cards</span>
                </div>
                {p.hasUno && (
                  <span className="uno-opponent-uno">UNO!</span>
                )}
              </div>
            ))}
        </div>

        {/* Draw and discard piles */}
        <div className="uno-piles">
          <div className="uno-pile">
            <div className="uno-pile-label">Draw ({state.drawCount})</div>
            <div className="uno-card back">
              <div className="uno-card-back-design">UNO</div>
            </div>
          </div>
          <div className="uno-pile">
            <div className="uno-pile-label">Discard</div>
            {state.discardTop ? (
              <CardView card={state.discardTop} />
            ) : (
              <div className="uno-card empty">Empty</div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="uno-actions">
          {drawAction && isMyTurn && (
            <button
              className={`uno-btn uno-btn-draw ${state.pendingDraw > 0 ? "forced" : ""}`}
              onClick={() => onAction({ type: "DRAW_CARD" })}
            >
              Draw {drawAction.count || 1}
            </button>
          )}
          {passAction && isMyTurn && (
            <button className="uno-btn uno-btn-pass" onClick={() => onAction({ type: "PASS" })}>
              Pass
            </button>
          )}
          {unoAction && (
            <button className="uno-btn uno-btn-uno" onClick={() => onAction({ type: "CALL_UNO" })}>
              UNO!
            </button>
          )}
          {chooseColorAction && (
            <div className="uno-color-picker">
              <div className="uno-color-picker-label">Choose a color:</div>
              <div className="uno-color-buttons">
                {chooseColorAction.colors.map((color) => (
                  <button
                    key={color}
                    className={`uno-color-btn ${color}`}
                    onClick={() => onAction({ type: "CHOOSE_COLOR", color })}
                  >
                    {COLOR_LABELS[color]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Player's hand */}
      <div className="uno-hand-section">
        <div className="uno-hand-label">Your Hand ({state.hand?.length || 0})</div>
        <div className="uno-hand">
          {state.hand?.map((card) => {
            const canPlay = playableSet.has(card.id) && isMyTurn;
            return (
              <button
                key={card.id}
                className={`uno-card ${card.color} ${canPlay ? "playable" : ""}`}
                onClick={() => handlePlayCard(card.id)}
                disabled={!canPlay}
              >
                <CardImage card={card} />
              </button>
            );
          })}
          {(!state.hand || state.hand.length === 0) && (
            <div className="uno-hand-empty">No cards</div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatCardValue(card) {
  if (!card) return "";
  if (card.type === "number") return card.value;
  if (card.type === "draw2") return "+2";
  if (card.type === "draw4") return "+4";
  if (card.type === "reverse") return "Rev";
  if (card.type === "skip") return "Skip";
  if (card.type === "wild") return "Wild";
  return card.value || card.type;
}

function getPlayerName(state, playerId) {
  return state.players.find((p) => p.playerId === playerId)?.displayName || "player";
}

function CardView({ card }) {
  return (
    <div className={`uno-card ${card.color}`}>
      <CardImage card={card} />
    </div>
  );
}

function CardImage({ card }) {
  const image = getCardImage(card);
  if (image) {
    return <img src={image} alt={formatCardValue(card)} className="uno-card-img" />;
  }
  return <span className="uno-card-value">{formatCardValue(card)}</span>;
}

function getCardImage(card) {
  if (!card) return null;

  if (card.type === "wild") return "/uno/cards/others/Xwild.png";
  if (card.type === "draw4") return "/uno/cards/others/X+4.png";

  const color = card.color;
  if (!color) return null;

  if (card.type === "number") {
    return `/uno/cards/${color}/${color}${card.value}.png`;
  }

  if (card.type === "draw2") {
    if (color === "blue") return "/uno/cards/blue/BluePlus2.png";
    return `/uno/cards/${color}/${color}Plus2.png`;
  }

  if (card.type === "reverse") {
    if (color === "blue") return "/uno/cards/blue/BlueRev.png";
    return `/uno/cards/${color}/${color}Rev.png`;
  }

  if (card.type === "skip") {
    return `/uno/cards/${color}/${color}Skip.png`;
  }

  return null;
}
