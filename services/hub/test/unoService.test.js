import test from "node:test";
import assert from "node:assert/strict";
import {
  ACTIONS,
  PHASES,
  createUnoInitialState,
  getAvailableActions,
  processAction,
  startUnoGame,
} from "../src/games/uno/unoService.js";
import { CARD_TYPES, COLORS } from "../src/games/uno/unoConstants.js";

function makeCard({ id, color, type, value }) {
  return { id, color, type, value };
}

function makeState(players) {
  const state = createUnoInitialState(players);
  state.phase = PHASES.TURN;
  state.turnIndex = 0;
  state.direction = 1;
  state.pendingDraw = 0;
  state.pendingDrawType = null;
  state.pendingDrawTargetId = null;
  state.pendingColorChoiceFor = null;
  state.drawnCardId = null;
  state.drawnPlayerId = null;
  state.unoPendingPlayerId = null;
  state.winner = null;
  state.discardPile = [makeCard({ id: "discard", color: "red", type: CARD_TYPES.NUMBER, value: "5" })];
  state.currentColor = "red";
  state.currentValue = "5";
  state.hands = Object.fromEntries(players.map((p) => [p.playerId, []]));
  state.drawPile = [];
  return state;
}

test("uno: start game deals hands and sets starter", () => {
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    const state = createUnoInitialState([
      { playerId: "p1", displayName: "P1", isHost: true },
      { playerId: "p2", displayName: "P2" },
    ]);

    const result = startUnoGame(state);
    assert.equal(result.ok, true);
    assert.equal(state.phase, PHASES.TURN);
    assert.equal(state.hands.p1.length, 7);
    assert.equal(state.hands.p2.length, 7);
    assert.equal(state.discardPile.length, 1);
    assert.ok(state.currentColor);
    assert.notEqual(state.discardPile[0].type, CARD_TYPES.WILD);
    assert.notEqual(state.discardPile[0].type, CARD_TYPES.DRAW4);
  } finally {
    Math.random = originalRandom;
  }
});

test("uno: cannot start with fewer than 2 players", () => {
  const state = createUnoInitialState([{ playerId: "p1", displayName: "P1" }]);
  const result = startUnoGame(state);
  assert.equal(result.ok, false);
  assert.equal(result.error, "NOT_ENOUGH_PLAYERS");
  assert.equal(state.phase, PHASES.LOBBY);
});

test("uno: available actions respect pending draw stacking", () => {
  const state = makeState([
    { playerId: "p1", displayName: "P1" },
    { playerId: "p2", displayName: "P2" },
  ]);
  state.rules.stacking = true;
  state.pendingDraw = 2;
  state.pendingDrawType = CARD_TYPES.DRAW2;
  state.hands.p1 = [
    makeCard({ id: "d2", color: "red", type: CARD_TYPES.DRAW2, value: "draw2" }),
  ];

  const actions = getAvailableActions(state, "p1");
  const play = actions.find((action) => action.type === ACTIONS.PLAY_CARD);
  const draw = actions.find((action) => action.type === ACTIONS.DRAW_CARD);

  assert.deepEqual(play.playable, ["d2"]);
  assert.equal(draw.count, 2);
});

test("uno: skip advances turn by two players", () => {
  const state = makeState([
    { playerId: "p1", displayName: "P1" },
    { playerId: "p2", displayName: "P2" },
    { playerId: "p3", displayName: "P3" },
  ]);
  state.hands.p1 = [
    makeCard({ id: "skip", color: "red", type: CARD_TYPES.SKIP, value: "skip" }),
    makeCard({ id: "n7", color: "blue", type: CARD_TYPES.NUMBER, value: "7" }),
  ];

  const result = processAction(state, "p1", { type: ACTIONS.PLAY_CARD, cardId: "skip" });
  assert.equal(result.ok, true);
  assert.equal(state.turnIndex, 2);
});

test("uno: reverse with two players keeps same player", () => {
  const state = makeState([
    { playerId: "p1", displayName: "P1" },
    { playerId: "p2", displayName: "P2" },
  ]);
  state.hands.p1 = [
    makeCard({ id: "rev", color: "red", type: CARD_TYPES.REVERSE, value: "reverse" }),
  ];

  const result = processAction(state, "p1", { type: ACTIONS.PLAY_CARD, cardId: "rev" });
  assert.equal(result.ok, true);
  assert.equal(state.turnIndex, 0);
});

