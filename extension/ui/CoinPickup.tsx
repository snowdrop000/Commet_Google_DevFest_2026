import { useEffect, useRef, useState } from "react";
import "./rewards.css";

export type Pickup = { id: string; x: number; y: number };

export function CoinPickup({ pickup, onFinish }: { pickup: Pickup; onFinish: () => void }) {
  const coin = useRef<HTMLDivElement>(null);
  const [collected, setCollected] = useState(false);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const width = 91;
  const x = Math.min(Math.max(0, pickup.x), Math.max(0, innerWidth - width));
  const y = Math.min(Math.max(0, pickup.y), Math.max(0, innerHeight - 115));
  const right = Math.max(0, innerWidth - width - x);
  const distance = right >= 60 ? Math.min(135, right) : -Math.min(135, x);

  useEffect(() => {
    const controller = new AbortController();
    const animations: Animation[] = [];
    let finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      for (const animation of animations) animation.cancel();
      onFinish();
    }
    async function run() {
      if (!coin.current) return;
      if (reduced.matches) {
        setCollected(true);
        const feedback = coin.current.animate([{ opacity: 1 }, { opacity: 1 }], 650);
        animations.push(feedback);
        await feedback.finished;
        finish();
        return;
      }
      const incoming = coin.current.animate(
        [
          { opacity: 0, transform: `translateX(${distance}px) rotateY(0deg)` },
          {
            opacity: 1,
            transform: `translateX(${distance * 0.85}px) rotateY(90deg)`,
            offset: 0.15,
          },
          { opacity: 1, transform: "translateX(0) rotateY(540deg)" },
        ],
        { duration: 1400, easing: "linear", fill: "forwards" },
      );
      animations.push(incoming);
      await incoming.finished;
      if (finished) return;
      setCollected(true);
      const pickupEffect = coin.current.animate(
        [
          { opacity: 1, transform: "scale(1)" },
          { opacity: 1, transform: "translateY(-10px) scale(1.3)", offset: 0.35 },
          { opacity: 0, transform: "translateY(-34px) scale(.4)" },
        ],
        { duration: 650, fill: "forwards" },
      );
      animations.push(pickupEffect);
      await pickupEffect.finished;
      finish();
    }
    for (const event of ["pointerdown", "input", "visibilitychange"]) {
      document.addEventListener(event, finish, { signal: controller.signal });
    }
    window.addEventListener("resize", finish, { signal: controller.signal });
    window.addEventListener("scroll", finish, { signal: controller.signal, passive: true });
    reduced.addEventListener("change", finish, { signal: controller.signal });
    void run().catch(() => {
      if (!controller.signal.aborted) finish();
    });
    return () => {
      controller.abort();
      finished = true;
      for (const animation of animations) animation.cancel();
    };
  }, []);

  return (
    <div
      className="commet commet-coin-journey"
      style={{ left: x, top: y }}
      aria-hidden="true"
      data-phase={collected ? "collected" : "flowing"}
    >
      <div ref={coin} className="commet-pickup-coin" style={{ left: width / 2 }}>
        ✦
      </div>
      {collected && <span className="commet-pickup-label">+1 仮コイン</span>}
    </div>
  );
}
