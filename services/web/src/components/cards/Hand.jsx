import React from "react";
import Card from "./Card";

export default function Hand({
  cards = [],
  faceUp = true,
  selectedIds = [],
  onCardClick,
  disabledIds = [],
  size = "md",
  overlap = 0.5, // 0-1, how much cards overlap (1 = full overlap, 0 = no overlap)
  fanAngle = 0, // degrees of spread (0 = straight line)
  className = "",
}) {
  const sizeWidths = { sm: 48, md: 72, lg: 96 };
  const cardWidth = sizeWidths[size] || sizeWidths.md;

  // Calculate offset between cards
  const offsetX = cardWidth * (1 - overlap);

  // Calculate total width needed
  const totalWidth = cards.length > 0
    ? cardWidth + (cards.length - 1) * offsetX
    : 0;

  return (
    <div
      className={`hand ${className}`}
      style={{
        position: "relative",
        width: totalWidth,
        display: "inline-flex",
      }}
    >
      {cards.map((cardId, index) => {
        const isSelected = selectedIds.includes(cardId);
        const isDisabled = disabledIds.includes(cardId);

        // Calculate position and rotation for fan effect
        const centerIndex = (cards.length - 1) / 2;
        const angleOffset = fanAngle > 0
          ? (index - centerIndex) * (fanAngle / Math.max(1, cards.length - 1))
          : 0;

        const style = {
          position: "absolute",
          left: index * offsetX,
          transform: `
            translateY(${isSelected ? -12 : 0}px)
            rotate(${angleOffset}deg)
          `,
          transformOrigin: "bottom center",
          transition: "transform 0.15s ease",
          zIndex: index,
        };

        return (
          <div key={cardId} style={style}>
            <Card
              cardId={cardId}
              faceUp={faceUp}
              selected={isSelected}
              disabled={isDisabled}
              onClick={onCardClick}
              size={size}
            />
          </div>
        );
      })}
    </div>
  );
}
