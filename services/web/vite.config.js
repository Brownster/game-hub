import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// In production nginx serves the client and the hub from one origin. The dev
// server needs the same shape or every /api call and socket connection goes to
// Vite instead of the hub, which is why `npm run dev` alone could not reach a
// running game. Override with HUB_URL when the hub is on a non-default port.
const HUB_URL = process.env.HUB_URL || "http://127.0.0.1:8081";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: HUB_URL, changeOrigin: true },
      "/socket.io": { target: HUB_URL, changeOrigin: true, ws: true },
      "/slither": { target: HUB_URL, changeOrigin: true, ws: true },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.js",
    // tests/ holds Playwright specs, which must not be collected by vitest.
    include: ["src/**/*.{test,spec}.{js,jsx}"],
    exclude: ["node_modules/**", "dist/**", "tests/**"],
  },
});
