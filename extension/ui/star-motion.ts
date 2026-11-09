import type { CSSProperties } from "react";

export const sparkle = (x: number, y: number, r: number) =>
  `M${x} ${y - r}l${r * 0.3} ${r * 0.7} ${r * 0.7} ${r * 0.3}-${r * 0.7} ${r * 0.3}-${r * 0.3} ${r * 0.7}-${r * 0.3}-${r * 0.7}-${r * 0.7}-${r * 0.3} ${r * 0.7}-${r * 0.3}Z`;

// A five-pointed star centered on (cx, cy).
export const starShape = (cx: number, cy: number, r: number) =>
  `M${Array.from({ length: 10 }, (_, i) => {
    const angle = ((-90 + i * 36) * Math.PI) / 180;
    const radius = i % 2 ? r * 0.45 : r;
    return `${(cx + radius * Math.cos(angle)).toFixed(2)} ${(cy + radius * Math.sin(angle)).toFixed(2)}`;
  }).join("L")}Z`;
export const heartShape =
  "M0 3.2C-.8 2.5-3.2.9-3.2-.9c0-1.6 2.2-2.2 3.2-.7 1-1.5 3.2-.9 3.2.7C3.2.9.8 2.5 0 3.2Z";

// Motion classes for UR art. Each one rests on a still frame that reads fine on its own.
export function motion(name: string, delay = 0, duration?: number) {
  const style: CSSProperties = {};
  if (delay) style.animationDelay = `${-delay}s`;
  if (duration) style.animationDuration = `${duration}s`;
  return { className: `commet-ur-${name}`, style: delay || duration ? style : undefined };
}
