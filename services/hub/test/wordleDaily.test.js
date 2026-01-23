import test from "node:test";
import assert from "node:assert/strict";
import { installRedisMock } from "./helpers/redisTestHelper.js";
import { useFixedTime } from "./helpers/timeTestHelper.js";
import { isValidWord } from "../src/games/wordle/wordleUtils.js";

const { redis, restore } = installRedisMock();
const wordleDaily = await import("../src/games/wordle/wordleDaily.js");
const { startDailySession, submitDailyGuess, getDailyStatus, getDailyLeaderboard } = wordleDaily;

function dateKeyFromNow() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function dailyWordKey(dateKey) {
  return `wordle:daily:word:${dateKey}`;
}

function dailyPlayedKey(dateKey, displayName) {
  return `wordle:daily:played:${dateKey}:${String(displayName || "").trim().toLowerCase()}`;
}

test.after(() => {
  restore();
});

test("wordle daily: start requires a display name", async () => {
  const restoreTime = useFixedTime("2026-01-10T12:00:00Z");
  try {
    await assert.rejects(startDailySession({ playerId: "p1", displayName: "" }), /NAME_REQUIRED/);
  } finally {
    restoreTime();
  }
});

test("wordle daily: start rejects already played entries", async () => {
  const restoreTime = useFixedTime("2026-01-11T12:00:00Z");
  try {
    const dateKey = dateKeyFromNow();
    await redis.set(dailyPlayedKey(dateKey, "Alice"), "1");
    await assert.rejects(
      startDailySession({ playerId: "p1", displayName: "Alice" }),
      /ALREADY_PLAYED/
    );
  } finally {
    restoreTime();
  }
});

test("wordle daily: guess validation rejects invalid length and words", async () => {
  const restoreTime = useFixedTime("2026-01-12T12:00:00Z");
  try {
    const dateKey = dateKeyFromNow();
    await redis.set(dailyWordKey(dateKey), "ABOUT");

    const { gameId } = await startDailySession({ playerId: "p2", displayName: "Briana" });

    await assert.rejects(submitDailyGuess({ gameId, guess: "AB" }), /INVALID_LENGTH/);

    assert.equal(isValidWord("ZZZZZ"), false);
    await assert.rejects(submitDailyGuess({ gameId, guess: "ZZZZZ" }), /INVALID_WORD/);
  } finally {
    restoreTime();
  }
});

test("wordle daily: win updates stats and leaderboard entries", async () => {
  const restoreTime = useFixedTime("2026-01-13T12:00:00Z");
  try {
    const dateKey = dateKeyFromNow();
    await redis.set(dailyWordKey(dateKey), "APPLE");

    const { gameId } = await startDailySession({ playerId: "p-win", displayName: "Cara" });
    const result = await submitDailyGuess({ gameId, guess: "APPLE" });

    assert.equal(result.status, "WIN");
    assert.equal(result.answer, "APPLE");
    assert.equal(result.guesses.length, 1);

    const status = await getDailyStatus({ displayName: "Cara", playerId: "p-win" });
    assert.equal(status.date, dateKey);
    assert.equal(status.played, true);
    assert.ok(Array.isArray(status.leaderboard));
    assert.equal(status.playerEntry?.status, "WIN");
    assert.equal(status.playerEntry?.guesses, 1);
    assert.equal(status.stats?.wins, 1);
    assert.equal(status.stats?.losses, 0);
    assert.equal(status.stats?.streak, 1);
    assert.equal(status.stats?.maxStreak, 1);
    assert.equal(status.stats?.avgGuesses, 1);

    const leaderboard = await getDailyLeaderboard(dateKey);
    assert.equal(leaderboard.length, 1);
    assert.equal(leaderboard[0].playerId, "p-win");
    assert.equal(leaderboard[0].status, "WIN");
  } finally {
    restoreTime();
  }
});

test("wordle daily: lose updates stats and leaderboard entries", async () => {
  const restoreTime = useFixedTime("2026-01-14T12:00:00Z");
  try {
    const dateKey = dateKeyFromNow();
    await redis.set(dailyWordKey(dateKey), "ABOUT");

    const { gameId } = await startDailySession({ playerId: "p-lose", displayName: "Dylan" });

    for (let i = 0; i < 5; i += 1) {
      const result = await submitDailyGuess({ gameId, guess: "ABOVE" });
      assert.equal(result.status, "IN_PROGRESS");
    }

    const finalResult = await submitDailyGuess({ gameId, guess: "ABOVE" });
    assert.equal(finalResult.status, "LOSE");
    assert.equal(finalResult.answer, "ABOUT");

    const status = await getDailyStatus({ displayName: "Dylan", playerId: "p-lose" });
    assert.equal(status.played, true);
    assert.equal(status.playerEntry?.status, "LOSE");
    assert.equal(status.playerEntry?.guesses, 6);
    assert.equal(status.stats?.wins, 0);
    assert.equal(status.stats?.losses, 1);
    assert.equal(status.stats?.streak, 0);
    assert.equal(status.stats?.maxStreak, 0);
    assert.equal(status.stats?.avgGuesses, 6);

    const leaderboard = await getDailyLeaderboard(dateKey);
    assert.equal(leaderboard.length, 1);
    assert.equal(leaderboard[0].playerId, "p-lose");
    assert.equal(leaderboard[0].status, "LOSE");
  } finally {
    restoreTime();
  }
});

test("wordle daily: status for anonymous callers returns empty player fields", async () => {
  const restoreTime = useFixedTime("2026-01-15T12:00:00Z");
  try {
    const status = await getDailyStatus({});
    assert.equal(status.date, dateKeyFromNow());
    assert.equal(status.played, false);
    assert.deepEqual(status.leaderboard, []);
    assert.equal(status.playerEntry, null);
    assert.equal(status.stats, null);
  } finally {
    restoreTime();
  }
});
