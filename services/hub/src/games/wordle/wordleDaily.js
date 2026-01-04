import crypto from "node:crypto";
import { redis } from "../../redis.js";
import { MAX_GUESSES, WORD_LENGTH, checkGuess, isValidWord, normalizeGuess, pickRandomWord } from "./wordleUtils.js";

function todayKey() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function dailyWordKey(date) {
  return `wordle:daily:word:${date}`;
}

function dailyPlayedKey(date, nameKey) {
  return `wordle:daily:played:${date}:${nameKey}`;
}

function dailySessionKey(gameId) {
  return `wordle:daily:session:${gameId}`;
}

function dailyActiveKey(date, nameKey) {
  return `wordle:daily:active:${date}:${nameKey}`;
}

function dailyLeaderboardKey(date) {
  return `wordle:daily:leaderboard:${date}`;
}

function dailyEntryKey(date, playerId) {
  return `wordle:daily:entry:${date}:${playerId}`;
}

function dailyStatsKey(nameKey) {
  return `wordle:daily:stats:${nameKey}`;
}

function normalizeName(name) {
  return String(name || "").trim().toLowerCase();
}

function parseDateKey(dateKey) {
  const [yyyy, mm, dd] = dateKey.split("-").map(Number);
  return new Date(yyyy, mm - 1, dd);
}

function formatDateKey(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function previousDateKey(dateKey) {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() - 1);
  return formatDateKey(date);
}

async function getDailyWord(date) {
  const key = dailyWordKey(date);
  let word = await redis.get(key);
  if (!word) {
    word = pickRandomWord();
    await redis.set(key, word, "EX", 60 * 60 * 48);
  }
  return word;
}

export async function startDailySession({ playerId, displayName }) {
  const nameKey = normalizeName(displayName);
  if (!nameKey) {
    throw new Error("NAME_REQUIRED");
  }

  const date = todayKey();
  const played = await redis.get(dailyPlayedKey(date, nameKey));
  if (played) {
    throw new Error("ALREADY_PLAYED");
  }

  const activeGameId = await redis.get(dailyActiveKey(date, nameKey));
  if (activeGameId) {
    const existing = await redis.get(dailySessionKey(activeGameId));
    if (existing) {
      const parsed = JSON.parse(existing);
      return { gameId: parsed.gameId, date: parsed.date, wordLength: WORD_LENGTH, maxGuesses: MAX_GUESSES };
    }
  }

  const gameId = crypto.randomUUID();
  const answer = await getDailyWord(date);
  const session = {
    gameId,
    playerId,
    displayName,
    date,
    answer,
    guesses: [],
    results: [],
    status: "IN_PROGRESS",
    startedAt: Date.now(),
    endedAt: null
  };

  await redis.set(dailySessionKey(gameId), JSON.stringify(session), "EX", 60 * 60 * 48);
  await redis.set(dailyActiveKey(date, nameKey), gameId, "EX", 60 * 60 * 48);
  return { gameId, date, wordLength: WORD_LENGTH, maxGuesses: MAX_GUESSES };
}

export async function submitDailyGuess({ gameId, guess }) {
  const raw = await redis.get(dailySessionKey(gameId));
  if (!raw) {
    throw new Error("SESSION_NOT_FOUND");
  }

  const session = JSON.parse(raw);
  if (session.status !== "IN_PROGRESS") {
    throw new Error("GAME_OVER");
  }

  const normalized = normalizeGuess(guess);
  if (normalized.length !== WORD_LENGTH) {
    throw new Error("INVALID_LENGTH");
  }
  if (!isValidWord(normalized)) {
    throw new Error("INVALID_WORD");
  }

  const result = checkGuess(normalized, session.answer);
  session.guesses.push(normalized);
  session.results.push(result);

  let outcome = "IN_PROGRESS";
  if (normalized === session.answer) {
    outcome = "WIN";
  } else if (session.guesses.length >= MAX_GUESSES) {
    outcome = "LOSE";
  }

  session.status = outcome === "IN_PROGRESS" ? "IN_PROGRESS" : outcome;
  if (session.status !== "IN_PROGRESS") {
    session.endedAt = Date.now();
    await finalizeDailySession(session);
  }

  await redis.set(dailySessionKey(gameId), JSON.stringify(session), "EX", 60 * 60 * 48);

  return {
    result,
    guesses: session.guesses,
    results: session.results,
    status: session.status,
    answer: session.status === "IN_PROGRESS" ? undefined : session.answer
  };
}

async function finalizeDailySession(session) {
  const nameKey = normalizeName(session.displayName);
  const playedKey = dailyPlayedKey(session.date, nameKey);
  await redis.set(playedKey, "1", "EX", 60 * 60 * 48);
  await redis.del(dailyActiveKey(session.date, nameKey));

  const durationMs = (session.endedAt || Date.now()) - session.startedAt;
  const guessCount = session.guesses.length;
  const score = guessCount + durationMs / 1e7;

  await redis.zadd(dailyLeaderboardKey(session.date), score, session.playerId);
  await redis.set(
    dailyEntryKey(session.date, session.playerId),
    JSON.stringify({
      playerId: session.playerId,
      name: session.displayName,
      guesses: guessCount,
      durationMs,
      status: session.status
    }),
    "EX",
    60 * 60 * 48
  );

  const statsRaw = await redis.get(dailyStatsKey(nameKey));
  const stats = statsRaw
    ? JSON.parse(statsRaw)
    : { total: 0, wins: 0, losses: 0, streak: 0, maxStreak: 0, avgGuesses: 0, lastPlayed: null };

  stats.total += 1;

  if (session.status === "WIN") {
    stats.wins += 1;
    const yesterday = previousDateKey(session.date);
    stats.streak = stats.lastPlayed === yesterday ? stats.streak + 1 : 1;
    stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
  } else {
    stats.losses += 1;
    stats.streak = 0;
  }

  stats.avgGuesses = Number(((stats.avgGuesses * (stats.total - 1) + guessCount) / stats.total).toFixed(2));
  stats.lastPlayed = session.date;

  await redis.set(dailyStatsKey(nameKey), JSON.stringify(stats), "EX", 60 * 60 * 24 * 365);
}

export async function getDailyStatus({ displayName, playerId }) {
  const date = todayKey();
  const nameKey = normalizeName(displayName);
  const played = nameKey ? Boolean(await redis.get(dailyPlayedKey(date, nameKey))) : false;
  const leaderboard = await getDailyLeaderboard(date);
  let playerEntry = null;
  let stats = null;

  if (playerId) {
    const entryRaw = await redis.get(dailyEntryKey(date, playerId));
    if (entryRaw) playerEntry = JSON.parse(entryRaw);
  }

  if (nameKey) {
    const statsRaw = await redis.get(dailyStatsKey(nameKey));
    if (statsRaw) stats = JSON.parse(statsRaw);
  }

  return { date, played, leaderboard, playerEntry, stats };
}

export async function getDailyLeaderboard(date) {
  const key = dailyLeaderboardKey(date);
  const top = await redis.zrange(key, 0, 9);
  const entries = [];

  for (const playerId of top) {
    const raw = await redis.get(dailyEntryKey(date, playerId));
    if (raw) entries.push(JSON.parse(raw));
  }

  return entries;
}

export async function getRandomFreeWord() {
  return { word: pickRandomWord(), wordLength: WORD_LENGTH, maxGuesses: MAX_GUESSES };
}
