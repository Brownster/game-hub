import test from "node:test";
import assert from "node:assert/strict";
import { pickAiMove } from "../src/games/chess/chessAi.js";

test("chess ai: returns a legal move for starting position", () => {
  const startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const move = pickAiMove(startFen, 1);
  assert.ok(move);
  assert.ok(move.from);
  assert.ok(move.to);
});
