import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
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
  const data = await mkdtemp(join(tmpdir(), "commet-playwright-"));
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
    const extensionId = new URL(worker.url()).host;
    const options = await context.newPage();
    options.setDefaultTimeout(5000);
    await options.goto(`chrome-extension://${extensionId}/options.html`);
    const lab = options.getByRole("region", { name: "ほしもちの試着" });
    const sample = lab.locator(".commet-pet--star");
    await sample.locator("svg image").first().waitFor({ state: "attached" });
    await expect(sample.locator("[data-layer=cheeks]")).toHaveAttribute("opacity", ".56");
    await options.evaluate(async () => {
      const art = document.querySelector(".commet-lab-stage svg image");
      const img = new Image();
      img.src = art?.getAttribute("href") ?? "";
      await img.decode();
    });
    const original = await sample.screenshot();
    await lab.getByRole("button", { name: "以前のノーマルと比較" }).click();
    await expect(lab.getByRole("img", { name: "旧ノーマル" })).toBeVisible();
    const comparison = test.info().outputPath("star-compare.png");
    await lab.screenshot({ path: comparison });
    await test.info().attach("ノーマルの比較", { path: comparison, contentType: "image/png" });
    await lab.getByRole("button", { name: "以前のノーマルと比較" }).click();
    await lab.getByLabel("試着スキン").selectOption("skin_star_mint");
    await expect.poll(async () => (await sample.screenshot()).equals(original)).toBe(false);
    await lab.getByLabel("試着の帽子").selectOption("hat_star_beret");
    await lab.getByLabel("試着目", { exact: true }).selectOption("eyes_glimmer");
    await lab.getByLabel("試着口", { exact: true }).selectOption("mouth_smile");
    await lab.getByLabel("試着頭の飾り").selectOption("head_moon");
    await lab.getByLabel("試着体の柄").selectOption("pattern_stars");
    await lab.getByLabel("動き").selectOption("walk");
    await expect(sample).toHaveAttribute("data-action", "walk");
    const first = await sample.getAttribute("data-frame");
    await expect.poll(() => sample.getAttribute("data-frame")).not.toBe(first);
    await lab.getByRole("button", { name: "向きを反転" }).click();
    await expect(sample).toHaveAttribute("data-direction", "left");
    await expect(sample.locator("[data-hat=hat_star_beret]")).toHaveCount(1);
    await expect(sample.locator("[data-layer=eyes]")).toHaveAttribute("data-part", "eyes_glimmer");
    await expect(sample.locator("[data-layer=cheeks] ellipse")).toHaveCount(2);
    await expect(sample.locator("[data-layer=mouth]")).toHaveAttribute("data-part", "mouth_smile");
    await expect(sample.locator("[data-layer=head]")).toHaveAttribute("data-part", "head_moon");
    await expect(sample.locator("[data-layer=pattern]")).toHaveCount(1);
    await lab.getByLabel("動き").selectOption("cry");
    await expect(sample.locator("[data-layer=eyes]")).toHaveAttribute("data-part", "cry");
    await expect(sample.locator("[data-layer=effects]")).toHaveAttribute("data-part", "cry");
    await expect(sample.locator("[data-layer=cheeks]")).toHaveCount(0);
    await lab.getByLabel("試着スキン").selectOption("skin_star_night");
    await expect(sample).toHaveAttribute("data-skin", "skin_star_night");
    await lab.getByLabel("動き").selectOption("proud");
    await expect(sample).toHaveAttribute("data-frame", "proud");
    await expect(sample.locator("[data-layer=prop]")).toHaveAttribute("data-part", "prop_book");
    await lab.getByLabel("試着手持ち（学習時）").selectOption("prop_none");
    await expect(sample.locator("[data-layer=prop]")).toHaveCount(0);
    await expect(sample.locator("[data-layer=effects]")).toHaveAttribute("data-part", "proud");
    await lab.getByLabel("試着手持ち（学習時）").selectOption("prop_book");
    const trial = test.info().outputPath("star-trial.png");
    await lab.screenshot({ path: trial });
    await test.info().attach("ほしもち・試着", { path: trial, contentType: "image/png" });

    await options.getByRole("button", { name: "接続を確認" }).click();
    await expect(options.getByLabel("レスポンス")).toContainText("emulator-demo");
    await options.getByRole("button", { name: "開発用ログイン" }).click();
    await expect(options.getByRole("button", { name: "ログアウト" })).toBeEnabled();
    await options.getByLabel("初期キャラ").selectOption("f");
    await options.locator("select[name=skin]").selectOption("skin_star_night");
    await options.locator("select[name=hat]").selectOption("hat_star_pin");
    await options.locator("form select[name=eyes]").selectOption("eyes_glimmer");
    await options.getByRole("button", { name: "キャラ設定を保存" }).click();
    await expect(options.getByRole("status")).toHaveText("キャラ設定を保存しました。");
    await options.getByRole("button", { name: "コメント判定をテスト" }).click();
    await expect(options.getByLabel("リクエスト")).toContainText("POST /v1/analyze");
    await expect(options.getByLabel("レスポンス")).toContainText("unconstructive_criticism");

    await context.route("https://x.com/**", (route) =>
      route.fulfill({ contentType: "text/html", body: fixture }),
    );
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    await page.goto("https://x.com/commet-fixture");
    const panel = page.locator("commet-pet").getByRole("complementary", { name: "Commet" });
    await expect(panel.locator(".commet-pet--star")).toHaveAttribute(
      "data-skin",
      "skin_star_night",
    );
    await expect(panel.locator("[data-hat=hat_star_pin]")).toHaveCount(1);
    const snsPet = panel.locator(".commet-pet--star");
    await page.getByRole("textbox", { name: "投稿内容" }).fill("頭が悪い。動画を出すな。");
    await expect(snsPet).toHaveAttribute("data-action", "walk");
    await expect(snsPet.locator("[data-layer=eyes]")).toHaveAttribute("data-part", "eyes_glimmer");
    await expect(snsPet).toHaveAttribute("data-action", "peek");
    await panel.getByRole("button", { name: "この投稿をチェック" }).click();
    await expect(panel.getByText("だれかを傷つける表現（デモ）")).toBeVisible();
    await expect(panel.locator("[data-mood=cry]")).toBeVisible();
    await expect(panel.getByText("相手の人格に触れず", { exact: false })).toBeHidden();
    await panel.getByText("改善案を見る").click();
    await expect(panel.getByText("相手の人格に触れず", { exact: false })).toBeVisible();
    await panel.getByRole("button", { name: "改善案を入力欄に反映" }).click();
    await expect(page.getByRole("textbox", { name: "投稿内容" })).toContainText(
      "相手の人格に触れず",
    );
    await page
      .getByRole("textbox", { name: "投稿内容" })
      .fill("参考になりました。応援しています！");
    await page.getByRole("button", { name: "ポストする" }).click();
    await expect(panel.getByText(/1\.5倍で/)).toBeVisible();
    await panel.getByRole("button", { name: "育成状況" }).click();
    await expect(panel.getByText("1 投稿", { exact: false })).toBeVisible();
  } finally {
    await context?.close();
    await rm(data, { recursive: true, force: true });
  }
});
