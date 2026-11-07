import { demoCandidate } from "../shared/demo";
import { createApp } from "../server/app";
import {
  newAccount,
  newSession,
  type AccountState,
  type ExplorationSession,
  type GameRepository,
  type Mutation,
} from "../server/model/state";
import { AnalysisService, type GeminiQuota } from "../server/service/analysis";
import { GameService } from "../server/service/game";
import type { AiRepository } from "../server/repository/gemini";
import type { ExchangeResult, GachaResult } from "../shared/gacha";
import { migrateInventory } from "../server/model/inventory";

export class MemoryRepository implements GameRepository {
  readonly accounts = new Map<string, AccountState>();
  readonly sessions = new Map<string, ExplorationSession>();
  readonly draws = new Map<string, GachaResult>();
  readonly exchanges = new Map<string, ExchangeResult>();
  private writes = Promise.resolve();
  transactDraw(
    uid: string,
    requestId: string,
    mutate: Parameters<GameRepository["transactDraw"]>[2],
  ) {
    const task = this.writes.then(async () => {
      const key = `${uid}/${requestId}`;
      const change = mutate(await this.read(uid), structuredClone(this.draws.get(key) ?? null));
      if (change.account) this.accounts.set(uid, structuredClone(change.account));
      if (change.receipt) this.draws.set(key, structuredClone(change.receipt));
      return change.value;
    });
    this.writes = task.then(
      () => {},
      () => {},
    );
    return task;
  }
  async read(uid: string) {
    const account = this.accounts.get(uid) ?? newAccount();
    const items = [...this.draws.entries()]
      .filter(([key]) => key.startsWith(uid + "/"))
      .map(([, draw]) => draw.itemId);
    const current = migrateInventory(account, items);
    if (current !== account) this.accounts.set(uid, structuredClone(current));
    return structuredClone(current);
  }
  transactExchange(
    uid: string,
    requestId: string,
    mutate: Parameters<GameRepository["transactExchange"]>[2],
  ) {
    const task = this.writes.then(async () => {
      const key = `${uid}/${requestId}`;
      const change = mutate(await this.read(uid), structuredClone(this.exchanges.get(key) ?? null));
      if (change.account) this.accounts.set(uid, structuredClone(change.account));
      if (change.receipt) this.exchanges.set(key, structuredClone(change.receipt));
      return change.value;
    });
    this.writes = task.then(
      () => {},
      () => {},
    );
    return task;
  }
  transact<T>(uid: string, sessionId: string | null, mutate: Mutation<T>): Promise<T> {
    const task = this.writes.then(async () => {
      const key = `${uid}/${sessionId}`;
      const change = mutate(
        await this.read(uid),
        structuredClone(this.sessions.get(key) ?? newSession()),
      );
      if (change.account) this.accounts.set(uid, structuredClone(change.account));
      if (change.session && sessionId) this.sessions.set(key, structuredClone(change.session));
      return change.value;
    });
    this.writes = task.then(
      () => {},
      () => {},
    );
    return task;
  }
}

export function testApi(
  options: {
    ai?: AiRepository;
    quota?: GeminiQuota;
    verify?: (token: string) => Promise<string>;
  } = {},
) {
  let now = Date.parse("2026-11-06T01:00:00Z");
  const repository = new MemoryRepository();
  const game = new GameService(repository, () => now);
  const analysis = new AnalysisService(
    options.ai ?? null,
    options.quota ?? {
      async reserve() {
        return true;
      },
    },
    game,
    !options.ai,
  );
  const app = createApp(
    game,
    analysis,
    options.verify ??
      (async (token) => {
        if (!["alice", "bob"].includes(token)) throw new Error();
        return token;
      }),
    options.ai ? "gemini" : "emulator-demo",
  );
  return {
    app,
    repository,
    game,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

export function fakeAi(): AiRepository {
  return {
    async comment(input) {
      const text = (input as { draft: string }).draft;
      return demoCandidate(text);
    },
    async video() {
      return { summary: "動画内容の要約", topics: [], keyClaims: [], sensitiveTopics: [] };
    },
  };
}
