import { serve } from "@hono/node-server";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import { createApp } from "./app";
import { FirestoreGameRepository, FirestoreGeminiQuota } from "./repository/firestore";
import { GeminiRepository } from "./repository/gemini";
import { AnalysisService } from "./service/analysis";
import { GameService } from "./service/game";

const config = z
  .object({
    FIREBASE_PROJECT_ID: z.string().min(1).default("demo-commet"),
    FIREBASE_AUTH_EMULATOR_HOST: z.string().optional(),
    FIRESTORE_EMULATOR_HOST: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z
      .string()
      .regex(/^gemini-[a-zA-Z0-9.-]+$/)
      .default("gemini-3.1-flash-lite"),
    COMMET_DEMO_AI: z.enum(["true", "false"]).default("false"),
    COMMET_GEMINI_QUOTA_ENABLED: z.enum(["true", "false"]).default("true"),
    COMMET_GEMINI_USER_DAILY: z.coerce.number().int().min(1).default(20),
    COMMET_GEMINI_PROJECT_DAILY: z.coerce.number().int().min(1).default(150),
    HOST: z.string().default("127.0.0.1"),
    PORT: z.coerce.number().int().min(1).max(65535).default(8765),
  })
  .parse(process.env);

const emulator = Boolean(config.FIREBASE_AUTH_EMULATOR_HOST && config.FIRESTORE_EMULATOR_HOST);
if (Boolean(config.FIREBASE_AUTH_EMULATOR_HOST) !== Boolean(config.FIRESTORE_EMULATOR_HOST)) {
  throw new Error("Auth と Firestore の Emulator は一緒に設定してください。");
}
const loopback = /^127\.0\.0\.1:\d+$/;
if (
  emulator &&
  (!config.FIREBASE_PROJECT_ID.startsWith("demo-") ||
    config.HOST !== "127.0.0.1" ||
    !loopback.test(config.FIREBASE_AUTH_EMULATOR_HOST ?? "") ||
    !loopback.test(config.FIRESTORE_EMULATOR_HOST ?? ""))
) {
  throw new Error("Emulator には demo- プロジェクトと 127.0.0.1 を使用してください。");
}
if (!emulator && config.FIREBASE_PROJECT_ID.startsWith("demo-")) {
  throw new Error("Emulator を設定するか、Firebase のプロジェクト ID を指定してください。");
}
const demo = config.COMMET_DEMO_AI === "true";
if (demo && (!emulator || config.GEMINI_API_KEY)) {
  throw new Error("デモ判定は Gemini キーなしの Emulator 環境でのみ使用できます。");
}

const firebase = initializeApp({
  projectId: config.FIREBASE_PROJECT_ID,
  ...(emulator ? {} : { credential: applicationDefault() }),
});
const database = getFirestore(firebase);
const game = new GameService(new FirestoreGameRepository(database));
const quota = new FirestoreGeminiQuota(
  database,
  config.COMMET_GEMINI_USER_DAILY,
  config.COMMET_GEMINI_PROJECT_DAILY,
  config.COMMET_GEMINI_QUOTA_ENABLED === "true",
);
const ai = config.GEMINI_API_KEY
  ? new GeminiRepository(config.GEMINI_API_KEY, config.GEMINI_MODEL)
  : null;
const mode = ai ? "gemini" : demo ? "emulator-demo" : "unconfigured";
const app = createApp(
  game,
  new AnalysisService(ai, quota, game, demo),
  async (token) => {
    const claims = await getAuth(firebase).verifyIdToken(token);
    if (!emulator && claims.firebase.sign_in_provider !== "google.com")
      throw new Error("Google login required");
    return claims.uid;
  },
  mode,
);
serve({ fetch: app.fetch, hostname: config.HOST, port: config.PORT }, (info) => {
  console.log(`Commet API http://${config.HOST}:${info.port} (${mode})`);
});
