import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { testApi } from "./fixture";
import { webRoutes } from "../server/web";

describe("public static experience / authenticated API boundary", () => {
  let root: string;
  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), "commet-web-"));
    await mkdir(join(root, "assets"));
    await writeFile(join(root, "index.html"), "<!doctype html><title>Commet Web体験版</title>");
    await writeFile(join(root, "assets/app-ABC.js"), "console.log('Commet')");
    await writeFile(join(root, ".env"), "MUST_NOT_BE_SERVED");
  });
  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });
  it("serves the web page without authentication and leaves /v1 authentication intact", async () => {
    const { app } = testApi();
    app.route("/", webRoutes(root));
    const page = await app.request("/");
    expect(page.status).toBe(200);
    expect(await page.text()).toContain("Web体験版");
    expect(page.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    const asset = await app.request("/web/assets/app-ABC.js");
    expect(asset.status).toBe(200);
    expect(asset.headers.get("Cache-Control")).toContain("immutable");
    expect(page.headers.get("Cache-Control")).toBe("no-store");
    expect((await app.request("/v1/profile")).status).toBe(401);
    expect((await app.request("/v1/analyze", { method: "POST", body: "{}" })).status).toBe(401);
    for (const path of [
      "/web/.env",
      "/web/assets/../../.env",
      "/web/characters/file.json",
      "/unknown",
    ])
      expect((await app.request(path)).status).toBe(404);
  });
});
