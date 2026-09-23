/**
 * End-to-end smoke test for the hub.
 *
 *   npm run test:integration          (needs a real Redis on REDIS_URL)
 *
 * Boots the real Fastify server and real socket handlers in-process on an
 * ephemeral port and drives an actual room to a started game over a real
 * socket connection.
 *
 * This exists because the unit suites are all mocked, and three separate
 * app-breaking bugs slipped past them:
 *
 *   - the join-code validator required 6 characters while the generator
 *     produced 4, so every room:join was rejected
 *   - session:hello arrived after room:join, so rooms sat at 0 players
 *   - the dev server had no proxy, so the client never reached the hub at all
 *
 * Each step below would have caught at least one of those.
 */

import { io } from "socket.io-client";

import { buildServer } from "../src/server.js";
import { registerSocketHandlers } from "../src/socket.js";
import { redis } from "../src/redis.js";

const STEP_TIMEOUT_MS = 8000;

let passed = 0;
const failures = [];

function check(label, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${label}`);
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

/** Resolve on the first matching socket event, or reject with context. */
function waitFor(socket, event, predicate = () => true, label = event) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`timed out after ${STEP_TIMEOUT_MS}ms waiting for ${label}`));
    }, STEP_TIMEOUT_MS);

    const onEvent = (payload) => {
      if (!predicate(payload)) return;
      cleanup();
      resolve(payload);
    };
    const onError = (payload) => {
      cleanup();
      reject(new Error(`${label}: server replied with error ${JSON.stringify(payload)}`));
    };
    function cleanup() {
      clearTimeout(timer);
      socket.off(event, onEvent);
      socket.off("room:error", onError);
      socket.off("session:error", onError);
    }

    socket.on(event, onEvent);
    socket.on("room:error", onError);
    socket.on("session:error", onError);
  });
}

async function connectPlayer(url, displayName) {
  const socket = io(url, { transports: ["websocket"], reconnection: false });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${displayName}: socket never connected`)), STEP_TIMEOUT_MS);
    socket.on("connect", () => { clearTimeout(timer); resolve(); });
    socket.on("connect_error", (e) => { clearTimeout(timer); reject(e); });
  });

  const playerId = crypto.randomUUID();
  const authenticated = waitFor(socket, "session:authenticated", () => true, `${displayName} session`);
  socket.emit("session:hello", { playerId, displayName });
  await authenticated;

  return { socket, playerId, displayName };
}

async function main() {
  const fastify = buildServer({ logger: false });
  await fastify.listen({ port: 0, host: "127.0.0.1" });
  registerSocketHandlers(fastify.server);

  const { port } = fastify.server.address();
  const url = `http://127.0.0.1:${port}`;
  console.log(`hub listening on ${url}\n`);

  let host;
  let guest;

  try {
    const health = await fastify.inject({ method: "GET", url: "/api/health" });
    check("health endpoint responds", health.statusCode === 200, `got ${health.statusCode}`);

    const created = await fetch(`${url}/api/rooms`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ maxPlayers: 4 }),
    }).then((r) => r.json());

    const joinCode = created.joinCode;
    check("room created with a join code", Boolean(joinCode), JSON.stringify(created));

    // The generator and the validator disagreed here once; that broke every join.
    const { isValidJoinCode } = await import("../src/util/inputValidation.js");
    check("generated join code passes the hub's own validator",
      isValidJoinCode(joinCode), `code was ${joinCode}`);

    host = await connectPlayer(url, "Host");
    check("host completed the session handshake", true);

    const hostState = waitFor(host.socket, "room:state", (s) => s.players?.length >= 1, "host room:state");
    host.socket.emit("room:join", { joinCode });
    const afterHostJoin = await hostState;

    check("host appears in the room after joining",
      afterHostJoin.players.length === 1,
      `players: ${afterHostJoin.players.length}`);
    check("host is marked as host",
      afterHostJoin.players[0]?.isHost === true,
      JSON.stringify(afterHostJoin.players[0]));

    guest = await connectPlayer(url, "Guest");
    const bothPresent = waitFor(host.socket, "room:state", (s) => s.players?.length === 2, "two players");
    guest.socket.emit("room:join", { joinCode });
    const afterGuestJoin = await bothPresent;

    check("both players are in the room", afterGuestJoin.players.length === 2,
      `players: ${afterGuestJoin.players.length}`);

    // Selecting a game creates room.currentGame immediately; starting it flips
    // that game's status to PLAYING.
    const selected = waitFor(host.socket, "room:state",
      (s) => s.currentGame?.gameKey === "chess", "chess selected");
    host.socket.emit("room:selectGame", { gameKey: "chess", mode: "PVP" });
    const afterSelect = await selected;
    check("host can select chess", afterSelect.currentGame?.gameKey === "chess",
      `gameKey: ${afterSelect.currentGame?.gameKey}`);

    const started = waitFor(host.socket, "room:state",
      (s) => s.currentGame?.status === "PLAYING", "chess started");
    host.socket.emit("room:startGame");
    const afterStart = await started;

    check("chess game reaches PLAYING", afterStart.currentGame?.status === "PLAYING",
      `status: ${afterStart.currentGame?.status}`);
    check("started game has a board state",
      Boolean(afterStart.currentGame?.state?.fen || afterStart.currentGame?.state?.board),
      `state keys: ${Object.keys(afterStart.currentGame?.state || {}).join(",")}`);

    // The guest must see the started game too, or the board never renders for them.
    const guestSees = await waitFor(guest.socket, "room:state",
      (s) => s.currentGame?.status === "PLAYING", "guest sees started game")
      .catch((e) => ({ error: e.message }));
    check("guest also receives the started game", !guestSees.error, guestSees.error || "");
  } catch (err) {
    failures.push(err.message);
    console.log(`  FAIL ${err.message}`);
  } finally {
    host?.socket.close();
    guest?.socket.close();
    await fastify.close();
    await redis.quit().catch(() => {});
  }

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    console.log("\nfailures:");
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
