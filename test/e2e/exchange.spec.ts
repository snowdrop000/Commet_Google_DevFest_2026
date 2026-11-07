import { resolve } from "node:path";
import { chromium, expect, test, type BrowserContext } from "@playwright/test";
import { ITEM_CATALOG } from "../../shared/game";
import { displayRarity, exchangeSlots, gachaOnlyItems, shardCosts } from "../../shared/gacha";

test("shows daily previews, exchanges the chosen item and recovers the exact result without spending twice", async () => {
  let context: BrowserContext | undefined;
  try {
    const extension = resolve(".output/chrome-mv3");
    context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      headless: true,
      executablePath: process.env.COMMET_TEST_CHROMIUM,
      args: ["--disable-extensions-except=" + extension, "--load-extension=" + extension],
    });
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
    const root = "chrome-extension://" + new URL(worker.url()).host;
    const options = await context.newPage();
    options.setDefaultTimeout(5000);
    await options.goto(root + "/options.html");
    await options.getByRole("button", { name: "開発用ログイン" }).click();
    const shop = options.getByRole("region", { name: "かけら交換" });
    const cards = shop.locator(".commet-exchange-item");
    await expect(cards).toHaveCount(6);
    const items = await cards.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-item")!),
    );
    const id = items[0];
    const item = ITEM_CATALOG[id];
    expect(item.slot).toBe("skin");
    const rarity = displayRarity[id] ?? "N";
    const remaining =
      Object.values(shardCosts).reduce((sum, cost) => sum + cost, 0) - shardCosts[rarity];
    for (const exclusive of gachaOnlyItems)
      await expect(shop.getByText(ITEM_CATALOG[exclusive].name, { exact: true })).toHaveCount(0);
    await expect(cards.first().locator(".commet-exchange-art .commet-pet")).toBeVisible();
    await expect(
      cards.first().getByRole("heading", { name: item.name, exact: true }),
    ).toBeVisible();
    await shop.screenshot({
      path: test.info().outputPath("daily-exchange.png"),
      animations: "disabled",
    });
    await options.setViewportSize({ width: 390, height: 720 });
    expect((await shop.boundingBox())!.width).toBeLessThanOrEqual(390);
    await shop.screenshot({
      path: test.info().outputPath("daily-exchange-narrow.png"),
      animations: "disabled",
    });
    await options.setViewportSize({ width: 1280, height: 720 });
    await options.reload();
    await expect(cards).toHaveCount(6);
    expect(
      await cards.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("data-item")),
      ),
    ).toEqual(items);
    const coins = await options.locator(".commet-gacha-panel > p").first().textContent();
    await shop.getByRole("button", { name: item.name + "と交換", exact: true }).click();
    await expect(shop.locator(".commet-gacha-reveal")).toHaveAttribute("data-phase", "flight");
    // Reopening before acknowledgement must recover the same item without another charge.
    await options.reload();
    await expect(shop.getByRole("button", { name: "交換結果を確認", exact: true })).toBeEnabled();
    await shop.getByRole("button", { name: "交換結果を確認", exact: true }).click();
    await shop.getByRole("button", { name: "演出をスキップ" }).click();
    const result = shop.locator(".commet-gacha-reveal");
    await expect(result).toHaveAttribute("data-phase", "revealed");
    await expect(result).toHaveAttribute("data-item", id);
    await expect(result.getByRole("status")).toContainText(item.name);
    await expect(shop.getByRole("button", { name: item.name + "と交換", exact: true })).toHaveCount(
      0,
    );
    await expect(cards).toHaveCount(6);
    const balance = shop.getByLabel("所持かけら").locator("b");
    await expect(balance).toHaveText(String(remaining));
    await expect(options.locator(".commet-gacha-panel > p").first()).toHaveText(coins!);
    await expect(options.getByLabel("初期キャラ")).toHaveCount(0);
    const collection = options.getByRole("region", { name: "所持アイテム" });
    await collection.getByRole("button", { name: exchangeSlots[item.slot], exact: true }).click();
    await collection.getByRole("button", { name: item.name, exact: true }).click();
    await options.getByRole("button", { name: "キャラ設定を保存" }).click();
    await expect(
      options.getByRole("status").filter({ hasText: "キャラ設定を保存しました。" }),
    ).toBeVisible();
    await options.reload();
    await collection.getByRole("button", { name: exchangeSlots[item.slot], exact: true }).click();
    await expect(collection.getByRole("button", { name: item.name, exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(shop.getByLabel("所持かけら").locator("b")).toHaveText(String(remaining));
    await expect(cards).toHaveCount(6);
    await expect(shop.locator(`article[data-item="${id}"]`)).toHaveCount(0);
    await expect(shop.getByRole("button", { name: "交換結果を確認", exact: true })).toHaveCount(0);
  } finally {
    await context?.close();
  }
});