test("uno: draw2 sets pending draw and enforces draw", () => {
  const state = makeState([
    { playerId: "p1", displayName: "P1" },
    { playerId: "p2", displayName: "P2" },
  ]);
  state.rules.unoCall = false;
  state.hands.p1 = [
    makeCard({ id: "d2", color: "red", type: CARD_TYPES.DRAW2, value: "draw2" }),
    makeCard({ id: "n7", color: "blue", type: CARD_TYPES.NUMBER, value: "7" }),
  ];
  state.hands.p2 = [
    makeCard({ id: "n1", color: "yellow", type: CARD_TYPES.NUMBER, value: "1" }),
  ];
  state.drawPile = [
    makeCard({ id: "c1", color: "blue", type: CARD_TYPES.NUMBER, value: "2" }),
    makeCard({ id: "c2", color: "green", type: CARD_TYPES.NUMBER, value: "3" }),
  ];

  const played = processAction(state, "p1", { type: ACTIONS.PLAY_CARD, cardId: "d2" });
  assert.equal(played.ok, true);
  assert.equal(state.pendingDraw, 2);
  assert.equal(state.turnIndex, 1);

  const invalid = processAction(state, "p2", { type: ACTIONS.PLAY_CARD, cardId: "n1" });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.error, "DRAW_REQUIRED");

  const drawn = processAction(state, "p2", { type: ACTIONS.DRAW_CARD });
  assert.equal(drawn.ok, true);
  assert.equal(state.pendingDraw, 0);
  assert.equal(state.hands.p2.length, 3);
});

test("uno: draw4 requires color choice then target draws", () => {
  const state = makeState([
    { playerId: "p1", displayName: "P1" },
    { playerId: "p2", displayName: "P2" },
  ]);
  state.rules.unoCall = false;
  state.hands.p1 = [
    makeCard({ id: "d4", color: "wild", type: CARD_TYPES.DRAW4, value: "draw4" }),
    makeCard({ id: "n7", color: "blue", type: CARD_TYPES.NUMBER, value: "7" }),
  ];
  state.hands.p2 = [makeCard({ id: "n1", color: "yellow", type: CARD_TYPES.NUMBER, value: "1" })];
  state.drawPile = [
    makeCard({ id: "c1", color: "red", type: CARD_TYPES.NUMBER, value: "1" }),
    makeCard({ id: "c2", color: "blue", type: CARD_TYPES.NUMBER, value: "2" }),
    makeCard({ id: "c3", color: "green", type: CARD_TYPES.NUMBER, value: "3" }),
    makeCard({ id: "c4", color: "yellow", type: CARD_TYPES.NUMBER, value: "4" }),
  ];

  const played = processAction(state, "p1", { type: ACTIONS.PLAY_CARD, cardId: "d4" });
  assert.equal(played.ok, true);
  assert.equal(state.phase, PHASES.COLOR_CHOICE);
  assert.equal(state.pendingColorChoiceFor, "p1");
  assert.equal(state.pendingDraw, 4);

  const badColor = processAction(state, "p1", { type: ACTIONS.CHOOSE_COLOR, color: "purple" });
  assert.equal(badColor.ok, false);
  assert.equal(badColor.error, "INVALID_COLOR");

  const colorChoice = processAction(state, "p1", { type: ACTIONS.CHOOSE_COLOR, color: COLORS[0] });
  assert.equal(colorChoice.ok, true);
  assert.equal(state.phase, PHASES.TURN);
  assert.equal(state.currentColor, COLORS[0]);
  assert.equal(state.turnIndex, 1);

  const draw = processAction(state, "p2", { type: ACTIONS.DRAW_CARD });
  assert.equal(draw.ok, true);
  assert.equal(state.hands.p2.length, 5);
});

