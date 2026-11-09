import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { api } from "../extension/core/api";
import { browser } from "wxt/browser";

vi.mock("wxt/browser", () => ({
  browser: { runtime: { getPlatformInfo: vi.fn().mockResolvedValue({ os: "win" }) } },
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.clearAllMocks();
});

function delayedResponse(milliseconds: number) {
  vi.useFakeTimers();
  vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(new DOMException("Timed out", "TimeoutError")), ms);
    return controller.signal;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (_url, init: RequestInit) =>
        new Promise((resolve, reject) => {
          const timer = setTimeout(
            () => resolve(new Response(JSON.stringify({ ok: true }))),
            milliseconds,
          );
          init.signal?.addEventListener(
            "abort",
            () => {
              clearTimeout(timer);
              reject(init.signal?.reason);
            },
            { once: true },
          );
        }),
    ),
  );
}

describe("API client request deadlines", () => {
  it("waits for a video-backed analysis that takes more than the old 24-second deadline", async () => {
    delayedResponse(195_000);
    const result = api("/v1/analyze", z.object({ ok: z.literal(true) }), undefined, {
      text: "応援しています",
    });
    const completed = expect(result).resolves.toEqual({ ok: true });
    await vi.advanceTimersByTimeAsync(195_000);
    await completed;
    const calls = vi.mocked(browser.runtime.getPlatformInfo).mock.calls.length;
    expect(calls).toBeGreaterThan(0);
    await vi.advanceTimersByTimeAsync(200_000);
    expect(browser.runtime.getPlatformInfo).toHaveBeenCalledTimes(calls);
  });

  it("still fails ordinary API operations promptly when they stop responding", async () => {
    delayedResponse(6_000);
    const result = api("/v1/profile", z.object({ ok: z.literal(true) }));
    const failed = expect(result).rejects.toMatchObject({ status: 0 });
    await vi.advanceTimersByTimeAsync(6_000);
    await failed;
    expect(browser.runtime.getPlatformInfo).not.toHaveBeenCalled();
  });

  it("stops keeping the worker active after an analysis fails", async () => {
    delayedResponse(1_000);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(api("/v1/analyze", z.object({ ok: z.literal(true) }))).rejects.toMatchObject({
      status: 0,
    });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(browser.runtime.getPlatformInfo).not.toHaveBeenCalled();
  });
});
