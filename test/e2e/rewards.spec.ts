import { resolve } from "node:path";
import { chromium, expect, test, type BrowserContext } from "@playwright/test";
import { ITEM_CATALOG } from "../../shared/game";

test("coin journeys and comet reveals follow confirmed rewards and spend 10 coins", async () => {
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
    const root = `chrome-extension://${new URL(worker.url()).host}`;
    const options = await context.newPage();
    options.setDefaultTimeout(5000);
    await options.goto(root + "/options.html");
    // Wait until the loading status clears before checking the preview's position.
    await expect(
      options.getByRole("button", { name: "開発用ログイン", exact: true }),
    ).toBeEnabled();
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

    await expect(lab.locator(".commet-gacha-reveal")).toHaveCount(0);
    await expect(options.getByRole("button", { name: "SR以上確定演出を試す" })).toHaveCount(0);
    await expect(options.getByText("銀河もち", { exact: true })).toHaveCount(0);
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
    await expect(panel.locator(".commet-coin-counter")).toHaveAttribute("aria-label", /仮 1 枚/);
    await panel.getByRole("button", { name: "メニューを開く" }).click();
    await panel.getByRole("button", { name: "ガチャ", exact: true }).click();
    const dialog = video.getByRole("dialog", { name: "ほしもちの彗星ガチャ" });
    await expect(dialog).toBeVisible();
    const balanceText = await dialog.locator(".commet-gacha-panel > p").first().textContent();
    const balance = Number(balanceText?.match(/\d+/)?.[0]);
    await dialog.getByRole("button", { name: "10枚でガチャを回す" }).click();
    const result = dialog.locator(".commet-gacha-reveal");
    await expect(result).toHaveAttribute("data-phase", "flight");
    await expect(result.locator(".commet-gacha-item")).toHaveCount(0);
    await expect(dialog.locator(".commet-gacha-panel > p").first()).toContainText(
      String(balance - 10),
    );
    await dialog.getByRole("button", { name: "演出をスキップ" }).click();
    await expect(result).toHaveAttribute("data-phase", "revealed");
    const itemId = await result.getAttribute("data-item");
    expect(itemId).not.toBeNull();
    const item = ITEM_CATALOG[itemId!];
    expect(item).toBeDefined();
    await expect(result.getByRole("status")).toContainText(item.name);
    await expect(result.getByRole("status")).toContainText("新しいアイテムをゲット");
    await video.waitForTimeout(500);
    await expect(dialog.getByRole("button", { name: "10枚でガチャを回す" })).toBeEnabled();
    await dialog.screenshot({ path: test.info().outputPath("gacha-reward.png") });
    await dialog.getByRole("button", { name: "閉じる", exact: true }).click();
    await expect(panel.locator(".commet-wallet")).toContainText(`確定 ${balance - 10}`);
    await options.reload();
    await expect(options.getByLabel("初期キャラ")).toHaveCount(0);
    const collection = options.getByRole("region", { name: "所持アイテム" });
    const slotLabels = {
      skin: "スキン",
      hat: "帽子",
      badge: "バッジ",
      eyes: "目",
      mouth: "口",
      head: "耳・飾り",
      prop: "手持ち",
      pattern: "体の柄",
    };
    await collection.getByRole("button", { name: slotLabels[item.slot], exact: true }).click();
    await collection.getByRole("button", { name: item.name, exact: true }).click();
    await options.getByRole("button", { name: "キャラ設定を保存" }).click();
    await expect(options.getByRole("status")).toHaveText("キャラ設定を保存しました。");
    await options.reload();
    await collection.getByRole("button", { name: slotLabels[item.slot], exact: true }).click();
    await expect(collection.getByRole("button", { name: item.name, exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await options.emulateMedia({ reducedMotion: "reduce" });
    await options.getByRole("button", { name: "10枚でガチャを回す" }).click();
    await expect(options.locator(".commet-gacha-reveal")).toHaveAttribute("data-phase", "revealed");
  } finally {
    await context?.close();
  }
});
