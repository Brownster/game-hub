import test from "node:test";
import assert from "node:assert/strict";
import { installRedisMock } from "./helpers/redisTestHelper.js";
import { useFixedTime } from "./helpers/timeTestHelper.js";

const { redis, restore } = installRedisMock();
const { buildServer } = await import("../src/server.js");

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

async function withServer(run) {
  const app = buildServer({ logger: false });
  await app.ready();
  try {
    await run(app);
  } finally {
    await app.close();
  }
}

test.after(() => {
  restore();
});

test("rooms api: create room and lookup by code", async () => {
  await withServer(async (app) => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/rooms",
      payload: { maxPlayers: 4 },
    });

    assert.equal(createResponse.statusCode, 200);
    const created = createResponse.json();
    assert.ok(created.roomId, "expected roomId to be set");
    assert.ok(created.joinCode, "expected joinCode to be set");
    assert.equal(created.joinUrl, `/room/${created.joinCode}`);
    assert.equal(created.maxPlayers, 4);

    const lookupResponse = await app.inject({
      method: "GET",
      url: `/api/rooms/by-code/${created.joinCode.toLowerCase()}`,
    });

    assert.equal(lookupResponse.statusCode, 200);
    const lookup = lookupResponse.json();
    assert.equal(lookup.roomId, created.roomId);
    assert.equal(lookup.joinCode, created.joinCode);
    assert.equal(lookup.playerCount, 0);
    assert.equal(lookup.maxPlayers, 4);
    assert.equal(lookup.hasGame, false);
    assert.equal(lookup.gameKey, null);
  });
});

test("rooms api: lookup returns 404 for missing room", async () => {
  await withServer(async (app) => {
    const response = await app.inject({
      method: "GET",
      url: "/api/rooms/by-code/ZZZZ",
    });

    assert.equal(response.statusCode, 404);
    assert.deepEqual(response.json(), { error: "ROOM_NOT_FOUND" });
  });
});

test("wordle daily api: start rejects missing name and already played", async () => {
  const restoreTime = useFixedTime("2026-01-20T12:00:00Z");
  try {
    const dateKey = dateKeyFromNow();
    await redis.set(dailyPlayedKey(dateKey, "Alice"), "1");

    await withServer(async (app) => {
      const missingNameResponse = await app.inject({
        method: "POST",
        url: "/api/wordle/daily/start",
        payload: { playerId: "p1", displayName: "" },
      });

      assert.equal(missingNameResponse.statusCode, 400);
      assert.deepEqual(missingNameResponse.json(), { error: "NAME_REQUIRED" });

      const playedResponse = await app.inject({
        method: "POST",
        url: "/api/wordle/daily/start",
        payload: { playerId: "p2", displayName: "Alice" },
      });

      assert.equal(playedResponse.statusCode, 400);
      assert.deepEqual(playedResponse.json(), { error: "ALREADY_PLAYED" });
    });
  } finally {
    restoreTime();
  }
});

test("wordle daily api: guess rejects invalid length and words", async () => {
  const restoreTime = useFixedTime("2026-01-21T12:00:00Z");
  try {
    const dateKey = dateKeyFromNow();
    await redis.set(dailyWordKey(dateKey), "ABOUT");

    await withServer(async (app) => {
      const startResponse = await app.inject({
        method: "POST",
        url: "/api/wordle/daily/start",
        payload: { playerId: "p3", displayName: "Brianna" },
      });

      assert.equal(startResponse.statusCode, 200);
      const { gameId } = startResponse.json();

      const invalidLengthResponse = await app.inject({
        method: "POST",
        url: "/api/wordle/daily/guess",
        payload: { gameId, guess: "AB" },
      });

      assert.equal(invalidLengthResponse.statusCode, 400);
      assert.deepEqual(invalidLengthResponse.json(), { error: "INVALID_LENGTH" });

      const invalidWordResponse = await app.inject({
        method: "POST",
        url: "/api/wordle/daily/guess",
        payload: { gameId, guess: "ZZZZZ" },
      });

      assert.equal(invalidWordResponse.statusCode, 400);
      assert.deepEqual(invalidWordResponse.json(), { error: "INVALID_WORD" });
    });
  } finally {
    restoreTime();
  }
});

test("wordle free api: returns expected shape", async () => {
  await withServer(async (app) => {
    const response = await app.inject({ method: "GET", url: "/api/wordle/free/word" });

    assert.equal(response.statusCode, 200);
    const payload = response.json();
    assert.ok(typeof payload.word === "string" && payload.word.length === 5, "expected 5-letter word");
    assert.equal(payload.wordLength, 5);
    assert.equal(payload.maxGuesses, 6);
  });
});
