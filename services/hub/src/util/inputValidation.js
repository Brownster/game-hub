import { JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH } from "./codes.js";

const JOIN_CODE_PATTERN = new RegExp(`^[${JOIN_CODE_ALPHABET}]{${JOIN_CODE_LENGTH}}$`);

/**
 * Input validation utilities (VULN-005 fix)
 */

/**
 * Validate player ID format
 */
export function isValidPlayerId(playerId) {
  if (!playerId || typeof playerId !== "string") return false;
  // UUID format or alphanumeric with length constraints
  return /^[a-f0-9-]{36}$|^[a-zA-Z0-9_-]{8,64}$/.test(playerId);
}

/**
 * Validate display name
 */
export function isValidDisplayName(displayName) {
  if (!displayName || typeof displayName !== "string") return false;
  const trimmed = displayName.trim();
  return trimmed.length >= 1 && trimmed.length <= 50;
}

/**
 * Validate join code format
 */
export function isValidJoinCode(joinCode) {
  if (!joinCode || typeof joinCode !== "string") return false;
  // Derived from the generator so the two cannot drift apart.
  return JOIN_CODE_PATTERN.test(joinCode);
}

/**
 * Validate room password
 */
export function isValidPassword(password) {
  if (!password || typeof password !== "string") return false;
  return password.length >= 4 && password.length <= 100;
}

/**
 * Validate game action type
 */
export function isValidActionType(actionType) {
  if (!actionType || typeof actionType !== "string") return false;
  // Action types are UPPERCASE_SNAKE_CASE
  return /^[A-Z_]{3,50}$/.test(actionType);
}

/**
 * Validate integer within range
 */
export function isValidInteger(value, min = -Infinity, max = Infinity) {
  if (typeof value !== "number") return false;
  if (!Number.isInteger(value)) return false;
  return value >= min && value <= max;
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid) {
  if (!uuid || typeof uuid !== "string") return false;
  return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(uuid);
}

/**
 * Validate game key
 */
export function isValidGameKey(gameKey) {
  const validGameKeys = [
    "reversi",
    "connect4",
    "draw",
    "charades",
    "cribbage",
    "catan",
    "uno",
    "crazy_eights",
    "chess",
    "fibbage",
    "wordle",
  ];
  return validGameKeys.includes(gameKey);
}

/**
 * Validate game mode for a specific game
 */
export function isValidGameMode(gameKey, mode) {
  const validModes = {
    reversi: ["PVP", "AI"],
    connect4: ["PVP", "AI"],
    draw: ["PARTY"],
    charades: ["PARTY"],
    cribbage: ["2P"],
    catan: ["3P", "4P"],
    uno: ["STANDARD"],
    crazy_eights: ["STANDARD"],
    chess: ["PVP", "AI"],
    fibbage: ["PARTY"],
    wordle: ["STANDARD", "QUICK", "LONG"],
  };

  return validModes[gameKey]?.includes(mode) || false;
}

/**
 * Validate message length and content
 */
export function isValidChatMessage(message) {
  if (!message || typeof message !== "string") return false;
  const trimmed = message.trim();
  return trimmed.length > 0 && trimmed.length <= 500;
}
