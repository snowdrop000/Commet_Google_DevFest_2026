import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test/e2e",
  testMatch: "**/*.spec.ts",
  workers: 1,
  timeout: 45_000,
  webServer: {
    command: "node --import tsx test/e2e/server.ts",
    url: "http://127.0.0.1:8765/health",
    reuseExistingServer: false,
  },
});
