# GameHub Playwright Testing Infrastructure

Comprehensive UI testing infrastructure for GameHub using Playwright.

## Overview

This testing infrastructure provides:
- **Test Helpers**: Utilities for socket interactions and common game flows
- **Page Objects**: Reusable page models for HubHome, GameLobby, and GameRoom
- **Fixtures**: Custom Playwright fixtures with socket exposure for testing
- **Mobile Testing**: Configured viewports for mobile testing (375x667 - iPhone SE)
- **Multi-browser**: Tests run on Chromium, Firefox, and WebKit

## Directory Structure

```
tests/
├── e2e/                    # End-to-end test suites
│   └── smoke.spec.js       # Basic smoke tests
├── helpers/                # Test helper utilities
│   ├── socket-helper.js    # Socket.io testing utilities
│   ├── game-flow-helper.js # Game flow actions (join, start, etc.)
│   └── index.js           # Helper exports
├── page-objects/           # Page object models
│   ├── HubHomePage.js     # Home page model
│   ├── GameLobbyPage.js   # Lobby page model
│   ├── GameRoomPage.js    # Game room model
│   └── index.js           # Page object exports
├── fixtures.js            # Custom Playwright fixtures
└── README.md             # This file
```

## Quick Start

### Install Dependencies

```bash
cd services/web
npm install
```

### Install Playwright Browsers

```bash
npx playwright install
```

### Run Tests

**⚠️ IMPORTANT:** The hub service (backend) must be running for E2E tests to work!

#### Option 1: Manual Setup (Recommended)

**Terminal 1 - Start Hub Service:**
```bash
cd services/hub
npm start
```

**Terminal 2 - Run Tests:**
```bash
cd services/web

# Run all tests (headless)
npm run test:e2e

# Run tests with browser UI visible
npm run test:e2e:headed

# Run tests in interactive UI mode
npm run test:e2e:ui

# Debug specific test
npm run test:e2e:debug

# View test report
npm run test:e2e:report
```

#### Option 2: Using Helper Script

```bash
cd services/web/tests

# Run all tests (starts hub automatically)
./run-e2e-tests.sh

# Run specific test file
./run-e2e-tests.sh catan.spec.js

# Run with options
./run-e2e-tests.sh catan.spec.js --project=chromium-desktop
```

## Page Objects

### HubHomePage

Represents the main GameHub home page.

```javascript
import { test, expect } from '../fixtures.js';

test('example', async ({ hubHomePage }) => {
  await hubHomePage.goto();

  // Create a room
  const joinCode = await hubHomePage.createRoom();

  // Join a room
  await hubHomePage.joinRoom('ABC123');

  // Navigate to quick play
  await hubHomePage.goToWordle();
});
```

**Key Methods:**
- `goto()` - Navigate to home page
- `createRoom()` - Create new room, returns join code
- `joinRoom(code)` - Join room with code
- `goToWordle()`, `goToReversi()`, etc. - Navigate to quick play games

### GameLobbyPage

Represents a room in lobby state (before game starts).

```javascript
import { test, expect } from '../fixtures.js';

test('example', async ({ gameLobbyPage }) => {
  // Wait for lobby to load
  await gameLobbyPage.waitForLobbyLoad();

  // Get players
  const players = await gameLobbyPage.getPlayerNames();

  // Select game
  await gameLobbyPage.selectGame('Catan');

  // Start game (host only)
  await gameLobbyPage.startGame();

  // Chat
  await gameLobbyPage.sendChatMessage('Hello!');
});
```

**Key Methods:**
- `waitForLobbyLoad()` - Wait for lobby to initialize
- `getPlayerNames()` - Get list of player names
- `isHost()` - Check if current user is host
- `selectGame(name)` - Select game to play
- `startGame()` - Start the game
- `sendChatMessage(msg)` - Send chat message

### GameRoomPage

Represents a room with an active game in progress.

```javascript
import { test, expect } from '../fixtures.js';

test('example', async ({ gameRoomPage }) => {
  // Wait for game to load
  await gameRoomPage.waitForGameLoad();

  // Wait for turn
  await gameRoomPage.waitForMyTurn();

  // Take action
  await gameRoomPage.clickBoardElement('.tile');
  await gameRoomPage.endTurn();

  // Wait for game end
  await gameRoomPage.waitForGameEnd();
  const winner = await gameRoomPage.getWinner();
});
```

**Key Methods:**
- `waitForGameLoad()` - Wait for game board to appear
- `isMyTurn()` - Check if it's current player's turn
- `waitForMyTurn()` - Wait until it's your turn
- `clickBoardElement(selector)` - Click element on game board
- `emitGameAction(type, data)` - Emit custom game action
- `getGameState()` - Get current game state
- `waitForGameEnd()` - Wait for game to finish
- `getWinner()` - Get winner information

