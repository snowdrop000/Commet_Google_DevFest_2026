import { useEffect, useRef, useState } from "react";
import { browser } from "wxt/browser";
import { CATEGORY_RULES, newProfile } from "../../shared/game";
import type { AnalyzeResponse } from "../../shared/model";
import { defaults, send, type State } from "../core/messages";
import { composerNear, contextFor, isComposer, readText, replaceDraft } from "../sns/composer";
import { createMotion } from "../sns/motion";
import type { Platform } from "../sns/platforms";
import { watchPost } from "../sns/post-confirmation";
import { Pet, Stats } from "./Pet";
import { restingPet } from "./pet-animation";

const initial: State = { signedIn: false, emulator: false, settings: defaults, profile: null };

export function Overlay({ platform }: { platform: Platform }) {
  const [state, setState] = useState(initial);
  const [view, setView] = useState<"check" | "status">("check");
  const [collapsed, setCollapsed] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(0);
  const [confirmed, setConfirmed] = useState(0);
  const [checking, setChecking] = useState(false);
  const [petAnimation, setPetAnimation] = useState(restingPet);
  const panel = useRef<HTMLElement>(null);
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
      preview.current = null;
      editor.current = null;
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
          if (pet)
            motion.current?.explore(
              pet,
              dragHandle.current?.querySelector<HTMLElement>(".commet-coin") ?? null,
            );
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
        if (
          preview.current?.editor === event.target &&
          readText(event.target) !== preview.current.text
        ) {
          preview.current = null;
          setResult(null);
        }
        motion.current?.focus(readText(event.target) ? event.target : null);
        void tick();
      },
      { capture: true, signal },
    );
    document.addEventListener(
      "focusin",
      (event) => {
        if (isComposer(event.target, platform)) editor.current = event.target;
      },
      { signal },
    );
    document.addEventListener(
      "focusout",
      (event) => {
        if (!isComposer(event.target, platform)) return;
        const root = panel.current?.getRootNode();
        if (root instanceof ShadowRoot && root.host === event.relatedTarget) return;
        motion.current?.focus(null);
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

  async function check() {
    const target =
      editor.current?.isConnected && readText(editor.current)
        ? editor.current
        : composerNear(null, platform);
    const text = readText(target);
    if (!target || text.length < 2) {
      setStatus("文章を2文字以上入力してください。");
      return;
    }
    if (text.length > 5000) {
      setStatus("判定できるのは5,000文字までです。");
      return;
    }
    setChecking(true);
    try {
      const context = contextFor(platform, target, state.settings.useContext);
      const analysis = await send({
        type: "preview",
        draft: { text, context, summarizeVideos: state.settings.summarizeVideos },
      });
      if (!target.isConnected || readText(target) !== text) return;
      preview.current = { editor: target, text };
      setResult(analysis);
      setStatus("投稿前のプレビューです。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "判定できませんでした。");
    } finally {
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
      setStatus("改善案を入力しました。送信前に内容を確認してください。");
    } else setStatus("入力欄を更新できませんでした。改善案をコピーして使えます。");
  }

  const pet = state.profile ?? newProfile();
  const analysis = result?.analysis;
  const rule = analysis ? CATEGORY_RULES[analysis.category] : null;
  return (
    <aside
      ref={panel}
      className="commet commet-card"
      data-collapsed={collapsed}
      aria-label="Commet"
    >
      <button
        className="commet-close"
        aria-label={collapsed ? "Commetを開く" : "Commetを閉じる"}
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? "+" : "−"}
      </button>
      <div ref={dragHandle} className="commet-drag">
        <Pet profile={pet} mood={rule?.mood} animation={petAnimation} />
        <span className="commet-coin" aria-hidden="true">
          ●
        </span>
        <small>LV. {pet.level}</small>
      </div>
      {!collapsed && (
        <>
          <div>
            <h2>
              {pet.name} · {platform.name}
            </h2>
            <button aria-pressed={view === "check"} onClick={() => setView("check")}>
              投稿チェック
            </button>{" "}
            <button aria-pressed={view === "status"} onClick={() => setView("status")}>
              育成状況
            </button>
            {view === "status" ? (
              <Stats profile={pet} />
            ) : (
              <>
                <p role="status">
                  {status ||
                    (state.signedIn
                      ? "ことばを一緒に見直そう。"
                      : "拡張機能のポップアップからログインできます。")}
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
                      有害性 {analysis.harm.severity} · 敬意 {analysis.dialogueStyle.respect} ·
                      建設性 {analysis.constructivenessScore} · 共感 {analysis.empathyScore} / 10
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
                  className="primary"
                  disabled={checking || !state.signedIn}
                  onClick={() => void check()}
                >
                  {checking ? "判定中…" : `この${platform.contentLabel}をチェック`}
                </button>
              </>
            )}
          </div>
          <p className="commet-wallet">
            探索コイン · 仮 {pending} ・ 確定 {confirmed}
          </p>
        </>
      )}
    </aside>
  );
}
