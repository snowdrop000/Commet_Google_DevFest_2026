import { useEffect, useId, useRef, useState } from "react";
import { starCharacter, type Appearance, type Profile } from "../../shared/game";
import { send } from "../core/messages";
import { AppearanceForm } from "./AppearanceForm";
import { CharacterLab } from "./CharacterLab";

export function YoutubeWardrobe({
  profile,
  signedIn,
  onClose,
  onSaved,
}: {
  profile: Profile | null;
  signedIn: boolean;
  onClose: () => void;
  onSaved: () => void;
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
        <h2 id={title}>ほしもちの着せ替え</h2>
        <button type="button" disabled={saving} onClick={() => dialog.current?.close()}>
          閉じる
        </button>
      </header>
      {profile ? (
        <>
          {profile.characterType !== starCharacter && (
            <p>保存すると、使うキャラがほしもちに切り替わります。</p>
          )}
          <AppearanceForm
            pet={profile}
            fixedCharacter={starCharacter}
            saving={saving}
            onSave={save}
          />
          {error && <p role="alert">{error}</p>}
        </>
      ) : (
        <>
          <p>
            {signedIn
              ? "プロフィールを読み込めませんでした。試着はこのまま使えます。"
              : "ログインすると着せ替えを保存できます。"}
          </p>
          <CharacterLab />
        </>
      )}
    </dialog>
  );
}
