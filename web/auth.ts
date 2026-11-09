import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { analyzeResponse, type AnalyzeRequest } from "../shared/model";
import { requestTimeouts } from "../shared/request-timeouts";

declare const __FIREBASE_CONFIG__: {
  apiKey?: string;
  appId?: string;
  authDomain?: string;
  projectId?: string;
};
const config = __FIREBASE_CONFIG__;
export const firebaseConfigured = Boolean(
  config.apiKey && config.projectId && config.authDomain && config.appId,
);
const auth = firebaseConfigured ? getAuth(initializeApp(config, "commet-web")) : null;
if (auth) auth.languageCode = "ja";
export type WebLoginKind = "google" | "demo" | null;
async function loginKind(user: User | null): Promise<WebLoginKind> {
  if (!user) return null;
  const result = await user.getIdTokenResult();
  if (result.signInProvider === "google.com") return "google";
  return result.signInProvider === "password" && result.claims.commetWebDemo === true
    ? "demo"
    : null;
}
export const currentLoginKind = () => loginKind(auth?.currentUser ?? null);
export function observeLogin(callback: (kind: WebLoginKind) => void) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  let revision = 0;
  const stop = onAuthStateChanged(auth, (user) => {
    const expected = ++revision;
    void loginKind(user)
      .then((kind) => {
        if (expected === revision) callback(kind);
      })
      .catch(() => {
        if (expected === revision) callback(null);
      });
  });
  return () => {
    revision++;
    stop();
  };
}
export async function googleLogin() {
  if (!auth)
    throw new Error("Googleログインの設定がまだ完了していません。サンプル判定は利用できます。");
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "auth/unauthorized-domain")
      throw new Error("このURLのGoogleログイン設定を確認中です。サンプル判定をご利用ください。");
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request")
      throw new Error("ログインをキャンセルしました。");
    if (code === "auth/popup-blocked")
      throw new Error("ポップアップがブロックされました。許可してから再度ログインしてください。");
    throw new Error("Googleログインに失敗しました。時間をおいて再度お試しください。");
  }
}
export async function passwordLogin(email: string, password: string) {
  if (!auth) throw new Error("ログインの設定を確認してください。");
  try {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    if ((await loginKind(credential.user)) !== "demo") {
      await signOut(auth);
      throw new Error("審査用アカウントを入力してください。");
    }
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "auth/too-many-requests")
      throw new Error("ログインを試しすぎました。少し待ってからお試しください。");
    if (code?.startsWith("auth/"))
      throw new Error("メールアドレスまたはパスワードを確認してください。");
    throw error;
  }
}
export async function logout() {
  if (auth) await signOut(auth);
}
export type LoginRequest = { resolve: () => void; reject: (error: Error) => void };
export function requestWebLogin(): Promise<void> {
  return new Promise((resolve, reject) =>
    window.dispatchEvent(
      new CustomEvent<LoginRequest>("commet:web-login", { detail: { resolve, reject } }),
    ),
  );
}
export async function analyzeWithGemini(input: AnalyzeRequest, signal: AbortSignal) {
  const kind = await currentLoginKind();
  if (!auth?.currentUser || !kind) throw new Error("Gemini判定にはログインが必要です。");
  const token = await auth.currentUser.getIdToken();
  const response = await fetch(kind === "demo" ? "/web-demo/analyze" : "/v1/analyze", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal: AbortSignal.any([signal, AbortSignal.timeout(requestTimeouts.analysis)]),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      typeof json?.error === "string" ? json.error : "Geminiの判定を取得できませんでした。",
    );
  return analyzeResponse.parse(json);
}
