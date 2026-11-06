import { randomUUID } from "node:crypto";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import { FirestoreGameRepository, FirestoreGeminiQuota } from "../server/repository/firestore";
import { createApp } from "../server/app";
import { AnalysisService } from "../server/service/analysis";
import { GameService } from "../server/service/game";

const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
const loopback = /^127\.0\.0\.1:\d+$/;
describe.skipIf(
  !authHost || !firestoreHost || !loopback.test(authHost) || !loopback.test(firestoreHost),
)("Firebase Emulator Suite", () => {
  it("verifies an emulator token and persists a single transaction across requests", async () => {
    const firebase = initializeApp({ projectId: "demo-commet" }, "commet-test");
    try {
      const auth = getAuth(firebase);
      const db = getFirestore(firebase);
      let now = Date.now();
      const game = new GameService(new FirestoreGameRepository(db), () => now);
      const analysis = new AnalysisService(null, new FirestoreGeminiQuota(db, 20, 150), game, true);
      const app = createApp(
        game,
        analysis,
        async (token) => (await auth.verifyIdToken(token)).uid,
        "emulator-demo",
      );
      const signIn = await fetch(
        `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ returnSecureToken: true }),
        },
      );
      expect(signIn.ok).toBe(true);
      const { idToken, localId } = (await signIn.json()) as { idToken: string; localId: string };
      const headers = { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" };
      const sessionId = randomUUID();
      const call = (route: string, payload: unknown) =>
        app.request(route, { method: "POST", headers, body: JSON.stringify(payload) });
      expect((await call("/v1/coins/tick", { sessionId, active: true })).status).toBe(200);
      now += 15_000;
      expect(
        await (await call("/v1/coins/tick", { sessionId, active: true })).json(),
      ).toMatchObject({ pending: 1 });
      const close = { sessionId, outcome: { kind: "closed" } };
      for (const response of await Promise.all([
        call("/v1/coins/settle", close),
        call("/v1/coins/settle", close),
      ])) {
        expect(await response.json()).toMatchObject({ awarded: 1 });
      }
      expect(
        (await db.collection("accounts").doc(localId).get()).get("profile.confirmedCoins"),
      ).toBe(1);
    } finally {
      await deleteApp(firebase);
    }
  }, 20_000);
});
