// Cribbage scoring utilities
// Can be reused for other card games that use similar scoring patterns

import { parseCard, cardValue, cardsValue, cardRankIndex, getCardSuit } from "./cardUtils.js";

/**
 * Find all subsets of cards that sum to 15
 * @param {string[]} cardIds - Array of card IDs
 * @returns {{ cards: string[], points: number }[]} Array of scoring combinations
 */
export function findFifteens(cardIds) {
  const results = [];
  const n = cardIds.length;

  // Iterate through all subsets using bitmask
  for (let mask = 1; mask < (1 << n); mask++) {
    const subset = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        subset.push(cardIds[i]);
      }
    }
    if (cardsValue(subset) === 15) {
      results.push({ cards: subset, points: 2 });
    }
  }

  return results;
}

/**
 * Find pairs, three-of-a-kind, and four-of-a-kind
 * @param {string[]} cardIds - Array of card IDs
 * @returns {{ cards: string[], points: number, type: string }[]} Scoring combinations
 */
export function findPairs(cardIds) {
  const results = [];

  // Group cards by rank
  const byRank = {};
  for (const cardId of cardIds) {
    const { rank } = parseCard(cardId);
    if (!byRank[rank]) byRank[rank] = [];
    byRank[rank].push(cardId);
  }

  // Score each group
  for (const [rank, cards] of Object.entries(byRank)) {
    const count = cards.length;
    if (count >= 2) {
      // Pair = 2pts, Three of a kind = 6pts (3 pairs), Four of a kind = 12pts (6 pairs)
      const points = (count * (count - 1)); // n choose 2 * 2
      const type = count === 2 ? "pair" : count === 3 ? "three-of-a-kind" : "four-of-a-kind";
      results.push({ cards, points, type });
    }
  }

  return results;
}

/**
 * Find runs of 3 or more consecutive cards
 * Handles multiple cards of same rank (double/triple runs)
 * @param {string[]} cardIds - Array of card IDs
 * @returns {{ cards: string[], points: number, type: string }[]} Scoring combinations
 */
export function findRuns(cardIds) {
  if (cardIds.length < 3) return [];

  // Group cards by rank index
  const byRankIndex = {};
  for (const cardId of cardIds) {
    const index = cardRankIndex(cardId);
    if (!byRankIndex[index]) byRankIndex[index] = [];
    byRankIndex[index].push(cardId);
  }

  const sortedIndices = Object.keys(byRankIndex).map(Number).sort((a, b) => a - b);
  const results = [];

  // Find consecutive sequences
  let runStart = 0;
  for (let i = 1; i <= sortedIndices.length; i++) {
    // Check if run ends (gap in sequence or end of array)
    const isEnd = i === sortedIndices.length || sortedIndices[i] !== sortedIndices[i - 1] + 1;

    if (isEnd) {
      const runLength = i - runStart;
      if (runLength >= 3) {
        // Calculate multiplier from duplicate cards
        let multiplier = 1;
        const runCards = [];
        for (let j = runStart; j < i; j++) {
          const index = sortedIndices[j];
          multiplier *= byRankIndex[index].length;
          runCards.push(...byRankIndex[index]);
        }

        const points = runLength * multiplier;
        const type = multiplier === 1 ? `run-of-${runLength}` :
          multiplier === 2 ? `double-run-of-${runLength}` :
          multiplier === 3 ? `triple-run-of-${runLength}` :
          `quadruple-run-of-${runLength}`;

        results.push({ cards: runCards, points, type, runLength, multiplier });
      }
      runStart = i;
    }
  }

  return results;
}

/**
 * Check for flush (4 or 5 cards of same suit)
 * @param {string[]} hand - 4 cards in hand (not including starter)
 * @param {string|null} starter - Starter/cut card
 * @param {boolean} isCrib - Whether this is the crib (crib requires 5-card flush)
 * @returns {{ cards: string[], points: number, type: string }|null}
 */
export function findFlush(hand, starter, isCrib = false) {
  if (hand.length !== 4) return null;

  const handSuits = hand.map(getCardSuit);
  const allSameSuit = handSuits.every((s) => s === handSuits[0]);

  if (!allSameSuit) return null;

  // Check if starter matches
  if (starter && getCardSuit(starter) === handSuits[0]) {
    return {
      cards: [...hand, starter],
      points: 5,
      type: "flush-5",
    };
  }

  // Crib only scores with 5-card flush
  if (isCrib) return null;

  // Hand (not crib) scores with 4-card flush
  return {
    cards: hand,
    points: 4,
    type: "flush-4",
  };
}

