import test from "node:test";
import assert from "node:assert/strict";
import {
  createBoardState,
  findLongestPath,
  getAllCorners,
  getAllEdges,
  getAllTiles,
  getPlayerBuildings,
  getPlayerRoads,
  placeBuilding,
  placeRoad,
  serializeBoard,
  deserializeBoard,
} from "../src/games/board/boardUtils.js";

test("boardUtils: board state init and serialization", () => {
  const board = createBoardState({
    tiles: [{ id: "t1" }],
    corners: [{ id: "a" }, { id: "b" }],
    edges: [{ id: "e1" }],
  });

  assert.equal(getAllTiles(board).length, 1);
  assert.equal(getAllCorners(board).length, 2);
  assert.equal(getAllEdges(board).length, 1);

  const serialized = serializeBoard(board);
  const restored = deserializeBoard(serialized);
  assert.equal(getAllTiles(restored).length, 1);
});

test("boardUtils: place buildings/roads and longest path", () => {
  const board = createBoardState({
    tiles: [],
    corners: [{ id: "a" }, { id: "b" }, { id: "c" }],
    edges: [
      { id: "e1", corners: ["a", "b"] },
      { id: "e2", corners: ["b", "c"] },
    ],
  });

  placeRoad(board, "e1", "p1");
  placeRoad(board, "e2", "p1");

  const edgeCornersFn = (edge) => edge.corners;
  const cornerEdgesFn = (corner) => {
    if (corner.id === "a") return ["e1"];
    if (corner.id === "b") return ["e1", "e2"];
    return ["e2"];
  };

  const longest = findLongestPath(board, "p1", edgeCornersFn, cornerEdgesFn);
  assert.equal(longest, 2);

  placeBuilding(board, "b", "settlement", "p2");
  const blocked = findLongestPath(board, "p1", edgeCornersFn, cornerEdgesFn);
  assert.equal(blocked, 1);

  const roads = getPlayerRoads(board, "p1");
  const buildings = getPlayerBuildings(board, "p2");
  assert.equal(roads.length, 2);
  assert.equal(buildings.length, 1);
});
