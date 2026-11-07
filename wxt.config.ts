import { defineConfig } from "wxt";
import { resolve } from "node:path";
import { snsMatches } from "./extension/sns/platforms";
import { starAssets } from "./extension/ui/star-assets";

// Legacy assets remain in assets/characters, but are excluded from the active extension.
const characterAssets = Object.values(starAssets);

export default defineConfig({
  srcDir: "extension",
  modules: ["@wxt-dev/module-react"],
  manifestVersion: 3,
  manifest: () => {
    const emulator = (process.env.WXT_FIREBASE_PROJECT_ID || "demo-commet").startsWith("demo-");
    const clientId = !emulator && process.env.WXT_GOOGLE_CLIENT_ID;
    return {
      name: "Commet",
      description: "X・YouTubeのコメントを振り返り、ことばでキャラクターを育てます。",
      permissions: clientId ? ["storage", "identity"] : ["storage"],
      host_permissions: [
        "http://127.0.0.1:8765/*",
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
          resources: ["characters/*.png"],
          matches: snsMatches,
        },
      ],
    };
  },
  hooks: {
    "prepare:publicPaths": (_wxt, paths) => {
      paths.push(...characterAssets);
    },
    "build:publicAssets": (wxt, files) => {
      for (const file of characterAssets) {
        files.push({ absoluteSrc: resolve(wxt.config.root, "assets", file), relativeDest: file });
      }
    },
  },
});
