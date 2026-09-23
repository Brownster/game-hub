import { describe, it, expect, vi, beforeEach } from "vitest";

// Regression guard for the join race: Room.jsx emits room:join synchronously on
// mount, while session:hello goes out from the socket's own "connect" handler.
// Socket.IO flushes pre-connect emits ahead of that handler, so room:join
// reached the server first and was rejected with NO_SESSION, leaving the room
// showing 0 players. Every emit must now wait for session:authenticated.

function makeFakeSocket() {
  const handlers = {};
  const sent = [];
  const socket = {
    on(event, handler) {
      (handlers[event] ||= []).push(handler);
      return socket;
    },
    emit(...args) {
      sent.push(args);
      return socket;
    },
    // Test helpers, not part of the socket.io surface.
    __fire(event, ...args) {
      (handlers[event] || []).forEach((h) => h(...args));
    },
    __sent: sent,
  };
  return socket;
}

let fake;

vi.mock("socket.io-client", () => ({
  io: () => fake,
}));

vi.mock("./session.js", () => ({
  ensureSession: () => ({ playerId: "player-1", displayName: "Marc" }),
}));

async function freshSocketModule() {
  vi.resetModules();
  fake = makeFakeSocket();
  const mod = await import("./socket.js");
  return mod.getSocket();
}

describe("getSocket", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("sends session:hello as soon as the connection opens", async () => {
    const socket = await freshSocketModule();
    expect(fake.__sent).toHaveLength(0);

    fake.__fire("connect");

    expect(fake.__sent).toEqual([["session:hello", { playerId: "player-1", displayName: "Marc" }]]);
    expect(socket).toBe(fake);
  });

  it("holds an emit made before the connection even opens", async () => {
    // This is the exact shape of the bug: Room.jsx calls getSocket() and emits
    // room:join in the same tick, long before "connect" fires.
    const socket = await freshSocketModule();
    socket.emit("room:join", { joinCode: "AB12" });

    expect(fake.__sent).toHaveLength(0);

    fake.__fire("connect");
    expect(fake.__sent.map(([e]) => e)).toEqual(["session:hello"]);

    fake.__fire("session:authenticated", { playerId: "player-1" });
    expect(fake.__sent.map(([e]) => e)).toEqual(["session:hello", "room:join"]);
  });

  it("flushes queued emits in order once authenticated", async () => {
    const socket = await freshSocketModule();
    fake.__fire("connect");

    socket.emit("room:join", { joinCode: "AB12" });
    socket.emit("room:chat", { message: "hello" });
    expect(fake.__sent.map(([e]) => e)).toEqual(["session:hello"]);

    fake.__fire("session:authenticated", { playerId: "player-1" });

    expect(fake.__sent.map(([e]) => e)).toEqual([
      "session:hello",
      "room:join",
      "room:chat",
    ]);
  });

  it("passes emits straight through once authenticated", async () => {
    const socket = await freshSocketModule();
    fake.__fire("connect");
    fake.__fire("session:authenticated", { playerId: "player-1" });

    socket.emit("game:action", { action: { type: "MOVE" } });

    expect(fake.__sent.at(-1)).toEqual(["game:action", { action: { type: "MOVE" } }]);
  });

  it("re-queues after a disconnect until the new session is acknowledged", async () => {
    const socket = await freshSocketModule();
    fake.__fire("connect");
    fake.__fire("session:authenticated", { playerId: "player-1" });

    fake.__fire("disconnect");
    socket.emit("room:join", { joinCode: "CD34" });

    const afterDisconnect = fake.__sent.filter(([e]) => e === "room:join");
    expect(afterDisconnect).toHaveLength(0);

    fake.__fire("connect");
    fake.__fire("session:authenticated", { playerId: "player-1" });
    expect(fake.__sent.at(-1)).toEqual(["room:join", { joinCode: "CD34" }]);
  });
});
