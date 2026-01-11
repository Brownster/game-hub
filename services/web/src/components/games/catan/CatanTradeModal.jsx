import { useState } from "react";
import { getResourceIcon } from "../../../utils/hexMath";

const RESOURCES = ["wood", "brick", "sheep", "wheat", "ore"];

export default function CatanTradeModal({
  myResources,
  players,
  availableActions,
  onTrade,
  onClose,
}) {
  const [tradeType, setTradeType] = useState("bank"); // "bank" or "player"
  const [bankGive, setBankGive] = useState(null);
  const [bankReceive, setBankReceive] = useState(null);
  const [playerTarget, setPlayerTarget] = useState(null);
  const [offer, setOffer] = useState({});
  const [request, setRequest] = useState({});

  // Get bank trade options
  const bankTradeAction = availableActions.find((a) => a.type === "BANK_TRADE");
  const bankTrades = bankTradeAction?.trades || [];

  // Get available ratios per resource
  const getRatio = (resource) => {
    const trade = bankTrades.find((t) => t.give === resource);
    return trade?.ratio || 4;
  };

  // Handle bank trade
  const handleBankTrade = () => {
    if (bankGive && bankReceive && bankGive !== bankReceive) {
      onTrade("bank", { give: bankGive, receive: bankReceive });
    }
  };

  // Handle player trade proposal
  const handlePlayerTrade = () => {
    if (playerTarget && hasOfferOrRequest()) {
      onTrade("player", { toPlayerId: playerTarget, offer, request });
    }
  };

  const hasOfferOrRequest = () => {
    const offerTotal = Object.values(offer).reduce((a, b) => a + b, 0);
    const requestTotal = Object.values(request).reduce((a, b) => a + b, 0);
    return offerTotal > 0 && requestTotal > 0;
  };

  // Update offer/request counts
  const updateOffer = (resource, delta) => {
    const current = offer[resource] || 0;
    const max = myResources[resource] || 0;
    const newVal = Math.max(0, Math.min(max, current + delta));
    setOffer({ ...offer, [resource]: newVal });
  };

  const updateRequest = (resource, delta) => {
    const current = request[resource] || 0;
    const newVal = Math.max(0, current + delta);
    setRequest({ ...request, [resource]: newVal });
  };

  return (
    <div className="catan-modal-overlay" onClick={onClose}>
      <div className="catan-trade-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Trade</h3>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="trade-type-tabs">
          <button
            className={tradeType === "bank" ? "active" : ""}
            onClick={() => setTradeType("bank")}
          >
            Bank Trade
          </button>
          <button
            className={tradeType === "player" ? "active" : ""}
            onClick={() => setTradeType("player")}
          >
            Player Trade
          </button>
        </div>

        {tradeType === "bank" && (
          <div className="bank-trade-section">
            <p>Trade with the bank at your best available ratio:</p>

            <div className="trade-row">
              <div className="trade-give">
                <h4>Give</h4>
                <div className="resource-select">
                  {RESOURCES.map((r) => {
                    const ratio = getRatio(r);
                    const canAfford = (myResources[r] || 0) >= ratio;
                    return (
                      <button
                        key={r}
                        className={`resource-btn ${bankGive === r ? "selected" : ""} ${!canAfford ? "disabled" : ""}`}
                        onClick={() => canAfford && setBankGive(r)}
                        disabled={!canAfford}
                      >
                        <img src={getResourceIcon(r)} alt={r} />
                        <span className="ratio">{ratio}:1</span>
                        <span className="have">({myResources[r] || 0})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="trade-arrow">&rarr;</div>

              <div className="trade-receive">
                <h4>Receive</h4>
                <div className="resource-select">
                  {RESOURCES.map((r) => (
                    <button
                      key={r}
                      className={`resource-btn ${bankReceive === r ? "selected" : ""} ${r === bankGive ? "disabled" : ""}`}
                      onClick={() => r !== bankGive && setBankReceive(r)}
                      disabled={r === bankGive}
                    >
                      <img src={getResourceIcon(r)} alt={r} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              className="trade-btn"
              onClick={handleBankTrade}
              disabled={!bankGive || !bankReceive || bankGive === bankReceive}
            >
              Trade
            </button>
          </div>
        )}

        {tradeType === "player" && (
          <div className="player-trade-section">
            <div className="player-select">
              <h4>Trade with:</h4>
              <div className="player-buttons">
                {players.map((p) => (
                  <button
                    key={p.playerId}
                    className={playerTarget === p.playerId ? "selected" : ""}
                    onClick={() => setPlayerTarget(p.playerId)}
                  >
                    {p.displayName}
                  </button>
                ))}
              </div>
            </div>

            <div className="trade-row">
              <div className="trade-offer">
                <h4>You Offer</h4>
                {RESOURCES.map((r) => (
                  <div key={r} className="resource-counter">
                    <img src={getResourceIcon(r)} alt={r} />
                    <button onClick={() => updateOffer(r, -1)} disabled={(offer[r] || 0) <= 0}>
                      -
                    </button>
                    <span>{offer[r] || 0}</span>
                    <button
                      onClick={() => updateOffer(r, 1)}
                      disabled={(offer[r] || 0) >= (myResources[r] || 0)}
                    >
                      +
                    </button>
                    <span className="have">/{myResources[r] || 0}</span>
                  </div>
                ))}
              </div>

              <div className="trade-arrow">&harr;</div>

              <div className="trade-request">
                <h4>You Request</h4>
                {RESOURCES.map((r) => (
                  <div key={r} className="resource-counter">
                    <img src={getResourceIcon(r)} alt={r} />
                    <button onClick={() => updateRequest(r, -1)} disabled={(request[r] || 0) <= 0}>
                      -
                    </button>
                    <span>{request[r] || 0}</span>
                    <button onClick={() => updateRequest(r, 1)}>+</button>
                  </div>
                ))}
              </div>
            </div>

            <button
              className="trade-btn"
              onClick={handlePlayerTrade}
              disabled={!playerTarget || !hasOfferOrRequest()}
            >
              Propose Trade
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
