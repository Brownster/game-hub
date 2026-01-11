import { useEffect, useMemo, useState } from "react";

const RESOURCES = ["wood", "brick", "sheep", "wheat", "ore"];

export default function CatanActionPanel({
  phase,
  isMyTurn,
  availableActions,
  interactionMode,
  onAction,
  myPlayer,
}) {
  const hasAction = (type) => availableActions.some((a) => a.type === type);
  const discardAction = availableActions.find((a) => a.type === "DISCARD_RESOURCES");
  const discardCount = discardAction?.count || 0;
  const resources = myPlayer?.resources || {};

  const [discardSelection, setDiscardSelection] = useState({});

  useEffect(() => {
    if (phase !== "DISCARD") {
      setDiscardSelection({});
    }
  }, [phase]);

  const selectedDiscardCount = useMemo(
    () => Object.values(discardSelection).reduce((sum, count) => sum + count, 0),
    [discardSelection]
  );

  const updateDiscard = (resource, delta) => {
    const current = discardSelection[resource] || 0;
    const max = resources[resource] || 0;
    const next = Math.max(0, Math.min(max, current + delta));
    setDiscardSelection({ ...discardSelection, [resource]: next });
  };

  // Setup phases - no panel needed, interaction is on board
  if (phase === "LOBBY") {
    return (
      <div className="catan-action-panel waiting">
        <p>Waiting for host to start the game...</p>
      </div>
    );
  }

  // Setup phases - no panel needed, interaction is on board
  if (phase.startsWith("SETUP_")) {
    return (
      <div className="catan-action-panel setup">
        <p>Click on the board to place your {phase.includes("SETTLEMENT") ? "settlement" : "road"}</p>
      </div>
    );
  }

  // Discard phase
  if (phase === "DISCARD") {
    return (
      <div className="catan-action-panel discard">
        {discardAction ? (
          <>
            <p>Discard exactly {discardCount} resources</p>
            <div className="discard-grid">
              {RESOURCES.map((resource) => {
                const have = resources[resource] || 0;
                const selected = discardSelection[resource] || 0;
                return (
                  <div key={resource} className="discard-row">
                    <img src={`/catan/icons/icon-${resource}.svg`} alt="" />
                    <span className="discard-name">{resource}</span>
                    <button onClick={() => updateDiscard(resource, -1)} disabled={selected <= 0}>
                      -
                    </button>
                    <span className="discard-count">{selected}</span>
                    <button
                      onClick={() => updateDiscard(resource, 1)}
                      disabled={have <= selected || selectedDiscardCount >= discardCount}
                    >
                      +
                    </button>
                    <span className="discard-have">/{have}</span>
                  </div>
                );
              })}
            </div>
            <button
              className="action-btn discard-btn"
              onClick={() => onAction({ type: "DISCARD_RESOURCES", resources: discardSelection })}
              disabled={selectedDiscardCount !== discardCount}
            >
              Discard
            </button>
          </>
        ) : (
          <p>Waiting for other players to discard</p>
        )}
      </div>
    );
  }

  // Robber phases
  if (phase === "ROBBER_MOVE") {
    return (
      <div className="catan-action-panel robber">
        <p>Click on a tile to move the robber</p>
      </div>
    );
  }

  if (phase === "ROBBER_STEAL") {
    const stealAction = availableActions.find((a) => a.type === "STEAL_RESOURCE");
    return (
      <div className="catan-action-panel steal">
        <p>Select a player to steal from:</p>
        <div className="steal-targets">
          {stealAction?.targets?.map((targetId) => (
            <button key={targetId} onClick={() => onAction({ type: "STEAL_RESOURCE", targetPlayerId: targetId })}>
              Steal
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Game finished
  if (phase === "FINISHED") {
    return (
      <div className="catan-action-panel finished">
        <p>Game Over!</p>
      </div>
    );
  }

  // Roll phase
  if (phase === "ROLL" && isMyTurn) {
    return (
      <div className="catan-action-panel roll">
        <button className="action-btn roll-btn" onClick={() => onAction("roll")}>
          Roll Dice
        </button>
        {hasAction("PLAY_DEV_CARD") && (
          <p className="hint">You can play a development card before rolling</p>
        )}
      </div>
    );
  }

  // Main phase - show build options
  if (phase === "MAIN" && isMyTurn) {
    // If in interaction mode, show cancel button
    if (interactionMode) {
      return (
        <div className="catan-action-panel interaction">
          <p>
            {interactionMode === "buildRoad" && "Click on a valid edge to build a road"}
            {interactionMode === "buildSettlement" && "Click on a valid corner to build a settlement"}
            {interactionMode === "buildCity" && "Click on a settlement to upgrade to city"}
          </p>
          <button className="action-btn cancel-btn" onClick={() => onAction("cancel")}>
            Cancel
          </button>
        </div>
      );
    }

    return (
      <div className="catan-action-panel main">
        <div className="action-buttons">
          {hasAction("BUILD_ROAD") && (
            <button
              className="action-btn build-btn"
              onClick={() => onAction("buildRoad")}
              title="Wood + Brick"
            >
              <img src="/catan/icons/icon-wood.svg" alt="" />
              Road
            </button>
          )}

          {hasAction("BUILD_SETTLEMENT") && (
            <button
              className="action-btn build-btn"
              onClick={() => onAction("buildSettlement")}
              title="Wood + Brick + Sheep + Wheat"
            >
              <img src="/catan/icons/icon-settlement.svg" alt="" />
              Settlement
            </button>
          )}

          {hasAction("BUILD_CITY") && (
            <button
              className="action-btn build-btn"
              onClick={() => onAction("buildCity")}
              title="2 Wheat + 3 Ore"
            >
              <img src="/catan/icons/icon-city.svg" alt="" />
              City
            </button>
          )}

          {hasAction("BUY_DEV_CARD") && (
            <button
              className="action-btn dev-btn"
              onClick={() => onAction("buyDevCard")}
              title="Sheep + Wheat + Ore"
            >
              Dev Card
            </button>
          )}

          {hasAction("BANK_TRADE") && (
            <button className="action-btn trade-btn" onClick={() => onAction("trade")}>
              Trade
            </button>
          )}

          {hasAction("END_TURN") && (
            <button className="action-btn end-btn" onClick={() => onAction("endTurn")}>
              End Turn
            </button>
          )}
        </div>

        {/* Dev card play buttons */}
        {hasAction("PLAY_DEV_CARD") && myPlayer?.devCards?.length > 0 && (
          <div className="dev-card-actions">
            <DevCardButtons
              devCards={myPlayer.devCards}
              availableCards={availableActions.find((a) => a.type === "PLAY_DEV_CARD")?.cards || []}
              onPlay={onAction}
            />
          </div>
        )}
      </div>
    );
  }

  // Not my turn
  if (!isMyTurn) {
    return (
      <div className="catan-action-panel waiting">
        <p>Waiting for other player...</p>
      </div>
    );
  }

  return null;
}

function DevCardButtons({ devCards, availableCards, onPlay }) {
  const playableTypes = new Set(availableCards);

  if (playableTypes.size === 0) return null;

  return (
    <div className="dev-card-buttons">
      <span>Play dev card:</span>
      {playableTypes.has("knight") && (
        <button onClick={() => onPlay({ type: "PLAY_DEV_CARD", cardType: "knight" })}>
          <img src="/catan/icons/icon-knight.svg" alt="" /> Knight
        </button>
      )}
      {playableTypes.has("roadBuilding") && (
        <button onClick={() => onPlay({ type: "PLAY_DEV_CARD", cardType: "roadBuilding" })}>
          <img src="/catan/icons/icon-road-building.svg" alt="" /> Roads
        </button>
      )}
      {playableTypes.has("yearOfPlenty") && (
        <button onClick={() => onPlay({ type: "PLAY_DEV_CARD", cardType: "yearOfPlenty" })}>
          <img src="/catan/icons/icon-year-of-plenty.svg" alt="" /> Year of Plenty
        </button>
      )}
      {playableTypes.has("monopoly") && (
        <button onClick={() => onPlay({ type: "PLAY_DEV_CARD", cardType: "monopoly" })}>
          <img src="/catan/icons/icon-monopoly.svg" alt="" /> Monopoly
        </button>
      )}
    </div>
  );
}
