import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateLongestRoad,
  calculateVictoryPoints,
  updateLongestRoad,
} from "../src/games/catan/catanScoring.js";
import { DEV_CARDS, MIN_LONGEST_ROAD, VP_VALUES } from "../src/games/catan/catanConstants.js";
import {
  cornerKey,
  edgeKey,
  getCornerEdges,
  getEdgeCorners,
} from "../src/games/board/hexUtils.js";

function parseCornerKey(key) {
  const match = key.match(/^C:(-?\d+),(-?\d+),(\d+)$/);
  if (!match) {
    throw new Error(`Invalid corner key: ${key}`);
  }
  return {
    q: Number.parseInt(match[1], 10),
    r: Number.parseInt(match[2], 10),
    dir: Number.parseInt(match[3], 10),
  };
}

function canonicalCorner(corner) {
  return parseCornerKey(cornerKey(corner.q, corner.r, corner.dir));
}

function buildRoadChain(startCorner, length, playerId) {
  let currentCorner = canonicalCorner(startCorner);
  const edges = [];
  const corners = new Map();
  const path = [];
  let previousEdgeId = null;
  const usedEdgeIds = new Set();

  const ensureCorner = (corner) => {
    const id = cornerKey(corner.q, corner.r, corner.dir);
    if (!corners.has(id)) {
      corners.set(id, {
        id,
        q: corner.q,
        r: corner.r,
        direction: corner.dir,
        building: null,
        playerId: null,
      });
    }
    return id;
  };

  const startId = ensureCorner(currentCorner);
  path.push(startId);

  for (let i = 0; i < length; i += 1) {
    const candidates = getCornerEdges(
      currentCorner.q,
      currentCorner.r,
      currentCorner.dir
    ).map((edge) => ({
      ...edge,
      id: edgeKey(edge.q, edge.r, edge.dir),
    }));

    const nextEdge = candidates.find(
      (edge) => edge.id !== previousEdgeId && !usedEdgeIds.has(edge.id)
    );

    if (!nextEdge) {
      throw new Error("Unable to extend road chain");
    }

    usedEdgeIds.add(nextEdge.id);

    const edgeCornerData = getEdgeCorners(nextEdge.q, nextEdge.r, nextEdge.dir);
    const cornerIds = edgeCornerData.map((corner) => ensureCorner(corner));

    edges.push({
      id: nextEdge.id,
      q: nextEdge.q,
      r: nextEdge.r,
      direction: nextEdge.dir,
      road: true,
      playerId,
      corners: cornerIds,
    });

    const currentCornerId = cornerKey(
      currentCorner.q,
      currentCorner.r,
      currentCorner.dir
    );
    const nextCorner = edgeCornerData.find(
      (corner) => cornerKey(corner.q, corner.r, corner.dir) !== currentCornerId
    );

    if (!nextCorner) {
      throw new Error("Unable to find next corner for road chain");
    }

    const nextCornerId = ensureCorner(nextCorner);
    path.push(nextCornerId);
    currentCorner = canonicalCorner(nextCorner);
    previousEdgeId = nextEdge.id;
  }

  return {
    edges,
    corners: Array.from(corners.values()),
    path,
  };
}

function mergeCorners(...cornerSets) {
  const merged = new Map();
  for (const corners of cornerSets) {
    for (const corner of corners) {
      merged.set(corner.id, corner);
    }
  }
  return Array.from(merged.values());
}

function makePlayer(playerId, overrides = {}) {
  return {
    playerId,
    devCards: [],
    knightsPlayed: 0,
    longestRoad: 0,
    resources: {},
    ...overrides,
  };
}

