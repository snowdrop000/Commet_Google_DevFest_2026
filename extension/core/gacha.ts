import { browser } from "wxt/browser";
import type { User } from "firebase/auth/web-extension";
import { gachaRequest, gachaResult } from "../../shared/gacha";
import { api } from "./api";

let writes = Promise.resolve();
function serial<T>(operation: () => Promise<T>): Promise<T> {
  const task = writes.then(operation);
  writes = task.then(
    () => {},
    () => {},
  );
  return task;
}

export function drawGacha(user: User) {
  return serial(async () => {
    const key = `commetGacha:${user.uid}`;
    const stored = await browser.storage.local.get(key);
    const pending = gachaRequest.safeParse(stored[key]);
    const request = pending.success ? pending.data : { requestId: crypto.randomUUID() };
    // Persist before requesting. Lost responses and service-worker restarts reuse this ID.
    await browser.storage.local.set({ [key]: request });
    const result = await api("/v1/gacha/draw", gachaResult, user, request);
    await browser.storage.local.set({ commetProfileRevision: crypto.randomUUID() });
    return result;
  });
}

export function acknowledgeGacha(user: User, requestId: string) {
  return serial(async () => {
    const key = `commetGacha:${user.uid}`;
    const stored = await browser.storage.local.get(key);
    const pending = gachaRequest.safeParse(stored[key]);
    if (pending.success && pending.data.requestId === requestId) {
      await browser.storage.local.remove(key);
    }
    return null;
  });
}
