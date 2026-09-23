# Wordle Daily Mode E2E Test Guide

## Prerequisites

Before running the Wordle E2E tests, ensure the following services are running:

### 1. Redis Server
```bash
# Start Redis (if not already running)
redis-server

# Or using Docker
docker run -d -p 6379:6379 redis:latest
```

### 2. Hub Service (Backend)
```bash
# Terminal 1: Start hub service
cd services/hub
npm install
npm start

# Service should be available at http://localhost:3000
```

### 3. Web Service (Frontend)
```bash
# Terminal 2: Start web service
cd services/web
npm install
npm run dev

# Service should be available at http://localhost:5173
```

### 4. Verify Services
```bash
# Check web service
curl http://localhost:5173

# Check hub service
curl http://localhost:3000/health
```

## Running the Tests

### All Tests
```bash
cd services/web

# Run all Wordle tests on all browsers
npm run test:e2e -- wordle.spec.js

# Run with HTML report
npm run test:e2e -- wordle.spec.js --reporter=html
```

### Specific Browser
```bash
# Chromium only
npm run test:e2e -- wordle.spec.js --project=chromium-desktop

# Firefox only
npm run test:e2e -- wordle.spec.js --project=firefox-desktop

# WebKit (Safari) only
npm run test:e2e -- wordle.spec.js --project=webkit-desktop

# Mobile Chrome
npm run test:e2e -- wordle.spec.js --project=mobile-chrome

# Mobile Safari
npm run test:e2e -- wordle.spec.js --project=mobile-safari
```

### Specific Test
```bash
# Run a single test by name
npm run test:e2e -- wordle.spec.js -g "should complete name entry"

# Run win outcome test
npm run test:e2e -- wordle.spec.js -g "should handle win outcome"

# Run leaderboard test
npm run test:e2e -- wordle.spec.js -g "should verify leaderboard"
```

### Debug Mode
```bash
# Run in headed mode (see browser)
npm run test:e2e:headed -- wordle.spec.js

# Run with Playwright UI
npm run test:e2e:ui -- wordle.spec.js

# Run with debugger
npm run test:e2e:debug -- wordle.spec.js

# Step through with PWDEBUG
PWDEBUG=1 npm run test:e2e -- wordle.spec.js
```

### CI/CD Mode
```bash
# Run with retries (2 retries on failure)
npm run test:e2e -- wordle.spec.js --retries=2

# Run with workers (parallel execution)
npm run test:e2e -- wordle.spec.js --workers=4

# Run with JSON reporter for CI
npm run test:e2e -- wordle.spec.js --reporter=json > wordle-results.json
```

## Test Coverage

### Core Tests (5)
1. **Name entry and game start** - Validates session setup and board initialization
2. **Guess submission and feedback** - Tests visual feedback (green/yellow/gray tiles)
3. **Win outcome** - Simulates winning within 6 guesses
4. **Lose outcome** - Simulates losing after 6 failed guesses
5. **Leaderboard display** - Validates ranking and player entries

### Additional Tests (6)
6. **Invalid guess handling** - Tests error validation and shake animation
7. **Daily limit enforcement** - Prevents playing twice on same day
8. **Tile color consistency** - Validates visual feedback classes
9. **Stats tracking** - Verifies wins, losses, streak tracking
10. **Keyboard navigation** - Tests physical keyboard input
11. **Mobile responsiveness** - Tests 375×667 viewport

## Test Results

### View Results
```bash
# Show HTML report
npm run test:e2e:report

# View test artifacts
ls -la test-results/

# View screenshots (on failure)
ls -la test-results/*/screenshots/

# View videos (on failure)
ls -la test-results/*/videos/
```

## Troubleshooting

### Services Not Running
**Error**: `page.goto: net::ERR_CONNECTION_REFUSED`

**Solution**: Ensure both hub and web services are running:
```bash
# Check services
curl http://localhost:5173  # Web service
curl http://localhost:3000  # Hub service

# Start services if needed
cd services/hub && npm start &
cd services/web && npm run dev &
```

