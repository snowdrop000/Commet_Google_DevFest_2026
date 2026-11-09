import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  currentLoginKind,
  firebaseConfigured,
  googleLogin,
  passwordLogin,
  type LoginRequest,
} from "./auth";
import { webSession } from "./bridge";

export function LoginDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  const pending = useRef<LoginRequest[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const open = (event: Event) => {
      pending.current.push((event as CustomEvent<LoginRequest>).detail);
      setError("");
      dialog.current?.showModal();
    };
    window.addEventListener("commet:web-login", open);
    if (new URL(location.href).searchParams.get("login") === "1") dialog.current?.showModal();
    return () => {
      window.removeEventListener("commet:web-login", open);
      pending.current.forEach((task) => task.reject(new Error("ログインをキャンセルしました。")));
    };
  }, []);
  async function login(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
      const kind = await currentLoginKind();
      if (!kind) throw new Error("このアカウントではログインできません。");
      webSession.setAuthentication(kind);
      webSession.setMode("gemini");
      pending.current.forEach((task) => task.resolve());
      pending.current = [];
      setPassword("");
      dialog.current?.close();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ログインできませんでした。");
    } finally {
      setBusy(false);
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    void login(() => passwordLogin(email, password));
  }
  return (
    <dialog
      ref={dialog}
      className="demo-login-dialog"
      aria-labelledby="web-login-title"
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
      onClose={() => {
        pending.current.forEach((task) => task.reject(new Error("ログインをキャンセルしました。")));
        pending.current = [];
        setPassword("");
      }}
    >
      <header>
        <h2 id="web-login-title">Commetにログイン</h2>
        <button
          type="button"
          aria-label="ログイン画面を閉じる"
          disabled={busy}
          onClick={() => dialog.current?.close()}
        >
          ×
        </button>
      </header>
      <p>審査用アカウントでログインすると、Gemini判定を利用できます。</p>
      <form onSubmit={submit}>
        <label htmlFor="login-email">メールアドレス</label>
        <input
          id="login-email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={busy}
        />
        <label htmlFor="login-password">パスワード</label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={256}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={busy}
        />
        {error && <p role="alert">{error}</p>}
        <button type="submit" className="demo-login-submit" disabled={busy || !firebaseConfigured}>
          {busy ? "ログイン中…" : "ログイン"}
        </button>
      </form>
      <div className="demo-login-divider">または</div>
      <button
        type="button"
        className="demo-google-login"
        disabled={busy || !firebaseConfigured}
        onClick={() => void login(googleLogin)}
      >
        Googleでログイン
      </button>
      <small>
        育成や着せ替えはこのブラウザに保存されます。Geminiの利用には日次上限があります。
      </small>
    </dialog>
  );
}
