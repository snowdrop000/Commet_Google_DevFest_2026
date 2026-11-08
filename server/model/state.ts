import { z } from "zod";
import { analysisResult, settlementResult } from "../../shared/model";
import { newProfile, profile } from "../../shared/game";
import type { ExchangeResult, GachaResult } from "../../shared/gacha";

export const growthEvidence = analysisResult
  .pick({
    category: true,
    S: true,
    Q: true,
    decision: true,
    appreciation: true,
    constructiveness: true,
    information: true,
    humor: true,
    contextSufficient: true,
    isReply: true,
  })
  .strip();
export type GrowthEvidence = z.infer<typeof growthEvidence>;
export const inventoryVersion = 3;
export const growthVersion = 1;

export const accountState = z.strictObject({
  inventoryVersion: z.number().int().nonnegative().default(0),
  growthVersion: z.number().int().nonnegative().default(0),
  profile,
  legacyAppearance: profile
    .pick({ name: true, characterType: true, equippedItems: true })
    .optional(),
  pickupDay: z.string(),
  dailyPickups: z.number().int().nonnegative(),
  lastPickupAt: z.number(),
  activeSessionId: z.uuid().nullable(),
});
export type AccountState = z.infer<typeof accountState>;
export function newAccount(): AccountState {
  return {
    inventoryVersion,
    growthVersion,
    profile: newProfile(),
    pickupDay: "",
    dailyPickups: 0,
    lastPickupAt: 0,
    activeSessionId: null,
  };
}

/** One-time growth reset. Appearance, inventory, balances and acquisitions stay intact. */
export function migrateGrowth(account: AccountState): AccountState {
  if (account.growthVersion >= growthVersion) return account;
  const initial = newProfile();
  return {
    ...account,
    growthVersion,
    // Accept the existing wardrobe as owned; an old inventory cleanup must not
    // remove items or change equipment while resetting growth.
    inventoryVersion: Math.max(account.inventoryVersion, inventoryVersion),
    profile: {
      ...account.profile,
      level: initial.level,
      xp: initial.xp,
      empathy: initial.empathy,
      criticalThinking: initial.criticalThinking,
      resilience: initial.resilience,
      growth: initial.growth,
    },
  };
}

export const explorationSession = z.strictObject({
  pending: z.number().int().nonnegative(),
  lastTickAt: z.number().nullable(),
  postPending: z.boolean(),
  receipt: z
    .strictObject({
      id: z.uuid(),
      // Old evaluation receipts never grant rewards under the new rules.
      evidence: growthEvidence.nullable().catch(null),
      expiresAt: z.number(),
    })
    .nullable(),
  result: settlementResult.nullable(),
});
export type ExplorationSession = z.infer<typeof explorationSession>;
export function newSession(): ExplorationSession {
  return { pending: 0, lastTickAt: null, postPending: false, receipt: null, result: null };
}

export type Change<T> = { value: T; account?: AccountState; session?: ExplorationSession };
export type Mutation<T> = (account: AccountState, session: ExplorationSession) => Change<T>;
export interface GameRepository {
  read(uid: string): Promise<AccountState>;
  transact<T>(uid: string, sessionId: string | null, mutate: Mutation<T>): Promise<T>;
  transactDraw(
    uid: string,
    requestId: string,
    mutate: (
      account: AccountState,
      receipt: GachaResult | null,
    ) => {
      value: GachaResult;
      account?: AccountState;
      receipt?: GachaResult;
    },
  ): Promise<GachaResult>;
  transactExchange(
    uid: string,
    requestId: string,
    mutate: (
      account: AccountState,
      receipt: ExchangeResult | null,
    ) => { value: ExchangeResult; account?: AccountState; receipt?: ExchangeResult },
  ): Promise<ExchangeResult>;
}

export class ServiceError extends Error {
  constructor(
    public readonly status: 400 | 401 | 403 | 409 | 429 | 503,
    message: string,
  ) {
    super(message);
  }
}
