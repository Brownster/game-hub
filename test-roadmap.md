# Test Roadmap

Goal: add coverage for all major functions, prioritize game correctness and room lifecycle, then add integration and UI coverage.

## Phase 0 — Inventory & Priorities
- [x] Map major function areas per service:
  - **services/hub (core)**
    - Rooms + lifecycle: `services/hub/src/rooms/roomService.js`, `services/hub/src/rooms/roomTypes.js`
    - Redis boundary: `services/hub/src/redis.js`
    - Utility helpers: `services/hub/src/util/codes.js`
    - Socket orchestration + timers: `services/hub/src/socket.js`
    - HTTP API: `services/hub/src/server.js`
    - Game registry/init: `services/hub/src/games/registry.js`
  - **services/hub (game modules)**
    - Reversi: `services/hub/src/games/reversi/reversiService.js`, `services/hub/src/games/reversi/reversiRules.js`, `services/hub/src/games/reversi/reversiAI.js`
    - Connect4: `services/hub/src/games/connect4/connect4Service.js`, `services/hub/src/games/connect4/connect4Rules.js`, `services/hub/src/games/connect4/connect4AI.js`
    - Draw: `services/hub/src/games/draw/drawService.js`, `services/hub/src/games/draw/words.js`
    - Charades: `services/hub/src/games/charades/charadesService.js`, `services/hub/src/games/charades/prompts.js`
    - Cribbage: `services/hub/src/games/cribbage/cribbageService.js`, `services/hub/src/games/cards/cardUtils.js`, `services/hub/src/games/cards/scoringUtils.js`
    - Catan: `services/hub/src/games/catan/catanService.js`, `services/hub/src/games/catan/catanActions.js`, `services/hub/src/games/catan/catanBoard.js`, `services/hub/src/games/catan/catanResources.js`, `services/hub/src/games/catan/catanScoring.js`, `services/hub/src/games/catan/catanConstants.js`, `services/hub/src/games/catan/catanDevCards.js`
    - Uno: `services/hub/src/games/uno/unoService.js`, `services/hub/src/games/uno/unoDeck.js`, `services/hub/src/games/uno/unoConstants.js`
    - Crazy Eights: `services/hub/src/games/crazy_eights/crazyEightsService.js`
    - Chess: `services/hub/src/games/chess/chessService.js`, `services/hub/src/games/chess/chessAi.js`
    - Fibbage: `services/hub/src/games/fibbage/fibbageService.js`, `services/hub/src/games/fibbage/fibbageConstants.js`, `services/hub/src/games/fibbage/questions.js`
    - Wordle (room): `services/hub/src/games/wordle/wordleRoomService.js`, `services/hub/src/games/wordle/wordleUtils.js`, `services/hub/src/games/wordle/words.js`
    - Wordle (daily API): `services/hub/src/games/wordle/wordleDaily.js`, `services/hub/src/games/wordle/wordleUtils.js`
    - Wordle (VS API): `services/hub/src/games/wordle/wordleVs.js`, `services/hub/src/games/wordle/wordleUtils.js`
    - Slither: `services/hub/src/games/slither/slitherSocket.js`, `services/hub/src/games/slither/slitherEngine.js`
    - Shared board helpers: `services/hub/src/games/board/boardUtils.js`, `services/hub/src/games/board/hexUtils.js`
  - **services/web**
    - Entry + routing: `services/web/src/main.jsx`, `services/web/src/App.jsx`
    - Client state + API: `services/web/src/state/api.js`, `services/web/src/state/session.js`, `services/web/src/state/socket.js`, `services/web/src/state/wordleUtils.js`, `services/web/src/state/sounds.js`
    - Pages/screens: `services/web/src/pages/HubHome.jsx`, `services/web/src/pages/Lobby.jsx`, `services/web/src/pages/Room.jsx`, `services/web/src/pages/Game.jsx`, `services/web/src/pages/WordleHome.jsx`, `services/web/src/pages/WordleGame.jsx`, `services/web/src/pages/Connect4Home.jsx`, `services/web/src/pages/Connect4Game.jsx`, `services/web/src/pages/ReversiHome.jsx`, `services/web/src/pages/DrawHome.jsx`, `services/web/src/pages/DrawGame.jsx`, `services/web/src/pages/CharadesHome.jsx`, `services/web/src/pages/CharadesGame.jsx`, `services/web/src/pages/Slither.jsx`
    - Game components: `services/web/src/components/games/**` (UNO, Crazy Eights, Chess, Catan, Fibbage, Wordle)
    - Shared UI: `services/web/src/components/**` (chat, voice, selectors, cards, board)
    - Utilities + styles: `services/web/src/utils/hexMath.js`, `services/web/src/styles/main.css`
