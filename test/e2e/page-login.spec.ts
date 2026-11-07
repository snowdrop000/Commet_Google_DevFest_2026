import { resolve } from "node:path";
import { chromium, expect, test, type BrowserContext } from "@playwright/test";

for (const platform of ["youtube", "x"] as const) {
  test(`${platform}: login stays on the SNS page and keeps the draft`, async () => {
    let context: BrowserContext | undefined;
    try {
      const extension = resolve(".output/chrome-mv3");
      context = await chromium.launchPersistentContext("", {
        channel: "chromium",
        headless: true,
        executablePath: process.env.COMMET_TEST_CHROMIUM,
        args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
      });
      const host = platform === "youtube" ? "www.youtube.com" : "x.com";
      const composer =
        platform === "youtube"
          ? '<ytd-comment-simplebox-renderer><div id="contenteditable-root" contenteditable="true" role="textbox" aria-label="下書き"></div></ytd-comment-simplebox-renderer>'
          : '<form><div data-testid="tweetTextarea_0"><div contenteditable="true" role="textbox" aria-label="下書き"></div></div><button data-testid="tweetButtonInline" type="button">ポストする</button></form>';
      await context.route(`https://${host}/**`, (route) =>
        route.fulfill({
          contentType: "text/html",
          body:
            '<!doctype html><meta charset="utf-8"><main style="margin:80px">' +
            composer +
            "</main>",
        }),
      );
      const page = await context.newPage();
      page.setDefaultTimeout(8000);
      const url =
        `https://${host}/` + (platform === "youtube" ? "watch?v=demo1234567" : "commet-fixture");
      await page.goto(url);
      await page.getByRole("textbox", { name: "下書き" }).fill("まだ送信していない文章です。");
      const tabs = context.pages().length;
      const panel = page.getByRole("complementary", { name: "Commet" });
      await panel.getByRole("button", { name: "メニューを開く" }).click();
      await panel.getByRole("button", { name: "育成状況", exact: true }).click();
      await panel.getByRole("button", { name: "設定・ログイン", exact: true }).click();
      const settings = page.getByRole("dialog", { name: "ほしもちの設定・ログイン" });
      await settings.getByRole("button", { name: "開発用ログイン", exact: true }).click();
      await expect(settings.getByRole("button", { name: "ログアウト", exact: true })).toBeEnabled();
      expect(context.pages().length).toBe(tabs);
      await expect(page).toHaveURL(url);
      await expect(page.getByRole("textbox", { name: "下書き" })).toHaveText(
        "まだ送信していない文章です。",
      );
      expect((await settings.boundingBox())!.width).toBeLessThanOrEqual(420);
      await settings.screenshot({ path: test.info().outputPath("page-settings.png") });
      await page.setViewportSize({ width: 390, height: 600 });
      expect((await settings.boundingBox())!.width).toBeLessThanOrEqual(366);
      expect((await settings.boundingBox())!.height).toBeLessThanOrEqual(568);
      await settings.screenshot({ path: test.info().outputPath("page-settings-narrow.png") });
      await page.setViewportSize({ width: 1280, height: 720 });
      await settings.getByRole("button", { name: "閉じる", exact: true }).click();
      await panel.getByRole("button", { name: "着せ替え", exact: true }).click();
      const wardrobe = page.getByRole("dialog", { name: "ほしもちの着せ替え" });
      await expect(wardrobe.getByLabel("初期キャラ")).toHaveCount(0);
      await expect(wardrobe.locator(".commet-lab-stage .commet-pet--star")).toBeVisible();
      await wardrobe.getByRole("button", { name: "閉じる", exact: true }).click();
      await panel.getByRole("button", { name: "ガチャ", exact: true }).click();
      const gacha = page.getByRole("dialog", { name: "ほしもちの彗星ガチャ" });
      const offers = gacha.locator(".commet-exchange-item");
      await expect(offers).toHaveCount(6);
      const skinId = await offers.first().getAttribute("data-item");
      await expect(offers.first().locator(".commet-pet--star")).toHaveAttribute(
        "data-skin",
        skinId!,
      );
      await gacha.getByRole("button", { name: "閉じる", exact: true }).click();
      await panel.getByRole("button", { name: "設定", exact: true }).click();
      await settings.getByRole("button", { name: "ログアウト", exact: true }).click();
      await expect(
        settings.getByRole("button", { name: "開発用ログイン", exact: true }),
      ).toBeEnabled();
      expect(context.pages().length).toBe(tabs);
      await expect(page).toHaveURL(url);
    } finally {
      await context?.close();
    }
  });
}
