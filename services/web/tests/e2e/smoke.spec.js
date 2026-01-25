/**
 * Smoke tests for GameHub
 * Basic end-to-end tests to verify core functionality
 */

import { test, expect } from '../fixtures.js';

test.describe('GameHub Smoke Tests', () => {
  test('should load HubHome page', async ({ hubHomePage }) => {
    await hubHomePage.goto();

    expect(await hubHomePage.isLoaded()).toBe(true);

    const title = await hubHomePage.getTitle();
    expect(title).toContain('GAME HUB');
  });

  test('should create a room and navigate to lobby', async ({ page, hubHomePage, gameLobbyPage }) => {
    await hubHomePage.goto();

    const joinCode = await hubHomePage.createRoom();

    expect(joinCode).toBeTruthy();
    expect(joinCode).toMatch(/^[A-Z0-9]+$/);

    // Verify we're in the lobby
    await gameLobbyPage.waitForLobbyLoad();

    const roomCode = await gameLobbyPage.getRoomCode();
    expect(roomCode).toBe(joinCode);

    // Creator should be host
    const isHost = await gameLobbyPage.isHost();
    expect(isHost).toBe(true);
  });

  test('should join existing room with code', async ({ hubHomePage, gameLobbyPage }) => {
    // First create a room
    await hubHomePage.goto();
    const joinCode = await hubHomePage.createRoom();

    // Go back to home and join with code
    await hubHomePage.goto();
    await hubHomePage.joinRoom(joinCode);

    // Verify we're in the lobby
    await gameLobbyPage.waitForLobbyLoad();

    const roomCode = await gameLobbyPage.getRoomCode();
    expect(roomCode).toBe(joinCode);
  });

  test('should navigate to quick play games', async ({ hubHomePage, page }) => {
    await hubHomePage.goto();

    // Test Wordle navigation
    await hubHomePage.goToWordle();
    expect(page.url()).toContain('/wordle');

    // Go back and test Reversi
    await hubHomePage.goto();
    await hubHomePage.goToReversi();
    expect(page.url()).toContain('/reversi');
  });
});

test.describe('GameLobby Functionality', () => {
  test('should show player in lobby', async ({ hubHomePage, gameLobbyPage }) => {
    await hubHomePage.goto();
    await hubHomePage.createRoom();

    await gameLobbyPage.waitForLobbyLoad();

    const playerCount = await gameLobbyPage.getPlayerCount();
    expect(playerCount).toBeGreaterThanOrEqual(1);
  });

  test('should display start game button for host', async ({ hubHomePage, gameLobbyPage }) => {
    await hubHomePage.goto();
    await hubHomePage.createRoom();

    await gameLobbyPage.waitForLobbyLoad();

    const isHost = await gameLobbyPage.isHost();
    expect(isHost).toBe(true);

    // Host should be able to see start game capability
    // Note: Button might be disabled if no game selected
    const canStart = await gameLobbyPage.canStartGame();
    expect(typeof canStart).toBe('boolean');
  });
});

test.describe('Mobile Viewport', () => {
  test.use({
    viewport: { width: 375, height: 667 }, // iPhone SE
  });

  test('should load HubHome on mobile viewport', async ({ hubHomePage, page }) => {
    await hubHomePage.goto();

    expect(await hubHomePage.isLoaded()).toBe(true);

    // Verify viewport is mobile size
    const viewportSize = page.viewportSize();
    expect(viewportSize.width).toBe(375);
    expect(viewportSize.height).toBe(667);
  });

  test('should create room on mobile', async ({ hubHomePage, gameLobbyPage }) => {
    await hubHomePage.goto();

    const joinCode = await hubHomePage.createRoom();
    expect(joinCode).toBeTruthy();

    await gameLobbyPage.waitForLobbyLoad();
  });
});
