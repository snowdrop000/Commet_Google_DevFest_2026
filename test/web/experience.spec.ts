import { test, expect } from "@playwright/test";

test("short viewports retain the character profile and keep menu actions accessible", async ({
  page,
}) => {
  for (const sns of ["youtube", "x"]) {
    await page.setViewportSize({ width: 1280, height: 520 });
    await page.goto(`/?sns=${sns}`);
    const host = page.locator("commet-pet[data-web-extension=true]");
    await host.getByRole("button", { name: "メニューを開く", exact: true }).click();
    const menu = host.locator(".commet-menu");
    const profile = menu.locator(".commet-menu-profile");
    await expect(profile).toBeVisible();
    await expect(profile.getByRole("heading", { name: "ほしもち", exact: true })).toBeVisible();
    await expect(profile.locator(".commet-menu-avatar .commet-pet")).toBeVisible();
    await expect(profile).toBeInViewport({ ratio: 1 });
    await expect(profile).toContainText("Lv. 1");
    await page.setViewportSize({ width: 390, height: 420 });
    await expect(profile).toBeVisible();
    await expect(profile).toBeInViewport({ ratio: 1 });
    await expect(async () => {
      const box = await menu.boundingBox();
      const pet = await host.locator(".commet-drag").boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);
      expect(box!.y + box!.height).toBeLessThanOrEqual(pet!.y);
    }).toPass();
    await page.screenshot({ path: `.commet/web-${sns}-short-menu.png`, animations: "disabled" });
    await menu.getByRole("button", { name: "着せ替え", exact: true }).click();
    const wardrobe = host.getByRole("dialog", { name: "ほしもちの着せ替え" });
    await expect(wardrobe).toBeVisible();
    await wardrobe.getByRole("button", { name: "閉じる", exact: false }).click();
    await menu.getByRole("button", { name: "設定", exact: true }).click();
    await expect(host.getByRole("dialog", { name: "ほしもちの設定・ログイン" })).toBeVisible();
  }
});

test("opening the menu near the top leaves the companion in place and uses the space below", async ({
  page,
}) => {
  await page.goto("/?sns=x");
  const host = page.locator("commet-pet[data-web-extension=true]");
  const handle = host.locator(".commet-drag");
  const box = await handle.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(100, 95, { steps: 8 });
  await page.mouse.up();
  const card = host.locator(".commet-card");
  await expect(async () => {
    expect((await card.boundingBox())!.y).toBeLessThan(100);
  }).toPass();
  await card.evaluate(async (node) => {
    await Promise.all(node.getAnimations().map((animation) => animation.finished.catch(() => {})));
  });
  const before = (await card.boundingBox())!;
  await host.getByRole("button", { name: "メニューを開く", exact: true }).click();
  const menu = host.locator(".commet-menu");
  await expect(menu).toHaveAttribute("data-placement", "below");
  await expect(async () => {
    const after = (await card.boundingBox())!,
      popup = (await menu.boundingBox())!;
    expect(Math.abs(after.x - before.x)).toBeLessThan(1);
    expect(Math.abs(after.y - before.y)).toBeLessThan(1);
    expect(popup.y).toBeGreaterThanOrEqual(after.y + after.height);
    expect(popup.y + popup.height).toBeLessThanOrEqual(1000);
  }).toPass();
  await page.screenshot({ path: ".commet/web-menu-without-warp.png", animations: "disabled" });
});

