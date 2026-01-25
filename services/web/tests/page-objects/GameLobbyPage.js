/**
 * Page Object for GameLobby
 * Represents a game room in lobby state (before game starts)
 */

export class GameLobbyPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Locators
    this.roomContainer = page.locator('.room-mode, [data-testid="room-container"]');
    this.playerList = page.locator('[data-testid="player-list"], .players');
    this.chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel');
    this.chatInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]');
    this.chatSendButton = page.locator('button:has-text("Send")');

    // Game selector
    this.gameSelector = page.locator('[data-testid="game-selector"], .game-selector');

    // Action buttons
    this.startGameButton = page.locator('button:has-text("Start Game"), button:has-text("Start")');
    this.leaveRoomButton = page.locator('button:has-text("Leave"), button:has-text("Exit")');

    // Room info
    this.roomCode = page.locator('[data-testid="room-code"], .room-code');
  }

  /**
   * Wait for lobby to load
   */
  async waitForLobbyLoad() {
    await this.roomContainer.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Get list of players in the room
   * @returns {Promise<Array<string>>}
   */
  async getPlayerNames() {
    await this.playerList.waitFor({ state: 'visible', timeout: 5000 });

    return this.page.evaluate(() => {
      const players = window.__roomState?.players || [];
      return players.map(p => p.displayName || p.playerId);
    });
  }

  /**
   * Get player count
   * @returns {Promise<number>}
   */
  async getPlayerCount() {
    const players = await this.getPlayerNames();
    return players.length;
  }

  /**
   * Check if current user is host
   * @returns {Promise<boolean>}
   */
  async isHost() {
    return this.page.evaluate(() => {
      const session = JSON.parse(localStorage.getItem('session') || '{}');
      const players = window.__roomState?.players || [];
      const host = players.find(p => p.isHost);
      return host?.playerId === session.playerId;
    });
  }

  /**
   * Get room join code
   * @returns {Promise<string>}
   */
  async getRoomCode() {
    const url = this.page.url();
    const match = url.match(/\/room\/([A-Z0-9]+)/);
    return match ? match[1] : null;
  }

  /**
   * Select a game to play
   * @param {string} gameName - Game name (e.g., 'Catan', 'UNO', 'Wordle')
   */
  async selectGame(gameName) {
    await this.gameSelector.waitFor({ state: 'visible', timeout: 5000 });

    const gameButton = this.page.locator(`button:has-text("${gameName}")`).first();
    await gameButton.click();

    await this.page.waitForTimeout(500);
  }

  /**
   * Start the game (host only)
   */
  async startGame() {
    await this.startGameButton.waitFor({ state: 'visible', timeout: 5000 });
    await this.startGameButton.click();

    // Wait for game to start
    await this.page.waitForTimeout(1000);
  }

  /**
   * Check if start game button is visible
   * @returns {Promise<boolean>}
   */
  async canStartGame() {
    try {
      await this.startGameButton.waitFor({ state: 'visible', timeout: 2000 });
      return await this.startGameButton.isEnabled();
    } catch {
      return false;
    }
  }

  /**
   * Send a chat message
   * @param {string} message - Message to send
   */
  async sendChatMessage(message) {
    await this.chatInput.fill(message);
    await this.chatInput.press('Enter');

    await this.page.waitForTimeout(300);
  }

  /**
   * Get chat messages
   * @returns {Promise<Array<{author: string, text: string}>>}
   */
  async getChatMessages() {
    return this.page.evaluate(() => {
      const messages = [];
      const messageElements = document.querySelectorAll('[data-testid="chat-message"], .chat-message');

      messageElements.forEach(el => {
        const author = el.querySelector('[data-testid="message-author"]')?.textContent || '';
        const text = el.querySelector('[data-testid="message-text"]')?.textContent || el.textContent;
        messages.push({ author, text });
      });

      return messages;
    });
  }

  /**
   * Wait for a player to join
   * @param {string} playerName - Name of player to wait for
   * @param {number} timeout - Timeout in milliseconds
   */
  async waitForPlayerJoin(playerName, timeout = 10000) {
    await this.page.waitForFunction(
      (name) => {
        const players = window.__roomState?.players || [];
        return players.some(p => p.displayName === name || p.playerId === name);
      },
      playerName,
      { timeout }
    );
  }

  /**
   * Leave the room
   */
  async leaveRoom() {
    await this.page.goto('/');
  }

  /**
   * Wait for game to start
   * @param {number} timeout - Timeout in milliseconds
   */
  async waitForGameStart(timeout = 15000) {
    await this.page.waitForFunction(
      () => {
        return window.__roomState?.currentGame?.status === 'IN_PROGRESS' ||
               document.querySelector('[data-testid="game-board"], .game-board') !== null;
      },
      { timeout }
    );
  }

  /**
   * Toggle chat panel visibility
   */
  async toggleChat() {
    const chatToggle = this.page.locator('button:has-text("Chat"), [data-testid="chat-toggle"]');
    await chatToggle.click();

    await this.page.waitForTimeout(300);
  }

  /**
   * Check if chat is open
   * @returns {Promise<boolean>}
   */
  async isChatOpen() {
    return this.page.evaluate(() => {
      const chatPanel = document.querySelector('[data-testid="chat-panel"], .chat-panel');
      return chatPanel && window.getComputedStyle(chatPanel).display !== 'none';
    });
  }
}
