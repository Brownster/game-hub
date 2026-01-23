import test from "node:test";
import assert from "node:assert/strict";
import {
  addResources,
  applyMonopoly,
  applyYearOfPlenty,
  canBankTrade,
  createResourceBundle,
  deductResources,
  executeBankTrade,
  getDiscardCount,
  getTotalResources,
  hasResources,
  mustDiscard,
  validateDiscard,
  validateTradeOffer,
} from "../src/games/catan/catanResources.js";
import { PORTS, RESOURCES } from "../src/games/catan/catanConstants.js";

function makePlayer(playerId, resourceOverrides = {}) {
  const resources = createResourceBundle();
  Object.assign(resources, resourceOverrides);
  return {
    playerId,
    resources,
    devCards: [],
    knightsPlayed: 0,
    longestRoad: 0,
  };
}

function makeState(players, corners = []) {
  return {
    board: {
      corners,
    },
    players,
  };
}

test("catanResources: bundle math and resource checks", () => {
  const player = makePlayer("p1");

  addResources(player, { [RESOURCES.WOOD]: 2, [RESOURCES.BRICK]: 1 });
  assert.equal(getTotalResources(player.resources), 3);
  assert.equal(hasResources(player.resources, { [RESOURCES.WOOD]: 1 }), true);

  deductResources(player, { [RESOURCES.WOOD]: 1, [RESOURCES.BRICK]: 1 });
  assert.equal(player.resources[RESOURCES.WOOD], 1);
  assert.equal(player.resources[RESOURCES.BRICK], 0);
});

test("catanResources: discard validation uses exact counts", () => {
  const player = makePlayer("p1", {
    [RESOURCES.WOOD]: 3,
    [RESOURCES.BRICK]: 2,
    [RESOURCES.WHEAT]: 2,
    [RESOURCES.SHEEP]: 2,
  });

  assert.equal(mustDiscard(player), true);
  assert.equal(getDiscardCount(player), 4);

  const wrongCount = validateDiscard(player, { [RESOURCES.WOOD]: 3 });
  assert.deepEqual(wrongCount, {
    ok: false,
    error: "WRONG_DISCARD_COUNT",
    required: 4,
  });

  const notEnough = validateDiscard(player, { [RESOURCES.ORE]: 4 });
  assert.deepEqual(notEnough, { ok: false, error: "NOT_ENOUGH_RESOURCES" });

  const valid = validateDiscard(player, {
    [RESOURCES.WOOD]: 2,
    [RESOURCES.BRICK]: 1,
    [RESOURCES.WHEAT]: 1,
  });
  assert.deepEqual(valid, { ok: true });
});

test("catanResources: trade offer validation rejects invalid offers", () => {
  const fromPlayer = makePlayer("p1", { [RESOURCES.WOOD]: 1 });
  const toPlayer = makePlayer("p2", { [RESOURCES.BRICK]: 2 });
  const state = makeState([fromPlayer, toPlayer]);

  assert.deepEqual(
    validateTradeOffer(state, "p1", "p1", { [RESOURCES.WOOD]: 1 }, { [RESOURCES.BRICK]: 1 }),
    { ok: false, error: "CANNOT_TRADE_WITH_SELF" }
  );

  assert.deepEqual(
    validateTradeOffer(state, "p1", "p2", { [RESOURCES.ORE]: 1 }, { [RESOURCES.BRICK]: 1 }),
    { ok: false, error: "OFFERER_LACKS_RESOURCES" }
  );

  assert.deepEqual(
    validateTradeOffer(state, "p1", "p2", { [RESOURCES.WOOD]: 1 }, { [RESOURCES.SHEEP]: 1 }),
    { ok: false, error: "TARGET_LACKS_RESOURCES" }
  );

  assert.deepEqual(
    validateTradeOffer(state, "p1", "p2", createResourceBundle(), { [RESOURCES.BRICK]: 1 }),
    { ok: false, error: "EMPTY_TRADE" }
  );
});

test("catanResources: bank trades respect best ratio", () => {
  const player = makePlayer("p1", { [RESOURCES.WOOD]: 4, [RESOURCES.BRICK]: 0 });
  const stateNoPort = makeState([player]);

  const defaultTrade = canBankTrade(stateNoPort, "p1", RESOURCES.WOOD, RESOURCES.BRICK);
  assert.deepEqual(defaultTrade, { ok: true, ratio: 4 });

  const withSpecificPort = makeState(
    [makePlayer("p1", { [RESOURCES.WOOD]: 2, [RESOURCES.BRICK]: 0 })],
    [
      {
        id: "corner-wood",
        building: "settlement",
        playerId: "p1",
        port: { type: RESOURCES.WOOD, ratio: 2 },
      },
    ]
  );

  const specificTrade = canBankTrade(
    withSpecificPort,
    "p1",
    RESOURCES.WOOD,
    RESOURCES.BRICK
  );
  assert.deepEqual(specificTrade, { ok: true, ratio: 2 });

  const withGenericPort = makeState(
    [makePlayer("p1", { [RESOURCES.WOOD]: 3, [RESOURCES.BRICK]: 0 })],
    [
      {
        id: "corner-generic",
        building: "settlement",
        playerId: "p1",
        port: { type: PORTS.GENERIC, ratio: 3 },
      },
    ]
  );

  const genericTrade = executeBankTrade(
    withGenericPort,
    "p1",
    RESOURCES.WOOD,
    RESOURCES.BRICK
  );
  assert.deepEqual(genericTrade, { ok: true, ratio: 3 });
  const tradePlayer = withGenericPort.players[0];
  assert.equal(tradePlayer.resources[RESOURCES.WOOD], 0);
  assert.equal(tradePlayer.resources[RESOURCES.BRICK], 1);
});

test("catanResources: monopoly and year of plenty update resources", () => {
  const p1 = makePlayer("p1", { [RESOURCES.BRICK]: 1 });
  const p2 = makePlayer("p2", { [RESOURCES.BRICK]: 3, [RESOURCES.WOOD]: 2 });
  const p3 = makePlayer("p3", { [RESOURCES.BRICK]: 0, [RESOURCES.ORE]: 1 });
  const state = makeState([p1, p2, p3]);

  const monopolyResult = applyMonopoly(state, "p1", RESOURCES.BRICK);
  assert.deepEqual(monopolyResult, { ok: true, stolen: 3 });
  assert.equal(p1.resources[RESOURCES.BRICK], 4);
  assert.equal(p2.resources[RESOURCES.BRICK], 0);
  assert.equal(p3.resources[RESOURCES.BRICK], 0);

  const plentyResult = applyYearOfPlenty(state, "p1", RESOURCES.ORE, RESOURCES.WHEAT);
  assert.deepEqual(plentyResult, { ok: true });
  assert.equal(p1.resources[RESOURCES.ORE], 1);
  assert.equal(p1.resources[RESOURCES.WHEAT], 1);
});
