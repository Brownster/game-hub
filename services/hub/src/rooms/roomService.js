import crypto from "node:crypto";
import { redis } from "../redis.js";
import { generateJoinCode } from "../util/codes.js";

const ROOM_TTL_SECONDS = Number(process.env.ROOM_TTL_SECONDS || 60 * 60 * 24);
const MAX_CHAT_MESSAGES = 100;
const MAX_PLAYERS = 12; // For party games

function roomKey(roomId) {
  return `room:${roomId}`;
}

function codeKey(joinCode) {
  return `room:code:${joinCode}`;
}

/**
 * Create a new room (game-agnostic)
 * Players join rooms first, then select games to play
 */
export async function createRoom({ maxPlayers = 2 } = {}) {
  const roomId = crypto.randomUUID();
  let joinCode = generateJoinCode();

  // Ensure join code is unique
  for (let i = 0; i < 5; i += 1) {
    const exists = await redis.exists(codeKey(joinCode));
    if (!exists) break;
    joinCode = generateJoinCode();
  }

  const room = {
    roomId,
    joinCode,
    createdAt: new Date().toISOString(),
    maxPlayers: Math.min(maxPlayers, MAX_PLAYERS),

    // Room-level state (persists across games)
    players: [], // [{ playerId, displayName, joinedAt, isHost }]
    chat: [], // [{ playerId, displayName, message, timestamp }]

    // Current game (can be null, switched, or reset)
    currentGame: null,
    /*
    currentGame: {
      gameKey: string,
      mode: string,
      state: object,
      status: "PLAYING" | "FINISHED",
      startedAt: timestamp
    }
    */
  };

  await saveRoom(room);
  return room;
}

/**
 * Add a player to the room
 */
export function addPlayer(room, player) {
  const existing = room.players.find((p) => p.playerId === player.playerId);
  if (existing) {
    // Update display name if changed
    existing.displayName = player.displayName;
    return { ok: true, isNew: false };
  }

  if (room.players.length >= room.maxPlayers) {
    return { ok: false, error: "ROOM_FULL" };
  }

  const isHost = room.players.length === 0;
  room.players.push({
    playerId: player.playerId,
    displayName: player.displayName,
    joinedAt: new Date().toISOString(),
    isHost,
  });

  return { ok: true, isNew: true };
}

/**
 * Remove a player from the room
 */
export function removePlayer(room, playerId) {
  const idx = room.players.findIndex((p) => p.playerId === playerId);
  if (idx === -1) return false;

  const wasHost = room.players[idx].isHost;
  room.players.splice(idx, 1);

  // Assign new host if needed
  if (wasHost && room.players.length > 0) {
    room.players[0].isHost = true;
  }

  return true;
}

/**
 * Add a chat message
 */
export function addChatMessage(room, playerId, message) {
  const player = room.players.find((p) => p.playerId === playerId);
  if (!player) return null;

  const chatMessage = {
    id: crypto.randomUUID(),
    playerId,
    displayName: player.displayName,
    message: message.trim().slice(0, 500), // Limit message length
    timestamp: Date.now(),
  };

  room.chat.push(chatMessage);

  // Keep chat size manageable
  if (room.chat.length > MAX_CHAT_MESSAGES) {
    room.chat = room.chat.slice(-MAX_CHAT_MESSAGES);
  }

  return chatMessage;
}

/**
 * Start a new game in the room
 */
export function startGame(room, gameKey, mode, initialState) {
  room.currentGame = {
    gameKey,
    mode,
    state: initialState,
    status: "PLAYING",
    startedAt: new Date().toISOString(),
  };
}

/**
 * Reset the current game for a rematch
 */
export function resetGame(room, initialState) {
  if (!room.currentGame) return false;

  room.currentGame.state = initialState;
  room.currentGame.status = "PLAYING";
  room.currentGame.startedAt = new Date().toISOString();

  return true;
}

/**
 * End the current game
 */
export function endCurrentGame(room) {
  if (room.currentGame) {
    room.currentGame.status = "FINISHED";
  }
}

/**
 * Clear the current game (back to game selection)
 */
export function clearCurrentGame(room) {
  room.currentGame = null;
}

/**
 * Get the host player
 */
export function getHost(room) {
  return room.players.find((p) => p.isHost) || null;
}

/**
 * Check if a player is in the room
 */
export function isPlayerInRoom(room, playerId) {
  return room.players.some((p) => p.playerId === playerId);
}

/**
 * Check if room is ready to start a game
 */
export function isRoomReady(room) {
  // For 2-player games, need exactly 2
  // For party games, need at least 2
  return room.players.length >= 2;
}

// ===== Redis Operations =====

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
