import { useEffect, useId, useRef, useState } from "react";
import {
  defaultEquipment,
  ITEM_CATALOG,
  newProfile,
  starCharacter,
  type Profile,
} from "../../shared/game";
import { GACHA_COST, gachaRates, type GachaResult } from "../../shared/gacha";
import { send } from "../core/messages";
import { Pet } from "./Pet";
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
              {result.rarity} · {item.name}
            </b>
            <p>
              {result.duplicate
                ? "持っているアイテムでした。かけら +1"
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
  preview = false,
  onUpdate,
}: {
  profile: Profile | null;
  preview?: boolean;
  onUpdate?: () => void;
}) {
  const [result, setResult] = useState<GachaResult | null>(null);
  const [pending, setPending] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  async function draw() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      const receipt = await send({ type: "gacha" });
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
    } finally {
      setPending(false);
    }
  }
  function completed() {
    if (preview || !result) {
      setPlaying(false);
      busy.current = false;
      return;
    }
    // Acknowledge only after the result was shown. Reopening before this replays the receipt.
    void send({ type: "gachaAck", requestId: result.requestId })
      .then(() => {
        setPlaying(false);
        busy.current = false;
      })
      .catch(() => setError("結果は保存済みです。通信を確認してから画面を開き直してください。"));
  }
  function sample(rare: boolean) {
    setResult({
      requestId: crypto.randomUUID(),
      itemId: rare ? "skin_star_pixel" : "skin_star_mint",
      rarity: rare ? "SR" : "R",
      duplicate: false,
    });
    setPlaying(true);
  }
  return (
    <div className="commet-gacha-panel">
      {preview ? (
        <p>演出プレビュー</p>
      ) : (
        <p>
          確定コイン <b>{profile?.confirmedCoins ?? 0}</b> 枚 · 1回 {GACHA_COST} 枚
        </p>
      )}
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
        {preview ? (
          <>
            <button onClick={() => sample(false)}>通常演出（N・R）を試す</button>
            <button onClick={() => sample(true)}>SR以上確定演出を試す</button>
          </>
        ) : (
          <button
            className="primary"
            disabled={pending || playing || !profile}
            onClick={() => void draw()}
          >
            {pending
              ? "抽選中…"
              : playing
                ? "彗星を待っています…"
                : `${GACHA_COST}枚でガチャを回す`}
          </button>
        )}
      </div>
      {!preview && (
        <small>
          N {gachaRates.N}% · R {gachaRates.R}% · SR {gachaRates.SR}% · UR {gachaRates.UR}%
          <br />
          消費するのは確定コインです。重複したアイテムはかけらになります。
        </small>
      )}
    </div>
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
        <h2 id={title}>ほしもちの彗星ガチャ</h2>
        <button onClick={() => dialog.current?.close()}>閉じる</button>
      </header>
      {!profile && <p>ログインすると、確定コインでガチャを回せます。</p>}
      <GachaPanel profile={profile} onUpdate={onUpdate} />
    </dialog>
  );
}
