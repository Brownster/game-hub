// Card utilities for card games
// Card ID format: {rank}{suit} where rank is A,2-10,J,Q,K and suit is C,D,H,S
// Example: "5H" = 5 of Hearts, "KC" = King of Clubs

const SUITS = ["C", "D", "H", "S"]; // Clubs, Diamonds, Hearts, Spades
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// Rank to numeric index (for sorting and runs)
const RANK_INDEX = {
  A: 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7,
  "8": 8, "9": 9, "10": 10, J: 11, Q: 12, K: 13,
};

// Rank to point value (for cribbage counting - face cards = 10, ace = 1)
const RANK_POINTS = {
  A: 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7,
  "8": 8, "9": 9, "10": 10, J: 10, Q: 10, K: 10,
};

/**
 * Parse a card ID into its components
 * @param {string} cardId - Card ID like "5H" or "10C"
 * @returns {{ id: string, rank: string, suit: string, index: number, points: number }}
 */
export function parseCard(cardId) {
  const suit = cardId.slice(-1);
  const rank = cardId.slice(0, -1);
  return {
    id: cardId,
    rank,
    suit,
    index: RANK_INDEX[rank],
    points: RANK_POINTS[rank],
  };
}

/**
 * Create a standard 52-card deck
 * @returns {string[]} Array of card IDs
 */
export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(`${rank}${suit}`);
    }
  }
  return deck;
}

/**
 * Shuffle an array in place using Fisher-Yates algorithm
 * @param {any[]} arr - Array to shuffle
 * @param {number} [seed] - Optional seed for reproducible shuffles (for testing)
 * @returns {any[]} The shuffled array (same reference)
 */
export function shuffle(arr, seed) {
  // Simple seeded random if seed provided, otherwise use Math.random
  let random = Math.random;
  if (seed !== undefined) {
    let s = seed;
    random = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Create a new shuffled deck
 * @param {number} [seed] - Optional seed for reproducible shuffles
 * @returns {string[]} Shuffled array of card IDs
 */
export function createShuffledDeck(seed) {
  return shuffle(createDeck(), seed);
}

/**
 * Deal cards from deck (removes from end of array)
 * @param {string[]} deck - Deck to deal from (mutated)
 * @param {number} count - Number of cards to deal
 * @returns {string[]} Array of dealt card IDs
 */
export function deal(deck, count) {
  if (count > deck.length) {
    throw new Error(`Cannot deal ${count} cards from deck of ${deck.length}`);
  }
  return deck.splice(-count, count);
}

/**
 * Draw a single card from deck
 * @param {string[]} deck - Deck to draw from (mutated)
 * @returns {string|undefined} Card ID or undefined if deck empty
 */
export function draw(deck) {
  return deck.pop();
}

/**
 * Get the point value of a card (for counting in cribbage)
 * @param {string} cardId - Card ID
 * @returns {number} Point value (1-10)
 */
export function cardValue(cardId) {
  const { points } = parseCard(cardId);
  return points;
}

/**
 * Get the sum of point values for multiple cards
 * @param {string[]} cardIds - Array of card IDs
 * @returns {number} Total point value
 */
export function cardsValue(cardIds) {
  return cardIds.reduce((sum, id) => sum + cardValue(id), 0);
}

/**
 * Get the rank index of a card (for sorting and run detection)
 * @param {string} cardId - Card ID
 * @returns {number} Rank index (1-13, Ace=1, King=13)
 */
export function cardRankIndex(cardId) {
  const { index } = parseCard(cardId);
  return index;
}

/**
 * Sort cards by rank then suit
 * @param {string[]} cardIds - Array of card IDs
 * @returns {string[]} New sorted array
 */
export function sortCards(cardIds) {
  return [...cardIds].sort((a, b) => {
    const cardA = parseCard(a);
    const cardB = parseCard(b);
    if (cardA.index !== cardB.index) {
      return cardA.index - cardB.index;
    }
    return SUITS.indexOf(cardA.suit) - SUITS.indexOf(cardB.suit);
  });
}

/**
 * Check if a card can be legally played (count won't exceed 31)
 * @param {string} cardId - Card to play
 * @param {number} currentCount - Current play count
 * @returns {boolean}
 */
export function canPlayCard(cardId, currentCount) {
  return currentCount + cardValue(cardId) <= 31;
}

/**
 * Get all cards that can be legally played from a hand
 * @param {string[]} hand - Cards in hand
 * @param {number} currentCount - Current play count
 * @returns {string[]} Playable card IDs
 */
export function getLegalPlays(hand, currentCount) {
  return hand.filter((cardId) => canPlayCard(cardId, currentCount));
}

/**
 * Get card suit
 * @param {string} cardId - Card ID
 * @returns {string} Suit character (C, D, H, S)
 */
export function getCardSuit(cardId) {
  return parseCard(cardId).suit;
}

/**
 * Get card rank
 * @param {string} cardId - Card ID
 * @returns {string} Rank string (A, 2-10, J, Q, K)
 */
export function getCardRank(cardId) {
  return parseCard(cardId).rank;
}

export { SUITS, RANKS, RANK_INDEX, RANK_POINTS };
