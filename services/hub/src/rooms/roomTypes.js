// Types are documented via JSDoc for clarity in a JS-only codebase.

/**
 * @typedef {Object} Player
 * @property {string} playerId
 * @property {string} displayName
 */

/**
 * @typedef {Object} Room
 * @property {string} roomId
 * @property {string} joinCode
 * @property {string} gameKey
 * @property {"PVP"|"AI"} mode
 * @property {string} createdAt
 * @property {"LOBBY"|"IN_PROGRESS"|"FINISHED"} status
 * @property {{ black: Player|"AI"|null, white: Player|"AI"|null }} players
 * @property {Object} state
 */

export {};
