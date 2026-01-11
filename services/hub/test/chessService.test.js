import test from "node:test";
import assert from "node:assert/strict";
import {
  ACTIONS,
  PHASES,
  createChessInitialState,
  processAction,
  startChessGame,
} from "../src/games/chess/chessService.js";

function createPlayers() {
  return [
    { playerId: "p1", displayName: "White", isHost: true },
    { playerId: "p2", displayName: "Black" },
  ];
}

test("chess: start game sets initial state", () => {
  const state = createChessInitialState(createPlayers(), "PVP");
  const started = startChessGame(state);
  assert.equal(started.ok, true);
  assert.equal(state.phase, PHASES.TURN);
  assert.equal(state.turn, "w");
  assert.ok(state.fen);
});

test("chess: legal move updates turn and history", () => {
  const state = createChessInitialState(createPlayers(), "PVP");
  startChessGame(state);

  const move = processAction(state, "p1", { type: ACTIONS.MOVE, from: "e2", to: "e4" });
  assert.equal(move.ok, true);
  assert.equal(state.turn, "b");
  assert.equal(state.moves.length, 1);
  assert.equal(state.lastMove?.from, "e2");
});

test("chess: promotion requires piece", () => {
  const state = createChessInitialState(createPlayers(), "PVP");
  startChessGame(state);

  state.fen = "8/P7/8/8/8/8/8/k6K w - - 0 1";
  state.turn = "w";

  const blocked = processAction(state, "p1", { type: ACTIONS.MOVE, from: "a7", to: "a8" });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.error, "PROMOTION_REQUIRED");

  const promoted = processAction(state, "p1", { type: ACTIONS.MOVE, from: "a7", to: "a8", promotion: "q" });
  assert.equal(promoted.ok, true);
});

test("chess: resign ends game for opponent", () => {
  const state = createChessInitialState(createPlayers(), "PVP");
  startChessGame(state);

  const resign = processAction(state, "p1", { type: ACTIONS.RESIGN });
  assert.equal(resign.ok, true);
  assert.equal(state.phase, PHASES.FINISHED);
  assert.equal(state.winnerColor, "b");
});

test("chess: draw offer accept/decline", () => {
  const state = createChessInitialState(createPlayers(), "PVP");
  startChessGame(state);

  const offer = processAction(state, "p1", { type: ACTIONS.OFFER_DRAW });
  assert.equal(offer.ok, true);
  assert.equal(state.drawOfferBy, "p1");

  const decline = processAction(state, "p2", { type: ACTIONS.DECLINE_DRAW });
  assert.equal(decline.ok, true);
  assert.equal(state.drawOfferBy, null);

  processAction(state, "p1", { type: ACTIONS.OFFER_DRAW });
  const accept = processAction(state, "p2", { type: ACTIONS.ACCEPT_DRAW });
  assert.equal(accept.ok, true);
  assert.equal(state.phase, PHASES.FINISHED);
  assert.equal(state.drawReason, "draw_agreed");
});
