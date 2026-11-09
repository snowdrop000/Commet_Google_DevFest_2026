import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";

test("the specified review account can log in and run real Gemini without accessing production profiles", async ({
  page,
}) => {
  test.skip(
    !process.env.COMMET_REVIEW_LOGIN,
    "Requires the explicitly provisioned review account and deployed API",
  );
  const account = JSON.parse(await readFile(".commet/web-review-account.json", "utf8"));
  await page.goto("/?sns=x&login=1");
  const login = page.getByRole("dialog", { name: "Commetにログイン" });
  await expect(login).toBeVisible();
  await page.screenshot({ path: ".commet/web-review-login.png", animations: "disabled" });
  await login.getByLabel("メールアドレス", { exact: true }).fill(account.email);
  await login.getByLabel("パスワード", { exact: true }).fill("invalid-review-password");
  await login.getByRole("button", { name: "ログイン", exact: true }).click();
  await expect(login.getByRole("alert")).toContainText("メールアドレスまたはパスワード");
  await login.getByLabel("パスワード", { exact: true }).fill(account.password);
  await login.getByRole("button", { name: "ログイン", exact: true }).click();
  await expect(login).not.toBeVisible();
  await expect(page.locator(".demo-account-label")).toHaveText("審査用アカウント");
  await expect(page.getByLabel("判定方法")).toHaveValue("gemini");
  await page
    .getByRole("textbox", { name: "返信", exact: true })
    .fill("わかりやすい説明をありがとうございます。参考になりました。");
  const analyzed = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/web-demo/analyze",
  );
  const host = page.locator("commet-pet[data-web-extension=true]");
  await host.getByRole("button", { name: "キャラにコメントをチェックしてもらう" }).click();
  const response = await analyzed;
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ demo: false, analysisId: null });
  const token = await response.request().headerValue("authorization");
  expect(
    (await page.request.get("/v1/profile", { headers: { Authorization: token! } })).status(),
  ).toBe(401);
  await host.getByRole("button", { name: "メニューを開く", exact: true }).click();
  await expect(host.locator(".commet-result")).toBeVisible();
  await expect(host.locator(".commet-result")).not.toContainText("（デモ）");
  await page.screenshot({ path: ".commet/web-review-gemini.png", animations: "disabled" });
  await page.goto("/?sns=x");
  await expect(page.locator(".demo-account-label")).toHaveText("審査用アカウント");
  await page.getByRole("button", { name: "ログアウト", exact: true }).click();
  await expect(page.getByLabel("判定方法")).toHaveValue("sample");
  await expect(page.getByRole("button", { name: "ログイン", exact: true })).toBeVisible();
});
