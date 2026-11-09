import { build } from "esbuild";
import { cp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { parseEnv } from "node:util";
import { brotliCompressSync, constants } from "node:zlib";

const fileEnv = await readFile(".env.cloud.local", "utf8")
  .then(parseEnv)
  .catch(() => ({}));
const env = { ...fileEnv, ...process.env };
// Firebase's public web identifiers only. Never serialize the server environment.
const config = Object.fromEntries(
  Object.entries({
    apiKey: env.WXT_FIREBASE_API_KEY,
    projectId: env.WXT_FIREBASE_PROJECT_ID,
    authDomain: env.WXT_FIREBASE_AUTH_DOMAIN,
    appId: env.WXT_FIREBASE_APP_ID,
  }).filter(([, value]) => value),
);
const root = "dist/web";
if (!resolve(root).startsWith(resolve("dist") + sep)) throw new Error("Invalid build output");
await rm(root, { recursive: true, force: true });
await mkdir(root, { recursive: true });
const result = await build({
  entryPoints: { app: "web/main.tsx" },
  outdir: root + "/assets",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["chrome110", "safari17"],
  minify: true,
  metafile: true,
  entryNames: "[name]-[hash]",
  assetNames: "[name]-[hash]",
  jsx: "automatic",
  tsconfig: "tsconfig.web.json",
  legalComments: "eof",
  alias: { "wxt/browser": resolve("web/browser.ts") },
  define: { __FIREBASE_CONFIG__: JSON.stringify(config), "process.env.NODE_ENV": '"production"' },
});
const entry = Object.entries(result.metafile.outputs).find(
  ([, value]) => value.entryPoint === "web/main.tsx" && !value.cssBundle?.endsWith(".js"),
);
if (!entry) throw new Error("Web entry point was not emitted");
const [js, info] = entry;
const link = (path) => "/web/" + path.replaceAll("\\", "/").replace(/^dist\/web\//, "");
const html = (await readFile("web/index.html", "utf8")).replace(
  "<!--ASSETS-->",
  (info.cssBundle
    ? `<link data-commet-styles rel="stylesheet" href="${link(info.cssBundle)}">`
    : "") + `<script type="module" src="${link(js)}"></script>`,
);
await writeFile(root + "/index.html", html);
for (const path of [
  root + "/index.html",
  ...Object.keys(result.metafile.outputs).filter((path) => /\.(js|css)$/.test(path)),
]) {
  const source = await readFile(path);
  await writeFile(
    path + ".br",
    brotliCompressSync(source, { params: { [constants.BROTLI_PARAM_QUALITY]: 7 } }),
  );
}
await cp("web/favicon.svg", root + "/favicon.svg");
await mkdir(root + "/characters", { recursive: true });
for (const name of ["star-body-poses", "star-body-walk", "star-beret", "star-pin", "star-book"])
  await cp(`assets/characters/${name}.png`, `${root}/characters/${name}.png`);
await cp("extension/assets/fonts", root + "/fonts", { recursive: true });
console.log(
  JSON.stringify({
    output: root,
    googleLoginConfigured: Object.keys(config).length === 4,
    jsBytes: info.bytes,
  }),
);
