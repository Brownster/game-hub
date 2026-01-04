import crypto from "node:crypto";
import { redis } from "../redis.js";
import { generateJoinCode } from "../util/codes.js";

const ROOM_TTL_SECONDS = Number(process.env.ROOM_TTL_SECONDS || 60 * 60 * 24);

function roomKey(roomId) {
  return `room:${roomId}`;
}

function codeKey(joinCode) {
  return `room:code:${joinCode}`;
}

export async function createRoom({ gameKey, mode, state }) {
  const roomId = crypto.randomUUID();
  let joinCode = generateJoinCode();

  // Ensure join code is unique.
  for (let i = 0; i < 5; i += 1) {
    const exists = await redis.exists(codeKey(joinCode));
    if (!exists) break;
    joinCode = generateJoinCode();
  }

  const room = {
    roomId,
    joinCode,
    gameKey,
    mode,
    createdAt: new Date().toISOString(),
    status: "LOBBY",
    players: { black: null, white: null },
    state
  };

  await saveRoom(room);
  return room;
}

export async function saveRoom(room) {
  const key = roomKey(room.roomId);
  const code = codeKey(room.joinCode);
  const payload = JSON.stringify(room);

  await redis.set(key, payload, "EX", ROOM_TTL_SECONDS);
  await redis.set(code, room.roomId, "EX", ROOM_TTL_SECONDS);
  return room;
}

export async function getRoom(roomId) {
  const payload = await redis.get(roomKey(roomId));
  return payload ? JSON.parse(payload) : null;
}

export async function getRoomByCode(joinCode) {
  const roomId = await redis.get(codeKey(joinCode));
  if (!roomId) return null;
  return getRoom(roomId);
}

export async function deleteRoom(room) {
  await redis.del(roomKey(room.roomId));
  await redis.del(codeKey(room.joinCode));
}
