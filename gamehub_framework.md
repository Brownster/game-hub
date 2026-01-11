# Gamehub Framework Overview

## Goals
- Make it easy to add new games by reusing common multiplayer, UI, and game-loop patterns.
- Separate **shared platform** concerns from **per-game logic/assets**.
- Support board, card, and party games with consistent UX.

## Shared Platform (applies to all games)

### 1) Multiplayer Core (server)
- Standard room flow: join/leave, session, host, reconnect (`roomService.js`)
- Game registry with min/max players, modes (`registry.js`)
- Canonical state fields: `phase`, `turnIndex`, `players[]`
- Sanitized state per viewer (hide opponent hands/cards)
- Socket events: `room:state`, `game:action`, `game:error`
- Common timers for timed phases (draw, charades)

### 2) UI Shell (client)
- Room layout: header (room code, timer, actions), sidebar (players, voice, host controls)
- Game area renders game-specific component based on `gameKey`
- Chat panel with typing indicators
- Toast notifications for errors/events
- Audio cues via `sounds.js`
- Mobile-first responsiveness

### 3) Design Tokens (actual)
```css
:root {
  --wood-light: #d4b08a;
  --wood-dark: #8b5e3c;
  --ink: #1b120b;
  --accent: #ffb23f;
  --accent-deep: #d98314;
  --panel: rgba(255, 248, 235, 0.85);
  --panel-strong: rgba(255, 248, 235, 0.96);
  --shadow-strong: 0 16px 40px rgba(0, 0, 0, 0.35);
}
```

## Game-Type Frameworks

### A) Board Games
**Shared utilities** (`services/hub/src/games/board/`):
- `hexUtils.js` - Hex grid math (axial coords, neighbors, corners, edges)
- `boardUtils.js` - Generic board state (tiles, nodes, edges, path finding)

**Frontend** (`services/web/src/components/board/`):
- `HexGrid.jsx` - SVG container with viewBox
- `HexTile.jsx` - Hex polygon with terrain/number
- `HexCorner.jsx` - Settlement/city placement
- `HexEdge.jsx` - Road placement
- `hexMath.js` - Pixel calculations for rendering

**Patterns**:
- Clickable hotspots with highlight states
- Interaction modes (buildSettlement, moveRobber, etc.)
- Per-player state sanitization (hide resources/dev cards)
- Available actions sent to client for UI hints

### B) Card Games
**Shared utilities** (`services/hub/src/games/cards/`):
- `cardUtils.js` - Deck creation, shuffle, deal, draw
- `scoringUtils.js` - Standard card scoring (15s, pairs, runs, flush)

**Frontend** (`services/web/src/components/cards/`):
- `PlayingCard.jsx` - Card face with suit/rank
- `CardHand.jsx` - Fanned hand display
- `CardStack.jsx` - Deck/discard pile

**Patterns**:
- Hand privacy (only show own cards)
- Card selection with confirm
- Animated card movement
- Scoring breakdowns

### C) Party Games
**Shared patterns**:
- Prompt/word management with categories
- Round timers with countdowns
- Turn rotation through players
- Scoring with leaderboard
- Reveal phases with answers

**Components**:
- Drawing canvas (Draw & Guess)
- Video/prompt display (Charades)
- Guess input with chat integration

## Per-Game Layer

### Server (`services/hub/src/games/<game>/`)
Each game implements:
- `<game>Service.js` - State creation, sanitization, main interface
- `<game>Actions.js` - Action handlers and validation
- `<game>Constants.js` - Game-specific constants
- Additional modules as needed (board, resources, scoring)

**Required exports**:
```javascript
createInitialState(mode, players)  // Create fresh game state
sanitizeState(state, playerId)     // Hide private info per player
processAction(state, playerId, action)  // Execute game action
```

### Client (`services/web/src/components/games/<game>/`)
- Main board/game component
- Sub-components for UI sections
- Game-specific styles (can be in main.css or separate)

## Current Games

| Game | Type | Players | Key Features |
|------|------|---------|--------------|
| Reversi | Board | 2 | Grid board, AI opponent |
| Connect 4 | Board | 2 | Drop pieces, AI opponent |
| Draw & Guess | Party | 2-12 | Canvas drawing, word guessing |
| Charades | Party | 2-12 | Acting prompts, guessing |
| Cribbage | Card | 2 | Pegging, hand scoring, crib |
| Catan | Board | 3-4 | Hex grid, trading, building |

## Folder Structure (Actual)

```
services/hub/src/
  games/
    board/              # Shared board utilities
      hexUtils.js
      boardUtils.js
    cards/              # Shared card utilities
      cardUtils.js
      scoringUtils.js
    reversi/            # Game-specific
    connect4/
    draw/
    charades/
    cribbage/
    catan/
    registry.js         # Game creation registry
  rooms/
    roomService.js      # Room management
  socket.js             # Socket event handlers

services/web/src/
  components/
    board/              # Shared board UI
      HexGrid.jsx
      HexTile.jsx
      HexCorner.jsx
      HexEdge.jsx
    cards/              # Shared card UI
      PlayingCard.jsx
      CardHand.jsx
    games/              # Game-specific UI
      catan/
      ReversiBoard.jsx
      CribbageBoard.jsx
      ...
    GameSelector.jsx
    ChatPanel.jsx
    VoicePanel.jsx
  pages/
    Room.jsx            # Main room page
  utils/
    hexMath.js          # Hex pixel calculations
  styles/
    main.css            # All styles
  public/
    cards/              # Card images
    catan/icons/        # Catan SVG icons
    audio/              # Sound effects
```

## Adding a New Game (Checklist)

### Backend
1. Create game folder: `services/hub/src/games/<game>/`
2. Implement `<game>Service.js` with:
   - `create<Game>InitialState(players, mode)`
   - `sanitizeState(state, playerId)`
   - `processAction(state, playerId, action)` or action handlers
3. Add constants file with phases, actions, game rules
4. Update `registry.js` to import and call your create function
5. Update `socket.js`:
   - Add to `GAME_CONFIG` with minPlayers, maxPlayers, modes
   - Add sanitization case in `broadcastRoomState`
   - Add action handler case in `handleGameAction`

### Frontend
1. Create component folder: `services/web/src/components/games/<game>/`
2. Build main game component with props: `state`, `playerId`, `onAction`
3. Import and add case in `Room.jsx` switch statement
4. Add game entry to `GameSelector.jsx` GAMES array
5. Add CSS styles to `main.css`
6. Add assets to `public/<game>/`

### Testing
- Test with minimum and maximum players
- Verify state sanitization (check opponent can't see private info)
- Test all game phases and actions
- Check mobile responsiveness

## Related Roadmaps
- `card_games_roadmap.md`
- `catan_roadmap.md`
- `fibbage_roadmap.md`
