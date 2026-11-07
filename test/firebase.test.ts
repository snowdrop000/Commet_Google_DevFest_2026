import { randomUUID } from "node:crypto";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import { FirestoreGameRepository, FirestoreGeminiQuota } from "../server/repository/firestore";
import { createApp } from "../server/app";
import { AnalysisService } from "../server/service/analysis";
import { GameService } from "../server/service/game";
import { newAccount, inventoryVersion } from "../server/model/state";
import { starterItems } from "../shared/game";
import { displayRarity, exchangeResult, shardCosts } from "../shared/gacha";

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
      const legacy = newAccount();
      legacy.inventoryVersion = 0;
      legacy.profile.characterType = "f";
      legacy.profile.unlockedItems = [...starterItems, "skin_star_galaxy", "skin_star_mint"];
      legacy.profile.equippedItems.skin = "skin_star_galaxy";
      legacy.profile.gacha.shards = { skin_star_mint: 3, hat_star_beret: 5 };
      const accountRef = db.collection("accounts").doc(localId);
      await accountRef.set(legacy);
      const requestId = randomUUID();
      await accountRef.collection("gachaDraws").doc(requestId).set({
        requestId,
        itemId: "skin_star_mint",
        rarity: "R",
        duplicate: true,
      });
      for (const response of await Promise.all([
        app.request("/v1/profile", { headers }),
        app.request("/v1/profile", { headers }),
      ])) {
        const pet = await response.json();
        expect(pet.unlockedItems).not.toContain("skin_star_galaxy");
        expect(pet.unlockedItems).toContain("skin_star_mint");
        expect(pet.equippedItems.skin).toBe("skin_base");
        expect(pet.gacha.shards).toBe(8);
      }
      expect((await accountRef.get()).get("inventoryVersion")).toBe(inventoryVersion);
      const sessionId = randomUUID();
      const call = (route: string, payload: unknown) =>
        app.request(route, { method: "POST", headers, body: JSON.stringify(payload) });
      const shop = await game.exchangeShop(localId);
      const itemId = shop.items.find((id) => id !== "skin_star_mint")!;
      const rarity = displayRarity[itemId] ?? "N";
      await accountRef.update({ "profile.gacha.shards": shardCosts[rarity] });
      const exchange = { requestId: randomUUID(), itemId, day: shop.day };
      const exchanges = await Promise.all(
        Array.from({ length: 4 }, async () => {
          const response = await call("/v1/gacha/exchange", exchange);
          expect(response.status).toBe(200);
          return exchangeResult.parse(await response.json());
        }),
      );
      for (const receipt of exchanges) expect(receipt).toEqual(exchanges[0]);
      expect(exchanges[0]).toMatchObject({
        itemId,
        cost: shardCosts[rarity],
        rarity,
        duplicate: false,
      });
      const stored = await accountRef.get();
      expect(stored.get("profile.gacha.shards")).toBe(0);
      expect(stored.get("profile.unlockedItems")).toContain(exchanges[0].itemId);
      expect((await accountRef.collection("shardExchanges").get()).size).toBe(1);
      expect(
        (await call("/v1/gacha/exchange", { ...exchange, requestId: randomUUID() })).status,
      ).toBe(409);
      now += 86_400_000;
      expect(await (await call("/v1/gacha/exchange", exchange)).json()).toEqual(exchanges[0]);
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