- [x] Critical game paths per game (start, turn progression, win detection, scoring):
  - **Reversi**: start `createReversiInitialState` (`services/hub/src/games/reversi/reversiService.js`); turn `applyMove` + `getLegalMoves` (`services/hub/src/games/reversi/reversiRules.js`); win detection in `applyMove` status/winner (`services/hub/src/games/reversi/reversiRules.js`); scoring via `countDiscs` (`services/hub/src/games/reversi/reversiRules.js`).
  - **Connect4**: start `createConnect4InitialState` (`services/hub/src/games/connect4/connect4Service.js`); turn `dropPiece` + turn switch (`services/hub/src/games/connect4/connect4Service.js`); win detection `checkWinner` / `isBoardFull` (`services/hub/src/games/connect4/connect4Rules.js`); scoring via `countPieces` (`services/hub/src/games/connect4/connect4Rules.js`).
  - **Draw**: start `createDrawInitialState` + `startRound` (`services/hub/src/games/draw/drawService.js`); turn `addStroke` / `applyGuess` / `advanceTurn` (`services/hub/src/games/draw/drawService.js`); win detection is round-based (no global winner); scoring in `endRound` score updates (`services/hub/src/games/draw/drawService.js`).
  - **Charades**: start `createCharadesInitialState` + `startRound` (`services/hub/src/games/charades/charadesService.js`); turn `applyGuess` / `advanceTurn` (`services/hub/src/games/charades/charadesService.js`); win detection is round-based; scoring in `endRound` score updates (`services/hub/src/games/charades/charadesService.js`).
  - **Cribbage**: start `createCribbageInitialState` + `startRound` (`services/hub/src/games/cribbage/cribbageService.js`); turn `discardToCrib` / `cutDeck` / `playCard` / `sayGo` / `confirmShow` / `nextRound` (`services/hub/src/games/cribbage/cribbageService.js`); win detection via `checkGameEnd` + `PHASES.GAME_END` (`services/hub/src/games/cribbage/cribbageService.js`); scoring via `scoreHand` / `scorePegging` + `awardPoints` (`services/hub/src/games/cards/scoringUtils.js`, `services/hub/src/games/cribbage/cribbageService.js`).
  - **Catan**: start `createCatanInitialState` + `startCatanGame` (`services/hub/src/games/catan/catanService.js`); turn `processAction` / `executeAction` (`services/hub/src/games/catan/catanService.js`, `services/hub/src/games/catan/catanActions.js`); win detection in `processAction` (victory -> `PHASES.FINISHED`) + `isGameFinished` (`services/hub/src/games/catan/catanService.js`); scoring via `calculateVictoryPoints` / `getPublicScore` (`services/hub/src/games/catan/catanScoring.js`).
  - **Uno**: start `createUnoInitialState` + `startUnoGame` (`services/hub/src/games/uno/unoService.js`); turn `processAction` (`services/hub/src/games/uno/unoService.js`); win detection when hand empty -> `PHASES.FINISHED` (`services/hub/src/games/uno/unoService.js`); scoring = winner only (no point totals).
  - **Crazy Eights**: start `createCrazyEightsInitialState` + `startCrazyEightsGame` (`services/hub/src/games/crazy_eights/crazyEightsService.js`); turn `processAction` (`services/hub/src/games/crazy_eights/crazyEightsService.js`); win detection when hand empty -> `PHASES.FINISHED`; scoring = winner only.
  - **Chess**: start `createChessInitialState` + `startChessGame` (`services/hub/src/games/chess/chessService.js`); turn `processAction` with `MOVE` (`services/hub/src/games/chess/chessService.js`); win detection via checkmate/draw/resign -> `PHASES.FINISHED` (`services/hub/src/games/chess/chessService.js`); scoring = win/draw only.
  - **Fibbage**: start `createFibbageInitialState` + `startRound` (`services/hub/src/games/fibbage/fibbageService.js`); turn `submitLie` / `submitVote` / phase advances (`services/hub/src/games/fibbage/fibbageService.js`); win detection in `advanceToNextRound` -> `PHASES.GAME_END` (`services/hub/src/games/fibbage/fibbageService.js`); scoring in `calculateRoundScores` (`services/hub/src/games/fibbage/fibbageService.js`).
  - **Wordle (room)**: start `createWordleInitialState` + `startRound` (`services/hub/src/games/wordle/wordleRoomService.js`); turn `submitGuess` / `processAction` (`services/hub/src/games/wordle/wordleRoomService.js`); win detection when rounds complete -> `PHASES.GAME_END` (`services/hub/src/games/wordle/wordleRoomService.js`); scoring in `finalizeRound` (`services/hub/src/games/wordle/wordleRoomService.js`).
  - **Wordle (daily)**: start `startDailySession` (`services/hub/src/games/wordle/wordleDaily.js`); turn `submitDailyGuess` (`services/hub/src/games/wordle/wordleDaily.js`); win/lose in `submitDailyGuess` + `finalizeDailySession`; scoring/leaderboard in `finalizeDailySession` (`services/hub/src/games/wordle/wordleDaily.js`).
  - **Wordle (VS API)**: start `createVsState` / `startRound` (`services/hub/src/games/wordle/wordleVs.js`); turn `applyVsGuess` (`services/hub/src/games/wordle/wordleVs.js`); win detection + round wrap in `finalizeRound` / `prepareNextRound` (`services/hub/src/games/wordle/wordleVs.js`); scoring in `finalizeRound` (`services/hub/src/games/wordle/wordleVs.js`).
  - **Slither**: start `initSlitherEngine` + `addPlayer` (`services/hub/src/games/slither/slitherEngine.js`); turn progression via `tickAndGetState` / `updateGame` (`services/hub/src/games/slither/slitherEngine.js`); win detection = none (endless session); scoring via `score` growth + death/respawn (`services/hub/src/games/slither/slitherEngine.js`).
