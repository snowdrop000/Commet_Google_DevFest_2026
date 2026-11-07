import { useEffect, useId, useRef, useState } from "react";
import { starCharacter, type Appearance, type Profile } from "../../shared/game";
import { send } from "../core/messages";
import { AppearanceForm } from "./AppearanceForm";
import { CharacterLab } from "./CharacterLab";
import { OverlayIcon } from "./OverlayIcon";

export function YoutubeWardrobe({
  profile,
  signedIn,
  onClose,
  onSaved,
  onLogin,
}: {
  profile: Profile | null;
  signedIn: boolean;
  onClose: () => void;
  onSaved: () => void;
  onLogin: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  async function save(appearance: Appearance) {
    setSaving(true);
    setError("");
    try {
      await send({ type: "appearance", appearance });
      onSaved();
      dialog.current?.close();
    } catch (error) {
      setError(error instanceof Error ? error.message : "着せ替えを保存できませんでした。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="commet commet-wardrobe-dialog"
      aria-labelledby={title}
      onClose={onClose}
      onCancel={(event) => {
        if (saving) event.preventDefault();
      }}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <header className="commet-wardrobe-dialog-header">
        <div className="commet-dialog-title">
          <span aria-hidden="true">ほしもち</span>
          <h2 id={title}>ほしもちの着せ替え</h2>
        </div>
        <button type="button" disabled={saving} onClick={() => dialog.current?.close()}>
          閉じる <OverlayIcon name="close" />
        </button>
      </header>
      {profile ? (
        <>
          <AppearanceForm
            pet={profile}
            fixedCharacter={starCharacter}
            saving={saving}
            onSave={save}
          />
        </>
      ) : (
        <>
          <p className="commet-wardrobe-notice">
            {signedIn
              ? "プロフィールを読み込めませんでした。試着はこのまま使えます。"
              : "現在は試着モードです。名前や着せ替えを保存するには、Commetへのログインが必要です。"}
          </p>
          {!signedIn && (
            <button
              type="button"
              onClick={() => {
                dialog.current?.close();
                onLogin();
              }}
            >
              Commetのログイン画面を開く
            </button>
          )}
          <CharacterLab />
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </dialog>
  );
}
