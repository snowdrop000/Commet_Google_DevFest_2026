import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { browser } from "wxt/browser";
import { CATEGORY_RULES, newProfile, starCharacter, type Profile } from "../../shared/game";
import type { AnalyzeResponse } from "../../shared/model";
import { defaults, send, type State } from "../core/messages";
import { composerNear, contextFor, isComposer, readText, replaceDraft } from "../sns/composer";
import { createMotion } from "../sns/motion";
import type { Platform } from "../sns/platforms";
import { watchPost } from "../sns/post-confirmation";
import { Pet, Stats } from "./Pet";
import { YoutubeWardrobe } from "./YoutubeWardrobe";
import { restingPet } from "./pet-animation";
import { CoinPickup, type Pickup } from "./CoinPickup";
import { GachaDialog } from "./Gacha";
import { OverlayIcon } from "./OverlayIcon";
import { PageSettingsDialog } from "./PageSettingsDialog";
import { starSkins } from "./star-skins";
import { placeOverlay } from "./overlay-placement";

const initial: State = { signedIn: false, emulator: false, settings: defaults, profile: null };
const guestPet: Profile = { ...newProfile(), characterType: starCharacter, name: "ほしもち" };

export function Overlay({ platform }: { platform: Platform }) {
  const [state, setState] = useState(initial);
  const [view, setView] = useState<"check" | "status">("check");
  const [menuOpen, setMenuOpen] = useState(false);
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [gachaOpen, setGachaOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pickup, setPickup] = useState<Pickup | null>(null);
  const uiOpen = useRef(false);
  uiOpen.current = menuOpen || wardrobeOpen || gachaOpen || settingsOpen;
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(0);
  const [checking, setChecking] = useState(false);
  const checkingInFlight = useRef(false);
  const [composing, setComposing] = useState(false);
  const [petAnimation, setPetAnimation] = useState(restingPet);
  const panel = useRef<HTMLElement>(null);
  const dock = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const speechBubble = useRef<HTMLSpanElement>(null);
  const menuPosition = useRef<{ x: number; y: number } | null>(null);
  const positionOverlays = useRef(() => {});
  const menuButton = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const dragHandle = useRef<HTMLDivElement>(null);
  const motion = useRef<ReturnType<typeof createMotion> | null>(null);
  const editor = useRef<HTMLElement | null>(null);
  const preview = useRef<{ editor: HTMLElement; text: string } | null>(null);
  const config = useRef(initial);
  const onRefresh = useRef<(() => void) | null>(null);

  useEffect(() => {
    let mounted = true;
    let refreshRevision = 0;
    const refresh = () => {
      const expected = ++refreshRevision;
      void send({ type: "state" })
        .then((next) => {
          if (!mounted || expected !== refreshRevision) return;
          if (!next.signedIn) {
            setResult(null);
            setPending(0);
          }
          if (config.current.signedIn !== next.signedIn) setStatus("");
          config.current = next;
          setState(next);
          motion.current?.configure(next.settings);
        })
        .catch(() => {});
    };
    onRefresh.current = refresh;
    if (panel.current && dragHandle.current) {
      motion.current = createMotion(
        panel.current,
        dragHandle.current,
        (position) => {
          const settings = { ...config.current.settings, position };
          config.current = { ...config.current, settings };
          void send({ type: "preferences", settings }).catch(() => {});
        },
        setPetAnimation,
      );
      motion.current.wake();
    }
    refresh();
    const changed = (changes: Record<string, unknown>, area: string) => {
      if (
        area === "local" &&
        ("commetPreferences" in changes ||
          "commetAuthRevision" in changes ||
          "commetProfileRevision" in changes)
      )
        refresh();
    };
    browser.storage.onChanged.addListener(changed);
    return () => {
      mounted = false;
      onRefresh.current = null;
      browser.storage.onChanged.removeListener(changed);
      motion.current?.dispose();
    };
  }, []);

  useEffect(() => {
    motion.current?.pause(menuOpen || wardrobeOpen || gachaOpen || settingsOpen);
  }, [menuOpen, wardrobeOpen, gachaOpen, settingsOpen]);

  useEffect(() => {
    if (!menuOpen || !state.signedIn) return;
    const refresh = () => {
      if (!document.hidden) onRefresh.current?.();
    };
    refresh();
    const timer = setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [menuOpen, view, state.signedIn]);

  useLayoutEffect(() => {
    const popup = menuOpen ? menu.current : null;
    const bubble =
      result && !checking && !wardrobeOpen && !gachaOpen && !settingsOpen
        ? speechBubble.current
        : null;
    if ((!popup && !bubble) || !panel.current) return;
    const root = panel.current;
    root.getAnimations().forEach((animation) => animation.cancel());
    function positionMenu() {
      const gap = 12;
      const menuMaxHeight = 520;
      const clamp = (value: number, min: number, max: number) =>
        Math.max(min, Math.min(Math.max(min, max), value));
      const rect = root.getBoundingClientRect();
      if (bubble) {
        const right = innerWidth - rect.right - gap,
          left = rect.left - gap;
        const onRight = right >= left;
        bubble.dataset.side = onRight ? "right" : "left";
        bubble.style.maxWidth = `${Math.max(1, Math.max(left, right) - 4)}px`;
        bubble.style.left = `${onRight ? root.offsetWidth + 4 : -bubble.offsetWidth - 4}px`;
        bubble.style.top = `${clamp((dragHandle.current?.offsetHeight ?? 140) * 0.55 - bubble.offsetHeight / 2, gap - rect.top, innerHeight - rect.top - bubble.offsetHeight - gap)}px`;
      }
      if (!popup) return;
      const speechRect = bubble?.getBoundingClientRect();
      const group = {
        left: Math.min(rect.left, speechRect?.left ?? rect.left),
        top: Math.min(rect.top, speechRect?.top ?? rect.top),
        right: Math.max(rect.right, speechRect?.right ?? rect.right),
        bottom: Math.max(rect.bottom, speechRect?.bottom ?? rect.bottom),
      };
      popup.dataset.compact = "false";
      popup.style.maxHeight = `${menuMaxHeight}px`;
      const desiredHeight = Math.min(menuMaxHeight, popup.offsetHeight);
      const position = placeOverlay(
        { width: innerWidth, height: innerHeight },
        group,
        { width: popup.offsetWidth, height: desiredHeight },
        menuPosition.current,
      );
      popup.dataset.compact = String(position.maxHeight < 360);
      popup.dataset.placement = position.direction;
      popup.style.maxHeight = `${position.maxHeight}px`;
      popup.style.left = `${position.x}px`;
      popup.style.top = `${position.y + (position.direction === "above" ? position.maxHeight - popup.offsetHeight : 0)}px`;
    }
    positionOverlays.current = positionMenu;
    positionMenu();
    const observer = new ResizeObserver(positionMenu);
    if (popup) observer.observe(popup);
    if (bubble) observer.observe(bubble);
    observer.observe(root);
    const movement = new MutationObserver(positionMenu);
    if (panel.current)
      movement.observe(panel.current, { attributes: true, attributeFilter: ["style"] });
    addEventListener("resize", positionMenu);
    return () => {
      observer.disconnect();
      movement.disconnect();
      positionOverlays.current = () => {};
      removeEventListener("resize", positionMenu);
    };
  }, [menuOpen, result, checking, wardrobeOpen, gachaOpen, settingsOpen]);

  useEffect(() => {
    if (menuOpen)
      menu.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen || wardrobeOpen || gachaOpen || settingsOpen) return;
    const events = new AbortController();
    const { signal } = events;
    const popup = menu.current;
    let drag: { id: number; startX: number; startY: number; x: number; y: number } | null = null;
    let dragged = false;
    popup?.addEventListener(
      "pointerdown",
      (event) => {
        dragged = false;
        if (
          event.button !== 0 ||
          !(event.target instanceof Element) ||
          event.target.closest("button, a, input, textarea, select, summary, .commet-suggestion p")
        )
          return;
        // Leave the scrolling surface available on short screens; drag by the header.
        if (popup.dataset.compact === "true" && !event.target.closest(".commet-menu-header"))
          return;
        popup.getAnimations().forEach((animation) => animation.finish());
        const rect = popup.getBoundingClientRect();
        if (event.clientX >= rect.right - 10) return;
        const content = popup.querySelector(".commet-menu-content")?.getBoundingClientRect();
        if (
          content &&
          event.clientX >= content.right - 12 &&
          event.clientX <= content.right &&
          event.clientY >= content.top &&
          event.clientY <= content.bottom
        )
          return;
        drag = {
          id: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          x: rect.left,
          y: rect.top,
        };
        popup.setPointerCapture(event.pointerId);
        event.preventDefault();
      },
      { signal },
    );
    popup?.addEventListener(
      "pointermove",
      (event) => {
        if (
          !drag ||
          event.pointerId !== drag.id ||
          (!dragged && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 5)
        )
          return;
        dragged = true;
        popup.dataset.dragging = "true";
        menuPosition.current = {
          x: drag.x + event.clientX - drag.startX,
          y: drag.y + event.clientY - drag.startY,
        };
        positionOverlays.current();
      },
      { signal },
    );
    const stopDrag = () => {
      drag = null;
      if (popup) delete popup.dataset.dragging;
    };
    popup?.addEventListener("lostpointercapture", stopDrag, { signal });
    popup?.addEventListener("pointercancel", stopDrag, { signal });
    popup?.addEventListener(
      "click",
      (event) => {
        if (!dragged) return;
        dragged = false;
        event.preventDefault();
        event.stopImmediatePropagation();
      },
      { capture: true, signal },
    );
    popup?.addEventListener(
      "keydown",
      (event) => {
        if (!(event.target instanceof Element) || !event.target.matches(".commet-menu-eyebrow"))
          return;
        const directions: Record<string, readonly [number, number]> = {
          ArrowLeft: [-12, 0],
          ArrowRight: [12, 0],
          ArrowUp: [0, -12],
          ArrowDown: [0, 12],
        };
        const delta = directions[event.key];
        if (!delta) return;
        event.preventDefault();
        popup.getAnimations().forEach((animation) => animation.finish());
        const rect = popup.getBoundingClientRect();
        menuPosition.current = { x: rect.left + delta[0], y: rect.top + delta[1] };
        positionOverlays.current();
      },
      { signal },
    );
    document.addEventListener(
      "pointerdown",
      (event) => {
        const root = panel.current?.getRootNode();
        const host = root instanceof ShadowRoot ? root.host : panel.current;
        if (host && event.composedPath().includes(host)) return;
        setMenuOpen(false);
      },
      { capture: true, signal },
    );
    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        setMenuOpen(false);
        menuButton.current?.focus({ preventScroll: true });
      },
      { capture: true, signal },
    );
    return () => events.abort();
  }, [menuOpen, wardrobeOpen, gachaOpen, settingsOpen]);

  useEffect(() => {
    const events = new AbortController();
    const signal = events.signal;
    const routeKey = () =>
      location.pathname +
      (platform.id === "youtube" ? new URL(location.href).searchParams.get("v") : "");
    let route = routeKey();
    let pageId = crypto.randomUUID();
    let posting = false;
    let lastAction = Date.now();
    let activeBefore = false;
    let lastTickAt = 0;
    let inFlight = false;
    let limitUntil = 0;
    let leaving = false;
    let generation = 0;

    function close() {
      if (config.current.signedIn) void send({ type: "leave", pageId }).catch(() => {});
    }
    function routeChanged() {
      const next = routeKey();
      if (next === route) return;
      close();
      route = next;
      pageId = crypto.randomUUID();
      generation++;
      activeBefore = false;
      setPending(0);
      setResult(null);
      setPickup(null);
      preview.current = null;
      editor.current = null;
      setComposing(false);
      motion.current?.focus(null);
      motion.current?.wake();
    }
    async function tick() {
      if (signal.aborted || leaving) return;
      routeChanged();
      const { settings, signedIn } = config.current;
      if (!signedIn || inFlight || posting || Date.now() < limitUntil) return;
      const typing =
        isComposer(document.activeElement, platform) && !!readText(document.activeElement);
      const active =
        settings.explore &&
        !document.hidden &&
        document.hasFocus() &&
        !typing &&
        Date.now() - lastAction < 60_000;
      if (active === activeBefore && (!active || Date.now() - lastTickAt < 15_000)) return;
      activeBefore = active;
      lastTickAt = Date.now();
      inFlight = true;
      const expected = generation;
      try {
        const balance = await send({ type: "tick", pageId, active });
        if (expected !== generation || signal.aborted || !config.current.signedIn) return;
        setPending(balance.pending);
        if (balance.confirmed !== config.current.profile?.confirmedCoins) onRefresh.current?.();
        if (balance.limited) {
          const day = 86_400_000,
            offset = 9 * 3_600_000;
          limitUntil = (Math.floor((Date.now() + offset) / day) + 1) * day - offset;
        }
        if (balance.picked) {
          const pet = dragHandle.current?.querySelector<HTMLElement>(".commet-pet");
          if (
            pet &&
            !uiOpen.current &&
            panel.current?.dataset.motion === "idle" &&
            !document.hidden
          ) {
            const rect = pet.getBoundingClientRect();
            setPickup({
              id: crypto.randomUUID(),
              x: rect.left,
              y: rect.top,
              direction: pet.dataset.direction === "left" ? "left" : "right",
            });
          }
        }
      } catch {
        /* The next heartbeat retries after a transient failure. */
      } finally {
        inFlight = false;
      }
    }
    const timer = setInterval(() => {
      void tick();
    }, 1000);
    const wake = () => {
      lastAction = Date.now();
    };
    for (const name of ["pointerdown", "keydown", "wheel"])
      document.addEventListener(name, wake, { passive: true, signal });
    document.addEventListener(
      "input",
      (event) => {
        if (!isComposer(event.target, platform)) return;
        editor.current = event.target;
        setComposing(true);
        if (
          !preview.current ||
          preview.current.editor !== event.target ||
          readText(event.target) !== preview.current.text
        ) {
          preview.current = null;
          setResult(null);
        }
        motion.current?.focus(event.target);
        void tick();
      },
      { capture: true, signal },
    );
    document.addEventListener(
      "focusin",
      (event) => {
        if (!isComposer(event.target, platform)) return;
        editor.current = event.target;
        setComposing(true);
        motion.current?.focus(event.target);
      },
      { signal },
    );
    document.addEventListener(
      "focusout",
      (event) => {
        if (!isComposer(event.target, platform)) return;
        const root = panel.current?.getRootNode();
        if (root instanceof ShadowRoot && root.host === event.relatedTarget) return;
        queueMicrotask(() => {
          if (signal.aborted) return;
          const active = document.activeElement;
          if (isComposer(active, platform)) {
            editor.current = active;
            motion.current?.focus(active);
            return;
          }
          setComposing(false);
          motion.current?.focus(null);
        });
      },
      { signal },
    );
    async function post(origin: Element) {
      const { signedIn, settings } = config.current;
      if (!signedIn || posting) return;
      const target = composerNear(origin, platform);
      const text = readText(target);
      if (!target || text.length < 2) return;
      routeChanged();
      const id = pageId;
      const postId = crypto.randomUUID();
      const context = settings.analyzeOnPost
        ? contextFor(platform, target, settings.useContext)
        : undefined;
      posting = true;
      const confirmation = watchPost(platform.id, text, target, readText);
      try {
        await send({ type: "beginPost", pageId: id, postId });
        const posted = await confirmation;
        if (posted && !signal.aborted && id === pageId) {
          setResult(null);
          preview.current = null;
        }
        const draft =
          posted && context && text.length <= 5000
            ? { text, context, summarizeVideos: settings.summarizeVideos }
            : undefined;
        const update = await send({ type: "finishPost", pageId: id, postId, draft });
        if (signal.aborted || id !== pageId || !config.current.signedIn) return;
        setPending(0);
        const settlement = update.result;
        setStatus(
          settlement?.status === "settled"
            ? `${settlement.multiplier?.toFixed(1)}倍で ${settlement.awarded} 枚確定`
            : settlement
              ? "投稿または判定を確認できず、精算を保留しました。"
              : "接続後に精算します。",
        );
        onRefresh.current?.();
      } catch (error) {
        if (!signal.aborted)
          setStatus(error instanceof Error ? error.message : "投稿の精算を確認できませんでした。");
      } finally {
        posting = false;
        activeBefore = false;
        void tick();
      }
    }
    document.addEventListener(
      "click",
      (event) => {
        const button =
          event.target instanceof Element ? event.target.closest(platform.submitSelector) : null;
        if (
          button &&
          !button.matches(":disabled") &&
          button.getAttribute("aria-disabled") !== "true"
        )
          void post(button);
      },
      { capture: true, signal },
    );
    document.addEventListener(
      "keydown",
      (event) => {
        if (
          platform.id === "x" &&
          event.key === "Enter" &&
          (event.metaKey || event.ctrlKey) &&
          !event.isComposing &&
          isComposer(event.target, platform)
        ) {
          void post(event.target);
        }
      },
      { capture: true, signal },
    );
    document.addEventListener(
      "visibilitychange",
      () => {
        void tick();
      },
      { signal },
    );
    addEventListener(
      "blur",
      () => {
        void tick();
      },
      { signal },
    );
    addEventListener("focus", wake, { signal });
    addEventListener(
      "pagehide",
      () => {
        leaving = true;
        close();
      },
      { signal },
    );
    addEventListener(
      "pageshow",
      (event) => {
        if (event.persisted) {
          pageId = crypto.randomUUID();
          generation++;
          leaving = false;
          activeBefore = false;
        }
      },
      { signal },
    );
    return () => {
      events.abort();
      clearInterval(timer);
    };
  }, [platform]);

  async function check(fromPet = false) {
    if (checkingInFlight.current) return;
    const target =
      editor.current?.isConnected && readText(editor.current)
        ? editor.current
        : composerNear(null, platform);
    const text = readText(target);
    if (!target || text.length < 2) {
      setStatus("文章を2文字以上入力してください。");
      if (fromPet) setMenuOpen(true);
      return;
    }
    if (text.length > 5000) {
      setStatus("判定できるのは5,000文字までです。");
      if (fromPet) setMenuOpen(true);
      return;
    }
    if (!state.signedIn) {
      setStatus("ログインすると、キャラをクリックしてコメントをチェックできます。");
      setMenuOpen(true);
      return;
    }
    const origin = location.href;
    checkingInFlight.current = true;
    setResult(null);
    setStatus("コメントを確認しています…");
    setChecking(true);
    try {
      const context = contextFor(platform, target, state.settings.useContext);
      const analysis = await send({
        type: "preview",
        draft: { text, context, summarizeVideos: state.settings.summarizeVideos },
      });
      if (
        !target.isConnected ||
        readText(target) !== text ||
        location.href !== origin ||
        !config.current.signedIn
      )
        return;
      preview.current = { editor: target, text };
      setResult(analysis);
      setStatus("");
    } catch (error) {
      if (!target.isConnected || readText(target) !== text || location.href !== origin) return;
      setStatus(error instanceof Error ? error.message : "判定できませんでした。");
      if (fromPet) setMenuOpen(true);
    } finally {
      checkingInFlight.current = false;
      setChecking(false);
    }
  }

  function apply() {
    const draft = preview.current;
    if (
      !draft?.editor.isConnected ||
      readText(draft.editor) !== draft.text ||
      !result?.analysis.suggestion
    ) {
      setStatus("文章が変わりました。もう一度チェックしてください。");
      return;
    }
    if (replaceDraft(draft.editor, result.analysis.suggestion)) {
      setResult(null);
      setMenuOpen(false);
      setStatus("改善案を入力しました。送信前に内容を確認してください。");
    } else setStatus("入力欄を更新できませんでした。改善案をコピーして使えます。");
  }

  const pet = state.profile ?? guestPet;
  const confirmed = pet.confirmedCoins;
  const analysis = result?.analysis;
  const rule = analysis ? CATEGORY_RULES[analysis.category] : null;
  const speech = !analysis
    ? ""
    : analysis.decision === "harmful"
      ? "んむ…。この言葉は、相手を傷つけちゃうかも。伝えたいことを残して、いっしょに整えてみよ？"
      : analysis.needsSecondaryCheck
        ? analysis.contextSufficient
          ? "んむ…。ことばの受け取り方が分かれそう。伝えたいことを、いっしょに確かめよ？"
          : "んむ…。もう少しお話がわかると、いっしょに考えられそう。"
        : analysis.appreciation > 0
          ? `わぁ、あったかいことばだね。${pet.name}も、ぽかぽかだよ。`
          : analysis.humor > 0
            ? `ふふっ、ことばに遊び心があるね。${pet.name}、にっこり。`
            : analysis.Q > 0
              ? `ふむふむ、考えを伝えてくれたんだね。${pet.name}、ちゃんと読んだよ。`
              : `うんうん、穏やかなことばだね。${pet.name}、ちゃんと読んだよ。`;
  const browsingAnimation =
    state.settings.explore &&
    !composing &&
    !uiOpen.current &&
    !rule &&
    petAnimation.action === "idle"
      ? { action: "walk" as const, direction: petAnimation.direction }
      : petAnimation;
  // While the menu is open, the pet stands still and shows off its held item.
  // A running check keeps its peeking pose so the user can see it is working.
  const showingProp = menuOpen && !checking && !rule && pet.equippedItems.prop !== "prop_none";
  const displayAnimation = checking
    ? { ...petAnimation, action: "peek" as const }
    : showingProp
      ? { ...petAnimation, action: "idle" as const }
      : rule
        ? { ...petAnimation, action: "idle" as const }
        : browsingAnimation;
  return (
    <>
      <aside ref={panel} className="commet commet-card" aria-label="Commet">
        <div
          ref={dragHandle}
          className="commet-drag commet-companion"
          role="button"
          tabIndex={0}
          aria-label="キャラにコメントをチェックしてもらう"
          aria-disabled={!composing || checking}
          aria-busy={checking}
          title={
            checking
              ? "判定中…"
              : composing
                ? "クリックでコメントをチェック／ドラッグで移動"
                : "ドラッグして移動"
          }
          onPointerDown={() => setMenuOpen(false)}
          onClick={() => {
            if (composing) void check(true);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            event.stopPropagation();
            if (composing) void check(true);
          }}
        >
          <Pet
            profile={pet}
            mood={
              checking
                ? "idle"
                : showingProp
                  ? "proud"
                  : (rule?.mood ?? (displayAnimation.action === "peek" ? "idle" : undefined))
            }
            animation={displayAnimation}
          />
        </div>
        <span
          ref={speechBubble}
          className={
            analysis && !checking && !wardrobeOpen && !gachaOpen && !settingsOpen
              ? "commet-speech"
              : "commet-visually-hidden"
          }
          role="status"
          aria-live="polite"
        >
          {checking ? "コメントを確認しています。" : speech}
        </span>
        <div ref={dock} className="commet-dock">
          <div
            className="commet-coin-counter"
            role="status"
            aria-label={`探索コイン 使えるコイン ${confirmed} 枚、確定前 ${pending} 枚`}
            title={`使えるコイン ${confirmed.toLocaleString()} 枚 / 確定前 ${pending.toLocaleString()} 枚`}
          >
            <span className="commet-coin-confirmed" aria-hidden="true">
              <OverlayIcon name="coin" />
              <span>{confirmed.toLocaleString()}</span>
            </span>
            <span className="commet-coin-pending" aria-hidden="true">
              <OverlayIcon name="coin" />
              <span>{pending.toLocaleString()}</span>
            </span>
          </div>
          <button
            ref={menuButton}
            type="button"
            className="commet-menu-toggle"
            aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-haspopup="dialog"
            data-notice={!menuOpen && Boolean(status || result)}
            onClick={() => {
              setPickup(null);
              setMenuOpen(!menuOpen);
            }}
          >
            <OverlayIcon name={menuOpen ? "close" : "menu"} />
          </button>
        </div>
        {menuOpen && (
          <div
            ref={menu}
            id={menuId}
            className="commet-menu"
            data-view={view}
            role="dialog"
            aria-label={`${pet.name}のメニュー`}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <header className="commet-menu-header">
              <p
                className="commet-menu-eyebrow"
                role="button"
                tabIndex={0}
                aria-label="パネルを移動"
                title="ドラッグ、または矢印キーでパネルを移動"
              >
                <span className="commet-wordmark">
                  Commet <span aria-hidden="true">✦</span>
                </span>
                <span className="commet-platform">{platform.name}</span>
              </p>
              <button
                type="button"
                className="commet-menu-dismiss"
                aria-label="メニューを閉じる"
                onClick={() => {
                  setMenuOpen(false);
                  menuButton.current?.focus({ preventScroll: true });
                }}
              >
                <OverlayIcon name="close" />
              </button>
            </header>
            <div
              className="commet-menu-profile"
              style={{
                backgroundColor: starSkins[pet.equippedItems.skin]?.background ?? "#fae8ef",
              }}
            >
              <div className="commet-menu-avatar" aria-hidden="true">
                <Pet profile={pet} mood="idle" />
              </div>
              <div className="commet-menu-identity">
                <h2>{pet.name}</h2>
                <p title="使えるコイン">
                  <OverlayIcon name="coin" />
                  <span>
                    <span className="commet-visually-hidden">使えるコイン </span>
                    <b key={confirmed}>{confirmed.toLocaleString()}</b>
                  </span>
                </p>
              </div>
              <span key={pet.level} className="commet-level">
                Lv. {pet.level}
              </span>
            </div>
            <nav className="commet-menu-nav" aria-label="Commetの機能">
              <button
                type="button"
                aria-pressed={view === "check"}
                onClick={() => setView("check")}
              >
                <OverlayIcon name="check" />
                <span>投稿チェック</span>
              </button>
              <button
                type="button"
                aria-pressed={view === "status"}
                onClick={() => setView("status")}
              >
                <OverlayIcon name="status" />
                <span>育成状況</span>
              </button>
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => {
                  setPickup(null);
                  setWardrobeOpen(true);
                }}
              >
                <OverlayIcon name="wardrobe" />
                <span>着せ替え</span>
              </button>
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => {
                  setPickup(null);
                  setGachaOpen(true);
                }}
              >
                <OverlayIcon name="gacha" />
                <span>ガチャ</span>
              </button>
            </nav>
            <div
              className="commet-menu-content"
              role="region"
              aria-label={view === "check" ? "判定と例文" : "育成記録"}
              tabIndex={0}
            >
              {view === "status" ? (
                <>
                  <h3>いっしょに育てた記録</h3>
                  <Stats profile={pet} />
                </>
              ) : (
                <>
                  {(status || !analysis) && (
                    <p className="commet-menu-message" role="status">
                      {status ||
                        (state.signedIn
                          ? "ことばを一緒に見直そう。"
                          : "ログインすると、投稿チェックと育成が使えます。")}
                    </p>
                  )}
                  {analysis && rule && (
                    <div key={analysis.suggestion + analysis.reason}>
                      <details className="commet-suggestion">
                        <summary>
                          <span className="commet-suggestion-closed">言い換え例を見る</span>
                          <span className="commet-suggestion-open">言い換え例を閉じる</span>
                        </summary>
                        <div>
                          <p>
                            {analysis.suggestion ||
                              (analysis.decision === "harmful"
                                ? "言い換え例を用意できなかったよ。伝えたい意見と、相手を傷つける表現を分けて見直してみよ？"
                                : analysis.needsSecondaryCheck
                                  ? "まだ判断が難しいので、無理に言い換えず、伝えたい内容や文脈を確かめてね。"
                                  : "今の表現に強い攻撃は見当たらないよ。無理に言い換えなくても大丈夫だよ。")}
                          </p>
                          {analysis.suggestion && preview.current && (
                            <button onClick={apply}>入力欄に反映</button>
                          )}
                        </div>
                      </details>
                      <section className="commet-result" data-tone={analysis.category}>
                        <b>
                          {rule.label}
                          {result?.demo ? "（デモ）" : ""}
                        </b>
                        <p>{analysis.reason}</p>
                        <small>
                          安全性 S {analysis.S} / 2 · 貢献度 Q {analysis.Q} / 2
                          <br />
                          投稿成功時：{analysis.needsSecondaryCheck ? "暫定 " : ""}
                          {analysis.xp} XP · コイン {analysis.coinMultiplier}倍
                        </small>
                        {result?.videoSource === "gemini_video" && (
                          <p>
                            <small>動画要約を考慮</small>
                          </p>
                        )}
                        {result?.videoSource === "page_metadata" && (
                          <p>
                            <small>動画タイトル・説明文を考慮</small>
                          </p>
                        )}
                      </section>
                    </div>
                  )}
                </>
              )}
            </div>
            {view === "check" && (
              <button
                type="button"
                className="primary commet-check-action"
                disabled={checking || !state.signedIn}
                aria-busy={checking}
                onClick={() => void check()}
              >
                <OverlayIcon name="check" />
                <span>{checking ? "判定中…" : `この${platform.contentLabel}をチェック`}</span>
              </button>
            )}
            <footer className="commet-menu-footer">
              <button
                type="button"
                className="commet-settings-link"
                onClick={() => {
                  setPickup(null);
                  setSettingsOpen(true);
                }}
              >
                <OverlayIcon name="settings" />
                {state.signedIn ? "設定" : "設定・ログイン"}
              </button>
            </footer>
          </div>
        )}
        {wardrobeOpen && (
          <YoutubeWardrobe
            profile={state.profile}
            signedIn={state.signedIn}
            onLogin={() => setSettingsOpen(true)}
            onClose={() => setWardrobeOpen(false)}
            onSaved={() => {
              setStatus("着せ替えを保存しました。");
              onRefresh.current?.();
            }}
          />
        )}
        {settingsOpen && <PageSettingsDialog onClose={() => setSettingsOpen(false)} />}
        {gachaOpen && (
          <GachaDialog
            profile={state.profile}
            onClose={() => setGachaOpen(false)}
            onUpdate={() => onRefresh.current?.()}
          />
        )}
      </aside>
      {pickup && <CoinPickup key={pickup.id} pickup={pickup} onFinish={() => setPickup(null)} />}
    </>
  );
}
