import React from "react";

// Card ID format: {rank}{suit} where rank is A,2-10,J,Q,K and suit is C,D,H,S
const SUIT_NAMES = { C: "clubs", D: "diamonds", H: "hearts", S: "spades" };
const RANK_NAMES = {
  A: "ace", "2": "2", "3": "3", "4": "4", "5": "5", "6": "6", "7": "7",
  "8": "8", "9": "9", "10": "10", J: "jack", Q: "queen", K: "king",
};

function parseCardId(cardId) {
  const suit = cardId.slice(-1);
  const rank = cardId.slice(0, -1);
  return { rank, suit };
}

function getCardImagePath(cardId) {
  const { rank, suit } = parseCardId(cardId);
  const rankName = RANK_NAMES[rank];
  const suitName = SUIT_NAMES[suit];
  return `/cards/${rankName}_of_${suitName}.png`;
}

export default function Card({
  cardId,
  faceUp = true,
  selected = false,
  onClick,
  disabled = false,
  size = "md",
  className = "",
}) {
  // Size classes
  const sizeStyles = {
    sm: { width: 48, height: 67 },
    md: { width: 72, height: 101 },
    lg: { width: 96, height: 134 },
  };

  const { width, height } = sizeStyles[size] || sizeStyles.md;

  const imageSrc = faceUp && cardId ? getCardImagePath(cardId) : "/cards/back.png";

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick(cardId);
    }
  };

  return (
    <div
      className={`card ${selected ? "card--selected" : ""} ${disabled ? "card--disabled" : ""} ${onClick && !disabled ? "card--clickable" : ""} ${className}`}
      style={{ width, height }}
      onClick={handleClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleClick();
        }
      }}
    >
      <img
        src={imageSrc}
        alt={faceUp && cardId ? cardId : "Card back"}
        className="card__image"
        draggable={false}
      />
    </div>
  );
}

export { parseCardId, getCardImagePath };
