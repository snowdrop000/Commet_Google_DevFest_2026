import { describe, expect, it } from "vitest";
import { placeOverlay } from "../extension/ui/overlay-placement";
const viewport = { width: 1280, height: 720 },
  menu = { width: 336, height: 450 };
describe("menu placement around a stationary pet", () => {
  it("prefers the space above when it fits", () => {
    const anchor = { left: 1080, right: 1228, top: 530, bottom: 704 };
    const result = placeOverlay(viewport, anchor, menu);
    expect(result.direction).toBe("above");
    expect(result.y + result.maxHeight).toBeLessThan(anchor.top);
  });
  it("uses the space below a pet near the top without changing the anchor", () => {
    const anchor = { left: 450, right: 598, top: 12, bottom: 186 },
      before = { ...anchor };
    const result = placeOverlay(viewport, anchor, menu);
    expect(result.direction).toBe("below");
    expect(result.y).toBeGreaterThan(anchor.bottom);
    expect(anchor).toEqual(before);
  });
  it("uses a side when neither top nor bottom fits", () => {
    const anchor = { left: 1080, right: 1228, top: 250, bottom: 424 };
    const result = placeOverlay(viewport, anchor, menu);
    expect(result.direction).toBe("left");
    expect(result.x + menu.width).toBeLessThan(anchor.left);
    expect(result.maxHeight).toBe(450);
  });
  it("reduces the scrolling height on a narrow screen while keeping both surfaces in view", () => {
    const anchor = { left: 220, right: 368, top: 230, bottom: 404 };
    const result = placeOverlay({ width: 390, height: 420 }, anchor, menu);
    expect(result.direction).toBe("above");
    expect(result.maxHeight).toBeLessThan(menu.height);
    expect(result.x).toBeGreaterThanOrEqual(12);
    expect(result.x + menu.width).toBeLessThanOrEqual(378);
    expect(result.y).toBeGreaterThanOrEqual(12);
  });
});
