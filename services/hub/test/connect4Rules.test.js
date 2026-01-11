import test from "node:test";
import assert from "node:assert/strict";
import {
  COLS,
  ROWS,
  canDrop,
  checkWinner,
  countPieces,
  dropPiece,
  getLegalMoves,
  isBoardFull,
  newBoard,
} from "../src/games/connect4/connect4Rules.js";

test("connect4Rules: drop, legal moves, and fullness", () => {
  const board = newBoard();
  assert.equal(board.length, COLS);
  assert.equal(canDrop(board, -1), false);
  assert.equal(canDrop(board, COLS), false);

  const move = dropPiece(board, 0, "red");
  assert.equal(move?.row, 0);
  assert.equal(move?.col, 0);

  const fullBoard = Array(COLS).fill(null).map(() => Array(ROWS).fill("red"));
  assert.equal(isBoardFull(fullBoard), true);
  assert.equal(getLegalMoves(fullBoard).length, 0);
});

test("connect4Rules: horizontal win", () => {
  let board = newBoard();
  let last = null;
  for (let col = 0; col < 4; col += 1) {
    last = dropPiece(board, col, "red");
    board = last.board;
  }

  const result = checkWinner(board, last.col, last.row);
  assert.equal(result?.winner, "red");
});

test("connect4Rules: vertical win", () => {
  let board = newBoard();
  let last = null;
  for (let i = 0; i < 4; i += 1) {
    last = dropPiece(board, 2, "yellow");
    board = last.board;
  }

  const result = checkWinner(board, last.col, last.row);
  assert.equal(result?.winner, "yellow");
});

test("connect4Rules: diagonal win", () => {
  const board = newBoard();
  board[0] = ["red"];
  board[1] = ["yellow", "red"];
  board[2] = ["yellow", "yellow", "red"];
  board[3] = ["yellow", "yellow", "yellow", "red"];

  const result = checkWinner(board, 3, 3);
  assert.equal(result?.winner, "red");
});

test("connect4Rules: countPieces tallies correctly", () => {
  const board = newBoard();
  board[0] = ["red", "red"];
  board[1] = ["yellow"];
  const counts = countPieces(board);
  assert.equal(counts.red, 2);
  assert.equal(counts.yellow, 1);
});
