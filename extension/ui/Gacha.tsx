import { useEffect, useId, useRef, useState } from "react";
import {
  defaultEquipment,
  ITEM_CATALOG,
  newProfile,
  starCharacter,
  totalShards,
  type Profile,
} from "../../shared/game";
import {
  displayRarity,
  exchangeSlots,
  gachaOnlyItems,
  GACHA_COST,
  gachaRates,
  shardCosts,
  type ExchangeRequest,
  type ExchangeResult,
  type ExchangeSelection,
  type ExchangeShop,
  type GachaResult,
} from "../../shared/gacha";
import { send } from "../core/messages";
import { Pet } from "./Pet";
import { OverlayIcon } from "./OverlayIcon";
import "./rewards.css";

function GachaReveal({ result, onReveal }: { result: GachaResult; onReveal: () => void }) {
  const [revealed, setRevealed] = useState(false);
  const completed = useRef(false);
  const callback = useRef(onReveal);
  callback.current = onReveal;
  const gradient = useId();
  const rare = result.rarity === "SR" || result.rarity === "UR";
  const item = ITEM_CATALOG[result.itemId];
  function reveal() {
    if (completed.current) return;
    completed.current = true;
    setRevealed(true);
    callback.current();
  }
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const timer = setTimeout(reveal, reduced.matches ? 0 : 2600);
    const changed = () => {
      if (reduced.matches) reveal();
    };
    reduced.addEventListener("change", changed);
    return () => {
      clearTimeout(timer);
      reduced.removeEventListener("change", changed);
    };
  }, []);
  const pet = {
    ...newProfile(),
    characterType: starCharacter,
    equippedItems: { ...defaultEquipment, [item.slot]: result.itemId },
  } satisfies Profile;
  return (
    <div
      className="commet-gacha-reveal"
      data-rare={rare}
      data-phase={revealed ? "revealed" : "flight"}
      data-item={revealed ? result.itemId : undefined}
    >
      <div className="commet-gacha-sky" aria-hidden="true">
        <span className="commet-gacha-stars">✧ · ˚ · ✦ · ˚ · ✧</span>
        <svg className="commet-gacha-comet" viewBox="0 0 220 90">
          <defs>
            <linearGradient id={gradient}>
              <stop stopColor="currentColor" stopOpacity="0" />
              <stop offset="1" stopColor="currentColor" />
            </linearGradient>
          </defs>
          <path d="M3 74 185 24 199 45Z" fill={`url(#${gradient})`} />
          <path d="m190 19 4 10 11 4-10 4-4 11-4-10-11-4 10-4Z" fill="currentColor" />
          <circle cx="191" cy="34" r="5" fill="#fffefa" />
          <path
            d="m42 78 109-31M80 75l74-23"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity=".55"
          />
        </svg>
        <div className="commet-gacha-burst" />
        {revealed && (
          <div className="commet-gacha-item">
            <Pet profile={pet} mood={item.slot === "prop" ? "proud" : "idle"} />
          </div>
        )}
      </div>
      <div className="commet-gacha-result" role="status">
        {revealed ? (
          <>
            <b>
              <span className="commet-result-rarity">{result.rarity}</span> · {item.name}
            </b>
            {gachaOnlyItems.includes(result.itemId) && <small>ガチャ限定</small>}
            <p>
              {result.duplicate
                ? `持っているアイテムでした。星のかけら +${result.shardsAwarded ?? 1}`
                : "新しいアイテムをゲット！"}
            </p>
          </>
        ) : (
          <b>{rare ? "SR以上確定！" : "彗星が近づいてきた…"}</b>
        )}
      </div>
      {!revealed && (
        <button type="button" onClick={reveal}>
          演出をスキップ
        </button>
      )}
    </div>
  );
}

