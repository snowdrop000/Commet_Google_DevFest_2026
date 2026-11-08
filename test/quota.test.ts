import type { Firestore } from "firebase-admin/firestore";
import { describe, expect, it, vi } from "vitest";
import { FirestoreGeminiQuota } from "../server/repository/firestore";

const day = "2026-11-08";
type Ref = { path: string; collection: (name: string) => { doc: (id: string) => Ref } };
function ref(path: string): Ref {
  return { path, collection: (name) => ({ doc: (id) => ref(`${path}/${name}/${id}`) }) };
}
function database(userCount: number, projectCount: number) {
  const tx = {
    getAll: vi.fn(async () => [
      { get: (key: string) => (key === "day" ? day : projectCount) },
      { get: (key: string) => (key === "day" ? day : userCount) },
    ]),
    set: vi.fn(),
  };
  const raw = {
    collection: vi.fn((name: string) => ({ doc: (id: string) => ref(`${name}/${id}`) })),
    runTransaction: vi.fn(async (run: (transaction: typeof tx) => unknown) => run(tx)),
  };
  return { db: raw as unknown as Firestore, raw, tx };
}

describe("Commet daily Gemini quota", () => {
  it("bypasses both exhausted limits without reading or changing quota documents when disabled", async () => {
    const f = database(20, 150);
    const quota = new FirestoreGeminiQuota(f.db, 20, 150, false);
    expect(await quota.reserve("alice", day)).toBe(true);
    expect(await quota.reserve("alice", day)).toBe(true);
    expect(f.raw.collection).not.toHaveBeenCalled();
    expect(f.raw.runTransaction).not.toHaveBeenCalled();
    expect(f.tx.set).not.toHaveBeenCalled();
  });

  it.each([
    [20, 30],
    [2, 150],
  ])("keeps default limits enabled at user=%i project=%i", async (user, project) => {
    const f = database(user, project);
    expect(await new FirestoreGeminiQuota(f.db, 20, 150).reserve("alice", day)).toBe(false);
    expect(f.tx.set).not.toHaveBeenCalled();
  });

  it("resumes normal counting when explicitly enabled", async () => {
    const f = database(2, 3);
    expect(await new FirestoreGeminiQuota(f.db, 20, 150, true).reserve("alice", day)).toBe(true);
    expect(f.tx.set.mock.calls.map(([reference, value]) => [reference.path, value])).toEqual([
      ["geminiQuotas/project", { day, count: 4 }],
      ["geminiQuotas/users/byUid/alice", { day, count: 3 }],
    ]);
  });
});
