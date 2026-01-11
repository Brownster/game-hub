import { getResourceIcon } from "../../../utils/hexMath";

const RESOURCE_ORDER = ["wood", "brick", "sheep", "wheat", "ore"];

export default function CatanResourceHand({ resources, devCards }) {
  const totalCards = Object.values(resources || {}).reduce((a, b) => a + b, 0);

  return (
    <div className="catan-resource-hand">
      <div className="resource-cards">
        {RESOURCE_ORDER.map((resource) => {
          const count = resources?.[resource] || 0;
          return (
            <div key={resource} className={`resource-card ${count === 0 ? "empty" : ""}`}>
              <img src={getResourceIcon(resource)} alt={resource} />
              <span className="count">{count}</span>
              <span className="name">{resource}</span>
            </div>
          );
        })}
      </div>

      <div className="hand-summary">
        <span>{totalCards} cards</span>
        {devCards && devCards.length > 0 && (
          <span className="dev-count">{devCards.length} dev cards</span>
        )}
      </div>

      {/* Dev cards in hand */}
      {devCards && devCards.length > 0 && (
        <div className="dev-cards-hand">
          {devCards.map((card, i) => (
            <div
              key={card.id || i}
              className={`dev-card ${card.boughtThisTurn ? "just-bought" : ""}`}
              title={card.boughtThisTurn ? "Cannot play this turn" : card.type}
            >
              <DevCardIcon type={card.type} />
              <span>{formatDevCardType(card.type)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DevCardIcon({ type }) {
  const icons = {
    knight: "/catan/icons/icon-knight.svg",
    roadBuilding: "/catan/icons/icon-road-building.svg",
    yearOfPlenty: "/catan/icons/icon-year-of-plenty.svg",
    monopoly: "/catan/icons/icon-monopoly.svg",
    victoryPoint: "/catan/icons/icon-victory-point.svg",
  };

  return <img src={icons[type] || "/catan/icons/icon-wildcard.svg"} alt={type} />;
}

function formatDevCardType(type) {
  const names = {
    knight: "Knight",
    roadBuilding: "Road Building",
    yearOfPlenty: "Year of Plenty",
    monopoly: "Monopoly",
    victoryPoint: "VP",
  };
  return names[type] || type;
}
