import { Chess } from "chess.js";

const PIECE_VALUES = {
  p: 10,
  n: 30,
  b: 30,
  r: 50,
  q: 90,
  k: 900,
};

function evaluate(chess, aiColor) {
  const board = chess.board();
  let score = 0;
  for (const row of board) {
    for (const piece of row) {
      if (!piece) continue;
      const value = PIECE_VALUES[piece.type] || 0;
      score += piece.color === aiColor ? value : -value;
    }
  }
  return score;
}

function minimax(chess, depth, alpha, beta, maximizing, aiColor) {
  if (chess.isCheckmate()) {
    return chess.turn() === aiColor ? -10000 : 10000;
  }
  if (chess.isDraw()) return 0;
  if (depth === 0) return evaluate(chess, aiColor);

  if (maximizing) {
    let max = Number.NEGATIVE_INFINITY;
    for (const move of chess.moves({ verbose: true })) {
      chess.move(move);
      const score = minimax(chess, depth - 1, alpha, beta, false, aiColor);
      chess.undo();
      if (score > max) max = score;
      if (score > alpha) alpha = score;
      if (beta <= alpha) break;
    }
    return max;
  }

  let min = Number.POSITIVE_INFINITY;
  for (const move of chess.moves({ verbose: true })) {
    chess.move(move);
    const score = minimax(chess, depth - 1, alpha, beta, true, aiColor);
    chess.undo();
    if (score < min) min = score;
    if (score < beta) beta = score;
    if (beta <= alpha) break;
  }
  return min;
}

export function pickAiMove(fen, depth = 2) {
  const chess = new Chess(fen);
  const aiColor = chess.turn();
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;

  let bestMove = moves[0];
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const move of moves) {
    chess.move(move);
    const score = minimax(chess, depth - 1, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, false, aiColor);
    chess.undo();
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return { from: bestMove.from, to: bestMove.to, promotion: bestMove.promotion };
}
