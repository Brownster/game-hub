# Test Roadmap

Goal: add coverage for all major functions, prioritize game correctness and room lifecycle, then add integration and UI coverage.

## Phase 0 — Inventory & Priorities
- [ ] Map major function areas per service:
  - [ ] `services/hub/src/rooms/*`
  - [ ] `services/hub/src/util/*`
  - [ ] `services/hub/src/games/*`
  - [ ] `services/hub/src/socket.js`
  - [ ] `services/hub/src/server.js`
  - [ ] `services/web/src/*`
- [ ] Identify critical game paths (room creation, game start, turn progression, win detection, scoring).
- [ ] Define must-test APIs and socket events per game.

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
