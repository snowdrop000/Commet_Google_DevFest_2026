import { browser } from "wxt/browser";
import type { User } from "firebase/auth/web-extension";
import {
  exchangeRequest,
  exchangeResult,
  gachaRequest,
  gachaResult,
  type ExchangeSelection,
} from "../../shared/gacha";
import { api, ApiError } from "./api";

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
    try {
      const result = await api("/v1/gacha/draw", gachaResult, user, request);
      await browser.storage.local.set({ commetProfileRevision: crypto.randomUUID() });
      return result;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 400 || error.status === 409))
        await browser.storage.local.remove(key);
      throw error;
    }
  });
}

export function pendingGacha(user: User) {
  return serial(async () => {
    const key = `commetGacha:${user.uid}`;
    const stored = await browser.storage.local.get(key);
    const request = gachaRequest.safeParse(stored[key]);
    return request.success ? request.data : null;
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

export function pendingExchange(user: User) {
  return serial(async () => {
    const key = `commetExchange:${user.uid}`;
    const stored = await browser.storage.local.get(key);
    const pending = exchangeRequest.safeParse(stored[key]);
    return pending.success ? pending.data : null;
  });
}

export function exchangeShards(user: User, selection: ExchangeSelection, requestId?: string) {
  return serial(async () => {
    const key = `commetExchange:${user.uid}`;
    const stored = await browser.storage.local.get(key);
    const pending = exchangeRequest.safeParse(stored[key]);
    if (requestId && pending.success && pending.data.requestId !== requestId)
      throw new Error("別の交換が確認中です。画面を開き直してください。");
    const request = requestId
      ? { ...selection, requestId }
      : pending.success
        ? pending.data
        : { ...selection, requestId: crypto.randomUUID() };
    await browser.storage.local.set({ [key]: request });
    try {
      const result = await api("/v1/gacha/exchange", exchangeResult, user, request);
      await browser.storage.local.set({ commetProfileRevision: crypto.randomUUID() });
      return result;
    } catch (error) {
      // Definitive rejection means nothing was spent. Network failures retain the same ID.
      if (error instanceof ApiError && (error.status === 400 || error.status === 409))
        await browser.storage.local.remove(key);
      throw error;
    }
  });
}

export function acknowledgeExchange(user: User, requestId: string) {
  return serial(async () => {
    const key = `commetExchange:${user.uid}`;
    const stored = await browser.storage.local.get(key);
    const pending = exchangeRequest.safeParse(stored[key]);
    if (pending.success && pending.data.requestId === requestId)
      await browser.storage.local.remove(key);
    return null;
  });
}
