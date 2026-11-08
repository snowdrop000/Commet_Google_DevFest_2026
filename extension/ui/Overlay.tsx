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
  const [confirmed, setConfirmed] = useState(0);
  const [checking, setChecking] = useState(false);
  const checkingInFlight = useRef(false);
  const [composing, setComposing] = useState(false);
  const [petAnimation, setPetAnimation] = useState(restingPet);
  const panel = useRef<HTMLElement>(null);
  const dock = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
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
          setConfirmed(next.profile?.confirmedCoins ?? 0);
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

  useLayoutEffect(() => {
    if (!menuOpen || !menu.current || !dragHandle.current) return;
    const popup = menu.current;
    const anchor = dragHandle.current;
    function positionMenu() {
      const rect = anchor.getBoundingClientRect();
      const gap = 12;
      const aboveSpace = rect.top - gap * 2;
      popup.style.maxHeight = `${Math.max(0, aboveSpace >= 180 ? Math.min(innerHeight - gap * 2, aboveSpace) : innerHeight - gap * 2)}px`;
      const maxX = Math.max(gap, innerWidth - popup.offsetWidth - gap);
      const maxY = Math.max(gap, innerHeight - popup.offsetHeight - gap);
      const above = rect.top - popup.offsetHeight - gap;
      popup.style.left = `${Math.max(gap, Math.min(maxX, rect.right - popup.offsetWidth))}px`;
      popup.style.top = `${Math.max(gap, Math.min(maxY, above))}px`;
    }
    positionMenu();
    const observer = new ResizeObserver(positionMenu);
    observer.observe(popup);
    observer.observe(anchor);
    addEventListener("resize", positionMenu);
    popup.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    return () => {
      observer.disconnect();
      removeEventListener("resize", positionMenu);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen || wardrobeOpen || gachaOpen || settingsOpen) return;
    const events = new AbortController();
    const { signal } = events;
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
        setConfirmed(balance.confirmed);
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
        const draft =
          (await confirmation) && context && text.length <= 5000
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
        if (update.analysis) setResult(update.analysis);
        preview.current = null;
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
      setStatus("投稿前のプレビューです。");
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
  const analysis = result?.analysis;
  const rule = analysis ? CATEGORY_RULES[analysis.category] : null;
  const browsingAnimation =
    state.settings.explore &&
    !composing &&
    !uiOpen.current &&
    !rule &&
    petAnimation.action === "idle"
      ? { action: "walk" as const, direction: petAnimation.direction }
      : petAnimation;
  const displayAnimation = checking
    ? { ...petAnimation, action: "peek" as const }
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
                : (rule?.mood ?? (displayAnimation.action === "peek" ? "idle" : undefined))
            }
            animation={displayAnimation}
          />
        </div>
        <span className="commet-visually-hidden" role="status" aria-live="polite">
          {checking
            ? "コメントを確認しています。"
            : rule && analysis
              ? `${rule.label}。${analysis.reason}`
              : ""}
        </span>
        <div ref={dock} className="commet-dock">
          <div
            className="commet-coin-counter"
            role="status"
            aria-label={`探索コイン 合計 ${confirmed + pending} 枚。確定 ${confirmed} 枚、仮 ${pending} 枚`}
            title={`確定 ${confirmed.toLocaleString()} 枚 / 仮 ${pending.toLocaleString()} 枚`}
          >
            <OverlayIcon name="coin" />
            <span>{(confirmed + pending).toLocaleString()}</span>
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
            role="dialog"
            aria-label={`${pet.name}のメニュー`}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <header className="commet-menu-header">
              <p className="commet-menu-eyebrow">
                COMMET <span>· {platform.name}</span>
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
            <div className="commet-menu-profile">
              <div className="commet-menu-avatar" aria-hidden="true">
                <Pet profile={pet} mood="idle" />
              </div>
              <div className="commet-menu-identity">
                <h2>{pet.name}</h2>
                <p>
                  <OverlayIcon name="coin" />
                  <span>
                    確定 <b>{confirmed.toLocaleString()}</b>
                  </span>
                  <span>
                    仮 <b>{pending.toLocaleString()}</b>
                  </span>
                </p>
              </div>
              <span className="commet-level">Lv. {pet.level}</span>
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
            <div className="commet-menu-content">
              {view === "status" ? (
                <>
                  <h3>いっしょに育てた記録</h3>
                  <Stats profile={pet} />
                </>
              ) : (
                <>
                  <p className="commet-menu-message" role="status">
                    {status ||
                      (state.signedIn
                        ? "ことばを一緒に見直そう。"
                        : "ログインすると、投稿チェックと育成が使えます。")}
                  </p>
                  {analysis && rule && (
                    <section
                      className="commet-result"
                      data-tone={analysis.category}
                      key={analysis.suggestion + analysis.reason}
                    >
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
                      {analysis.suggestion && (
                        <details>
                          <summary>改善案を見る</summary>
                          <p>{analysis.suggestion}</p>
                          {preview.current && <button onClick={apply}>改善案を入力欄に反映</button>}
                        </details>
                      )}
                    </section>
                  )}
                  <button
                    type="button"
                    className="primary commet-check-action"
                    disabled={checking || !state.signedIn}
                    onClick={() => void check()}
                  >
                    <OverlayIcon name="check" />
                    {checking ? "判定中…" : `この${platform.contentLabel}をチェック`}
                  </button>
                </>
              )}
            </div>
            <footer className="commet-menu-footer">
              <p className="commet-wallet">
                <span>
                  確定 <b>{confirmed.toLocaleString()}</b>
                </span>
                <span>
                  仮 <b>{pending.toLocaleString()}</b>
                </span>
              </p>
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
