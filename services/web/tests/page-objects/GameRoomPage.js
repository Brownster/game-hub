/**
 * Page Object for GameRoom
 * Represents a game room with an active game in progress
 */

export class GameRoomPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Locators
    this.gameBoard = page.locator('[data-testid="game-board"], .game-board');
    this.playerHand = page.locator('[data-testid="player-hand"], .player-hand');
    this.actionPanel = page.locator('[data-testid="action-panel"], .action-panel');

    // Game controls
    this.endTurnButton = page.locator('button:has-text("End Turn"), button:has-text("Done")');
    this.rollDiceButton = page.locator('button:has-text("Roll"), button:has-text("Dice")');

    // Chat
    this.chatPanel = page.locator('[data-testid="chat-panel"], .chat-panel');
    this.chatInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]');

    // Game status
    this.turnIndicator = page.locator('[data-testid="turn-indicator"], .turn-indicator');
    this.scoreBoard = page.locator('[data-testid="scoreboard"], .scoreboard');
    this.winnerMessage = page.locator('[data-testid="winner"], .winner-message');
  }

  /**
   * Wait for game board to load
   */
  async waitForGameLoad() {
    await this.gameBoard.waitFor({ state: 'visible', timeout: 15000 });
  }

  /**
   * Check if it's current player's turn
   * @returns {Promise<boolean>}
   */
  async isMyTurn() {
    return this.page.evaluate(() => {
      const session = JSON.parse(localStorage.getItem('session') || '{}');
      const gameState = window.__roomState?.currentGame?.state;

      if (!gameState) return false;

      // Check common turn indicators
      return (
        gameState.currentPlayer === session.playerId ||
        gameState.currentPlayerId === session.playerId ||
        gameState.turn === session.playerId
      );
    });
  }

  /**
   * Get current game state
   * @returns {Promise<any>}
   */
  async getGameState() {
    return this.page.evaluate(() => {
      return window.__roomState?.currentGame || null;
    });
  }

  /**
   * Get game type/key
   * @returns {Promise<string>}
   */
  async getGameType() {
    return this.page.evaluate(() => {
      return window.__roomState?.currentGame?.gameKey || '';
    });
  }

  /**
   * Wait for player's turn
   * @param {number} timeout - Timeout in milliseconds
   */
  async waitForMyTurn(timeout = 30000) {
    await this.page.waitForFunction(
      () => {
        const session = JSON.parse(localStorage.getItem('session') || '{}');
        const gameState = window.__roomState?.currentGame?.state;

        if (!gameState) return false;

        return (
          gameState.currentPlayer === session.playerId ||
          gameState.currentPlayerId === session.playerId ||
          gameState.turn === session.playerId
        );
      },
      { timeout }
    );
  }

  /**
   * End current turn
   */
  async endTurn() {
    await this.endTurnButton.waitFor({ state: 'visible', timeout: 5000 });
    await this.endTurnButton.click();

    await this.page.waitForTimeout(500);
  }

  /**
   * Click on game board at specific coordinates
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  async clickGameBoard(x, y) {
    const boardBox = await this.gameBoard.boundingBox();

    if (!boardBox) {
      throw new Error('Game board not visible');
    }

    await this.page.mouse.click(boardBox.x + x, boardBox.y + y);
    await this.page.waitForTimeout(300);
  }

  /**
   * Click on a specific element within the game board
   * @param {string} selector - Selector for the element
   */
  async clickBoardElement(selector) {
    const element = this.gameBoard.locator(selector).first();
    await element.waitFor({ state: 'visible', timeout: 5000 });
    await element.click();

    await this.page.waitForTimeout(300);
  }

  /**
   * Get player scores
   * @returns {Promise<Array<{player: string, score: number}>>}
   */
  async getScores() {
    return this.page.evaluate(() => {
      const gameState = window.__roomState?.currentGame?.state;
      const players = window.__roomState?.players || [];

      if (!gameState || !gameState.scores) {
        return [];
      }

      return players.map(p => ({
        player: p.displayName || p.playerId,
        score: gameState.scores[p.playerId] || 0
      }));
    });
  }

  /**
   * Wait for game to end
   * @param {number} timeout - Timeout in milliseconds
   */
  async waitForGameEnd(timeout = 60000) {
    await this.page.waitForFunction(
      () => {
        return window.__roomState?.currentGame?.status === 'FINISHED';
      },
      { timeout }
    );
  }

  /**
   * Get winner information
   * @returns {Promise<{playerId: string, displayName: string} | null>}
   */
  async getWinner() {
    return this.page.evaluate(() => {
      const gameState = window.__roomState?.currentGame?.state;
      const players = window.__roomState?.players || [];

      if (!gameState || !gameState.winner) {
        return null;
      }

      const winner = players.find(p => p.playerId === gameState.winner);
      return winner ? {
        playerId: winner.playerId,
        displayName: winner.displayName || winner.playerId
      } : null;
    });
  }

  /**
   * Check if winner message is displayed
   * @returns {Promise<boolean>}
   */
  async isWinnerDisplayed() {
    try {
      await this.winnerMessage.waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Send a chat message during game
   * @param {string} message - Message to send
   */
  async sendChatMessage(message) {
    await this.chatInput.fill(message);
    await this.chatInput.press('Enter');

    await this.page.waitForTimeout(300);
  }

  /**
   * Get current turn player name
   * @returns {Promise<string | null>}
   */
  async getCurrentTurnPlayer() {
    return this.page.evaluate(() => {
      const gameState = window.__roomState?.currentGame?.state;
      const players = window.__roomState?.players || [];

      if (!gameState) return null;

      const currentPlayerId = gameState.currentPlayer || gameState.currentPlayerId || gameState.turn;
      const player = players.find(p => p.playerId === currentPlayerId);

      return player ? (player.displayName || player.playerId) : null;
    });
  }

  /**
   * Take a screenshot of the game board
   * @param {string} path - Path to save screenshot
   */
  async screenshotGameBoard(path) {
    await this.gameBoard.screenshot({ path });
  }

  /**
   * Emit a custom game action via socket
   * @param {string} actionType - Action type
   * @param {any} actionData - Action data
   */
  async emitGameAction(actionType, actionData = {}) {
    await this.page.evaluate(
      ({ action, data }) => {
        if (window.__socket) {
          window.__socket.emit('game:action', {
            action,
            ...data
          });
        }
      },
      { action: actionType, data: actionData }
    );

    await this.page.waitForTimeout(500);
  }

  /**
   * Return to lobby (after game ends)
   */
  async returnToLobby() {
    const lobbyButton = this.page.locator('button:has-text("Lobby"), button:has-text("Back to Lobby")');
    await lobbyButton.click();

    await this.page.waitForTimeout(1000);
  }

  /**
   * Check if game is finished
   * @returns {Promise<boolean>}
   */
  async isGameFinished() {
    return this.page.evaluate(() => {
      return window.__roomState?.currentGame?.status === 'FINISHED';
    });
  }
}
