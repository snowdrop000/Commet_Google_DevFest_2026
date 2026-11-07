import { randomInt, randomUUID } from "node:crypto";
import { displayRarity, GACHA_COST, gachaPool, gachaRates, type Rarity } from "../../shared/gacha";
import { canEquip, equipmentKeys, withStarterItems, type Appearance } from "../../shared/game";
import type { Analysis, Settlement, SettlementResult } from "../../shared/model";
import { growthEvidence, ServiceError, type GameRepository } from "../model/state";
import { applyGrowth } from "./growth";

const interval = 15_000;
const dailyLimit = 60;
export const dayJst = (now: number) => new Date(now + 9 * 3_600_000).toISOString().slice(0, 10);

export class GameService {
  constructor(
    private readonly repository: GameRepository,
    private readonly clock = Date.now,
  ) {}

  async profile(uid: string) {
    return withStarterItems((await this.repository.read(uid)).profile);
  }

  draw(uid: string, requestId: string) {
    const roll = randomInt(100);
    const rarity: Rarity =
      roll < gachaRates.N
        ? "N"
        : roll < gachaRates.N + gachaRates.R
          ? "R"
          : roll < 100 - gachaRates.UR
            ? "SR"
            : "UR";
    const candidates = gachaPool.filter((id) => (displayRarity[id] ?? "N") === rarity);
    const itemId = candidates[randomInt(candidates.length)];
    return this.repository.transactDraw(uid, requestId, (account, previous) => {
      if (previous) return { value: previous };
      const pet = withStarterItems(account.profile);
      if (pet.confirmedCoins < GACHA_COST) {
        throw new ServiceError(409, `確定コインが${GACHA_COST}枚必要です。`);
      }
      const duplicate = pet.unlockedItems.includes(itemId);
      pet.confirmedCoins -= GACHA_COST;
      pet.gacha.draws++;
      pet.gacha.sinceSR = rarity === "SR" || rarity === "UR" ? 0 : pet.gacha.sinceSR + 1;
      pet.gacha.sinceUR = rarity === "UR" ? 0 : pet.gacha.sinceUR + 1;
      if (duplicate) pet.gacha.shards[itemId] = (pet.gacha.shards[itemId] ?? 0) + 1;
      else pet.unlockedItems.push(itemId);
      account.profile = pet;
      const receipt = { requestId, itemId, rarity, duplicate };
      return { value: receipt, account, receipt };
    });
  }

  appearance(uid: string, value: Appearance) {
    return this.repository.transact(uid, null, (account) => {
      const pet = withStarterItems(account.profile);
      for (const slot of equipmentKeys) {
        const item = value.equippedItems[slot];
        if (!canEquip(value.characterType, slot, item) || !pet.unlockedItems.includes(item)) {
          throw new ServiceError(400, "選んだキャラが装備できる所持アイテムを選んでください。");
        }
      }
      account.profile = { ...pet, ...value };
      return { value: account.profile, account };
    });
  }

  tick(uid: string, sessionId: string, active: boolean) {
    const now = this.clock();
    const day = dayJst(now);
    return this.repository.transact(uid, sessionId, (account, session) => {
      const value = {
        pending: session.pending,
        confirmed: account.profile.confirmedCoins,
        picked: false,
        limited: account.pickupDay === day && account.dailyPickups >= dailyLimit,
      };
      if (session.result || session.postPending || value.limited) return { value };
      if (!active) {
        if (account.activeSessionId !== sessionId) return { value };
        account.activeSessionId = null;
        session.lastTickAt = null;
        return { value, account, session };
      }
      const sameSession = account.activeSessionId === sessionId && session.lastTickAt !== null;
      const elapsed = session.lastTickAt === null ? 0 : now - session.lastTickAt;
      if (sameSession && elapsed >= 0 && elapsed < interval) return { value };
      if (sameSession && elapsed <= interval + 9_000 && now - account.lastPickupAt >= interval) {
        if (account.pickupDay !== day) {
          account.pickupDay = day;
          account.dailyPickups = 0;
        }
        account.dailyPickups++;
        account.lastPickupAt = now;
        session.pending++;
        value.pending = session.pending;
        value.picked = true;
        value.limited = account.dailyPickups >= dailyLimit;
      }
      account.activeSessionId = sessionId;
      session.lastTickAt = now;
      return { value, account, session };
    });
  }

  preparePost(uid: string, sessionId: string) {
    return this.repository.transact(uid, sessionId, (account, session) => {
      if (session.result) throw new ServiceError(409, "この探索セッションは精算済みです。");
      session.postPending = true;
      session.lastTickAt = null;
      if (account.activeSessionId === sessionId) account.activeSessionId = null;
      return { value: { ok: true }, account, session };
    });
  }

  issueReceipt(uid: string, sessionId: string, analysis: Analysis) {
    const now = this.clock();
    const id = randomUUID();
    return this.repository.transact(uid, sessionId, (_account, session) => {
      if (!session.postPending || session.result)
        throw new ServiceError(409, "送信を確認するセッションがありません。");
      if (session.receipt) return { value: session.receipt.id };
      session.receipt = { id, evidence: growthEvidence.parse(analysis), expiresAt: now + 300_000 };
      return { value: id, session };
    });
  }

  settle(uid: string, input: Settlement) {
    const now = this.clock();
    return this.repository.transact<SettlementResult>(uid, input.sessionId, (account, session) => {
      if (session.result) return { value: session.result };
      const { receipt } = session;
      const evidence =
        input.outcome.kind === "posted" &&
        session.postPending &&
        receipt?.id === input.outcome.analysisId &&
        receipt.expiresAt > now
          ? receipt.evidence
          : null;
      const multiplier =
        input.outcome.kind === "closed" && !session.postPending
          ? 1
          : !evidence || evidence.confidence <= 4 || evidence.category === "context_required"
            ? null
            : evidence.category === "abusive"
              ? 0
              : 1.5;
      const awarded = multiplier === null ? 0 : Math.floor(session.pending * multiplier);
      if (evidence) applyGrowth(account.profile, evidence, now);
      account.profile.confirmedCoins += awarded;
      if (account.activeSessionId === input.sessionId) account.activeSessionId = null;
      session.pending = multiplier === null ? session.pending : 0;
      session.receipt = null;
      session.result = {
        status: multiplier === null ? "held" : "settled",
        multiplier,
        awarded,
        pending: session.pending,
      };
      return { value: session.result, account, session };
    });
  }
}
