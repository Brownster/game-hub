/**
 * Playwright test fixtures for GameHub
 * Provides custom fixtures and setup for testing
 */

import { test as base } from '@playwright/test';
import { HubHomePage, GameLobbyPage, GameRoomPage } from './page-objects/index.js';

/**
 * Extended test fixture with page objects and custom setup
 */
export const test = base.extend({
  // Expose socket and room state on window for testing
  page: async ({ page }, use) => {
    // Inject test helpers into every page
    await page.addInitScript(() => {
      // Expose socket when it's created
      const originalIo = window.io;
      if (originalIo) {
        window.io = function (...args) {
          const socket = originalIo(...args);
          window.__socket = socket;

          // Track room state updates
          socket.on('room:state', (state) => {
            window.__roomState = state;
          });

          return socket;
        };
      }

      // Expose room state globally for tests
      window.__roomState = null;
      window.__socketEvents = {};
    });

    await use(page);
  },

  // HubHome page object
  hubHomePage: async ({ page }, use) => {
    const hubHomePage = new HubHomePage(page);
    await use(hubHomePage);
  },

  // GameLobby page object
  gameLobbyPage: async ({ page }, use) => {
    const gameLobbyPage = new GameLobbyPage(page);
    await use(gameLobbyPage);
  },

  // GameRoom page object
  gameRoomPage: async ({ page }, use) => {
    const gameRoomPage = new GameRoomPage(page);
    await use(gameRoomPage);
  },
});

export { expect } from '@playwright/test';
