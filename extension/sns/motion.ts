import type { Preferences } from "../core/messages";
import { restingPet, type PetAnimation } from "../ui/pet-animation";
type Position = NonNullable<Preferences["position"]>;
type Drag = Position & { startX: number; startY: number; moved: boolean };

export function createMotion(
  panel: HTMLElement,
  handle: HTMLElement,
  onPosition: (position: Position) => void,
  onAnimation: (animation: PetAnimation) => void,
) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let anchor: Position | null = null;
  let editor: HTMLElement | null = null;
  let drag: Drag | null = null;
  let suppressClick = false;
  let follow = true;
  let paused = false;
  let reading = false;
  let animation = restingPet;
  let arrivalTimer: ReturnType<typeof setTimeout> | undefined;

  function animatePet(action: PetAnimation["action"], direction = animation.direction) {
    if (animation.action === action && animation.direction === direction) return;
    animation = { action, direction };
    onAnimation(animation);
  }

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

  function readingDirection(left = panel.getBoundingClientRect().left) {
    const comment = editor?.getBoundingClientRect();
    return comment && comment.left + comment.width / 2 < left + panel.offsetWidth / 2
      ? "left"
      : "right";
  }

  function arrive() {
    clearTimeout(arrivalTimer);
    arrivalTimer = undefined;
    if (paused || drag || !editor?.isConnected || panel.dataset.motion !== "walking_to_input")
      return;
    reading = true;
    panel.dataset.motion = "peeking";
    animatePet("peek", readingDirection());
  }

  function place(x: number, y: number, state: string) {
    if (state !== "walking_to_input") {
      clearTimeout(arrivalTimer);
      arrivalTimer = undefined;
    }
    const currentX = state === "walking_to_input" ? panel.getBoundingClientRect().left : x;
    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.dataset.motion = state;
    if (state === "walking_to_input") {
      animatePet("walk", x < currentX ? "left" : x > currentX ? "right" : animation.direction);
      // Also settle when the browser skips transitionend (e.g. after a hidden tab).
      // Retargeting an expanding composer must not restart the arrival deadline.
      arrivalTimer ??= setTimeout(arrive, 800);
    } else if (state === "peeking") {
      reading = true;
      animatePet("peek", readingDirection(x));
    } else {
      animatePet("idle");
    }
  }

  function update() {
    if (drag) return;
    if (paused) {
      const rect = panel.getBoundingClientRect();
      const { x, y } = limits();
      place(Math.min(x, Math.max(0, rect.left)), Math.min(y, Math.max(0, rect.top)), "idle");
      return;
    }
    const [x, y] = home();
    if (!editor?.isConnected) {
      place(x, y, editor && reading ? "peeking" : "idle");
      return;
    }
    if (!follow || reduced.matches) {
      place(x, y, "peeking");
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
    const gap = 4;
    const clamp = (value: number, max: number) => Math.min(max, Math.max(0, value));
    // Bring the face alongside the text rather than below a full-width form.
    const besideTop = clamp(r.top + Math.min(r.height / 2, 24) - handle.offsetHeight * 0.55, maxY);
    const candidates: [number, number][] = [
      [r.right + gap, besideTop],
      [r.left - width - gap, besideTop],
      [clamp(r.right - width, maxX), area.top - height - gap],
      [clamp(r.right - width, maxX), area.bottom + gap + 44],
    ];
    const target = candidates.find(
      ([left, top]) => left >= 0 && left <= maxX && top >= 0 && top <= maxY,
    );
    if (!r.width || r.bottom < 0 || r.top > innerHeight || !target) {
      place(x, y, "peeking");
      return;
    }
    if (reading) {
      place(...target, "peeking");
      return;
    }
    if (
      Math.abs(parseFloat(panel.style.left) - target[0]) < 1 &&
      Math.abs(parseFloat(panel.style.top) - target[1]) < 1
    ) {
      if (panel.dataset.motion !== "walking_to_input") {
        place(...target, "peeking");
      }
      return;
    }
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
      ) {
        arrive();
      }
    },
    { signal },
  );
  handle.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button !== 0) return;
      const rect = panel.getBoundingClientRect();
      drag = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
      };
      suppressClick = false;
      handle.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    { signal },
  );
  handle.addEventListener(
    "pointermove",
    (event) => {
      if (!drag) return;
      if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 5)
        return;
      drag.moved = true;
      suppressClick = true;
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
    if (!drag.moved) {
      drag = null;
      if (panel.dataset.motion === "walking_to_input" && !arrivalTimer) arrive();
      return;
    }
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
  handle.addEventListener(
    "pointercancel",
    () => {
      suppressClick = true;
      stopDrag();
    },
    { signal },
  );
  handle.addEventListener(
    "click",
    (event) => {
      if (!suppressClick) return;
      suppressClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    { capture: true, signal },
  );
  addEventListener("resize", update, { signal });
  addEventListener("scroll", update, { passive: true, signal });
  reduced.addEventListener("change", update, { signal });
  const observer = new ResizeObserver(update);
  observer.observe(panel);
  return {
    dispose() {
      clearTimeout(arrivalTimer);
      cleanup.abort();
      observer.disconnect();
    },
    configure({ position, followComposer }: Pick<Preferences, "position" | "followComposer">) {
      anchor = position || null;
      follow = followComposer !== false;
      update();
    },
    focus(target: HTMLElement | null) {
      if (target !== editor) {
        // SNS editors can replace their contenteditable node during composition.
        if (!target || !editor || editor.isConnected) reading = false;
        clearTimeout(arrivalTimer);
        arrivalTimer = undefined;
      }
      editor = target;
      update();
    },
    pause(value: boolean) {
      paused = value;
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
  };
}
