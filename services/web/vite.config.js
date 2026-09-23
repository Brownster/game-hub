import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.js",
    // tests/ holds Playwright specs, which must not be collected by vitest.
    include: ["src/**/*.{test,spec}.{js,jsx}"],
    exclude: ["node_modules/**", "dist/**", "tests/**"],
  },
});
