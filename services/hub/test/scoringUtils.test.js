import test from "node:test";
import assert from "node:assert/strict";
import {
  findFifteens,
  findFlush,
  findNobs,
  findPairs,
  findRuns,
  isHisHeels,
  scoreHand,
  scorePegging,
} from "../src/games/cards/scoringUtils.js";

test("scoringUtils: fifteens, pairs, runs basics", () => {
  const fifteens = findFifteens(["5H", "5D", "5S", "KC"]);
  assert.equal(fifteens.length, 4);

  const pairs = findPairs(["5H", "5D", "5S"]);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].points, 6);
  assert.equal(pairs[0].type, "three-of-a-kind");

  const runs = findRuns(["3H", "4D", "5S"]);
  assert.equal(runs.length, 1);
  assert.equal(runs[0].points, 3);
  assert.equal(runs[0].type, "run-of-3");
});

test("scoringUtils: double run detection", () => {
  const runs = findRuns(["3H", "3D", "4S", "5C"]);
  assert.equal(runs.length, 1);
  assert.equal(runs[0].type, "double-run-of-3");
  assert.equal(runs[0].points, 6);
});

test("scoringUtils: flush and nobs rules", () => {
  const hand = ["2H", "4H", "6H", "8H"];
  const flush = findFlush(hand, "KS", false);
  assert.equal(flush?.points, 4);

  const cribFlush = findFlush(hand, "KS", true);
  assert.equal(cribFlush, null);

  const nobs = findNobs(["JH", "2C", "3D", "4S"], "9H");
  assert.equal(nobs?.points, 1);
});

test("scoringUtils: scoreHand totals expected value", () => {
  const result = scoreHand(["5H", "5D", "5S", "KC"], "AD");
  assert.equal(result.total, 14);
});

test("scoringUtils: scorePegging pair and run", () => {
  const pairScore = scorePegging(["5H", "5D"]);
  assert.equal(pairScore.total, 2);

  const runScore = scorePegging(["3H", "5D", "4S"]);
  assert.equal(runScore.total, 3);
});

test("scoringUtils: his heels", () => {
  assert.equal(isHisHeels("JH"), true);
  assert.equal(isHisHeels("10H"), false);
});