test("uno: wild requires color choice before play continues", () => {
  const state = makeState([
    { playerId: "p1", displayName: "P1" },
    { playerId: "p2", displayName: "P2" },
  ]);
  state.hands.p1 = [
    makeCard({ id: "w1", color: "wild", type: CARD_TYPES.WILD, value: "wild" }),
    makeCard({ id: "n7", color: "blue", type: CARD_TYPES.NUMBER, value: "7" }),
  ];

  const played = processAction(state, "p1", { type: ACTIONS.PLAY_CARD, cardId: "w1" });
  assert.equal(played.ok, true);
  assert.equal(state.phase, PHASES.COLOR_CHOICE);

  const wrongAction = processAction(state, "p2", { type: ACTIONS.PLAY_CARD, cardId: "any" });
  assert.equal(wrongAction.ok, false);
  assert.equal(wrongAction.error, "COLOR_REQUIRED");

  const chosen = processAction(state, "p1", { type: ACTIONS.CHOOSE_COLOR, color: "green" });
  assert.equal(chosen.ok, true);
  assert.equal(state.phase, PHASES.TURN);
  assert.equal(state.currentColor, "green");
});

test("uno: UNO call penalty applies when not called", () => {
  const state = makeState([
    { playerId: "p1", displayName: "P1" },
    { playerId: "p2", displayName: "P2" },
  ]);
  state.hands.p1 = [
    makeCard({ id: "n5", color: "red", type: CARD_TYPES.NUMBER, value: "5" }),
    makeCard({ id: "n1", color: "red", type: CARD_TYPES.NUMBER, value: "1" }),
  ];
  state.hands.p2 = [makeCard({ id: "n9", color: "yellow", type: CARD_TYPES.NUMBER, value: "9" })];
  state.drawPile = [
    makeCard({ id: "p1", color: "blue", type: CARD_TYPES.NUMBER, value: "2" }),
    makeCard({ id: "p2", color: "green", type: CARD_TYPES.NUMBER, value: "3" }),
    makeCard({ id: "p3", color: "yellow", type: CARD_TYPES.NUMBER, value: "4" }),
  ];

  const played = processAction(state, "p1", { type: ACTIONS.PLAY_CARD, cardId: "n5" });
  assert.equal(played.ok, true);
  assert.equal(state.unoPendingPlayerId, "p1");

  const draw = processAction(state, "p2", { type: ACTIONS.DRAW_CARD });
  assert.equal(draw.ok, true);
  assert.equal(state.unoPendingPlayerId, null);
  assert.equal(state.hands.p1.length, 3);
});

test("uno: winner is declared when player empties hand", () => {
  const state = makeState([
    { playerId: "p1", displayName: "P1" },
    { playerId: "p2", displayName: "P2" },
  ]);
  state.hands.p1 = [makeCard({ id: "n5", color: "red", type: CARD_TYPES.NUMBER, value: "5" })];

  const result = processAction(state, "p1", { type: ACTIONS.PLAY_CARD, cardId: "n5" });
  assert.equal(result.ok, true);
  assert.equal(result.winner, "p1");
  assert.equal(state.phase, PHASES.FINISHED);
  assert.equal(state.winner, "p1");
});

test("uno: invalid actions return clear errors", () => {
  const state = makeState([
    { playerId: "p1", displayName: "P1" },
    { playerId: "p2", displayName: "P2" },
  ]);
  state.hands.p1 = [
    makeCard({ id: "n9", color: "yellow", type: CARD_TYPES.NUMBER, value: "9" }),
    makeCard({ id: "n5", color: "red", type: CARD_TYPES.NUMBER, value: "5" }),
  ];
  state.hands.p2 = [makeCard({ id: "n1", color: "red", type: CARD_TYPES.NUMBER, value: "1" })];

  const notYourTurn = processAction(state, "p2", { type: ACTIONS.PLAY_CARD, cardId: "n1" });
  assert.equal(notYourTurn.ok, false);
  assert.equal(notYourTurn.error, "NOT_YOUR_TURN");

  const notPlayable = processAction(state, "p1", { type: ACTIONS.PLAY_CARD, cardId: "n9" });
  assert.equal(notPlayable.ok, false);
  assert.equal(notPlayable.error, "CARD_NOT_PLAYABLE");

  const drawDenied = processAction(state, "p1", { type: ACTIONS.DRAW_CARD });
  assert.equal(drawDenied.ok, false);
  assert.equal(drawDenied.error, "PLAYABLE_CARD_AVAILABLE");
});
