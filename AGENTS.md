# AGENTS

## services/web
- Tests: `cd services/web && npm test`
- Build: `cd services/web && npm run build`
- Dev server: `cd services/web && npm run dev`
- Coverage (optional): `cd services/web && npx vitest --coverage` (requires `@vitest/coverage-v8`)

## services/hub
- Tests: `cd services/hub && npm test`
- Integration smoke test: `cd services/hub && REDIS_URL=redis://127.0.0.1:6379 npm run test:integration` (needs a real Redis; boots the server in-process and drives a room to a started game)
- Coverage (optional): `cd services/hub && node --test --coverage`

## CI
- `.github/workflows/ci.yml` runs hub unit + integration tests, web unit tests + build, and checks the built image actually contains the game art.
- Every check there was written against a bug that reached main. Confirm a new check fails without its fix before trusting it.
