# Catan End-to-End Tests Documentation

## Overview

Comprehensive Playwright tests for the Catan game implementation covering the full game flow from initialization through victory conditions.

## Test Coverage (FIN-002)

### ✅ Full Game Initialization
- 4-player room creation and joining
- Game selection and start flow
- Setup phase initialization
- Board generation (19 tiles, corners, edges)
- Player state initialization (colors, resources, pieces)

### ✅ Dice Rolls & Resource Distribution
- Board structure validation for resource distribution
- Terrain tile verification (forest, hills, pasture, fields, mountains, desert)
- Number token placement (2-12, excluding 7)
- Robber placement on desert tile
- Resource collection mechanism structure

### ✅ Building Placement & Validation
- **Setup Phase:**
  - Settlement placement with distance rule validation
  - Road placement connected to settlements
  - Turn progression through setup rounds

- **Main Game Phase:**
  - Building cost verification (road, settlement, city, dev card)
  - Valid placement location filtering
  - Client-side validation of placement rules
  - Resource tracking for building actions

### ✅ Victory Point Calculation
- Target VP tracking (default: 10)
- Public score visibility for all players
- Total VP tracking (includes hidden VP cards)
- Settlement VP (1 point each)
- City VP (2 points each)
- Largest Army / Longest Road tracking structure

### ✅ Player Disconnection Handling
- Graceful disconnect during lobby phase
- Player count updates on disconnect
- Game continues with minimum players (3)
- Room state synchronization after disconnect

## Test Suites

### 1. Catan Game Flow (7 tests)
- Full game initialization with setup phase
- Settlement and road placement during setup
- Dice roll and resource distribution mechanics
- Building placement validation rules
- Victory point tracking
- Player disconnection handling
- Building placement during main game

### 2. Catan Resource Distribution (1 test)
- Board structure with 19 tiles
- Resource-producing terrain types
- Number token distribution
- Robber initialization

### 3. Catan Victory Conditions (1 test)
- Victory point target (10 VP)
- Winner tracking mechanism
- Game finish state

## Running the Tests

```bash
# Run all Catan tests
cd services/web
npm run test:e2e -- catan.spec.js

# Run in headed mode (see browser)
npm run test:e2e:headed -- catan.spec.js

# Run specific test
npm run test:e2e -- catan.spec.js -g "should complete full game initialization"

# Debug mode
npm run test:e2e:debug -- catan.spec.js

# Run only on chromium
npm run test:e2e -- catan.spec.js --project=chromium-desktop
```

## Browser Coverage

Tests run across 5 browser configurations:
- **Desktop:** Chromium, Firefox, WebKit (1280x720)
- **Mobile:** Chrome, Safari on iPhone SE (375x667)

Total: **45 test executions** (9 tests × 5 browsers)

## Test Architecture

### Page Objects Used
- `HubHomePage` - Home page with room creation
- `GameLobbyPage` - Room lobby before game start
- `GameRoomPage` - Active game room (not extensively used in these tests)

### Helper Functions Used
- `createRoom(page, maxPlayers)` - Create new room
- `joinRoom(page, joinCode, displayName)` - Join existing room
- `selectGame(page, gameKey)` - Select game type
- `startGame(page)` - Start the game (host action)
- `waitForGameStart(page)` - Wait for game to begin

### Socket Events
Tests interact directly with socket events:
- `room:selectGame` - Select Catan as game type
- `game:start` - Start the game
- `game:action` - Execute game actions (place settlement, road, etc.)

### Game State Access
Tests access game state via `window.__roomState`:
```javascript
const gameState = window.__roomState?.currentGame?.state;
const sanitized = window.__roomState?.currentGame?.sanitized;
```

## Acceptance Criteria Status

| Criteria | Status | Test Coverage |
|----------|--------|---------------|
| Test covers full game initialization | ✅ | `should complete full game initialization with setup phase` |
| Test validates dice rolls and resource distribution | ✅ | `should roll dice and distribute resources correctly` + `should have board with resource-producing tiles` |
| Test verifies building placement and validation | ✅ | `should place settlements and roads during setup phase` + `should validate building placement rules` |
| Test checks victory point calculation | ✅ | `should track victory points correctly` + `should have victory point target and tracking` |
| Test handles player disconnection gracefully | ✅ | `should handle player disconnection gracefully` |

## Known Limitations

1. **Full Game Playthrough**: Tests do not complete a full game from start to finish due to the complexity and time required. Instead, they verify individual game mechanics and state transitions.

2. **Resource Distribution Testing**: While the board structure and dice rolling mechanism are tested, a full simulation of resource distribution across multiple turns is not included.

3. **AI/Bot Players**: Tests use multiple browser contexts to simulate players rather than AI bots, which can be resource-intensive.

4. **Trading & Dev Cards**: Specific tests for player trading and development card mechanics could be expanded in future iterations.

## Future Test Enhancements

- [ ] Complete end-to-end game playthrough to victory
- [ ] Resource distribution validation across multiple dice rolls
- [ ] Trading system (bank trades and player trades)
- [ ] Development card purchases and usage
- [ ] Robber movement and stealing mechanics
- [ ] Longest Road calculation verification
- [ ] Largest Army calculation verification
- [ ] Mid-game disconnection and reconnection

## Integration with CI/CD

These tests are designed to run in CI/CD pipelines:
- Headless mode by default
- Retries on CI (configured in playwright.config.js)
- Screenshots on failure
- Video recording on failure
- HTML report generation

## Dependencies

- Backend hub service must be running on default port
- Web service runs via Playwright's webServer config
- Redis required for room state management
- Socket.IO for real-time game state updates

## Troubleshooting

### Test Timeouts
If tests timeout, increase wait times in critical sections:
```javascript
await player1.waitForTimeout(2000); // Increase from 1000
```

### Socket Connection Issues
Ensure hub service is running:
```bash
cd services/hub
npm start
```

### State Not Updating
Add explicit waits for socket state sync:
```javascript
await page.waitForFunction(() => {
  return window.__roomState?.currentGame?.state?.phase === 'ROLL';
}, { timeout: 5000 });
```

## Contact

For issues or questions about these tests, refer to:
- FIN-002 in `.agents/tasks/prd-gamehub-finishing.json`
- Test architect agent documentation in `.agents/multi-agent/agents/test-architect.md`
