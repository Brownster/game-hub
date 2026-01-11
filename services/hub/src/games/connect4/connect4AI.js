import {
  COLS,
  ROWS,
  CONNECT,
  getLegalMoves,
  dropPiece,
  checkWinner,
  isBoardFull,
  getCell,
} from "./connect4Rules.js";

const DEPTH_BY_LEVEL = {
  EASY: 2,
  MEDIUM: 4,
  HARD: 6,
};

// Center columns are generally more valuable
const COLUMN_SCORES = [0, 1, 2, 3, 2, 1, 0];

export function pickMove(state) {
  const level = state.ai?.level || "MEDIUM";
  const depth = DEPTH_BY_LEVEL[level] || 4;
  const aiSide = state.ai?.side || "yellow";
  const humanSide = aiSide === "yellow" ? "red" : "yellow";

  const legalMoves = getLegalMoves(state.board);
  if (legalMoves.length === 0) return null;

  // Check for immediate win
  for (const col of legalMoves) {
    const result = dropPiece(state.board, col, aiSide);
    if (result) {
      const win = checkWinner(result.board, col, result.row);
      if (win && win.winner === aiSide) {
        return col;
      }
    }
  }

  // Block immediate opponent win
  for (const col of legalMoves) {
    const result = dropPiece(state.board, col, humanSide);
    if (result) {
      const win = checkWinner(result.board, col, result.row);
      if (win && win.winner === humanSide) {
        return col;
      }
    }
  }

  // Use minimax for deeper analysis
  let bestScore = -Infinity;
  let bestMoves = [];

  // Prioritize center columns in move ordering
  const orderedMoves = [...legalMoves].sort(
    (a, b) => COLUMN_SCORES[b] - COLUMN_SCORES[a]
  );

  for (const col of orderedMoves) {
    const result = dropPiece(state.board, col, aiSide);
    if (!result) continue;

    const score = minimax(
      result.board,
      depth - 1,
      -Infinity,
      Infinity,
      false,
      aiSide,
      humanSide
    );

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [col];
    } else if (score === bestScore) {
      bestMoves.push(col);
    }
  }

  // Randomly pick among best moves (with slight preference for center)
  if (bestMoves.length > 1) {
    const centerMoves = bestMoves.filter((m) => m === 3);
    if (centerMoves.length > 0 && Math.random() < 0.7) {
      return centerMoves[0];
    }
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

function minimax(board, depth, alpha, beta, isMaximizing, aiSide, humanSide) {
  const legalMoves = getLegalMoves(board);

  // Terminal conditions
  if (depth === 0 || legalMoves.length === 0) {
    return evaluateBoard(board, aiSide, humanSide);
  }

  if (isBoardFull(board)) {
    return 0;
  }

  const currentPlayer = isMaximizing ? aiSide : humanSide;

  // Order moves for better pruning (center first)
  const orderedMoves = [...legalMoves].sort(
    (a, b) => COLUMN_SCORES[b] - COLUMN_SCORES[a]
  );

  if (isMaximizing) {
    let maxScore = -Infinity;

    for (const col of orderedMoves) {
      const result = dropPiece(board, col, currentPlayer);
      if (!result) continue;

      // Check for immediate win
      const win = checkWinner(result.board, col, result.row);
      if (win) {
        return 100000 + depth; // Prefer faster wins
      }

      const score = minimax(
        result.board,
        depth - 1,
        alpha,
        beta,
        false,
        aiSide,
        humanSide
      );
      maxScore = Math.max(maxScore, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }

    return maxScore;
  } else {
    let minScore = Infinity;

    for (const col of orderedMoves) {
      const result = dropPiece(board, col, currentPlayer);
      if (!result) continue;

      // Check for immediate loss
      const win = checkWinner(result.board, col, result.row);
      if (win) {
        return -100000 - depth; // Prefer longer losses
      }

      const score = minimax(
        result.board,
        depth - 1,
        alpha,
        beta,
        true,
        aiSide,
        humanSide
      );
      minScore = Math.min(minScore, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }

    return minScore;
  }
}

function evaluateBoard(board, aiSide, humanSide) {
  let score = 0;

  // Evaluate all windows of 4
  // Horizontal
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col <= COLS - CONNECT; col++) {
      score += evaluateWindow(board, col, row, 1, 0, aiSide, humanSide);
    }
  }

  // Vertical
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row <= ROWS - CONNECT; row++) {
      score += evaluateWindow(board, col, row, 0, 1, aiSide, humanSide);
    }
  }

  // Diagonal /
  for (let col = 0; col <= COLS - CONNECT; col++) {
    for (let row = 0; row <= ROWS - CONNECT; row++) {
      score += evaluateWindow(board, col, row, 1, 1, aiSide, humanSide);
    }
  }

  // Diagonal \
  for (let col = 0; col <= COLS - CONNECT; col++) {
    for (let row = CONNECT - 1; row < ROWS; row++) {
      score += evaluateWindow(board, col, row, 1, -1, aiSide, humanSide);
    }
  }

  // Center column bonus
  for (let row = 0; row < ROWS; row++) {
    const cell = getCell(board, 3, row);
    if (cell === aiSide) score += 3;
    else if (cell === humanSide) score -= 3;
  }

  return score;
}

function evaluateWindow(board, startCol, startRow, dx, dy, aiSide, humanSide) {
  let aiCount = 0;
  let humanCount = 0;
  let emptyCount = 0;

  for (let i = 0; i < CONNECT; i++) {
    const cell = getCell(board, startCol + dx * i, startRow + dy * i);
    if (cell === aiSide) aiCount++;
    else if (cell === humanSide) humanCount++;
    else emptyCount++;
  }

  // Both players in window - blocked, no value
  if (aiCount > 0 && humanCount > 0) return 0;

  // Score based on pieces
  if (aiCount === 4) return 10000;
  if (aiCount === 3 && emptyCount === 1) return 50;
  if (aiCount === 2 && emptyCount === 2) return 10;

  if (humanCount === 4) return -10000;
  if (humanCount === 3 && emptyCount === 1) return -80; // Block threats more aggressively
  if (humanCount === 2 && emptyCount === 2) return -15;

  return 0;
}
