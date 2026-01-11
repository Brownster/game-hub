import { CARD_TYPES, COLORS, WILD_COLOR } from "./unoConstants.js";

function createCard({ color, type, value }) {
  const id = `${color}-${type}-${value}-${Math.random().toString(36).slice(2, 8)}`;
  return { id, color, type, value };
}

export function buildDeck() {
  const deck = [];

  for (const color of COLORS) {
    // One zero per color
    deck.push(createCard({ color, type: CARD_TYPES.NUMBER, value: "0" }));

    // Two of each 1-9 per color
    for (let i = 1; i <= 9; i += 1) {
      deck.push(createCard({ color, type: CARD_TYPES.NUMBER, value: String(i) }));
      deck.push(createCard({ color, type: CARD_TYPES.NUMBER, value: String(i) }));
    }

    // Two of each action per color
    for (let i = 0; i < 2; i += 1) {
      deck.push(createCard({ color, type: CARD_TYPES.SKIP, value: "skip" }));
      deck.push(createCard({ color, type: CARD_TYPES.REVERSE, value: "reverse" }));
      deck.push(createCard({ color, type: CARD_TYPES.DRAW2, value: "draw2" }));
    }
  }

  // Wilds
  for (let i = 0; i < 4; i += 1) {
    deck.push(createCard({ color: WILD_COLOR, type: CARD_TYPES.WILD, value: "wild" }));
    deck.push(createCard({ color: WILD_COLOR, type: CARD_TYPES.DRAW4, value: "draw4" }));
  }

  return deck;
}

export function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function drawCard(drawPile) {
  return drawPile.pop() || null;
}
