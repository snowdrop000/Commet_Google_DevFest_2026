import { useEffect, useId, useRef } from "react";
import { Dashboard } from "./Dashboard";

export function PageSettingsDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="commet commet-wardrobe-dialog commet-page-settings"
      aria-labelledby={title}
      onClose={onClose}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <header className="commet-wardrobe-dialog-header">
        <h2 id={title}>ほしもちの設定・ログイン</h2>
        <button type="button" onClick={() => dialog.current?.close()}>
          閉じる
        </button>
      </header>
      <Dashboard embedded />
    </dialog>
  );
}