export function GachaPanel({
  profile,
  onUpdate,
}: {
  profile: Profile | null;
  onUpdate?: () => void;
}) {
  const [result, setResult] = useState<GachaResult | null>(null);
  const [pending, setPending] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [exchanging, setExchanging] = useState(false);
  const [canRecover, setCanRecover] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const signedIn = Boolean(profile);
  useEffect(() => {
    let active = true;
    if (!signedIn) {
      setReady(false);
      setCanRecover(false);
      return;
    }
    void send({ type: "gachaPending" })
      .then((request) => {
        if (active) {
          setCanRecover(Boolean(request));
          setReady(true);
        }
      })
      .catch((error) => {
        if (active)
          setError(
            error instanceof Error
              ? error.message
              : "抽選結果を確認できませんでした。同じ抽選を再試行できます。",
          );
      });
    return () => {
      active = false;
    };
  }, [signedIn]);
  async function draw() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      const receipt = await send({ type: "gacha" });
      setCanRecover(true);
      setResult(receipt);
      setPlaying(true);
      onUpdate?.();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "抽選結果を確認できませんでした。同じ抽選を再試行できます。",
      );
      busy.current = false;
      void send({ type: "gachaPending" })
        .then((request) => setCanRecover(Boolean(request)))
        .catch(() => {});
      onUpdate?.();
    } finally {
      setPending(false);
    }
  }
  function completed() {
    if (!result) {
      setPlaying(false);
      busy.current = false;
      return;
    }
    // Acknowledge only after the result was shown. Reopening before this replays the receipt.
    void send({ type: "gachaAck", requestId: result.requestId })
      .then(() => {
        setCanRecover(false);
        setPlaying(false);
        busy.current = false;
      })
      .catch(() => setError("結果は保存済みです。通信を確認してから画面を開き直してください。"));
  }
  return (
    <div className="commet-gacha-panel">
      <p className="commet-gacha-wallet">
        <span>
          <OverlayIcon name="coin" />
          確定コイン <b>{profile?.confirmedCoins ?? 0}</b> 枚
        </span>
        <span className="commet-gacha-price"> · 1回 {GACHA_COST} 枚</span>
      </p>
      {result ? (
        <GachaReveal key={result.requestId} result={result} onReveal={completed} />
      ) : (
        <div className="commet-gacha-idle">
          <span aria-hidden="true">✦</span>
          <p>彗星が運ぶ、ほしもちの宝物</p>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      <div className="commet-reward-actions">
        <button
          className="primary"
          disabled={
            pending ||
            playing ||
            exchanging ||
            !profile ||
            !ready ||
            (!canRecover && profile.confirmedCoins < GACHA_COST)
          }
          onClick={() => void draw()}
        >
          {pending ? "抽選中…" : playing ? "彗星を待っています…" : `${GACHA_COST}枚でガチャを回す`}
        </button>
      </div>
      <small className="commet-gacha-guide">
        N {gachaRates.N}% · R {gachaRates.R}% · SR {gachaRates.SR}% · UR {gachaRates.UR}%
        <br />
        消費するのは確定コインです。重複すると星のかけらを獲得します（N: 1個・R: 3個・SR: 5個・UR:
        8個）。
      </small>
      <ShardExchange
        profile={profile}
        blocked={pending || playing}
        onBusy={(busy) => {
          setExchanging(busy);
          if (busy) setResult(null);
        }}
        onUpdate={onUpdate}
      />
    </div>
  );
}

function ShardExchange({
  profile,
  blocked,
  onBusy,
  onUpdate,
}: {
  profile: Profile | null;
  blocked: boolean;
  onBusy: (busy: boolean) => void;
  onUpdate?: () => void;
}) {
  const [shop, setShop] = useState<ExchangeShop | null>(null);
  const [pending, setPending] = useState<ExchangeRequest | null>(null);
  const [result, setResult] = useState<ExchangeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState("");
  const guard = useRef(false);
  const pendingRevision = useRef(0);
  const signedIn = Boolean(profile);
  const ownershipKey = profile ? [...profile.unlockedItems].sort().join("|") : "";
  useEffect(() => {
    let active = true;
    let revision = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (!signedIn) {
      setShop(null);
      setReady(false);
      return;
    }
    async function refresh() {
      const expected = ++revision;
      const expectedPending = pendingRevision.current;
      setReady(false);
      clearTimeout(timer);
      try {
        const [offers, request] = await Promise.all([
          send({ type: "exchangeShop" }),
          send({ type: "exchangePending" }),
        ]);
        if (!active || expected !== revision) return;
        setShop(offers);
        if (expectedPending === pendingRevision.current) setPending(request);
        setReady(true);
        // Use the server's remaining day, so a misconfigured device clock cannot freeze the shop.
        timer = setTimeout(
          () => void refresh(),
          Math.max(1000, offers.refreshAt - offers.serverTime + 250),
        );
      } catch (error) {
        if (active && expected === revision)
          setError(error instanceof Error ? error.message : "交換所を読み込めませんでした。");
      }
    }
    const visible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    void refresh();
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("focus", visible);
    return () => {
      active = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("focus", visible);
    };
  }, [signedIn, reload, ownershipKey]);

  async function exchange(selection: ExchangeSelection, requestId?: string) {
    if (guard.current) return;
    guard.current = true;
    pendingRevision.current++;
    setBusy(true);
    onBusy(true);
    setError("");
    setResult(null);
    try {
      const receipt = await send({ type: "exchange", selection, requestId });
      setResult(receipt);
      pendingRevision.current++;
      setPending(
        receipt.day
          ? { requestId: receipt.requestId, itemId: receipt.itemId, day: receipt.day }
          : { requestId: receipt.requestId, rarity: receipt.rarity, slot: receipt.slot },
      );
      onUpdate?.();
    } catch (error) {
      setError(error instanceof Error ? error.message : "交換結果を確認できませんでした。");
      try {
        const request = await send({ type: "exchangePending" });
        pendingRevision.current++;
        setPending(request);
      } catch {
        setReady(false);
      }
      setBusy(false);
      onBusy(false);
      guard.current = false;
      // Refresh expired offers and ownership after a definitive rejection.
      setReload((value) => value + 1);
      onUpdate?.();
    }
  }
  function completed() {
    if (!result) return;
    void send({ type: "exchangeAck", requestId: result.requestId })
      .then(() => {
        pendingRevision.current++;
        setPending(null);
        setBusy(false);
        onBusy(false);
        guard.current = false;
      })
      .catch(() => setError("交換は保存済みです。画面を開き直すと同じ結果を確認できます。"));
  }
  const offers = profile
    ? (shop?.items ?? []).filter((id) => !profile.unlockedItems.includes(id))
    : [];
  return (
    <section className="commet-shard-exchange" aria-label="かけら交換">
      <header className="commet-exchange-heading">
        <div>
          <h3>今日のかけら交換</h3>
          <p>気に入ったアイテムを選んで交換しよう。</p>
        </div>
        {shop && (
          <span className="commet-exchange-date">
            {shop.day.replaceAll("-", "/")}
            <small>毎日 0:00 更新 · 日本時間</small>
          </span>
        )}
      </header>
      <div className="commet-shard-balance" aria-label="所持かけら">
        <span>星のかけら</span>
        <b>{totalShards(profile?.gacha.shards ?? 0).toLocaleString()}</b>
        <span>個</span>
      </div>
      {!profile && <p>ログインすると、今日のラインナップを確認できます。</p>}
      {profile && !ready && !error && <p role="status">交換所を読み込み中…</p>}
      {pending && (
        <div className="commet-exchange-pending">
          <p>前回の交換結果を確認できます。追加の星のかけらは消費しません。</p>
          <button
            type="button"
            disabled={!ready || blocked || busy}
            onClick={() => {
              const { requestId, ...selection } = pending;
              void exchange(selection, requestId);
            }}
          >
            交換結果を確認
          </button>
        </div>
      )}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setError("");
              setReload((value) => value + 1);
            }}
          >
            交換所を再読み込み
          </button>
        </div>
      )}
      <div className="commet-exchange-items">
        {offers.map((id) => {
          const item = ITEM_CATALOG[id];
          if (!item || !shop) return null;
          const rarity = displayRarity[id] ?? "N";
          const cost = shardCosts[rarity];
          const balance = totalShards(profile?.gacha.shards ?? 0);
          const preview: Profile = {
            ...newProfile(),
            characterType: starCharacter,
            equippedItems: { ...defaultEquipment, [item.slot]: id },
          };
          return (
            <article className="commet-exchange-item" key={id} data-item={id}>
              <div className="commet-exchange-art" aria-hidden="true">
                <Pet profile={preview} mood={item.slot === "prop" ? "proud" : "idle"} />
              </div>
              <div className="commet-exchange-item-title">
                <span className="commet-exchange-rarity" data-rarity={rarity}>
                  {rarity}
                </span>
                <small>{exchangeSlots[item.slot]}</small>
              </div>
              <h4>{item.name}</h4>
              <p className="commet-exchange-cost">
                星のかけら <b>{cost}</b>個
              </p>
              <button
                type="button"
                aria-label={item.name + "と交換"}
                disabled={
                  !profile || !ready || blocked || busy || Boolean(pending) || balance < cost
                }
                onClick={() => void exchange({ itemId: id, day: shop.day })}
              >
                {balance < cost ? "あと" + (cost - balance) + "個" : "交換する"}
              </button>
            </article>
          );
        })}
      </div>
      {profile && ready && shop && !offers.length && (
        <p className="commet-exchange-empty">交換対象のアイテムはすべて所持しています。</p>
      )}
      {offers.length > 0 && <small>星のかけらで、表示中のアイテムと交換できます。</small>}
      {result && <GachaReveal key={result.requestId} result={result} onReveal={completed} />}
    </section>
  );
}

export function GachaDialog({
  profile,
  onClose,
  onUpdate,
}: {
  profile: Profile | null;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="commet commet-wardrobe-dialog commet-gacha-dialog"
      aria-labelledby={title}
      onClose={onClose}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <header className="commet-wardrobe-dialog-header">
        <div className="commet-dialog-title">
          <span aria-hidden="true">ほしもち</span>
          <h2 id={title}>ほしもちの彗星ガチャ</h2>
        </div>
        <button onClick={() => dialog.current?.close()}>
          閉じる <OverlayIcon name="close" />
        </button>
      </header>
      {!profile && <p>ログインすると、確定コインでガチャを回せます。</p>}
      <GachaPanel profile={profile} onUpdate={onUpdate} />
    </dialog>
  );
}
