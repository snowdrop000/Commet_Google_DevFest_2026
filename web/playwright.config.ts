import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

const remote = process.env.COMMET_WEB_TEST_URL;
export default defineConfig({
  testDir: "../test/web",
  outputDir: "../.commet/web-e2e",
  workers: 1,
  timeout: 45_000,
  use: {
    baseURL: remote || "http://127.0.0.1:8888",
    viewport: { width: 1440, height: 1000 },
    launchOptions: { executablePath: process.env.COMMET_TEST_CHROMIUM },
  },
  webServer: remote
    ? undefined
    : {
        command: "node --import tsx web/preview.ts",
        cwd: fileURLToPath(new URL("../", import.meta.url)),
        url: "http://127.0.0.1:8888/",
        reuseExistingServer: false,
      },
});
