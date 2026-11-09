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
import { newProfile } from "../shared/game";
import { demoCandidate } from "../shared/demo";
import { classify } from "../server/service/analysis";

const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
const loopback = /^127\.0\.0\.1:\d+$/;
describe.skipIf(
  !authHost || !firestoreHost || !loopback.test(authHost) || !loopback.test(firestoreHost),
)("Firebase Emulator Suite", () => {
  it("resets only growth once and preserves all acquisitions through a confirmed post", async () => {
    const firebase = initializeApp(
      { projectId: "demo-commet-gemini-rewards" },
      "commet-growth-test",
    );
    try {
      const db = getFirestore(firebase);
      const repository = new FirestoreGameRepository(db);
      const game = new GameService(repository);
      const uid = `growth-${randomUUID()}`;
      const ref = db.collection("accounts").doc(uid);
      const old = newAccount();
      old.growthVersion = 0;
      old.inventoryVersion = 0;
      Object.assign(old.profile, {
        level: 20,
        xp: 123,
        empathy: 88,
        criticalThinking: 76,
        resilience: 54,
        confirmedCoins: 321,
      });
      old.profile.unlockedItems.push("skin_star_galaxy", "hat_star_beret", "skin_level_moonlight");
      old.profile.equippedItems.skin = "skin_star_galaxy";
      old.profile.equippedItems.hat = "hat_star_beret";
      old.profile.gacha = { draws: 21, sinceSR: 4, sinceUR: 6, shards: 17 };
      const raw = structuredClone(old) as Record<string, unknown>;
      delete raw.growthVersion;
      delete (raw.profile as Record<string, unknown>).growth;
      await ref.set(raw);
      const expected = {
        ...old.profile,
        level: 1,
        xp: 0,
        empathy: 10,
        criticalThinking: 10,
        resilience: 10,
        growth: newProfile().growth,
      };
      const pets = await Promise.all(Array.from({ length: 4 }, () => game.profile(uid)));
      for (const pet of pets) expect(pet).toEqual(expected);
      expect((await ref.get()).get("growthVersion")).toBe(1);
      const sessionId = randomUUID();
      await game.preparePost(uid, sessionId);
      const analysis = classify(demoCandidate("応援しています！"), "応援しています！");
      const analysisId = await game.issueReceipt(uid, sessionId, analysis);
      await Promise.all(
        Array.from({ length: 4 }, () =>
          game.settle(uid, { sessionId, outcome: { kind: "posted", analysisId } }),
        ),
      );
      const pet = await game.profile(uid);
      expect(pet).toMatchObject({
        level: 2,
        xp: 0,
        empathy: 15,
        criticalThinking: 12,
        resilience: 12,
        confirmedCoins: 321,
      });
      expect(pet.equippedItems).toEqual(old.profile.equippedItems);
      expect(pet.gacha).toEqual(old.profile.gacha);
      expect(pet.unlockedItems).toEqual([
        ...old.profile.unlockedItems,
        "skin_sunset",
        "skin_level_sunrise",
      ]);
      expect((await game.profile(uid)).level).toBe(2);
      expect(
        JSON.stringify((await ref.collection("exploration").doc(sessionId).get()).data()),
      ).not.toContain("応援しています");
    } finally {
      await deleteApp(firebase);
    }
  }, 20_000);

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
