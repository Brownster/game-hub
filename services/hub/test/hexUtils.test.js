import test from "node:test";
import assert from "node:assert/strict";
import {
  cornerKey,
  createHexGrid,
  edgeKey,
  getHexNeighbor,
  getHexNeighbors,
  hexKey,
  hexToPixel,
  parseHexKey,
  pixelToHex,
} from "../src/games/board/hexUtils.js";

test("hexUtils: createHexGrid produces expected count", () => {
  const hexes = createHexGrid(2);
  assert.equal(hexes.length, 19);
});

test("hexUtils: pixel/hex conversions round-trip", () => {
  const pixel = hexToPixel(1, -1, 10);
  const hex = pixelToHex(pixel.x, pixel.y, 10);
  assert.deepEqual(hex, { q: 1, r: -1 });
});

test("hexUtils: neighbor utilities", () => {
  const neighbors = getHexNeighbors(0, 0);
  assert.equal(neighbors.length, 6);
  assert.deepEqual(getHexNeighbor(0, 0, 0), { q: 1, r: 0 });
});

test("hexUtils: key helpers are consistent", () => {
  const key = hexKey(2, -1);
  assert.deepEqual(parseHexKey(key), { q: 2, r: -1 });

  const edgeA = edgeKey(0, 0, 0);
  const edgeB = edgeKey(1, 0, 3);
  assert.equal(edgeA, edgeB);

  const cornerA = cornerKey(0, 0, 0);
  const cornerB = cornerKey(1, 0, 4);
  assert.equal(cornerA, cornerB);
});
