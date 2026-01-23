import test from "node:test";
import assert from "node:assert/strict";
import { installRedisMock } from "./helpers/redisTestHelper.js";

function createRoomFixture() {
  return {
    roomId: "room-1",
    joinCode: "ABCD",
    createdAt: new Date().toISOString(),
    maxPlayers: 4,
    players: [],
    chat: [],
    currentGame: null,
  };
}

installRedisMock();

async function loadRoomService() {
  return import("../src/rooms/roomService.js");
}

test("roomService: add/remove players assigns host and updates on removal", async (t) => {
  const roomService = await loadRoomService();
  const { addPlayer, getHost, removePlayer } = roomService;
  const room = createRoomFixture();

  const addFirst = addPlayer(room, { playerId: "p1", displayName: "Player 1" });
  assert.equal(addFirst.ok, true);
  assert.equal(addFirst.isNew, true);
  assert.equal(getHost(room)?.playerId, "p1");

  addPlayer(room, { playerId: "p2", displayName: "Player 2" });
  assert.equal(getHost(room)?.playerId, "p1");

  const removed = removePlayer(room, "p1");
  assert.equal(removed, true);
  assert.equal(getHost(room)?.playerId, "p2");
});

test("roomService: chat messages trim and cap size", async (t) => {
  const roomService = await loadRoomService();
  const { addChatMessage, addPlayer } = roomService;
  const room = createRoomFixture();
  addPlayer(room, { playerId: "p1", displayName: "Player 1" });

  const msg = addChatMessage(room, "p1", "  hello  ");
  assert.equal(msg.message, "hello");

  for (let i = 0; i < 101; i += 1) {
    addChatMessage(room, "p1", `msg${i + 1}`);
  }

  assert.equal(room.chat.length, 100);
  assert.equal(room.chat[0].message, "msg2");
  assert.equal(room.chat[room.chat.length - 1].message, "msg101");
});

test("roomService: start/reset/end/clear game and readiness helpers", async (t) => {
  const roomService = await loadRoomService();
  const {
    addPlayer,
    clearCurrentGame,
    endCurrentGame,
    isPlayerInRoom,
    isRoomReady,
    resetGame,
    startGame,
  } = roomService;
  const room = createRoomFixture();
  assert.equal(isRoomReady(room), false);

  addPlayer(room, { playerId: "p1", displayName: "Player 1" });
  addPlayer(room, { playerId: "p2", displayName: "Player 2" });
  assert.equal(isRoomReady(room), true);
  assert.equal(isPlayerInRoom(room, "p2"), true);

  assert.equal(resetGame(room, { foo: "bar" }), false);

  startGame(room, "catan", "STANDARD", { state: "init" });
  assert.equal(room.currentGame?.status, "PLAYING");

  const resetOk = resetGame(room, { state: "new" });
  assert.equal(resetOk, true);
  assert.equal(room.currentGame?.state?.state, "new");

  endCurrentGame(room);
  assert.equal(room.currentGame?.status, "FINISHED");

  clearCurrentGame(room);
  assert.equal(room.currentGame, null);
});
