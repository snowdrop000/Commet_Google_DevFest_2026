type Rect = { left: number; top: number; right: number; bottom: number };
type Position = { x: number; y: number };
const gap = 12;
const clamp = (n: number, low: number, high: number) =>
  Math.max(low, Math.min(Math.max(low, high), n));

/** Places the menu around the companion, without moving its anchor. */
export function placeOverlay(
  viewport: { width: number; height: number },
  anchor: Rect,
  menu: { width: number; height: number },
  preferred?: Position | null,
) {
  const height = Math.min(menu.height, viewport.height - gap * 2);
  const fits = (p: Position, h: number) =>
    p.x >= gap &&
    p.y >= gap &&
    p.x + menu.width <= viewport.width - gap &&
    p.y + h <= viewport.height - gap &&
    (p.x + menu.width + gap <= anchor.left ||
      p.x >= anchor.right + gap ||
      p.y + h + gap <= anchor.top ||
      p.y >= anchor.bottom + gap);
  if (preferred && fits(preferred, height))
    return { ...preferred, maxHeight: height, direction: "manual" };
  const x = clamp(
    (anchor.left + anchor.right - menu.width) / 2,
    gap,
    viewport.width - menu.width - gap,
  );
  const sides = [
    { direction: "above", available: anchor.top - gap * 2, x, y: 0 },
    {
      direction: "below",
      available: viewport.height - anchor.bottom - gap * 2,
      x,
      y: anchor.bottom + gap,
    },
    ...(viewport.width - anchor.right - gap * 2 >= menu.width
      ? [{ direction: "right", available: viewport.height - gap * 2, x: anchor.right + gap, y: 0 }]
      : []),
    ...(anchor.left - gap * 2 >= menu.width
      ? [
          {
            direction: "left",
            available: viewport.height - gap * 2,
            x: anchor.left - gap - menu.width,
            y: 0,
          },
        ]
      : []),
  ].filter((side) => side.available >= 48);
  const side =
    sides.find((side) => side.available >= height) ??
    sides.sort((a, b) => b.available - a.available)[0];
  if (!side)
    return { x, y: gap, maxHeight: Math.max(48, viewport.height - gap * 2), direction: "fallback" };
  const maxHeight = Math.min(height, side.available);
  const y =
    side.direction === "above"
      ? anchor.top - gap - maxHeight
      : side.direction === "below"
        ? side.y
        : clamp(
            (anchor.top + anchor.bottom - maxHeight) / 2,
            gap,
            viewport.height - maxHeight - gap,
          );
  return { x: side.x, y, maxHeight, direction: side.direction };
}
