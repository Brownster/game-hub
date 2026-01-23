import test from "node:test";
import assert from "node:assert/strict";
import {
  ACTIONS,
  PHASES,
  createCrazyEightsInitialState,
  getAvailableActions,
  processAction,
  startCrazyEightsGame,
} from "../src/games/crazy_eights/crazyEightsService.js";
import { parseCard } from "../src/games/cards/cardUtils.js";

function makeState(players) {
  const state = createCrazyEightsInitialState(players);
  state.phase = PHASES.TURN;
  state.turnIndex = 0;
  state.currentSuit = "H";
  state.discardPile = ["5H"];
  state.drawPile = [];
  state.hands = Object.fromEntries(players.map((player) => [player.playerId, []]));
  state.lastDrawnCardId = null;
  state.winner = null;
  return state;
}

test("crazy eights: start deals hands and sets starter", () => {
  const state = createCrazyEightsInitialState([
    { playerId: "p1", displayName: "P1", isHost: true },
    { playerId: "p2", displayName: "P2" },
  ]);

  const result = startCrazyEightsGame(state);
  assert.equal(result.ok, true);
  assert.equal(state.phase, PHASES.TURN);
  assert.equal(state.hands.p1.length, 7);
  assert.equal(state.hands.p2.length, 7);
  assert.equal(state.discardPile.length, 1);
  assert.equal(state.drawPile.length, 52 - 7 * 2 - 1);
  assert.equal(state.currentSuit, parseCard(state.discardPile[0]).suit);
});

test("crazy eights: start uses smaller hand size for 3+ players", () => {
  const state = createCrazyEightsInitialState([
    { playerId: "p1", displayName: "P1", isHost: true },
    { playerId: "p2", displayName: "P2" },
    { playerId: "p3", displayName: "P3" },
  ]);

  const result = startCrazyEightsGame(state);
  assert.equal(result.ok, true);
  assert.equal(state.hands.p1.length, 5);
  assert.equal(state.hands.p2.length, 5);
  assert.equal(state.hands.p3.length, 5);
});

test("crazy eights: playability matches rank, suit, and 8s", () => {
  const state = makeState([
    { playerId: "p1", displayName: "P1" },
    { playerId: "p2", displayName: "P2" },
  ]);
  state.hands.p1 = ["5S", "9H", "8C", "2D"];

  const actions = getAvailableActions(state, "p1");
  const play = actions.find((action) => action.type === ACTIONS.PLAY_CARD);

  assert.ok(play, "Expected playable cards to be available");
  assert.deepEqual([...play.playable].sort(), ["5S", "8C", "9H"].sort());
});

test("crazy eights: eight requires declared suit and updates current suit", () => {
  const state = makeState([
    { playerId: "p1", displayName: "P1" },
    { playerId: "p2", displayName: "P2" },
  ]);
  state.hands.p1 = ["8C", "2D"];

  const missingSuit = processAction(state, "p1", { type: ACTIONS.PLAY_CARD, cardId: "8C" });
  assert.equal(missingSuit.ok, false);
  assert.equal(missingSuit.error, "DECLARED_SUIT_REQUIRED");

  const played = processAction(state, "p1", {
    type: ACTIONS.PLAY_CARD,
    cardId: "8C",
    declaredSuit: "S",
  });
  assert.equal(played.ok, true);
  assert.equal(state.currentSuit, "S");
  assert.equal(state.discardPile[state.discardPile.length - 1], "8C");
  assert.equal(state.turnIndex, 1);
});

test("crazy eights: drawing is required when no playable cards exist", () => {
  const state = makeState([
    { playerId: "p1", displayName: "P1" },
    { playerId: "p2", displayName: "P2" },
  ]);
  state.hands.p1 = ["2D"];
  state.drawPile = ["3C"];

  const actions = getAvailableActions(state, "p1");
  assert.deepEqual(actions, [{ type: ACTIONS.DRAW_CARD }]);

  const pass = processAction(state, "p1", { type: ACTIONS.PASS });
  assert.equal(pass.ok, false);
  assert.equal(pass.error, "MUST_DRAW");

  const draw = processAction(state, "p1", { type: ACTIONS.DRAW_CARD });
  assert.equal(draw.ok, true);
  assert.equal(state.hands.p1.length, 2);
  assert.equal(state.lastDrawnCardId, "3C");
});

test("crazy eights: passing advances turn when no draw is possible", () => {
  const state = makeState([
    { playerId: "p1", displayName: "P1" },
    { playerId: "p2", displayName: "P2" },
  ]);
  state.hands.p1 = ["2D"];
  state.drawPile = [];
  state.discardPile = ["5H"];

  const actions = getAvailableActions(state, "p1");
  assert.deepEqual(actions, [{ type: ACTIONS.PASS }]);

  const result = processAction(state, "p1", { type: ACTIONS.PASS });
  assert.equal(result.ok, true);
  assert.equal(state.turnIndex, 1);
});

test("crazy eights: playing last card ends the game", () => {
  const state = makeState([
    { playerId: "p1", displayName: "P1" },
    { playerId: "p2", displayName: "P2" },
  ]);
  state.hands.p1 = ["5S"];

  const result = processAction(state, "p1", { type: ACTIONS.PLAY_CARD, cardId: "5S" });
  assert.equal(result.ok, true);
  assert.equal(state.phase, PHASES.FINISHED);
  assert.equal(state.winner, "p1");
});
