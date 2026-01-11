import React from "react";
import Card from "./Card";

export default function CardStack({
  cards = [],
  faceUp = false,
  size = "md",
  maxVisible = 4, // Max cards to show in stack
  offsetX = 2, // Pixel offset for stacking effect
  offsetY = 1,
  label = null,
  className = "",
}) {
  // Only show up to maxVisible cards
  const visibleCards = cards.slice(-maxVisible);
  const hiddenCount = Math.max(0, cards.length - maxVisible);

  const sizeStyles = {
    sm: { width: 48, height: 67 },
    md: { width: 72, height: 101 },
    lg: { width: 96, height: 134 },
  };

  const { width, height } = sizeStyles[size] || sizeStyles.md;

  // Calculate total size including offsets
  const totalWidth = width + (visibleCards.length - 1) * offsetX;
  const totalHeight = height + (visibleCards.length - 1) * offsetY;

  return (
    <div className={`card-stack ${className}`}>
      <div
        className="card-stack__cards"
        style={{
          position: "relative",
          width: totalWidth,
          height: totalHeight,
        }}
      >
        {visibleCards.length === 0 ? (
          // Empty placeholder
          <div
            className="card-stack__empty"
            style={{
              width,
              height,
              border: "2px dashed rgba(255,255,255,0.3)",
              borderRadius: 6,
            }}
          />
        ) : (
          visibleCards.map((cardId, index) => (
            <div
              key={cardId || `hidden-${index}`}
              style={{
                position: "absolute",
                left: index * offsetX,
                top: index * offsetY,
                zIndex: index,
              }}
            >
              <Card
                cardId={cardId}
                faceUp={faceUp}
                size={size}
              />
            </div>
          ))
        )}
      </div>
      {label && (
        <div className="card-stack__label">{label}</div>
      )}
      {hiddenCount > 0 && (
        <div className="card-stack__count">+{hiddenCount}</div>
      )}
    </div>
  );
}
