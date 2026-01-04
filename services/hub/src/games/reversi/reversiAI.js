import { applyMove } from "./reversiRules.js";

function randomPick(list) {
  if (!list.length) return null;
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}

export function pickMove(state) {
  const legalMoves = state.legalMoves || [];
  if (!legalMoves.length) return null;

  if (state.ai?.level === "MEDIUM") {
    let best = legalMoves[0];
    let bestScore = -1;

    for (const move of legalMoves) {
      try {
        const next = applyMove(state, state.turn, move.r, move.c);
        const flips = Math.abs(next.counts.B - state.counts.B) + Math.abs(next.counts.W - state.counts.W);
        if (flips > bestScore) {
          best = move;
          bestScore = flips;
        }
      } catch {
        // Ignore invalid moves from stale state.
      }
    }

    return best;
  }

  return randomPick(legalMoves);
}
