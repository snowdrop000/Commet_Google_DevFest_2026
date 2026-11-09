import { resolve } from "node:path";
import { chromium, expect, test, type BrowserContext } from "@playwright/test";

const fixture = `<!doctype html><html lang="ja"><meta charset="utf-8">
<body style="margin:80px"><form><div data-testid="tweetTextarea_0">
<div role="textbox" contenteditable="true" aria-label="投稿内容" style="width:330px;min-height:60px;border:1px solid">頭が悪い。動画を出すな。</div>
</div><button type="button" data-testid="tweetButtonInline">ポストする</button></form>
<script>
document.querySelector('button').onclick = () => {
  document.querySelector('[contenteditable]').textContent = '';
  const toast = document.createElement('div');
  toast.dataset.testid = 'toast';
  toast.textContent = 'ポストが送信されました';
  document.body.append(toast);
};
</script></body></html>`;

test("ログイン後にShadow DOMで判定・改善案を表示し、投稿を育成へ反映する", async () => {
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
    const extensionId = new URL(worker.url()).host;
    await context.route("https://www.youtube.com/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<!doctype html><meta charset="utf-8"><title>YouTube fixture</title><main><h1>YouTube</h1><ytd-comment-simplebox-renderer style="display:block;width:330px;margin:80px"><div id="contenteditable-root" contenteditable="true" role="textbox" aria-label="コメント" style="min-height:60px"></div></ytd-comment-simplebox-renderer></main>',
      }),
    );
    const youtube = await context.newPage();
    youtube.setDefaultTimeout(5000);
    const videoUrl = "https://www.youtube.com/watch?v=demo1234567";
    await youtube.goto(videoUrl);
    const youtubePanel = youtube.getByRole("complementary", { name: "Commet" });
    const youtubePet = youtube.locator("commet-pet").locator(".commet-drag .commet-pet");
    const openWardrobe = youtubePanel.getByRole("button", { name: "着せ替え", exact: true });
    const youtubeWardrobe = youtube.getByRole("dialog", { name: "ほしもちの着せ替え" });
    await expect(youtubePet).toHaveAttribute("aria-label", "ほしもち");
    await expect(youtubePet).toHaveAttribute("data-action", "walk");
    const menuToggle = youtubePanel.getByRole("button", { name: "メニューを開く" });
    await expect(openWardrobe).toBeHidden();
    await expect(youtubePanel.locator(".commet-coin-counter")).toHaveAttribute(
      "aria-label",
      "探索コイン 使えるコイン 0 枚、確定前 0 枚",
    );
    expect((await youtubePanel.boundingBox())?.width).toBeLessThan(190);
    await youtubePanel.screenshot({ path: test.info().outputPath("companion-compact.png") });
    await menuToggle.click();
    const companionMenu = youtubePanel.getByRole("dialog", { name: "ほしもちのメニュー" });
    await expect(companionMenu).toBeVisible();
    await expect(async () => {
      const menuBounds = await companionMenu.boundingBox();
      const characterBounds = await youtubePanel.locator(".commet-companion").boundingBox();
      expect(menuBounds!.y + menuBounds!.height).toBeLessThanOrEqual(characterBounds!.y - 8);
    }).toPass();
    await companionMenu.screenshot({ path: test.info().outputPath("companion-menu.png") });
    await youtube.setViewportSize({ width: 390, height: 420 });
    await expect(async () => {
      const box = await companionMenu.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);
      expect(box!.y + box!.height).toBeLessThanOrEqual(420);
    }).toPass();
    await companionMenu.screenshot({ path: test.info().outputPath("companion-menu-narrow.png") });
    await youtube.setViewportSize({ width: 1280, height: 720 });
    await youtube.keyboard.press("Escape");
    await expect(companionMenu).toBeHidden();
    await expect(menuToggle).toBeFocused();
    await menuToggle.click();
    await youtube.getByRole("heading", { name: "YouTube", exact: true }).click();
    await expect(companionMenu).toBeHidden();
    await menuToggle.click();
    await openWardrobe.click();
    await expect(youtubeWardrobe).toContainText("保存するには、Commetへのログインが必要です");
    await expect(
      youtubeWardrobe.getByRole("button", { name: "Commetのログイン画面を開く" }),
    ).toBeVisible();
    const loginDialog = youtube.getByRole("dialog", { name: "ほしもちの設定・ログイン" });
    const guestPages = context.pages().length;
    await youtubeWardrobe.getByRole("button", { name: "Commetのログイン画面を開く" }).click();
    await expect(loginDialog).toBeVisible();
    await expect(
      loginDialog.getByRole("button", { name: "開発用ログイン", exact: true }),
    ).toBeEnabled();
    expect(context.pages().length).toBe(guestPages);
    await expect(youtube).toHaveURL(videoUrl);
    await loginDialog.getByRole("button", { name: "閉じる", exact: true }).click();
    await openWardrobe.click();
    await expect(
      youtubeWardrobe.getByRole("button", { name: "銀河もち", exact: true }),
    ).toHaveCount(0);
    await youtubeWardrobe.getByRole("button", { name: "オリジナルカラー", exact: true }).click();
    await youtube.keyboard.press("Escape");
    await expect(youtubeWardrobe).toBeHidden();
    await expect(openWardrobe).toBeFocused();
    await expect(youtubePet).toHaveAttribute("data-skin", "skin_base");
    await youtube.keyboard.press("Escape");
    await youtube.getByLabel("コメント", { exact: true }).fill("この動画、わかりやすい！");
    await expect(youtubePet).toHaveAttribute("data-action", "peek");
    await expect(youtubePet).toHaveAttribute("data-direction", "left");
    await expect(youtubePet.locator('[data-layer="reading-gaze"]')).toBeVisible();
    const commentBox = await youtube.getByLabel("コメント", { exact: true }).boundingBox();
    const readerBox = await youtubePanel.boundingBox();
    const eyesBox = await youtubePet.locator('[data-layer="reading-gaze"]').boundingBox();
    expect(readerBox!.x - (commentBox!.x + commentBox!.width)).toBeGreaterThanOrEqual(0);
    expect(readerBox!.x - (commentBox!.x + commentBox!.width)).toBeLessThanOrEqual(12);
    const eyeLine = eyesBox!.y + eyesBox!.height / 2;
    expect(eyeLine).toBeGreaterThan(commentBox!.y - 8);
    expect(eyeLine).toBeLessThan(commentBox!.y + commentBox!.height + 8);
    await youtubePanel
      .getByRole("button", { name: "キャラにコメントをチェックしてもらう" })
      .click();
    await expect(companionMenu).toContainText(
      "ログインすると、キャラをクリックしてコメントをチェックできます。",
    );
    await youtube.keyboard.press("Escape");
    await youtube.getByLabel("コメント", { exact: true }).focus();
    await expect(youtubePet).toHaveAttribute("data-action", "peek");
    await youtubePet.evaluate((pet) => {
      const actions = [pet.getAttribute("data-action")];
      pet.setAttribute("data-reading-history", actions.join(","));
      const observer = new MutationObserver(() => {
        const action = pet.getAttribute("data-action");
        if (actions.at(-1) !== action) actions.push(action);
        pet.setAttribute("data-reading-history", actions.join(","));
      });
      observer.observe(pet, { attributes: true, attributeFilter: ["data-action"] });
      pet.addEventListener("commet-stop-reading-test", () => observer.disconnect(), { once: true });
    });
    await youtube.keyboard.press("End");
    await youtube.keyboard.press("Enter");
    await youtube.keyboard.insertText("続きの感想を書いています。");
    await youtube.getByLabel("コメント", { exact: true }).evaluate((node) => {
      node.style.minHeight = "120px";
      node.style.transform = "translateY(12px)";
      node.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
    await youtube
      .getByLabel("コメント", { exact: true })
      .pressSequentially(" Still writing.", { delay: 25 });
    await youtube.getByLabel("コメント", { exact: true }).evaluate((node) => {
      const replacement = node.cloneNode(true) as HTMLElement;
      node.replaceWith(replacement);
      replacement.focus();
      replacement.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
    await expect(youtubePet).toHaveAttribute("data-action", "peek");
    await expect(youtubePet).toHaveAttribute("data-reading-history", "peek");
    await youtubePanel.screenshot({ path: test.info().outputPath("companion-reading.png") });
    await youtube.getByLabel("コメント", { exact: true }).fill("");
    await expect(youtubePet).toHaveAttribute("data-action", "peek");
    await expect(youtubePet).toHaveAttribute("data-reading-history", "peek");
    await youtubePet.evaluate((pet) => pet.dispatchEvent(new Event("commet-stop-reading-test")));
    await youtube.getByRole("heading", { name: "YouTube", exact: true }).click();
    await expect(youtubePet).toHaveAttribute("data-action", "walk");
    await menuToggle.click();

    await youtubePanel.getByRole("button", { name: "育成状況", exact: true }).click();
    const levelRewards = youtubePanel.getByRole("region", { name: "レベル報酬", exact: true });
    await expect(levelRewards).toContainText("あと 10 XP");
    await expect(levelRewards).toContainText("はじまりのほし");
    await levelRewards.getByText("レベル報酬を見る", { exact: true }).click();
    await expect(levelRewards.getByText("スキン解放", { exact: true })).toHaveCount(4);
    await expect(levelRewards).not.toContainText("ひだまりもち");
    await expect(levelRewards).not.toContainText("月あかりもち");
    await levelRewards.getByText("レベル報酬を見る", { exact: true }).click();
    await youtubePanel.getByRole("button", { name: "設定・ログイン", exact: true }).click();
    await expect(loginDialog).toBeVisible();
    expect(context.pages().length).toBe(guestPages);
    await expect(youtube).toHaveURL(videoUrl);
    await loginDialog.getByRole("button", { name: "閉じる", exact: true }).click();
    const options = await context.newPage();
    options.setDefaultTimeout(5000);
    await options.goto(`chrome-extension://${extensionId}/options.html`);
    await expect(
      options.getByRole("button", { name: "開発用ログイン", exact: true }),
    ).toBeEnabled();
    const lab = options.getByRole("region", { name: "ほしもちの試着" });
    const sample = lab.locator(".commet-lab-stage .commet-pet--star");
    const trial = lab.getByRole("region", { name: "試着アイテム" });
    async function tryOn(category: string, item: string) {
      await trial.getByRole("button", { name: category, exact: true }).click();
      const card = trial.getByRole("button", { name: item, exact: true });
      await card.click();
      await expect(card).toHaveAttribute("aria-pressed", "true");
    }
    async function expectBalancedEyes() {
      const eyes = await sample.locator("[data-eye]").evaluateAll((nodes) =>
        nodes.map((node) => {
          const box = node.getBoundingClientRect();
          return {
            width: box.width,
            height: box.height,
            x: box.x + box.width / 2,
            y: box.y + box.height / 2,
          };
        }),
      );
      expect(eyes).toHaveLength(2);
      expect(Math.abs(eyes[0].width - eyes[1].width)).toBeLessThan(0.1);
      expect(Math.abs(eyes[0].height - eyes[1].height)).toBeLessThan(0.1);
      const tilt = Math.atan(Math.abs((eyes[1].y - eyes[0].y) / (eyes[1].x - eyes[0].x)));
      expect((tilt * 180) / Math.PI).toBeLessThan(5);
    }
    await expect(trial.getByRole("group", { name: "UR ウルトラレア" })).toHaveCount(0);
    await expect(trial.getByRole("button", { name: "銀河もち", exact: true })).toHaveCount(0);
    await expect(trial.getByRole("button", { name: "ミントもち", exact: true })).toHaveCount(0);
    await expect(options.getByRole("button", { name: "SR以上確定演出を試す" })).toHaveCount(0);
    await sample.locator("svg image").first().waitFor({ state: "attached" });
    await expect(sample.locator("[data-layer=cheeks]")).toHaveAttribute("opacity", ".56");
    await options.evaluate(async () => {
      const art = document.querySelector(".commet-lab-stage svg image");
      const img = new Image();
      img.src = art?.getAttribute("href") ?? "";
      await img.decode();
    });
    await sample.screenshot({ path: test.info().outputPath("wardrobe-basic.png") });
    await tryOn("スキン", "オリジナルカラー");
    await tryOn("帽子", "帽子なし");
    await expect(trial.getByRole("button", { name: "すみれベレー", exact: true })).toHaveCount(0);
    await tryOn("目", "まるい目");
    await expect(trial.getByRole("button", { name: "うるうる目", exact: true })).toHaveCount(0);
    await tryOn("口", "ちいさなW口");
    await expect(trial.getByRole("button", { name: "にっこり口", exact: true })).toHaveCount(0);
    await tryOn("耳・飾り", "飾りなし");
    await expect(sample.locator("[data-layer=head]")).toHaveCount(0);
    await tryOn("耳・飾り", "金の星飾り");
    await tryOn("体の柄", "柄なし");
    await lab.getByRole("button", { name: "歩く", exact: true }).click();
    await expect(sample).toHaveAttribute("data-action", "walk");
    await expect(sample.locator(".commet-thought")).toHaveCount(0);
    const first = await sample.getAttribute("data-frame");
    await expect.poll(() => sample.getAttribute("data-frame")).not.toBe(first);
    await lab.getByRole("button", { name: "向きを反転" }).click();
    await expect(sample).toHaveAttribute("data-direction", "left");
    await expectBalancedEyes();
    await expect(sample.locator("[data-layer=hat]")).toHaveCount(0);
    await expect(sample.locator("[data-layer=eyes]")).toHaveAttribute("data-part", "eyes_default");
    await expect(sample.locator("[data-layer=cheeks] ellipse")).toHaveCount(2);
    await expect(sample.locator("[data-layer=mouth]")).toHaveAttribute(
      "data-part",
      "mouth_default",
    );
    await expect(sample.locator("[data-layer=head]")).toHaveAttribute("data-part", "head_gold");
    await expect(sample.locator("[data-layer=pattern]")).toHaveCount(0);
    await lab.getByRole("button", { name: "読む", exact: true }).click();
    const gaze = sample.locator('[data-layer="reading-gaze"]');
    await expect(gaze).toBeVisible();
    const firstGaze = await gaze.evaluate((node) => getComputedStyle(node).transform);
    await expect
      .poll(() => gaze.evaluate((node) => getComputedStyle(node).transform))
      .not.toBe(firstGaze);
    await expectBalancedEyes();
    await sample.screenshot({ path: test.info().outputPath("reading-face-left.png") });
    const thought = sample.locator(".commet-thought");
    const thinkingMouth = sample.locator(".commet-thinking-mouth");
    const thinkingCheeks = sample.locator(".commet-thinking-cheeks");
    async function thoughtPhase(fraction: number) {
      await sample.evaluate((node, fraction) => {
        const animations = node
          .getAnimations({ subtree: true })
          .filter(
            (animation) =>
              animation instanceof CSSAnimation &&
              animation.animationName.startsWith("commet-thinking-") &&
              animation.animationName !== "commet-thinking-dot",
          );
        if (animations.length < 3) throw new Error("Missing thought or face animation");
        for (const animation of animations) {
          const duration = animation.effect?.getComputedTiming().duration;
          if (typeof duration !== "number") throw new Error("Missing animation duration");
          animation.pause();
          animation.currentTime = duration * fraction;
        }
      }, fraction);
    }
    await thoughtPhase(0);
    await expect(thought).toHaveCSS("opacity", "0");
    const neutralMouth = await thinkingMouth.evaluate((node) =>
      getComputedStyle(node).getPropertyValue("d"),
    );
    const neutralCheeks = await thinkingCheeks.evaluate((node) => getComputedStyle(node).transform);
    await thoughtPhase(0.35);
    await expect(thought).toHaveCSS("opacity", "1");
    await expect(thinkingCheeks).toHaveCSS("opacity", "0.56");
    await expect(thinkingCheeks).toHaveCSS("transform", neutralCheeks);
    await expect(thinkingMouth).toHaveCSS("d", neutralMouth);
    let thoughtBox = await thought.boundingBox();
    let petBox = await sample.boundingBox();
    expect(thoughtBox!.x).toBeGreaterThan(petBox!.x + petBox!.width / 2);
    await sample.screenshot({ path: test.info().outputPath("reading-thought-left.png") });
    await lab.getByRole("button", { name: "向きを反転" }).click();
    await expect(sample).toHaveAttribute("data-direction", "right");
    await expectBalancedEyes();
    await sample.screenshot({ path: test.info().outputPath("reading-face-right.png") });
    thoughtBox = await thought.boundingBox();
    petBox = await sample.boundingBox();
    expect(thoughtBox!.x + thoughtBox!.width).toBeLessThan(petBox!.x + petBox!.width / 2);
    await thoughtPhase(0.53);
    await expect(thought).toHaveCSS("opacity", "0");
    await expect(thinkingCheeks).toHaveCSS("opacity", "0.68");
    expect(await thinkingCheeks.evaluate((node) => getComputedStyle(node).transform)).not.toBe(
      neutralCheeks,
    );
    expect(
      await thinkingMouth.evaluate((node) => getComputedStyle(node).getPropertyValue("d")),
    ).not.toBe(neutralMouth);
    await expectBalancedEyes();
    await sample.screenshot({ path: test.info().outputPath("reading-thought-resolved.png") });
    await thoughtPhase(0.8);
    await expect(thought).toHaveCSS("opacity", "0");
    await expect(thinkingCheeks).toHaveCSS("opacity", "0.56");
    await expect(thinkingCheeks).toHaveCSS("transform", neutralCheeks);
    await expect(thinkingMouth).toHaveCSS("d", neutralMouth);
    await thoughtPhase(0.53);
    await options.emulateMedia({ reducedMotion: "reduce" });
    await expect(thought).toBeHidden();
    await expect(thinkingCheeks).toHaveCSS("animation-name", "none");
    await expect(thinkingCheeks).toHaveCSS("opacity", "0.56");
    await expect(thinkingMouth).toHaveCSS("animation-name", "none");
    await expect
      .poll(() => gaze.evaluate((node) => getComputedStyle(node).animationName))
      .toBe("none");
    await options.emulateMedia({ reducedMotion: "no-preference" });
    await tryOn("口", "ちいさなW口");
    await thoughtPhase(0);
    const neutralDefaultMouth = await thinkingMouth.evaluate((node) =>
      getComputedStyle(node).getPropertyValue("d"),
    );
    await thoughtPhase(0.53);
    expect(
      await thinkingMouth.evaluate((node) => getComputedStyle(node).getPropertyValue("d")),
    ).not.toBe(neutralDefaultMouth);
    await expect(thinkingCheeks).toHaveCSS("opacity", "0.68");
    await sample.screenshot({
      path: test.info().outputPath("reading-thought-resolved-default.png"),
    });
    await thoughtPhase(0.8);
    await expect(thinkingMouth).toHaveCSS("d", neutralDefaultMouth);
    await lab.getByRole("button", { name: "悲しむ", exact: true }).click();
    await expect(thought).toHaveCount(0);
    await expect(thinkingMouth).toHaveCount(0);
    await expect(thinkingCheeks).toHaveCount(0);
    await expect(sample.locator("[data-layer=eyes]")).toHaveAttribute("data-part", "cry");
    await expect(sample.locator("[data-layer=effects]")).toHaveAttribute("data-part", "cry");
    await expect(sample.locator("[data-layer=cheeks]")).toHaveCount(0);
    await tryOn("スキン", "オリジナルカラー");
    await expect(sample).toHaveAttribute("data-skin", "skin_base");
    await lab.getByRole("button", { name: "考える", exact: true }).click();
    await expect(sample).toHaveAttribute("data-frame", "proud");
    await expect(sample.locator("[data-layer=prop]")).toHaveAttribute("data-part", "prop_book");
    await tryOn("手持ち", "手持ちなし");
    await expect(sample.locator("[data-layer=prop]")).toHaveCount(0);
    await expect(sample.locator("[data-layer=effects]")).toHaveAttribute("data-part", "proud");
    await tryOn("手持ち", "星の本");
    const trialImage = test.info().outputPath("star-trial.png");
    await lab.screenshot({ path: trialImage });
    await test.info().attach("ほしもち・試着", { path: trialImage, contentType: "image/png" });

    await options.getByRole("button", { name: "接続を確認" }).click();
    await expect(options.getByLabel("レスポンス")).toContainText("emulator-demo");
    await options.getByRole("button", { name: "開発用ログイン" }).click();
    await expect(options.getByRole("button", { name: "ログアウト" })).toBeEnabled();
    for (const name of ["ぬくもり", "ひらめき", "おちゃめ"]) {
      await expect(options.getByRole("progressbar", { name, exact: true })).toBeVisible();
    }
    const collection = options.getByRole("region", { name: "所持アイテム" });
    await expect(collection.getByRole("button", { name: "オリジナルカラー" })).toBeVisible();
    await expect(collection.getByRole("button", { name: "サンセットスキン" })).toHaveCount(0);
    await expect(youtubePet).toHaveAttribute("aria-label", "ほしもち");
    await openWardrobe.click();
    await expect(youtubeWardrobe.getByLabel("初期キャラ")).toHaveCount(0);
    await expect(
      youtubeWardrobe.getByRole("button", { name: "銀河もち", exact: true }),
    ).toHaveCount(0);
    await youtubeWardrobe.getByRole("button", { name: "オリジナルカラー", exact: true }).click();
    await expect(youtubeWardrobe.locator(".commet-lab-stage .commet-pet--star")).toHaveAttribute(
      "data-skin",
      "skin_base",
    );
    await expect(youtubePet).toHaveAttribute("aria-label", "ほしもち");
    const petName = youtubeWardrobe.getByRole("textbox", { name: "なまえ", exact: true });
    await petName.fill("   ");
    await youtubeWardrobe.getByRole("button", { name: "着せ替えを保存" }).click();
    await expect(youtubeWardrobe).toBeVisible();
    expect(await petName.evaluate((input: HTMLInputElement) => input.validity.valid)).toBe(false);
    await petName.fill("こむぎ");
    const youtubePreview = test.info().outputPath("youtube-wardrobe.png");
    await youtubeWardrobe.screenshot({ path: youtubePreview });
    await test.info().attach("YouTubeでほしもちを着せ替え", {
      path: youtubePreview,
      contentType: "image/png",
    });
    await youtubeWardrobe.getByRole("button", { name: "着せ替えを保存" }).click();
    await expect(youtubeWardrobe).toBeHidden();
    await expect(youtubePet).toHaveAttribute("data-skin", "skin_base");
    await expect(youtubePet).toHaveAttribute("aria-label", "こむぎ");
    await expect(youtubePanel.getByRole("heading", { name: "こむぎ", exact: true })).toBeVisible();
    await expect(youtube).toHaveURL(videoUrl);
    await options.reload();
    await expect(options.getByRole("textbox", { name: "なまえ", exact: true })).toHaveValue(
      "こむぎ",
    );
    await expect(options.getByLabel("初期キャラ")).toHaveCount(0);
    await expect(collection.getByRole("button", { name: "オリジナルカラー" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(collection.getByRole("button", { name: "夜空もち", exact: true })).toHaveCount(0);
    await options.getByLabel("なまえ", { exact: false }).fill("ほしもち");
    await options.getByRole("button", { name: "キャラ設定を保存" }).click();
    await expect(options.getByRole("status")).toHaveText("キャラ設定を保存しました。");
    await expect(youtubePet).toHaveAttribute("aria-label", "ほしもち");
    await options.reload();
    await expect(options.getByRole("textbox", { name: "なまえ", exact: true })).toHaveValue(
      "ほしもち",
    );
    await options.getByRole("button", { name: "コメント判定をテスト" }).click();
    await expect(options.getByLabel("リクエスト")).toContainText("POST /v1/analyze");
    await expect(options.getByLabel("レスポンス")).toContainText(
      /"category":\s*"constructive_criticism"/,
    );

    await context.route("https://x.com/**", (route) =>
      route.fulfill({ contentType: "text/html", body: fixture }),
    );
    let characterChecks = 0;
    context.on("request", (request) => {
      if (request.method() === "POST" && new URL(request.url()).pathname === "/v1/analyze")
        characterChecks++;
    });
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    await page.goto("https://x.com/commet-fixture");
    const panel = page.locator("commet-pet").getByRole("complementary", { name: "Commet" });
    await expect(panel.locator(".commet-companion .commet-pet--star")).toHaveAttribute(
      "data-skin",
      "skin_base",
    );
    await expect(panel.locator("[data-layer=hat]")).toHaveCount(0);
    const snsPet = panel.locator(".commet-companion .commet-pet--star");
    await page.getByRole("textbox", { name: "投稿内容" }).fill("頭が悪い。動画を出すな。");
    await expect(snsPet).toHaveAttribute("data-action", "walk");
    await expect(snsPet.locator("[data-layer=eyes]")).toHaveAttribute("data-part", "eyes_default");
    await expect(snsPet).toHaveAttribute("data-action", "peek");
    await expect(snsPet).toHaveAttribute("data-direction", "left");
    const petControl = panel.getByRole("button", { name: "キャラにコメントをチェックしてもらう" });
    const petPosition = await snsPet.boundingBox();
    await page.mouse.move(
      petPosition!.x + petPosition!.width / 2,
      petPosition!.y + petPosition!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      petPosition!.x + petPosition!.width / 2 + 36,
      petPosition!.y + petPosition!.height / 2 + 18,
      { steps: 6 },
    );
    await page.mouse.up();
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    expect(characterChecks).toBe(0);
    await expect(snsPet).toHaveAttribute("data-action", "peek");
    await petControl.click();
    await expect(snsPet).toHaveAttribute("data-mood", "cry");
    await expect(snsPet).toHaveAttribute("data-action", "idle");
    await expect(snsPet.locator('[data-layer="eyes"]')).toHaveAttribute("data-part", "cry");
    await expect(panel.locator(".commet-menu")).toBeHidden();
    expect(characterChecks).toBe(1);
    await snsPet.screenshot({ path: test.info().outputPath("character-check-cry.png") });
    await expect(page.getByRole("textbox", { name: "投稿内容" })).toHaveText(
      "頭が悪い。動画を出すな。",
    );
    await page
      .getByRole("textbox", { name: "投稿内容" })
      .fill("参考になりました。応援しています！");
    await expect(snsPet).toHaveAttribute("data-action", "peek");
    await expect(snsPet).toHaveAttribute("data-mood", "idle");
    await petControl.focus();
    await petControl.press("Enter");
    await expect(snsPet).toHaveAttribute("data-mood", "happy");
    await expect(snsPet).toHaveAttribute("data-frame", "happy");
    expect(characterChecks).toBe(2);
    await snsPet.screenshot({ path: test.info().outputPath("character-check-happy.png") });
    await expect(options.locator(".commet-stats")).toContainText("0 投稿");
    await page.getByRole("textbox", { name: "投稿内容" }).fill("頭が悪い。動画を出すな。");
    await expect(snsPet).toHaveAttribute("data-action", "peek");
    await panel.getByRole("button", { name: "メニューを開く" }).click();
    await page.keyboard.press("Escape");
    await expect(snsPet).toHaveAttribute("data-action", "peek");
    await panel.getByRole("button", { name: "メニューを開く" }).click();
    await panel.getByRole("button", { name: "この投稿をチェック" }).click();
    await expect(panel.getByText("だれかを傷つける表現（デモ）")).toBeVisible();
    await expect(panel.locator("[data-mood=cry]")).toBeVisible();
    await expect(panel.getByText("相手の人格に触れず", { exact: false })).toBeHidden();
    await panel.getByText("言い換え例を見る").click();
    await expect(panel.getByText("相手の人格に触れず", { exact: false })).toBeVisible();
    await panel.getByRole("button", { name: "入力欄に反映" }).click();
    await expect(panel.locator(".commet-menu")).toBeHidden();
    await expect(page.getByRole("textbox", { name: "投稿内容" })).toContainText(
      "相手の人格に触れず",
    );
    await page
      .getByRole("textbox", { name: "投稿内容" })
      .fill("参考になりました。応援しています！");
    await page.getByRole("button", { name: "ポストする" }).click();
    await panel.getByRole("button", { name: "メニューを開く" }).click();
    await expect(panel.getByText(/1\.5倍で/)).toBeVisible();
    await panel.getByRole("button", { name: "育成状況" }).click();
    await expect(panel.getByText("1 投稿", { exact: false })).toBeVisible();
  } finally {
    await context?.close();
  }
});