test("the real extension checks and settles a YouTube demo post, saves equipment and opens gacha", async ({
  page,
}) => {
  const errors: string[] = [],
    apiRequests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/v1/")) apiRequests.push(request.url());
  });
  await page.goto("/");
  const host = page.locator("commet-pet[data-web-extension=true]");
  const pet = host.locator(".commet-drag .commet-pet");
  const editor = page.getByRole("textbox", { name: "コメント", exact: true });
  await page.getByRole("button", { name: "コメント欄へ", exact: true }).click();
  await editor.fill("参考になりました。ありがとうございます！");
  await expect(pet).toHaveAttribute("data-action", "peek");
  await page.screenshot({ path: ".commet/web-youtube-reading.png", animations: "disabled" });
  await host.getByRole("button", { name: "キャラにコメントをチェックしてもらう" }).click();
  await expect(host.locator(".commet-speech")).toContainText("あったかいことば");
  await host.getByRole("button", { name: "メニューを開く", exact: true }).click();
  await expect(host.getByRole("region", { name: "判定と例文" })).toContainText(
    "思いやりのある投稿（デモ）",
  );
  await host.getByRole("button", { name: "育成状況", exact: true }).click();
  await expect(host.getByRole("region", { name: "育成記録" })).toContainText("0 投稿");
  await host.getByRole("button", { name: "メニューを閉じる", exact: true }).first().click();
  await page.getByRole("button", { name: "コメント", exact: true }).click();
  await expect(page.locator("ytd-comment-renderer #content-text")).toHaveText(
    "参考になりました。ありがとうございます！",
  );
  await host.getByRole("button", { name: "メニューを開く", exact: true }).click();
  await host.getByRole("button", { name: "育成状況", exact: true }).click();
  await expect(host.getByRole("region", { name: "育成記録" })).toContainText("1 投稿");
  await expect(host.locator(".commet-menu-profile")).toContainText("Lv. 2");
  await host.getByRole("button", { name: "着せ替え", exact: true }).click();
  const wardrobe = host.getByRole("dialog", { name: "ほしもちの着せ替え" });
  await expect(wardrobe).toBeVisible();
  await wardrobe.getByLabel("なまえ", { exact: false }).fill("テストもち");
  await wardrobe.getByRole("button", { name: "着せ替えを保存", exact: true }).click();
  await expect(wardrobe).toHaveCount(0);
  await page.reload();
  await host.getByRole("button", { name: "メニューを開く", exact: true }).click();
  await expect(host.locator(".commet-menu-profile")).toContainText("テストもち");
  await host.getByRole("button", { name: "ガチャ", exact: true }).click();
  const gacha = host.getByRole("dialog", { name: "ほしもちの彗星ガチャ" });
  await expect(gacha).toBeVisible();
  await gacha.getByRole("button", { name: "10枚でガチャを回す", exact: true }).click();
  const skip = gacha.getByRole("button", { name: "演出をスキップ" });
  if (await skip.isVisible()) await skip.click();
  await expect(gacha.locator(".commet-gacha-reveal")).toHaveAttribute("data-phase", "revealed");
  await gacha.locator(".commet-exchange-item button").first().click();
  if (await skip.isVisible()) await skip.click();
  await expect(gacha.locator(".commet-exchange-item")).toHaveCount(6);
  await page.screenshot({ path: ".commet/web-youtube-gacha.png" });
  expect(apiRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test("the mobile X page uses the real composer, invalidates edits and grows only after sending", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?sns=x");
  const host = page.locator("commet-pet[data-web-extension=true]");
  const editor = page.getByRole("textbox", { name: "返信", exact: true });
  await editor.fill("お前は無能。もう動画を出すな。");
  await host.getByRole("button", { name: "キャラにコメントをチェックしてもらう" }).click();
  await expect(host.locator(".commet-drag .commet-pet")).toHaveAttribute("data-mood", "cry");
  await host.getByRole("button", { name: "メニューを開く", exact: true }).click();
  await expect(host.getByRole("region", { name: "判定と例文" })).toContainText(
    "だれかを傷つける表現",
  );
  await editor.fill("役に立ちました。ありがとうございます！");
  await expect(editor).toHaveText("役に立ちました。ありがとうございます！");
  await expect(host.locator(".commet-result")).toHaveCount(0);
  if (await host.locator(".commet-menu").isVisible())
    await host.getByRole("button", { name: "メニューを閉じる", exact: true }).first().click();
  await page.getByRole("button", { name: "返信する", exact: true }).click();
  await expect(page.getByTestId("toast")).toContainText("ポストが送信されました");
  await host.getByRole("button", { name: "メニューを開く", exact: true }).click();
  await host.getByRole("button", { name: "育成状況", exact: true }).click();
  await expect(host.getByRole("region", { name: "育成記録" })).toContainText("1 投稿");
  const menu = host.locator(".commet-menu");
  const menuBounds = await menu.boundingBox();
  const petBounds = await host.locator(".commet-drag").boundingBox();
  expect(menuBounds!.x).toBeGreaterThanOrEqual(0);
  expect(menuBounds!.x + menuBounds!.width).toBeLessThanOrEqual(391);
  expect(
    menuBounds!.y + menuBounds!.height <= petBounds!.y ||
      menuBounds!.y >= petBounds!.y + petBounds!.height ||
      menuBounds!.x + menuBounds!.width <= petBounds!.x ||
      menuBounds!.x >= petBounds!.x + petBounds!.width,
  ).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: ".commet/web-x-mobile.png", animations: "disabled" });
});
