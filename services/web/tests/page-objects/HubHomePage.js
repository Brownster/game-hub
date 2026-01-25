/**
 * Page Object for HubHome
 * Represents the main GameHub home page
 */

export class HubHomePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Locators
    this.header = page.locator('header.reversi-title');
    this.createRoomButton = page.locator('button:has-text("Create Room")');
    this.joinCodeInput = page.locator('input[placeholder*="room code"]');
    this.joinRoomButton = page.locator('button:has-text("Join Room")');

    // Quick play buttons
    this.reversiButton = page.locator('button:has-text("Reversi")');
    this.connect4Button = page.locator('button:has-text("Connect 4")');
    this.wordleButton = page.locator('button:has-text("Wordle")');
    this.drawButton = page.locator('button:has-text("Draw & Guess")');
    this.charadesButton = page.locator('button:has-text("Charades")');
    this.serpentButton = page.locator('button:has-text("SERPENT")');
  }

  /**
   * Navigate to HubHome
   */
  async goto() {
    await this.page.goto('/');
    await this.waitForPageLoad();
  }

  /**
   * Wait for page to load
   */
  async waitForPageLoad() {
    await this.header.waitFor({ state: 'visible', timeout: 10000 });
    await this.createRoomButton.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Create a new room
   * @returns {Promise<string>} Room join code
   */
  async createRoom() {
    await this.createRoomButton.click();

    // Wait for navigation to room page
    await this.page.waitForURL(/\/room\/[A-Z0-9]+/, { timeout: 10000 });

    // Extract join code from URL
    const url = this.page.url();
    const match = url.match(/\/room\/([A-Z0-9]+)/);
    return match ? match[1] : null;
  }

  /**
   * Join an existing room by code
   * @param {string} joinCode - Room join code
   */
  async joinRoom(joinCode) {
    await this.joinCodeInput.fill(joinCode);
    await this.joinRoomButton.click();

    // Wait for navigation
    await this.page.waitForURL(`/room/${joinCode}`, { timeout: 10000 });
  }

  /**
   * Join room by pressing Enter in input
   * @param {string} joinCode - Room join code
   */
  async joinRoomWithEnter(joinCode) {
    await this.joinCodeInput.fill(joinCode);
    await this.joinCodeInput.press('Enter');

    // Wait for navigation
    await this.page.waitForURL(`/room/${joinCode}`, { timeout: 10000 });
  }

  /**
   * Navigate to Reversi quick play
   */
  async goToReversi() {
    await this.reversiButton.click();
    await this.page.waitForURL('/reversi', { timeout: 5000 });
  }

  /**
   * Navigate to Connect4 quick play
   */
  async goToConnect4() {
    await this.connect4Button.click();
    await this.page.waitForURL('/connect4', { timeout: 5000 });
  }

  /**
   * Navigate to Wordle
   */
  async goToWordle() {
    await this.wordleButton.click();
    await this.page.waitForURL('/wordle', { timeout: 5000 });
  }

  /**
   * Navigate to Draw & Guess
   */
  async goToDraw() {
    await this.drawButton.click();
    await this.page.waitForURL('/draw', { timeout: 5000 });
  }

  /**
   * Navigate to Charades
   */
  async goToCharades() {
    await this.charadesButton.click();
    await this.page.waitForURL('/charades', { timeout: 5000 });
  }

  /**
   * Navigate to Serpent.IO
   */
  async goToSerpent() {
    await this.serpentButton.click();
    await this.page.waitForURL('/slither', { timeout: 5000 });
  }

  /**
   * Check if header is visible
   * @returns {Promise<boolean>}
   */
  async isLoaded() {
    return this.header.isVisible();
  }

  /**
   * Get page title text
   * @returns {Promise<string>}
   */
  async getTitle() {
    return this.header.textContent();
  }
}
