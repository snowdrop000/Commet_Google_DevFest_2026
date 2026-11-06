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
    await options.goto(`chrome-extension://${extensionId}/options.html`);
    await options.getByRole("button", { name: "接続を確認" }).click();
    await expect(options.getByLabel("レスポンス")).toContainText("emulator-demo");
    await options.getByRole("button", { name: "開発用ログイン" }).click();
    await expect(options.getByRole("button", { name: "ログアウト" })).toBeEnabled();
    await options.getByRole("button", { name: "コメント判定をテスト" }).click();
    await expect(options.getByLabel("リクエスト")).toContainText("POST /v1/analyze");
    await expect(options.getByLabel("レスポンス")).toContainText("unconstructive_criticism");

    await context.route("https://x.com/**", (route) =>
      route.fulfill({ contentType: "text/html", body: fixture }),
    );
    const page = await context.newPage();
    await page.goto("https://x.com/commet-fixture");
    const panel = page.locator("commet-pet").getByRole("complementary", { name: "Commet" });
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
