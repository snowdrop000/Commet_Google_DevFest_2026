import { resolve } from "node:path";
import { chromium, expect, test, type BrowserContext } from "@playwright/test";

test("YouTube checks award nothing; the posted draft determines XP and level-only abilities", async () => {
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
    const options = await context.newPage();
    options.setDefaultTimeout(8000);
    await options.goto(`chrome-extension://${new URL(worker.url()).host}/options.html`);
    await options.getByRole("button", { name: "開発用ログイン", exact: true }).click();
    await expect(options.getByRole("button", { name: "ログアウト", exact: true })).toBeEnabled();
    const stats = options.locator(".commet-stats");
    await expect(stats).toContainText("XP 0 / 10");

    // All comments stay on this local HTML fixture; no request posts to YouTube.
    await context.route("https://www.youtube.com/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<!doctype html><meta charset="utf-8"><title>報酬の検証</title>
        <main style="margin:80px"><h1 class="title">テスト用の公開動画</h1><ytd-comment-simplebox-renderer>
        <div id="contenteditable-root" contenteditable="true" role="textbox" aria-label="コメント"></div>
        <div id="submit-button"><button type="button">コメントを投稿</button></div>
        </ytd-comment-simplebox-renderer><div id="comments"></div></main>
        <script>let n=0;document.querySelector('#submit-button button').onclick=()=>{
          const editor=document.querySelector('[contenteditable]'); const text=editor.textContent;
          editor.textContent=''; const row=document.createElement('ytd-comment-view-model');
          const link=document.createElement('a');link.href='?v=demo1234567&lc='+(++n);row.append(link);
          const content=document.createElement('div');content.id='content-text';content.textContent=text;row.append(content);
          document.querySelector('#comments').append(row);
        };</script>`,
      }),
    );
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    await page.goto("https://www.youtube.com/watch?v=demo1234567");
    const panel = page.getByRole("complementary", { name: "Commet" });
    const menu = panel.getByRole("button", { name: "メニューを開く" });
    const editor = page.getByRole("textbox", { name: "コメント", exact: true });
    const check = async (text: string, S: number, Q: number, xp: number) => {
      await page.keyboard.press("Escape");
      await editor.fill(text);
      await menu.click();
      await panel.getByRole("button", { name: "このコメントをチェック", exact: true }).click();
      const result = panel.locator(".commet-result");
      await expect(result).toContainText(`安全性 S ${S} / 2`);
      await expect(result).toContainText(`貢献度 Q ${Q} / 2`);
      await expect(result).toContainText(`${xp} XP`);
      await expect(result).toContainText("動画タイトル・説明文を考慮");
    };
    await check("応援しています！", 2, 2, 10);
    await check("見ました。", 2, 0, 2);
    await check("頭が悪い。", 0, 0, 0);
    await panel
      .locator(".commet-result")
      .screenshot({ path: test.info().outputPath("youtube-sq-result.png") });
    await options.reload();
    await expect(stats).toContainText("XP 0 / 10");
    await expect(stats).toContainText("0 投稿");

    const post = async (text: string, posts: number) => {
      await page.keyboard.press("Escape");
      await editor.fill(text);
      await page.getByRole("button", { name: "コメントを投稿", exact: true }).click();
      await menu.click();
      await expect(panel.getByText(/倍で \d+ 枚確定/)).toBeVisible();
      await options.reload();
      await expect(stats).toContainText(`${posts} 投稿`);
    };
    await post("頭が悪い。", 1);
    await expect(stats).toContainText("XP 0 / 10");
    await expect(
      options.getByRole("progressbar", { name: "ぬくもり", exact: true }),
    ).toHaveAttribute("value", "10");
    await post("見ました。", 2);
    await expect(stats).toContainText("XP 2 / 10");
    await expect(
      options.getByRole("progressbar", { name: "ぬくもり", exact: true }),
    ).toHaveAttribute("value", "10");
    await post("応援しています！", 3);
    await expect(stats).toContainText("LV. 2");
    await expect(stats).toContainText("XP 2 / 10");
    for (const [name, value] of [
      ["ぬくもり", "15"],
      ["知恵", "12"],
      ["愛嬌", "12"],
    ]) {
      const bar = options.getByRole("progressbar", { name, exact: true });
      await expect(bar).toHaveAttribute("value", value);
      await expect(bar).toHaveAttribute("max", "300");
    }
    await stats.screenshot({ path: test.info().outputPath("level-up-stats.png") });
  } finally {
    await context?.close();
  }
});
