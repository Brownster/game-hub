/**
 * Socket Helper for Playwright Tests
 * Provides utilities for testing socket.io interactions
 */

/**
 * Wait for a socket event to be emitted from the page
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} eventName - Socket event name to wait for
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<any>} Event data
 */
export async function waitForSocketEvent(page, eventName, timeout = 5000) {
  return page.evaluate(
    ({ event, timeoutMs }) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Timeout waiting for socket event: ${event}`));
        }, timeoutMs);

        // Access the socket from window if exposed, or from the module
        const checkSocket = () => {
          if (window.__socket) {
            window.__socket.once(event, (data) => {
              clearTimeout(timer);
              resolve(data);
            });
          } else {
            setTimeout(checkSocket, 100);
          }
        };
        checkSocket();
      });
    },
    { event: eventName, timeoutMs: timeout }
  );
}

/**
 * Emit a socket event from the test page
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} eventName - Socket event name
 * @param {any} data - Event payload
 */
export async function emitSocketEvent(page, eventName, data = {}) {
  return page.evaluate(
    ({ event, payload }) => {
      if (window.__socket) {
        window.__socket.emit(event, payload);
      } else {
        throw new Error('Socket not available on window.__socket');
      }
    },
    { event: eventName, payload: data }
  );
}

/**
 * Wait for socket connection to be established
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {number} timeout - Timeout in milliseconds
 */
export async function waitForSocketConnection(page, timeout = 5000) {
  return page.waitForFunction(
    () => {
      return window.__socket && window.__socket.connected;
    },
    { timeout }
  );
}

/**
 * Get current socket connection status
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<boolean>}
 */
export async function isSocketConnected(page) {
  return page.evaluate(() => {
    return window.__socket?.connected || false;
  });
}

/**
 * Setup socket event listener for testing
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} eventName - Event to listen for
 * @returns {Promise<void>}
 */
export async function setupSocketListener(page, eventName) {
  await page.evaluate((event) => {
    if (!window.__socketEvents) {
      window.__socketEvents = {};
    }
    if (!window.__socketEvents[event]) {
      window.__socketEvents[event] = [];
    }

    if (window.__socket) {
      window.__socket.on(event, (data) => {
        window.__socketEvents[event].push({
          timestamp: Date.now(),
          data
        });
      });
    }
  }, eventName);
}

/**
 * Get all captured socket events of a specific type
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} eventName - Event name to retrieve
 * @returns {Promise<Array>}
 */
export async function getSocketEvents(page, eventName) {
  return page.evaluate((event) => {
    return window.__socketEvents?.[event] || [];
  }, eventName);
}

/**
 * Clear captured socket events
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} eventName - Optional specific event to clear, or all if not provided
 */
export async function clearSocketEvents(page, eventName = null) {
  await page.evaluate((event) => {
    if (event) {
      if (window.__socketEvents?.[event]) {
        window.__socketEvents[event] = [];
      }
    } else {
      window.__socketEvents = {};
    }
  }, eventName);
}
