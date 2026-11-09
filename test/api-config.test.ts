import { describe, expect, it } from "vitest";
import { localApiBase, resolveApiBase } from "../shared/api-config";

describe("API deployment configuration", () => {
  it("keeps emulator development local and normalizes a Cloud Run endpoint", () => {
    expect(resolveApiBase()).toBe(localApiBase);
    expect(resolveApiBase(" https://commet-example-an.a.run.app/ ", "real-project")).toBe(
      "https://commet-example-an.a.run.app",
    );
    expect(resolveApiBase(localApiBase, "real-project")).toBe(localApiBase);
  });

  it.each([
    "http://public.example.com",
    "https://user:password@example.com",
    "https://example.com/?key=secret",
    "https://example.com/#fragment",
    "https://example.com/api",
    "ftp://example.com",
  ])("rejects an unsafe or incompatible remote endpoint: %s", (url) => {
    expect(() => resolveApiBase(url)).toThrow();
  });

  it("requires an explicit endpoint when switching from the emulator to a real project", () => {
    expect(() => resolveApiBase(undefined, "real-project")).toThrow("WXT_API_BASE_URL");
  });
});
