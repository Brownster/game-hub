import { useState, useCallback, useMemo, useEffect } from "react";
import HexGrid from "../../board/HexGrid";
import CatanPlayerStrip from "./CatanPlayerStrip";
import CatanActionPanel from "./CatanActionPanel";
import CatanResourceHand from "./CatanResourceHand";
import CatanTradeModal from "./CatanTradeModal";
import CatanDice from "./CatanDice";

export default function CatanBoard({ state, playerId, onAction }) {
  const [interactionMode, setInteractionMode] = useState(null);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [selectedTradeTarget, setSelectedTradeTarget] = useState(null);

  const myPlayer = useMemo(
    () => state.players.find((p) => p.playerId === playerId),
    [state.players, playerId]
  );

  const isMyTurn = state.currentPlayer === playerId;

  // Process board data with player colors
  const processedCorners = useMemo(() => {
    return state.board.corners.map((corner) => {
      if (corner.playerId) {
        const player = state.players.find((p) => p.playerId === corner.playerId);
        return { ...corner, color: player?.color };
      }
      return corner;
    });
  }, [state.board.corners, state.players]);

  const processedEdges = useMemo(() => {
    return state.board.edges.map((edge) => {
      if (edge.playerId) {
        const player = state.players.find((p) => p.playerId === edge.playerId);
        return { ...edge, color: player?.color };
      }
      return edge;
    });
  }, [state.board.edges, state.players]);

  // Get highlights based on interaction mode
  const getHighlights = useCallback(() => {
    if (!isMyTurn || !state.availableActions) {
      return { tiles: [], corners: [], edges: [] };
    }

    const tiles = [];
    const corners = [];
    const edges = [];

    for (const action of state.availableActions) {
      if (interactionMode === "buildSettlement" || interactionMode === "placeSettlement") {
        if (action.type === "PLACE_SETTLEMENT" || action.type === "BUILD_SETTLEMENT") {
          corners.push(...(action.validCorners || []));
        }
      } else if (interactionMode === "buildRoad" || interactionMode === "placeRoad") {
        if (action.type === "PLACE_ROAD" || action.type === "BUILD_ROAD") {
          edges.push(...(action.validEdges || []));
        }
      } else if (interactionMode === "buildCity") {
        if (action.type === "BUILD_CITY") {
          corners.push(...(action.validCorners || []));
        }
      } else if (interactionMode === "moveRobber") {
        if (action.type === "MOVE_ROBBER") {
          tiles.push(...(action.validTiles || []));
        }
      }
    }

    return { tiles, corners, edges };
  }, [interactionMode, isMyTurn, state.availableActions]);

  const highlights = getHighlights();

  // Handle tile click (for robber)
  const handleTileClick = useCallback(
    (tileId) => {
      if (interactionMode === "moveRobber") {
        onAction({ type: "MOVE_ROBBER", tileId });
        setInteractionMode(null);
      }
    },
    [interactionMode, onAction]
  );

  // Handle corner click (settlements/cities)
  const handleCornerClick = useCallback(
    (cornerId) => {
      if (interactionMode === "placeSettlement") {
        onAction({ type: "PLACE_SETTLEMENT", cornerId });
        setInteractionMode(null);
      } else if (interactionMode === "buildSettlement") {
        onAction({ type: "BUILD_SETTLEMENT", cornerId });
        setInteractionMode(null);
      } else if (interactionMode === "buildCity") {
        onAction({ type: "BUILD_CITY", cornerId });
        setInteractionMode(null);
      }
    },
    [interactionMode, onAction]
  );

  // Handle edge click (roads)
  const handleEdgeClick = useCallback(
    (edgeId) => {
      if (interactionMode === "placeRoad") {
        onAction({ type: "PLACE_ROAD", edgeId });
        setInteractionMode(null);
      } else if (interactionMode === "buildRoad") {
        onAction({ type: "BUILD_ROAD", edgeId });
        setInteractionMode(null);
      }
    },
    [interactionMode, onAction]
  );

  // Auto-set interaction mode based on phase
  useEffect(() => {
    if (!isMyTurn) {
      setInteractionMode(null);
      return;
    }

    if (state.phase === "SETUP_SETTLEMENT_1" || state.phase === "SETUP_SETTLEMENT_2") {
      setInteractionMode("placeSettlement");
    } else if (state.phase === "SETUP_ROAD_1" || state.phase === "SETUP_ROAD_2") {
      setInteractionMode("placeRoad");
    } else if (state.phase === "ROBBER_MOVE") {
      setInteractionMode("moveRobber");
    } else if (interactionMode && !["buildSettlement", "buildRoad", "buildCity"].includes(interactionMode)) {
      setInteractionMode(null);
    }
  }, [state.phase, isMyTurn, interactionMode]);

  // Handle action button clicks
  const handleActionButton = useCallback(
    (actionInput) => {
      if (actionInput && typeof actionInput === "object" && actionInput.type) {
        onAction(actionInput);
        return;
      }

      switch (actionInput) {
        case "roll":
          onAction({ type: "ROLL_DICE" });
          break;
        case "buildRoad":
          setInteractionMode("buildRoad");
          break;
        case "buildSettlement":
          setInteractionMode("buildSettlement");
          break;
        case "buildCity":
          setInteractionMode("buildCity");
          break;
        case "buyDevCard":
          onAction({ type: "BUY_DEV_CARD" });
          break;
        case "trade":
          setShowTradeModal(true);
          break;
        case "endTurn":
          onAction({ type: "END_TURN" });
          break;
        case "cancel":
          setInteractionMode(null);
          break;
        default:
          break;
      }
    },
    [onAction]
  );

  // Handle trade submission
  const handleTrade = useCallback(
    (tradeType, tradeData) => {
      if (tradeType === "bank") {
        onAction({
          type: "BANK_TRADE",
          giveResource: tradeData.give,
          receiveResource: tradeData.receive,
        });
      } else if (tradeType === "player") {
        onAction({
          type: "PROPOSE_TRADE",
          toPlayerId: tradeData.toPlayerId,
          offer: tradeData.offer,
          request: tradeData.request,
        });
      }
      setShowTradeModal(false);
    },
    [onAction]
  );

  // Handle trade responses
  const handleTradeResponse = useCallback(
    (accept) => {
      if (state.tradeOffer) {
        onAction({
          type: accept ? "ACCEPT_TRADE" : "REJECT_TRADE",
          tradeId: state.tradeOffer.id,
        });
      }
    },
    [onAction, state.tradeOffer]
  );

  // Get phase display text
  const getPhaseText = () => {
    const currentPlayerName = state.players.find(p => p.playerId === state.currentPlayer)?.displayName;
    const phases = {
      LOBBY: "Waiting for host to start",
      SETUP_SETTLEMENT_1: `${currentPlayerName}'s turn - Place first settlement`,
      SETUP_ROAD_1: `${currentPlayerName}'s turn - Place first road`,
      SETUP_SETTLEMENT_2: `${currentPlayerName}'s turn - Place second settlement`,
      SETUP_ROAD_2: `${currentPlayerName}'s turn - Place second road`,
      ROLL: `${currentPlayerName}'s turn - Roll dice`,
      DISCARD: "Players must discard half their cards",
      ROBBER_MOVE: `${currentPlayerName}'s turn - Move the robber`,
      ROBBER_STEAL: `${currentPlayerName}'s turn - Steal a resource`,
      MAIN: `${currentPlayerName}'s turn`,
      FINISHED: `Game Over! ${state.players.find(p => p.playerId === state.winner)?.displayName} wins!`,
    };
    return phases[state.phase] || state.phase;
  };

  return (
    <div className="catan-board">
      {/* Player info strip */}
      <CatanPlayerStrip
        players={state.players}
        currentPlayer={state.currentPlayer}
        myPlayerId={playerId}
        longestRoadHolder={state.longestRoadHolder}
        largestArmy={state.largestArmy}
      />

      {/* Phase indicator */}
      <div className="catan-phase-indicator">
        <span>{getPhaseText()}</span>
        {interactionMode && (
          <button className="cancel-btn" onClick={() => setInteractionMode(null)}>
            Cancel
          </button>
        )}
      </div>

      {/* Dice display */}
      {state.lastRoll && <CatanDice roll={state.lastRoll} />}

      {/* Main board */}
      <div className="catan-board-container">
        <HexGrid
          tiles={state.board.tiles}
          corners={processedCorners}
          edges={processedEdges}
          hexSize={50}
          onTileClick={interactionMode === "moveRobber" ? handleTileClick : null}
          onCornerClick={
            ["placeSettlement", "buildSettlement", "buildCity"].includes(interactionMode)
              ? handleCornerClick
              : null
          }
          onEdgeClick={
            ["placeRoad", "buildRoad"].includes(interactionMode) ? handleEdgeClick : null
          }
          highlightTiles={highlights.tiles}
          highlightCorners={highlights.corners}
          highlightEdges={highlights.edges}
        />
      </div>

      {/* Resource hand */}
      {myPlayer && <CatanResourceHand resources={myPlayer.resources} devCards={myPlayer.devCards} />}

      {/* Trade offer notification */}
      {state.tradeOffer && state.tradeOffer.to === playerId && (
        <div className="catan-trade-offer">
          <p>
            <strong>{state.players.find(p => p.playerId === state.tradeOffer.from)?.displayName}</strong> wants to trade:
          </p>
          <div className="trade-details">
            <span>Offers: {formatResources(state.tradeOffer.offer)}</span>
            <span>Wants: {formatResources(state.tradeOffer.request)}</span>
          </div>
          <div className="trade-buttons">
            <button onClick={() => handleTradeResponse(true)}>Accept</button>
            <button onClick={() => handleTradeResponse(false)}>Reject</button>
          </div>
        </div>
      )}

      {/* Action panel */}
      <CatanActionPanel
        phase={state.phase}
        isMyTurn={isMyTurn}
        availableActions={state.availableActions || []}
        interactionMode={interactionMode}
        onAction={handleActionButton}
        myPlayer={myPlayer}
      />

      {/* Trade modal */}
      {showTradeModal && (
        <CatanTradeModal
          myResources={myPlayer?.resources || {}}
          players={state.players.filter((p) => p.playerId !== playerId)}
          availableActions={state.availableActions || []}
          onTrade={handleTrade}
          onClose={() => setShowTradeModal(false)}
        />
      )}
    </div>
  );
}

function formatResources(bundle) {
  if (!bundle) return "nothing";
  const parts = [];
  for (const [resource, count] of Object.entries(bundle)) {
    if (count > 0) {
      parts.push(`${count} ${resource}`);
    }
  }
  return parts.length > 0 ? parts.join(", ") : "nothing";
}
