import { resolve } from "node:path";
import { chromium, expect, test, type BrowserContext } from "@playwright/test";
import { demoCandidate } from "../../shared/demo";
import { classify } from "../../server/service/analysis";

test("keeps a 35-second analysis response available to the extension", async () => {
  test.setTimeout(75_000);
  let context: BrowserContext | undefined;
  try {
    const extension = resolve(".output/chrome-mv3");
    context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      headless: true,
      executablePath: process.env.COMMET_TEST_CHROMIUM,
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    });
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
    const page = await context.newPage();
    await page.goto(`chrome-extension://${new URL(worker.url()).host}/options.html`);
    await page.getByRole("button", { name: "開発用ログイン", exact: true }).click();
    await expect(page.getByRole("button", { name: "ログアウト", exact: true })).toBeEnabled();
    let intercepted = 0;
    await context.route(/http:\/\/127\.0\.0\.1:\d+\/v1\/analyze$/, async (route) => {
      intercepted++;
      await new Promise((resolve) => setTimeout(resolve, 35_000));
      const text = "ありがとうございます。";
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          analysis: classify(demoCandidate(text), text),
          analysisId: null,
          demo: false,
          videoSource: "gemini_video",
        }),
      });
    });
    const started = Date.now();
    await page.getByRole("button", { name: "コメント判定をテスト", exact: true }).click();
    await expect(page.getByLabel("レスポンス", { exact: true })).toContainText(
      '"videoSource": "gemini_video"',
      { timeout: 60_000 },
    );
    expect(intercepted).toBe(1);
    expect(Date.now() - started).toBeGreaterThanOrEqual(35_000);
  } finally {
    await context?.close();
  }
});
