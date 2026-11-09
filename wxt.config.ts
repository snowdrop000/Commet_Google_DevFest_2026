import { defineConfig } from "wxt";
import { resolve } from "node:path";
import { snsMatches } from "./extension/sns/platforms";
import { starAssets } from "./extension/ui/star-assets";
import { resolveApiBase } from "./shared/api-config";

// Legacy assets remain in assets/characters, but are excluded from the active extension.
const characterAssets = Object.values(starAssets);
const fontAssets = [
  "fonts/zen-maru-gothic-regular.woff2",
  "fonts/zen-maru-gothic-medium.woff2",
  "fonts/zen-maru-gothic-bold.woff2",
  "fonts/OFL.txt",
];

export default defineConfig({
  srcDir: "extension",
  modules: ["@wxt-dev/module-react"],
  manifestVersion: 3,
  manifest: () => {
    const apiBase = resolveApiBase(
      process.env.WXT_API_BASE_URL,
      process.env.WXT_FIREBASE_PROJECT_ID,
    );
    const emulator = (process.env.WXT_FIREBASE_PROJECT_ID || "demo-commet").startsWith("demo-");
    const clientId = !emulator && process.env.WXT_GOOGLE_CLIENT_ID;
    return {
      name: "Commet",
      description: "X・YouTubeのコメントを振り返り、ことばでキャラクターを育てます。",
      permissions: clientId ? ["storage", "identity"] : ["storage"],
      host_permissions: [
        `${apiBase}/*`,
        ...(emulator
          ? ["http://127.0.0.1:9099/*"]
          : ["https://identitytoolkit.googleapis.com/*", "https://securetoken.googleapis.com/*"]),
      ],
      ...(clientId
        ? {
            oauth2: {
              client_id: clientId,
              scopes: ["openid", "email", "profile"],
            },
          }
        : {}),
      ...(process.env.WXT_EXTENSION_PUBLIC_KEY
        ? { key: process.env.WXT_EXTENSION_PUBLIC_KEY }
        : {}),
      web_accessible_resources: [
        {
          resources: ["characters/*.png", "fonts/*.woff2"],
          matches: snsMatches,
        },
      ],
    };
  },
  hooks: {
    "prepare:publicPaths": (_wxt, paths) => {
      paths.push(...characterAssets, ...fontAssets);
    },
    "build:publicAssets": (wxt, files) => {
      for (const file of fontAssets) {
        files.push({
          absoluteSrc: resolve(wxt.config.root, "extension/assets", file),
          relativeDest: file,
        });
      }
      for (const file of characterAssets) {
        files.push({ absoluteSrc: resolve(wxt.config.root, "assets", file), relativeDest: file });
      }
    },
  },
});