## Test Helpers

### Socket Helper

Utilities for testing socket.io interactions.

```javascript
import {
  waitForSocketEvent,
  emitSocketEvent,
  waitForSocketConnection
} from './helpers/socket-helper.js';

// Wait for socket event
const data = await waitForSocketEvent(page, 'room:state');

// Emit event
await emitSocketEvent(page, 'game:action', { action: 'MOVE' });

// Check connection
await waitForSocketConnection(page);
```

### Game Flow Helper

Utilities for common game flows.

```javascript
import {
  createRoom,
  joinRoom,
  startGame,
  waitForGameStart
} from './helpers/game-flow-helper.js';

// Create and join room
const { joinCode } = await createRoom(page);
await joinRoom(page, joinCode);

// Start game
await startGame(page);
await waitForGameStart(page);
```

## Writing Tests

### Basic Test Structure

```javascript
import { test, expect } from '../fixtures.js';

test.describe('Feature Name', () => {
  test('should do something', async ({ page, hubHomePage, gameLobbyPage }) => {
    // Arrange
    await hubHomePage.goto();

    // Act
    const joinCode = await hubHomePage.createRoom();

    // Assert
    expect(joinCode).toBeTruthy();
  });
});
```

### Multi-Player Tests

For tests requiring multiple players, open multiple browser contexts:

```javascript
test('multiplayer game', async ({ browser }) => {
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();

  const page1 = await context1.newPage();
  const page2 = await context2.newPage();

  // Player 1 creates room
  const hubHome1 = new HubHomePage(page1);
  await hubHome1.goto();
  const joinCode = await hubHome1.createRoom();

  // Player 2 joins room
  const hubHome2 = new HubHomePage(page2);
  await hubHome2.goto();
  await hubHome2.joinRoom(joinCode);

  // Continue test...

  await context1.close();
  await context2.close();
});
```

### Mobile Testing

```javascript
test.describe('Mobile Tests', () => {
  test.use({
    viewport: { width: 375, height: 667 }, // iPhone SE
  });

  test('should work on mobile', async ({ hubHomePage }) => {
    await hubHomePage.goto();
    // Test mobile-specific behavior
  });
});
```

## Configuration

Main configuration is in `playwright.config.js`:

- **Base URL**: Defaults to `http://localhost:5173`
- **Projects**: Configured for desktop and mobile viewports
- **Retries**: Enabled on CI (2 retries)
- **Screenshots**: Captured on failure
- **Videos**: Retained on failure
- **Web Server**: Automatically starts dev server

### Environment Variables

- `PLAYWRIGHT_BASE_URL` - Override base URL
- `CI` - Set to enable CI-specific behavior (retries, sequential execution)

## Best Practices

1. **Use Page Objects**: Always use page objects instead of direct selectors
2. **Wait Strategies**: Use `waitFor*` methods instead of arbitrary timeouts
3. **Data Attributes**: Prefer `data-testid` attributes for reliable selectors
4. **Isolation**: Each test should be independent
5. **Clean State**: Don't rely on previous test state
6. **Meaningful Names**: Use descriptive test and variable names
7. **Arrange-Act-Assert**: Follow AAA pattern for test structure

## Troubleshooting

### Failed to create room: 404

**Cause:** Hub service (backend) is not running
**Solution:** Start the hub service first
```bash
cd services/hub
npm start
```

Verify hub is running:
```bash
curl http://localhost:8081/api/health
# Should return: {"ok":true}
```

### ECONNREFUSED localhost:8081

**Cause:** Hub service is not reachable
**Solutions:**
- Ensure hub service is running on port 8081
- Check firewall settings
- Verify no other service is using port 8081: `lsof -i :8081`

### Tests Timeout

- Increase timeout in specific test: `test.setTimeout(60000)`
- Check if dev server is running
- Check if hub server is running
- Verify socket connections are established

### Socket Not Available

The fixtures automatically expose socket on `window.__socket`. If not available:
- Ensure page is loaded before accessing socket
- Check that socket.io is properly initialized
- Verify the fixture is being used

### Flaky Tests

- Add explicit waits for dynamic content
- Use `waitForFunction` for complex conditions
- Check for race conditions
- Enable retries for known flaky tests

### Port Already in Use

If you see "Port 8081 already in use":
```bash
# Find process using port 8081
lsof -i :8081

# Kill the process
kill <PID>
```

## Next Steps

After completing FIN-001, the following test suites should be added:

- **FIN-002**: Catan game flow tests
- **FIN-003**: UNO game flow tests
- **FIN-004**: Wordle daily flow tests

See `.agents/tasks/prd-gamehub-finishing.json` for complete test requirements.
