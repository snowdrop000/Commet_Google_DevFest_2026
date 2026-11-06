import type { Preferences } from "../core/messages";
type Position = NonNullable<Preferences["position"]>;

export function createMotion(
  panel: HTMLElement,
  handle: HTMLElement,
  onPosition: (position: Position) => void,
) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let anchor: Position | null = null;
  let editor: HTMLElement | null = null;
  let drag: Position | null = null;
  let follow = true;

  function limits() {
    return {
      x: Math.max(0, innerWidth - panel.offsetWidth),
      y: Math.max(0, innerHeight - panel.offsetHeight),
    };
  }

  function home(): [number, number] {
    const { x, y } = limits();
    return anchor ? [anchor.x * x, anchor.y * y] : [Math.max(0, x - 22), Math.max(0, y - 22)];
  }

  function place(x: number, y: number, state: string) {
    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.dataset.motion = state;
  }

  function update() {
    if (drag) return;
    const [x, y] = home();
    if (!follow || reduced.matches || !editor?.isConnected) {
      place(x, y, "idle");
      return;
    }
    const r = editor.getBoundingClientRect();
    const obstruction = editor.closest(
      "form, [data-commet-compose], ytd-comment-simplebox-renderer, ytd-commentbox, ytd-comment-dialog-renderer",
    );
    const area = obstruction?.getBoundingClientRect() || r;
    const { x: maxX, y: maxY } = limits();
    const width = panel.offsetWidth,
      height = panel.offsetHeight;
    const gap = 16;
    const clamp = (value: number, max: number) => Math.min(max, Math.max(0, value));
    const candidates: [number, number][] = [
      [area.right + gap, clamp(r.top, maxY)],
      [area.left - width - gap, clamp(r.top, maxY)],
      [clamp(r.right - width, maxX), area.top - height - gap],
      [clamp(r.right - width, maxX), area.bottom + gap + 44],
    ];
    const target = candidates.find(
      ([left, top]) => left >= 0 && left <= maxX && top >= 0 && top <= maxY,
    );
    if (!r.width || r.bottom < 0 || r.top > innerHeight || !target) {
      place(x, y, "idle");
      return;
    }
    if (panel.style.left === `${target[0]}px` && panel.style.top === `${target[1]}px`) return;
    place(...target, "walking_to_input");
  }

  const cleanup = new AbortController();
  const signal = cleanup.signal;
  panel.addEventListener(
    "transitionend",
    (event) => {
      if (
        event.target === panel &&
        ["left", "top"].includes(event.propertyName) &&
        panel.dataset.motion === "walking_to_input"
      )
        panel.dataset.motion = "peeking";
    },
    { signal },
  );
  handle.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button !== 0) return;
      const rect = panel.getBoundingClientRect();
      drag = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      handle.setPointerCapture(event.pointerId);
      place(rect.left, rect.top, "dragging");
      event.preventDefault();
    },
    { signal },
  );
  handle.addEventListener(
    "pointermove",
    (event) => {
      if (!drag) return;
      const { x, y } = limits();
      place(
        Math.min(x, Math.max(0, event.clientX - drag.x)),
        Math.min(y, Math.max(0, event.clientY - drag.y)),
        "dragging",
      );
    },
    { signal },
  );
  const stopDrag = () => {
    if (!drag) return;
    const { x, y } = limits();
    anchor = {
      x: x ? parseFloat(panel.style.left) / x : 0,
      y: y ? parseFloat(panel.style.top) / y : 0,
    };
    drag = null;
    onPosition(anchor);
    update();
  };
  handle.addEventListener("lostpointercapture", stopDrag, { signal });
  addEventListener("resize", update, { signal });
  addEventListener("scroll", update, { passive: true, signal });
  reduced.addEventListener("change", update, { signal });
  const observer = new ResizeObserver(update);
  observer.observe(panel);
  return {
    dispose() {
      cleanup.abort();
      observer.disconnect();
    },
    configure({ position, followComposer }: Pick<Preferences, "position" | "followComposer">) {
      anchor = position || null;
      follow = followComposer !== false;
      update();
    },
    focus(target: HTMLElement | null) {
      editor = target;
      update();
    },
    wake() {
      if (!reduced.matches)
        panel.animate(
          [
            { scale: ".88", opacity: 0.6 },
            { scale: "1", opacity: 1 },
          ],
          360,
        );
    },
    explore(pet: HTMLElement, coin: HTMLElement | null) {
      if (reduced.matches || editor || drag || panel.dataset.motion !== "idle") return;
      pet.animate(
        [
          { translate: "0" },
          { translate: "12px -3px" },
          { translate: "21px 0" },
          { translate: "0" },
        ],
        { duration: 780, easing: "steps(5)" },
      );
      if (coin)
        coin.animate(
          [{ opacity: 1 }, { opacity: 1, offset: 0.6 }, { opacity: 0, translate: "0 -12px" }],
          780,
        );
    },
  };
}
