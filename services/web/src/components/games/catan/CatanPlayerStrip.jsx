import { getPlayerColor } from "../../../utils/hexMath";

export default function CatanPlayerStrip({
  players,
  currentPlayer,
  myPlayerId,
  longestRoadHolder,
  largestArmy,
}) {
  return (
    <div className="catan-player-strip">
      {players.map((player) => {
        const isCurrentTurn = player.playerId === currentPlayer;
        const isMe = player.playerId === myPlayerId;
        const hasLongestRoad = player.playerId === longestRoadHolder;
        const hasLargestArmy = player.playerId === largestArmy;

        return (
          <div
            key={player.playerId}
            className={`catan-player-card ${isCurrentTurn ? "current-turn" : ""} ${isMe ? "is-me" : ""}`}
            style={{ borderColor: getPlayerColor(player.color) }}
          >
            <div
              className="player-color-indicator"
              style={{ backgroundColor: getPlayerColor(player.color) }}
            />

            <div className="player-info">
              <div className="player-name">
                {player.displayName}
                {isMe && <span className="you-badge">(You)</span>}
              </div>

              <div className="player-stats">
                {/* Public VP (visible to all) */}
                <span className="stat vp">
                  <img src="/catan/icons/icon-victory-point.svg" alt="VP" />
                  {player.publicScore?.publicTotal ?? "?"}
                </span>

                {/* Resource count (hidden from others) */}
                <span className="stat resources">
                  {isMe ? (
                    Object.values(player.resources || {}).reduce((a, b) => a + b, 0)
                  ) : (
                    player.resourceCount ?? "?"
                  )} cards
                </span>

                {/* Dev card count */}
                <span className="stat dev-cards">
                  {isMe ? (player.devCards?.length ?? 0) : (player.devCardCount ?? "?")} dev
                </span>
              </div>

              {/* Badges */}
              <div className="player-badges">
                {hasLongestRoad && (
                  <span className="badge longest-road" title="Longest Road">
                    LR
                  </span>
                )}
                {hasLargestArmy && (
                  <span className="badge largest-army" title="Largest Army">
                    LA
                  </span>
                )}
              </div>
            </div>

            {/* Building counts */}
            <div className="building-counts">
              <span title="Settlements remaining">
                <img src="/catan/icons/icon-settlement.svg" alt="S" />
                {player.settlements}
              </span>
              <span title="Cities remaining">
                <img src="/catan/icons/icon-city.svg" alt="C" />
                {player.cities}
              </span>
              <span title="Roads remaining">R:{player.roads}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
