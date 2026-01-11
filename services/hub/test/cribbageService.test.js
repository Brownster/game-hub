import test from "node:test";
import assert from "node:assert/strict";
import {
  PHASES,
  addPlayer,
  createCribbageInitialState,
  cutDeck,
  discardToCrib,
  sanitizeState,
  startRound,
} from "../src/games/cribbage/cribbageService.js";

function setupTwoPlayerGame() {
  const state = createCribbageInitialState("2P");
  addPlayer(state, { playerId: "p1", displayName: "Player 1" });
  addPlayer(state, { playerId: "p2", displayName: "Player 2" });
  return state;
}

test("cribbage: startRound deals and moves to discard", () => {
  const state = setupTwoPlayerGame();
  startRound(state);

  assert.equal(state.phase, PHASES.DISCARD);
  assert.equal(state.hands.length, 2);
  assert.equal(state.hands[0].length, 6);
  assert.equal(state.hands[1].length, 6);
  assert.equal(state.crib.length, 0);
  assert.equal(state.deck.length, 52 - 12);
});

test("cribbage: discard flow and cut with heels", () => {
  const state = setupTwoPlayerGame();
  startRound(state);

  const p1Discard = state.hands[0].slice(0, 2);
  const p2Discard = state.hands[1].slice(0, 2);

  const r1 = discardToCrib(state, "p1", p1Discard);
  assert.equal(r1.ok, true);
  assert.equal(state.phase, PHASES.DISCARD);

  const r2 = discardToCrib(state, "p2", p2Discard);
  assert.equal(r2.ok, true);
  assert.equal(state.phase, PHASES.CUT);
  assert.equal(state.crib.length, 4);

  state.deck = ["JH"];
  const cut = cutDeck(state, "p2");
  assert.equal(cut.ok, true);
  assert.equal(cut.heels, true);
  assert.equal(state.starter, "JH");
  assert.equal(state.scores[state.dealerIndex], 2);
  assert.equal(state.phase, PHASES.PEGGING);
});

test("cribbage: sanitizeState hides other hands and crib", () => {
  const state = setupTwoPlayerGame();
  startRound(state);

  const forP1 = sanitizeState(state, "p1");
  assert.equal(Array.isArray(forP1.hands[0]), true);
  assert.equal(typeof forP1.hands[1].count, "number");
  assert.equal(forP1.crib.count, 0);

  const spectator = sanitizeState(state, "spectator");
  assert.equal(typeof spectator.hands[0].count, "number");
  assert.equal(typeof spectator.hands[1].count, "number");
});
