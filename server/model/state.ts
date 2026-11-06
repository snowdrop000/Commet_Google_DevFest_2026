import { z } from "zod";
import { analysisResult, settlementResult } from "../../shared/model";
import { newProfile, profile } from "../../shared/game";

export const growthEvidence = analysisResult
  .pick({
    category: true,
    confidence: true,
    harm: true,
    dialogueStyle: true,
    context: true,
    constructivenessScore: true,
    empathyScore: true,
  })
  .strip();
export type GrowthEvidence = z.infer<typeof growthEvidence>;

export const accountState = z.strictObject({
  profile,
  pickupDay: z.string(),
  dailyPickups: z.number().int().nonnegative(),
  lastPickupAt: z.number(),
  activeSessionId: z.uuid().nullable(),
});
export type AccountState = z.infer<typeof accountState>;
export function newAccount(): AccountState {
  return {
    profile: newProfile(),
    pickupDay: "",
    dailyPickups: 0,
    lastPickupAt: 0,
    activeSessionId: null,
  };
}

export const explorationSession = z.strictObject({
  pending: z.number().int().nonnegative(),
  lastTickAt: z.number().nullable(),
  postPending: z.boolean(),
  receipt: z
    .strictObject({ id: z.uuid(), evidence: growthEvidence, expiresAt: z.number() })
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
}

export class ServiceError extends Error {
  constructor(
    public readonly status: 400 | 401 | 403 | 409 | 429 | 503,
    message: string,
  ) {
    super(message);
  }
}
