import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium, expect, test, type BrowserContext } from "@playwright/test";

test("coin journeys and comet reveals follow confirmed rewards and spend 10 coins", async () => {
  const data = await mkdtemp(join(tmpdir(), "commet-rewards-"));
  let context: BrowserContext | undefined;
  try {
    const extension = resolve(".output/chrome-mv3");
    context = await chromium.launchPersistentContext(data, {
      channel: "chromium",
      headless: true,
      executablePath: process.env.COMMET_TEST_CHROMIUM,
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    });
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
    const root = `chrome-extension://${new URL(worker.url()).host}`;
    const options = await context.newPage();
    options.setDefaultTimeout(5000);
    await options.goto(root + "/options.html");
    const lab = options.getByRole("region", { name: "報酬アニメーションのプレビュー" });
    await lab.getByRole("button", { name: "コイン獲得演出を試す" }).click();
    const journey = lab.locator(".commet-coin-journey");
    await expect(journey).toHaveAttribute("data-phase", "flowing");
    const walkingPet = lab.locator(".commet-lab-stage .commet-pet");
    await expect(walkingPet).toHaveAttribute("data-action", "walk");
    const position = await walkingPet.boundingBox();
    await expect(journey).toHaveAttribute("data-phase", "collected");
    await expect(journey).toHaveCount(0);
    expect(await walkingPet.boundingBox()).toEqual(position);
    await expect(walkingPet).toHaveAttribute("data-action", "walk");

    for (const [label, rare] of [
      ["通常演出（N・R）を試す", "false"],
      ["SR以上確定演出を試す", "true"],
    ]) {
      await lab.getByRole("button", { name: label }).click();
      const reveal = lab.locator(".commet-gacha-reveal");
      await expect(reveal).toHaveAttribute("data-rare", rare);
      await expect(reveal).toHaveAttribute("data-phase", "flight");
      await options.waitForTimeout(1200);
      await reveal.screenshot({ path: test.info().outputPath(`comet-${rare}.png`) });
      await expect(reveal).toHaveAttribute("data-phase", "revealed");
      await expect(reveal.locator(".commet-gacha-item")).toBeVisible();
      await expect(reveal.getByRole("status")).toContainText(rare === "true" ? "SR ·" : "R ·");
    }
    await options.emulateMedia({ reducedMotion: "reduce" });
    await lab.getByRole("button", { name: "通常演出（N・R）を試す" }).click();
    await expect(lab.locator(".commet-gacha-reveal")).toHaveAttribute("data-phase", "revealed");
    await options.getByRole("button", { name: "開発用ログイン" }).click();
    await expect(options.getByRole("button", { name: "ログアウト" })).toBeEnabled();

    await context.route("https://www.youtube.com/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><title>YouTube fixture</title><h1>YouTube</h1><p>Browsing a video</p>",
      }),
    );
    const video = await context.newPage();
    await video.goto("https://www.youtube.com/watch?v=demo1234567");
    const panel = video.getByRole("complementary", { name: "Commet" });
    // The fixture clock advances like the live server. A successful tick starts the journey.
    await expect(video.locator(".commet-coin-journey")).toBeVisible({ timeout: 22_000 });
    await expect(panel.locator(".commet-wallet")).toContainText("仮 1");
    await panel.getByRole("button", { name: "ガチャ", exact: true }).click();
    const dialog = video.getByRole("dialog", { name: "ほしもちの彗星ガチャ" });
    await expect(dialog).toBeVisible();
    const balanceText = await dialog.locator(".commet-gacha-panel > p").first().textContent();
    const balance = Number(balanceText?.match(/\d+/)?.[0]);
    await dialog.getByRole("button", { name: "10枚でガチャを回す" }).click();
    const result = dialog.locator(".commet-gacha-reveal");
    await expect(result).toHaveAttribute("data-phase", "flight");
    await expect(dialog.locator(".commet-gacha-panel > p").first()).toContainText(
      String(balance - 10),
    );
    await dialog.getByRole("button", { name: "演出をスキップ" }).click();
    await expect(result).toHaveAttribute("data-phase", "revealed");
    await video.waitForTimeout(500);
    await expect(dialog.getByRole("button", { name: "10枚でガチャを回す" })).toBeEnabled();
    await dialog.screenshot({ path: test.info().outputPath("gacha-reward.png") });
    await dialog.getByRole("button", { name: "閉じる", exact: true }).click();
    await expect(panel.locator(".commet-wallet")).toContainText(`確定 ${balance - 10}`);
  } finally {
    await context?.close();
    await rm(data, { recursive: true, force: true });
  }
});
