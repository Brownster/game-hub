#!/bin/bash
# Quick script to run E2E tests with both services

echo "🚀 Starting Hub Service..."
cd ../../hub
npm start &
HUB_PID=$!

# Wait for hub to be ready
echo "⏳ Waiting for hub service to be ready..."
sleep 3

# Check if hub is running
curl -s http://localhost:8081/api/health > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ Hub service ready"
else
  echo "❌ Hub service failed to start"
  kill $HUB_PID 2>/dev/null
  exit 1
fi

# Run the E2E tests
echo "🧪 Running E2E tests..."
cd ../web
npm run test:e2e -- "$@"
TEST_EXIT_CODE=$?

# Cleanup
echo "🧹 Cleaning up..."
kill $HUB_PID 2>/dev/null

exit $TEST_EXIT_CODE
