const SIZE = 8;
const DIRECTIONS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1]
];

export function newBoard() {
  const board = Array.from({ length: SIZE }, () => Array(SIZE).fill("E"));
  board[3][3] = "W";
  board[3][4] = "B";
  board[4][3] = "B";
  board[4][4] = "W";
  return board;
}

function inBounds(r, c) {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

export function getOpponent(side) {
  return side === "B" ? "W" : "B";
}

export function countDiscs(board) {
  let B = 0;
  let W = 0;

  for (const row of board) {
    for (const cell of row) {
      if (cell === "B") B += 1;
      if (cell === "W") W += 1;
    }
  }

  return { B, W };
}

function getFlips(board, side, r, c) {
  if (!inBounds(r, c) || board[r][c] !== "E") return [];

  const opponent = getOpponent(side);
  const flips = [];

  for (const [dr, dc] of DIRECTIONS) {
    let rr = r + dr;
    let cc = c + dc;
    const line = [];

    while (inBounds(rr, cc) && board[rr][cc] === opponent) {
      line.push([rr, cc]);
      rr += dr;
      cc += dc;
    }

    if (line.length > 0 && inBounds(rr, cc) && board[rr][cc] === side) {
      flips.push(...line);
    }
  }

  return flips;
}

export function getLegalMoves(board, side) {
  const moves = [];
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (board[r][c] !== "E") continue;
      const flips = getFlips(board, side, r, c);
      if (flips.length > 0) {
        moves.push({ r, c });
      }
    }
  }
  return moves;
}

function cloneBoard(board) {
  return board.map((row) => row.slice());
}

export function applyMove(state, side, r, c) {
  const board = cloneBoard(state.board);
  const flips = getFlips(board, side, r, c);

  if (flips.length === 0) {
    throw new Error("INVALID_MOVE");
  }

  board[r][c] = side;
  for (const [fr, fc] of flips) {
    board[fr][fc] = side;
  }

  const counts = countDiscs(board);
  let nextTurn = getOpponent(side);
  let legalMoves = getLegalMoves(board, nextTurn);

  if (legalMoves.length === 0) {
    const currentMoves = getLegalMoves(board, side);
    if (currentMoves.length > 0) {
      nextTurn = side;
      legalMoves = currentMoves;
    }
  }

  const status = legalMoves.length === 0 ? "FINISHED" : "IN_PROGRESS";
  let winner = undefined;

  if (status === "FINISHED") {
    if (counts.B > counts.W) winner = "B";
    else if (counts.W > counts.B) winner = "W";
    else winner = "DRAW";
  }

  return {
    ...state,
    board,
    turn: nextTurn,
    legalMoves,
    counts,
    status,
    winner,
    lastMove: { r, c, by: side }
  };
}