- [x] Must-test APIs and socket events (with source file references):
  - **HTTP API** (`services/hub/src/server.js`):
    - `GET /api/health`
    - `POST /api/rooms`
    - `GET /api/rooms/by-code/:code`
    - `POST /api/wordle/vs`
    - `GET /api/wordle/daily/status`
    - `POST /api/wordle/daily/start`
    - `POST /api/wordle/daily/guess`
    - `GET /api/wordle/free/word`
  - **Socket.io room/voice/game events** (`services/hub/src/socket.js`):
    - Session/room: `session:hello`, `room:join`, `room:leave`, `room:chat`, `room:typing`, `room:selectGame`, `room:startGame`, `room:rematch`, `room:switchGame`
    - Game flow: `game:action`, `game:error`, `game:ended`, `game:stroke`, `room:state`, `room:gameSelected`, `room:gameCleared`, `room:playerJoined`, `room:playerLeft`, `room:rematch`
    - Voice: `voice:get-ice-servers`, `voice:ice-servers`, `voice:join`, `voice:leave`, `voice:offer`, `voice:answer`, `voice:ice-candidate`, `voice:peer-joined`, `voice:peer-left`, `voice:peers`
  - **Per-game action payloads for `game:action`** (`services/hub/src/socket.js` + game files):
    - Reversi: `MOVE` (`services/hub/src/games/reversi/reversiService.js`)
    - Connect4: `MOVE` (`services/hub/src/games/connect4/connect4Service.js`)
    - Draw: `STROKE`, `GUESS` (`services/hub/src/games/draw/drawService.js`)
    - Charades: `GUESS` (`services/hub/src/games/charades/charadesService.js`)
    - Cribbage: `DISCARD`, `CUT`, `PLAY_CARD`, `GO`, `CONFIRM_SHOW`, `NEXT_ROUND` (`services/hub/src/games/cribbage/cribbageService.js`)
    - Catan: `ACTIONS.*` (`services/hub/src/games/catan/catanConstants.js`, `services/hub/src/games/catan/catanActions.js`)
    - Uno: `ACTIONS.*` (`services/hub/src/games/uno/unoConstants.js`, `services/hub/src/games/uno/unoService.js`)
    - Crazy Eights: `ACTIONS.*` (`services/hub/src/games/crazy_eights/crazyEightsService.js`)
    - Chess: `ACTIONS.*` (`services/hub/src/games/chess/chessService.js`)
    - Fibbage: `ACTIONS.*` (`services/hub/src/games/fibbage/fibbageConstants.js`, `services/hub/src/games/fibbage/fibbageService.js`)
    - Wordle (room): `READY`, `GUESS`, `NEXT_ROUND` (`services/hub/src/games/wordle/wordleRoomService.js`)
  - **Slither namespace events** (`services/hub/src/games/slither/slitherSocket.js`):
    - Client -> server: `join`, `updateAngle`, `respawn`, `disconnect`
    - Server -> client: `init`, `gameState`

