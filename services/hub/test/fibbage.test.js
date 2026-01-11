import test from "node:test";
import assert from "node:assert/strict";
import {
  addPlayer,
  advanceToVoting,
  createFibbageInitialState,
  startRound,
  submitLie,
  submitVote,
} from "../src/games/fibbage/fibbageService.js";

test("fibbage: only players who submitted lies can vote", () => {
  const state = createFibbageInitialState();
  addPlayer(state, { playerId: "p1", displayName: "Player 1" });
  addPlayer(state, { playerId: "p2", displayName: "Player 2" });
  addPlayer(state, { playerId: "p3", displayName: "Player 3" });

  const started = startRound(state);
  assert.equal(started, true);

  const lieResult = submitLie(state, "p1", "totally fake answer");
  assert.equal(lieResult.ok, true);

  advanceToVoting(state);

  const choiceId = state.choices[0]?.id;
  assert.ok(choiceId);

  const voteResult = submitVote(state, "p2", choiceId);
  assert.equal(voteResult.ok, false);
  assert.equal(voteResult.error, "VOTE_NOT_ALLOWED");
});