### Redis Connection Error
**Error**: `Redis connection failed`

**Solution**: Start Redis server:
```bash
redis-server
# Or
docker run -d -p 6379:6379 redis:latest
```

### "Already Played" Error
**Issue**: Tests fail because daily limit is enforced

**Solution**: Tests use unique names with timestamps to avoid this. If issue persists:
```bash
# Clear Redis daily keys
redis-cli KEYS "wordle:daily:played:*" | xargs redis-cli DEL
```

### Timeout Errors
**Issue**: Tests timeout waiting for elements

**Solution**: Increase timeout or check service performance:
```bash
# Run with increased timeout
npm run test:e2e -- wordle.spec.js --timeout=60000

# Check if services are responsive
curl -w "@-" -o /dev/null -s http://localhost:5173
```

### Browser Launch Failures
**Issue**: Browser fails to launch

**Solution**: Install Playwright browsers:
```bash
npx playwright install
npx playwright install-deps
```

## Performance Tips

### Speed Up Test Execution
```bash
# Run single browser only
npm run test:e2e -- wordle.spec.js --project=chromium-desktop

# Disable video recording
npm run test:e2e -- wordle.spec.js --video=off

# Run tests in parallel
npm run test:e2e -- wordle.spec.js --workers=4
```

### Reduce Flakiness
- Tests already include appropriate wait times
- Use `--retries=2` for CI/CD environments
- Ensure services are fully started before running tests
- Check Redis is responding: `redis-cli ping`

## Test Maintenance

### Updating Tests
When Wordle game logic changes:

1. **UI Changes**: Update selectors in test file
2. **API Changes**: Update endpoint URLs and request formats
3. **Game Rules**: Update expected behaviors and assertions
4. **New Features**: Add new test cases following existing patterns

### Adding New Tests
```javascript
test('should test new feature', async ({ page }) => {
  // Set player name
  await page.goto('/');
  await page.evaluate(() => {
    const session = JSON.parse(localStorage.getItem('session') || '{}');
    session.displayName = 'NewFeatureTester' + Date.now();
    localStorage.setItem('session', JSON.stringify(session));
  });

  // Navigate to Wordle daily
  await page.goto('/wordle/daily');
  await page.waitForTimeout(1000);

  // Your test logic here
  // ...

  // Assertions
  expect(result).toBe(expected);
});
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Wordle E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      redis:
        image: redis:latest
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'

      - name: Install dependencies
        run: |
          cd services/hub && npm install
          cd ../web && npm install

      - name: Install Playwright browsers
        run: |
          cd services/web
          npx playwright install --with-deps

      - name: Start Hub service
        run: cd services/hub && npm start &

      - name: Start Web service
        run: cd services/web && npm run dev &

      - name: Wait for services
        run: |
          npx wait-on http://localhost:3000 http://localhost:5173

      - name: Run Wordle E2E tests
        run: |
          cd services/web
          npm run test:e2e -- wordle.spec.js --reporter=json > wordle-results.json

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: wordle-test-results
          path: services/web/wordle-results.json

      - name: Upload test artifacts
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: wordle-test-artifacts
          path: services/web/test-results/
```

## Best Practices

1. **Run tests locally before committing** to catch issues early
2. **Use unique player names** with timestamps to avoid conflicts
3. **Check service health** before running tests
4. **Review test artifacts** (screenshots, videos) on failures
5. **Keep tests independent** - each test should work in isolation
6. **Document test failures** - include screenshots and logs in bug reports
7. **Update tests with code changes** - keep tests in sync with implementation

## Support

For issues or questions:
1. Check test logs in `test-results/`
2. Review screenshots/videos for visual debugging
3. Verify service logs (hub and web)
4. Check Redis data: `redis-cli KEYS "wordle:*"`
5. Review test code for expected behaviors

---

**Last Updated**: 2026-01-25
**Test File**: `tests/e2e/wordle.spec.js`
**Story ID**: FIN-004
