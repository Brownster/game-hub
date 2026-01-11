/**
 * Connect 4 game rules
 * 7 columns x 6 rows
 */

export const COLS = 7;
export const ROWS = 6;
export const CONNECT = 4;

export function newBoard() {
  // Board is stored column-major: board[col] = array of cells from bottom to top
  return Array(COLS)
    .fill(null)
    .map(() => []);
}

export function canDrop(board, col) {
  return col >= 0 && col < COLS && board[col].length < ROWS;
}

export function getLegalMoves(board) {
  const moves = [];
  for (let col = 0; col < COLS; col++) {
    if (canDrop(board, col)) {
      moves.push(col);
    }
  }
  return moves;
}

export function dropPiece(board, col, player) {
  if (!canDrop(board, col)) return null;

  const newBoard = board.map((column) => [...column]);
  const row = newBoard[col].length;
  newBoard[col].push(player);

  return { board: newBoard, row, col };
}

export function getCell(board, col, row) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
  return board[col][row] || null;
}

export function checkWinner(board, lastCol, lastRow) {
  const player = getCell(board, lastCol, lastRow);
  if (!player) return null;

  const directions = [
    [1, 0], // horizontal
    [0, 1], // vertical
    [1, 1], // diagonal /
    [1, -1], // diagonal \
  ];

  for (const [dx, dy] of directions) {
    let count = 1;
    const winningCells = [{ col: lastCol, row: lastRow }];

    // Check positive direction
    for (let i = 1; i < CONNECT; i++) {
      const col = lastCol + dx * i;
      const row = lastRow + dy * i;
      if (getCell(board, col, row) === player) {
        count++;
        winningCells.push({ col, row });
      } else break;
    }

    // Check negative direction
    for (let i = 1; i < CONNECT; i++) {
      const col = lastCol - dx * i;
      const row = lastRow - dy * i;
      if (getCell(board, col, row) === player) {
        count++;
        winningCells.push({ col, row });
      } else break;
    }

    if (count >= CONNECT) {
      return { winner: player, winningCells };
    }
  }

  return null;
}

export function isBoardFull(board) {
  return board.every((col) => col.length >= ROWS);
}

export function countPieces(board) {
  let red = 0;
  let yellow = 0;
  for (const col of board) {
    for (const cell of col) {
      if (cell === "red") red++;
      else if (cell === "yellow") yellow++;
    }
  }
  return { red, yellow };
}