test("catanScoring: victory points include buildings, bonuses, and VP cards", () => {
  const player = makePlayer("p1", {
    devCards: [
      { type: DEV_CARDS.VICTORY_POINT },
      { type: DEV_CARDS.VICTORY_POINT },
    ],
  });

  const state = {
    players: [player],
    board: {
      corners: [
        { id: "c1", playerId: "p1", building: "settlement" },
        { id: "c2", playerId: "p1", building: "settlement" },
        { id: "c3", playerId: "p1", building: "city" },
      ],
    },
    longestRoadHolder: "p1",
    largestArmy: "p2",
  };

  const expected =
    2 * VP_VALUES.settlement +
    1 * VP_VALUES.city +
    VP_VALUES.longestRoad +
    2 * VP_VALUES.devCardVP;

  assert.equal(calculateVictoryPoints(state, "p1"), expected);
});

test("catanScoring: updateLongestRoad awards and preserves holder on ties", () => {
  const p1Chain = buildRoadChain({ q: 0, r: 0, dir: 0 }, MIN_LONGEST_ROAD, "p1");
  const p2Chain = buildRoadChain({ q: 6, r: 0, dir: 0 }, MIN_LONGEST_ROAD - 1, "p2");

  const state = {
    players: [makePlayer("p1"), makePlayer("p2")],
    board: {
      edges: [...p1Chain.edges, ...p2Chain.edges],
      corners: mergeCorners(p1Chain.corners, p2Chain.corners),
    },
    longestRoadHolder: null,
  };

  const firstUpdate = updateLongestRoad(state);
  assert.deepEqual(firstUpdate, {
    changed: true,
    holder: "p1",
    length: MIN_LONGEST_ROAD,
  });

  const p2Tie = buildRoadChain({ q: 10, r: 0, dir: 0 }, MIN_LONGEST_ROAD, "p2");
  state.board.edges.push(...p2Tie.edges);
  state.board.corners = mergeCorners(state.board.corners, p2Tie.corners);

  const tieUpdate = updateLongestRoad(state);
  assert.deepEqual(tieUpdate, { changed: false });
  assert.equal(state.longestRoadHolder, "p1");
});

test("catanScoring: updateLongestRoad reassigns when holder no longer qualifies", () => {
  const p1Chain = buildRoadChain({ q: 0, r: 4, dir: 1 }, MIN_LONGEST_ROAD, "p1");
  const p2Chain = buildRoadChain({ q: 8, r: 4, dir: 1 }, MIN_LONGEST_ROAD, "p2");

  const blockCornerId = p1Chain.path[2];
  const blockedCorner = p1Chain.corners.find((corner) => corner.id === blockCornerId);
  blockedCorner.building = "settlement";
  blockedCorner.playerId = "p2";

  const state = {
    players: [makePlayer("p1"), makePlayer("p2")],
    board: {
      edges: [...p1Chain.edges, ...p2Chain.edges],
      corners: mergeCorners(p1Chain.corners, p2Chain.corners),
    },
    longestRoadHolder: "p1",
  };

  const p1Length = calculateLongestRoad(state, "p1");
  const p2Length = calculateLongestRoad(state, "p2");
  assert.ok(p1Length < MIN_LONGEST_ROAD);
  assert.equal(p2Length, MIN_LONGEST_ROAD);

  const update = updateLongestRoad(state);
  assert.deepEqual(update, {
    changed: true,
    holder: "p2",
    length: MIN_LONGEST_ROAD,
  });
});

test("catanScoring: updateLongestRoad clears holder when no one qualifies", () => {
  const p1Chain = buildRoadChain({ q: 0, r: -4, dir: 2 }, MIN_LONGEST_ROAD - 1, "p1");
  const p2Chain = buildRoadChain({ q: 8, r: -4, dir: 2 }, MIN_LONGEST_ROAD - 2, "p2");

  const state = {
    players: [makePlayer("p1"), makePlayer("p2")],
    board: {
      edges: [...p1Chain.edges, ...p2Chain.edges],
      corners: mergeCorners(p1Chain.corners, p2Chain.corners),
    },
    longestRoadHolder: "p1",
  };

  const update = updateLongestRoad(state);
  assert.deepEqual(update, { changed: true, holder: null, length: 0 });
  assert.equal(state.longestRoadHolder, null);
});
