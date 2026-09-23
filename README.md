# Family Game Hub

A LAN-friendly game hub that runs on your Pi NAS. Includes Reversi (Othello), Connect 4, Cribbage, Catan, UNO, Crazy Eights, Fibbage, Chess, Wordle (daily/free/VS), Draw & Guess (party), Charades, and an open-arena SERPENT.IO mode.

## Quick start

```bash
docker compose up -d --build
```

Open `http://<pi-ip>:8081` from any phone or desktop on your LAN.

## How it works

- `web` serves the UI and proxies `/api` + `/socket.io` to the hub (single origin).
- `hub` handles rooms, game state, and real-time WebSocket updates.
- `redis` stores room state so multiple games can run at once.
- Audio assets live in `services/web/public/audio` and play after the first user interaction.
- SERPENT.IO is served from the same hub via the `/slither` Socket.IO namespace.
- Wordle daily and VS modes use server-backed state + LAN leaderboards.
- Chess uses `chess.js` for validation; AI mode uses a simple minimax bot.

## Local development (optional)

In two terminals:

```bash
cd services/hub
npm install
npm run dev
```

```bash
cd services/web
npm install
npm run dev
```

Then open `http://localhost:5173`. The dev server proxies `/api` and the socket
connection to the hub on port 8081, so the hub must be running. Point it
elsewhere with `HUB_URL`, and give the hub a reachable Redis:

```bash
cd services/hub && REDIS_URL=redis://127.0.0.1:6379 PORT=8090 npm run dev
cd services/web && HUB_URL=http://127.0.0.1:8090 npm run dev
```

## Testing

Hub tests use Node's built-in test runner to keep game logic and API behavior deterministic (room lifecycle, game services/utilities, and Wordle flows) without real Redis or network dependencies.

```bash
cd services/hub
npm test
```

Web tests run in Vitest + jsdom to cover routing, key HubHome interactions, and
the socket session handshake, while keeping browser APIs mocked.

```bash
cd services/web
npm test
```

### Integration smoke test

The unit suites are fully mocked, which let several app-breaking bugs through.
This one boots the real server and real socket handlers in-process and drives an
actual room to a started chess game. It needs a real Redis:

```bash
cd services/hub
REDIS_URL=redis://127.0.0.1:6379 npm run test:integration
```

### Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request: hub unit and
integration tests, web unit tests and build, and a check that the built Docker
image actually contains the game art. Each check was written against a bug that
had already reached `main`, and verified to fail without its fix.

### Coverage (optional, non-blocking)

Coverage is not enforced. If you want a quick snapshot, keep core game logic and routing around ~70% lines/branches and use:

- `cd services/hub && node --test --coverage`
- `cd services/web && npx vitest --coverage` (requires adding `@vitest/coverage-v8`)

## Notes

- Room codes are 4 characters; share the lobby link to join.
- Refreshing the page re-joins using the saved player ID.
