/**
 * Game Flow Helper for Playwright Tests
 * Provides utilities for common game flow actions
 */

import { waitForSocketEvent, emitSocketEvent } from './socket-helper.js';

/**
 * Create a new room via API
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {number} maxPlayers - Maximum players for the room
 * @returns {Promise<{joinCode: string, roomId: string}>}
 */
export async function createRoom(page, maxPlayers = 12) {
  const response = await page.request.post('/api/rooms', {
    data: { maxPlayers }
  });

  if (!response.ok()) {
    throw new Error(`Failed to create room: ${response.status()}`);
  }

  return response.json();
}

/**
 * Join a room with a specific join code
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} joinCode - Room join code
 * @param {string} displayName - Optional player display name
 */
export async function joinRoom(page, joinCode, displayName = null) {
  // Navigate to the room
  await page.goto(`/room/${joinCode}`);

  // Wait for room state to load
  await page.waitForSelector('[data-testid="room-container"], .room-mode', {
    timeout: 10000,
    state: 'attached'
  });

  // If display name is provided, update it
  if (displayName) {
    await setPlayerName(page, displayName);
  }

  // Wait a bit for socket to sync
  await page.waitForTimeout(500);
}

/**
 * Set player display name
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} name - Display name to set
 */
export async function setPlayerName(page, name) {
  // This would interact with name input if it exists in the UI
  // For now, this is a placeholder that can be implemented based on UI
  await page.evaluate((newName) => {
    const session = JSON.parse(localStorage.getItem('session') || '{}');
    session.displayName = newName;
    localStorage.setItem('session', JSON.stringify(session));
  }, name);
}

/**
 * Select a game from the game selector
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} gameKey - Game key (e.g., 'catan', 'uno', 'wordle')
 */
export async function selectGame(page, gameKey) {
  // Wait for game selector to be available
  await page.waitForSelector('[data-testid="game-selector"], .game-selector', {
    timeout: 5000
  });

  // Click the game option
  const gameButton = page.locator(`button:has-text("${gameKey}")`).first();
  await gameButton.click();

  await page.waitForTimeout(300);
}

/**
 * Start the game (host action)
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function startGame(page) {
  // Look for start game button
  const startButton = page.locator('button:has-text("Start"), button:has-text("start")').first();

  await startButton.waitFor({ state: 'visible', timeout: 5000 });
  await startButton.click();

  // Wait for game state to update
  await page.waitForTimeout(1000);
}

/**
 * Wait for game to start
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {number} timeout - Timeout in milliseconds
 */
export async function waitForGameStart(page, timeout = 10000) {
  // Wait for game board to appear or game status to change
  await page.waitForFunction(
    () => {
      // Check if game board elements are visible
      const gameBoard = document.querySelector('[data-testid="game-board"], .game-board');
      return gameBoard !== null;
    },
    { timeout }
  );
}

/**
 * Send a chat message
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} message - Message to send
 */
export async function sendChatMessage(page, message) {
  const chatInput = page.locator('input[placeholder*="message"], input[type="text"]').last();
  await chatInput.fill(message);
  await chatInput.press('Enter');

  await page.waitForTimeout(200);
}

/**
 * Wait for a specific player to join
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} playerName - Name of player to wait for
 * @param {number} timeout - Timeout in milliseconds
 */
export async function waitForPlayerJoin(page, playerName, timeout = 5000) {
  await page.waitForSelector(`:text("${playerName}")`, { timeout });
}

/**
 * Get current player list
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<Array<{playerId: string, displayName: string, isHost: boolean}>>}
 */
export async function getPlayerList(page) {
  return page.evaluate(() => {
    // Access room state from React component or window
    if (window.__roomState) {
      return window.__roomState.players || [];
    }
    return [];
  });
}

/**
 * Check if current player is host
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<boolean>}
 */
export async function isHost(page) {
  return page.evaluate(() => {
    const session = JSON.parse(localStorage.getItem('session') || '{}');
    if (window.__roomState) {
      const host = window.__roomState.players.find(p => p.isHost);
      return host?.playerId === session.playerId;
    }
    return false;
  });
}

/**
 * Get current game state
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<any>}
 */
export async function getGameState(page) {
  return page.evaluate(() => {
    return window.__roomState?.currentGame || null;
  });
}

/**
 * Take a turn in a game (generic action emitter)
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} actionType - Action type to emit
 * @param {any} actionData - Action payload
 */
export async function takeTurn(page, actionType, actionData = {}) {
  await emitSocketEvent(page, 'game:action', {
    action: actionType,
    ...actionData
  });

  // Wait for state update
  await page.waitForTimeout(500);
}

/**
 * Wait for game to end
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {number} timeout - Timeout in milliseconds
 */
export async function waitForGameEnd(page, timeout = 30000) {
  await page.waitForFunction(
    () => {
      return window.__roomState?.currentGame?.status === 'FINISHED';
    },
    { timeout }
  );
}

/**
 * Leave the room
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function leaveRoom(page) {
  await page.goto('/');
}
