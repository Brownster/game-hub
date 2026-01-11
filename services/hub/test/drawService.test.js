import test from "node:test";
import assert from "node:assert/strict";
import {
  addFeed,
  addPlayer,
  addStroke,
  advanceTurn,
  applyGuess,
  createDrawInitialState,
  sanitizeState,
  startRound,
} from "../src/games/draw/drawService.js";

test("draw: startRound requires 2+ players", () => {
  const state = createDrawInitialState();
  addPlayer(state, { playerId: "p1", displayName: "Player 1" });
  const started = startRound(state);
  assert.equal(started, false);
  assert.equal(state.phase, "LOBBY");
});

test("draw: round lifecycle and scoring on correct guess", () => {
  const state = createDrawInitialState();
  addPlayer(state, { playerId: "p1", displayName: "Player 1" });
  addPlayer(state, { playerId: "p2", displayName: "Player 2" });

  const started = startRound(state);
  assert.equal(started, true);
  assert.equal(state.phase, "DRAWING");

  state.word = "APPLE";
  state.roundEndsAt = Date.now();

  const result = applyGuess(state, "p2", "apple");
  assert.equal(result.correct, true);
  assert.equal(state.phase, "REVEAL");
  assert.equal(state.scores.p2, 10);
  assert.equal(state.scores.p1, 5);
});

test("draw: sanitizeState hides word from non-drawer", () => {
  const state = createDrawInitialState();
  addPlayer(state, { playerId: "p1", displayName: "Player 1" });
  addPlayer(state, { playerId: "p2", displayName: "Player 2" });

  startRound(state);
  state.word = "APPLE";

  const drawerView = sanitizeState(state, "p1");
  const otherView = sanitizeState(state, "p2");
  assert.equal(drawerView.word, "APPLE");
  assert.equal(otherView.word, null);

  state.phase = "REVEAL";
  const revealView = sanitizeState(state, "p2");
  assert.equal(revealView.word, "APPLE");
});

test("draw: turn advance and list caps", () => {
  const state = createDrawInitialState();
  addPlayer(state, { playerId: "p1", displayName: "Player 1" });
  addPlayer(state, { playerId: "p2", displayName: "Player 2" });

  advanceTurn(state);
  assert.equal(state.drawerId, "p2");

  for (let i = 0; i < 501; i += 1) {
    addStroke(state, { x: i, y: i });
  }
  assert.equal(state.strokes.length, 500);

  for (let i = 0; i < 51; i += 1) {
    addFeed(state, { type: "test", message: `m${i}` });
  }
  assert.equal(state.feed.length, 50);
});