/**
 * Check for nobs (Jack in hand matching starter suit)
 * @param {string[]} hand - Cards in hand
 * @param {string} starter - Starter/cut card
 * @returns {{ card: string, points: number }|null}
 */
export function findNobs(hand, starter) {
  if (!starter) return null;

  const starterSuit = getCardSuit(starter);

  for (const cardId of hand) {
    const { rank, suit } = parseCard(cardId);
    if (rank === "J" && suit === starterSuit) {
      return { card: cardId, points: 1 };
    }
  }

  return null;
}

/**
 * Score a complete hand (4 cards + starter)
 * @param {string[]} hand - 4 cards in hand
 * @param {string} starter - Starter/cut card
 * @param {boolean} isCrib - Whether this is the crib
 * @returns {{ total: number, breakdown: object[] }}
 */
export function scoreHand(hand, starter, isCrib = false) {
  const allCards = starter ? [...hand, starter] : hand;
  const breakdown = [];
  let total = 0;

  // Fifteens
  const fifteens = findFifteens(allCards);
  for (const f of fifteens) {
    breakdown.push({ type: "fifteen", ...f });
    total += f.points;
  }

  // Pairs/trips/quads
  const pairs = findPairs(allCards);
  for (const p of pairs) {
    breakdown.push(p);
    total += p.points;
  }

  // Runs
  const runs = findRuns(allCards);
  for (const r of runs) {
    breakdown.push(r);
    total += r.points;
  }

  // Flush (only uses hand cards, not starter for 4-card)
  const flush = findFlush(hand, starter, isCrib);
  if (flush) {
    breakdown.push(flush);
    total += flush.points;
  }

  // Nobs
  const nobs = findNobs(hand, starter);
  if (nobs) {
    breakdown.push({ type: "nobs", ...nobs });
    total += nobs.points;
  }

  return { total, breakdown };
}

/**
 * Score the last card played during pegging
 * @param {string[]} playStack - Cards played in order (most recent last)
 * @returns {{ total: number, breakdown: object[] }}
 */
export function scorePegging(playStack) {
  if (playStack.length === 0) return { total: 0, breakdown: [] };

  const breakdown = [];
  let total = 0;
  const count = cardsValue(playStack);

  // Check for 15
  if (count === 15) {
    breakdown.push({ type: "fifteen", points: 2 });
    total += 2;
  }

  // Check for 31
  if (count === 31) {
    breakdown.push({ type: "thirty-one", points: 2 });
    total += 2;
  }

  // Check for pairs/trips/quads (must be consecutive at end of stack)
  const lastCard = playStack[playStack.length - 1];
  const lastRank = parseCard(lastCard).rank;
  let pairCount = 1;

  for (let i = playStack.length - 2; i >= 0; i--) {
    if (parseCard(playStack[i]).rank === lastRank) {
      pairCount++;
    } else {
      break;
    }
  }

  if (pairCount >= 2) {
    const points = pairCount === 2 ? 2 : pairCount === 3 ? 6 : 12;
    const type = pairCount === 2 ? "pair" : pairCount === 3 ? "pair-royal" : "double-pair-royal";
    breakdown.push({ type, points, count: pairCount });
    total += points;
  }

  // Check for runs (must be consecutive at end, any order)
  // Start from longest possible and work down
  for (let len = Math.min(playStack.length, 7); len >= 3; len--) {
    const endCards = playStack.slice(-len);
    const indices = endCards.map(cardRankIndex).sort((a, b) => a - b);

    // Check if consecutive
    let isRun = true;
    for (let i = 1; i < indices.length; i++) {
      if (indices[i] !== indices[i - 1] + 1) {
        isRun = false;
        break;
      }
    }

    if (isRun) {
      breakdown.push({ type: `run-of-${len}`, points: len, cards: endCards });
      total += len;
      break; // Only score the longest run
    }
  }

  return { total, breakdown };
}

/**
 * Check for "his heels" - Jack cut as starter (dealer gets 2 points)
 * @param {string} starter - Starter/cut card
 * @returns {boolean}
 */
export function isHisHeels(starter) {
  return parseCard(starter).rank === "J";
}
