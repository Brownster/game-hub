import Fastify from "fastify";
import { createRoom, getRoomByCode } from "./rooms/roomService.js";
import { registerSocketHandlers } from "./socket.js";
import { createVsState } from "./games/wordle/wordleVs.js";
import { getDailyStatus, getRandomFreeWord, startDailySession, submitDailyGuess } from "./games/wordle/wordleDaily.js";

const PORT = Number(process.env.PORT || 8081);
const HOST = process.env.HOST || "0.0.0.0";

const fastify = Fastify({ logger: true });

fastify.get("/api/health", async () => ({ ok: true }));

/**
 * Create a new room (game-agnostic)
 * Players join rooms first, then select games via socket
 */
fastify.post("/api/rooms", async (request, reply) => {
  const { maxPlayers } = request.body || {};
  const safeMaxPlayers = Math.min(Math.max(Number(maxPlayers) || 2, 2), 12);

  const room = await createRoom({ maxPlayers: safeMaxPlayers });

  return {
    roomId: room.roomId,
    joinCode: room.joinCode,
    joinUrl: `/room/${room.joinCode}`,
    maxPlayers: room.maxPlayers,
  };
});

fastify.get("/api/rooms/by-code/:code", async (request, reply) => {
  const { code } = request.params;
  const joinCode = String(code || "").toUpperCase();
  const room = await getRoomByCode(joinCode);

  if (!room) {
    return reply.code(404).send({ error: "ROOM_NOT_FOUND" });
  }

  return {
    roomId: room.roomId,
    joinCode: room.joinCode,
    playerCount: room.players.length,
    maxPlayers: room.maxPlayers,
    hasGame: room.currentGame !== null,
    gameKey: room.currentGame?.gameKey || null,
  };
});

fastify.post("/api/wordle/vs", async (request, reply) => {
  const { rounds } = request.body || {};
  const safeRounds = Number(rounds) || 3;
  const state = createVsState(safeRounds);
  const room = await createRoom({ gameKey: "wordle", mode: "VS", state });

  return {
    roomId: room.roomId,
    joinCode: room.joinCode,
    joinUrl: `/wordle/vs/${room.joinCode}`,
    rounds: safeRounds
  };
});

fastify.get("/api/wordle/daily/status", async (request) => {
  const { name, playerId } = request.query || {};
  return getDailyStatus({ displayName: name, playerId });
});

fastify.post("/api/wordle/daily/start", async (request, reply) => {
  try {
    const { playerId, displayName } = request.body || {};
    return await startDailySession({ playerId, displayName });
  } catch (err) {
    return reply.code(400).send({ error: err.message });
  }
});

fastify.post("/api/wordle/daily/guess", async (request, reply) => {
  try {
    const { gameId, guess } = request.body || {};
    return await submitDailyGuess({ gameId, guess });
  } catch (err) {
    return reply.code(400).send({ error: err.message });
  }
});

fastify.get("/api/wordle/free/word", async () => {
  return getRandomFreeWord();
});

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: HOST });
    registerSocketHandlers(fastify.server);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