## Phase 1 — Unit Tests (Pure Logic)
- [ ] Add/expand unit tests for deterministic logic in `services/hub/src/util/*`.
- [ ] Add/expand unit tests for game logic in `services/hub/src/games/*`:
  - [ ] Move validation
  - [ ] Scoring and win detection
  - [ ] Board state updates
  - [ ] Serialization/sanitization
  - [ ] Edge cases (invalid moves, end-game, ties)

## Phase 2 — Service Layer Tests
- [ ] `services/hub/src/rooms/roomService.js` lifecycle and player management.
- [ ] Game service state transitions (cribbage, chess, wordle, etc.).
- [ ] Mock Redis boundary where needed.

## Phase 3 — Socket Action Handler Tests
- [ ] `services/hub/src/socket.js` action enforcement:
  - [ ] Turn ownership
  - [ ] Phase checks
  - [ ] Invalid action responses
- [ ] Timer scheduling/clearing behavior for time-based games.
- [ ] Game status transitions (ongoing -> finished).

## Phase 4 — HTTP API Tests
- [ ] `services/hub/src/server.js` endpoints:
  - [ ] `POST /api/rooms`
  - [ ] `GET /api/rooms/by-code/:code`
  - [ ] `POST /api/wordle/vs`
  - [ ] `GET /api/wordle/daily/status`
  - [ ] `POST /api/wordle/daily/start`
  - [ ] `POST /api/wordle/daily/guess`
  - [ ] `GET /api/wordle/free/word`

## Phase 5 — Web UI Tests
- [ ] `services/web/src/App.jsx` routing and critical screens.
- [ ] Socket-driven UI state updates (mock socket client).
- [ ] Minimal snapshots only where stable.

## Phase 6 — E2E (Optional)
- [ ] Room creation -> join -> play one turn (Playwright or similar).
- [ ] Multiplayer flow smoke test.

## Commit Hook Plan
- [ ] Add a fast pre-commit test hook for:
  - [ ] `services/hub` (unit-only)
  - [ ] `services/web` (unit-only)
- [ ] Keep full test suite in CI.
