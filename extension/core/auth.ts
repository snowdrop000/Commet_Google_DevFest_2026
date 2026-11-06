import { initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  GoogleAuthProvider,
  indexedDBLocalPersistence,
  initializeAuth,
  signInAnonymously,
  signInWithCredential,
  signOut,
} from "firebase/auth/web-extension";
import { browser } from "wxt/browser";

const projectId = import.meta.env.WXT_FIREBASE_PROJECT_ID || "demo-commet";
export const emulator = projectId.startsWith("demo-");
const firebase = initializeApp({
  apiKey: import.meta.env.WXT_FIREBASE_API_KEY || "fake-api-key",
  appId: import.meta.env.WXT_FIREBASE_APP_ID || "commet-demo",
  authDomain: import.meta.env.WXT_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
  projectId,
});
const auth = initializeAuth(firebase, { persistence: indexedDBLocalPersistence });
if (emulator) {
  connectAuthEmulator(auth, import.meta.env.WXT_FIREBASE_AUTH_EMULATOR || "http://127.0.0.1:9099", {
    disableWarnings: true,
  });
}

export async function currentUser() {
  await auth.authStateReady();
  return auth.currentUser;
}

// getAuthToken is Chrome-specific and is absent from the cross-browser polyfill types.
type ChromeIdentity = {
  getAuthToken(options: { interactive: boolean }): Promise<{ token?: string }>;
  removeCachedAuthToken(options: { token: string }): Promise<void>;
};
const chromeIdentity = (
  globalThis as typeof globalThis & { chrome?: { identity?: ChromeIdentity } }
).chrome?.identity;
let googleAccessToken: string | undefined;

export async function login() {
  if (emulator) {
    await signInAnonymously(auth);
  } else {
    if (
      !chromeIdentity ||
      !import.meta.env.WXT_GOOGLE_CLIENT_ID ||
      !import.meta.env.WXT_FIREBASE_API_KEY
    ) {
      throw new Error("FirebaseとChrome用Google OAuthクライアントを設定してください。");
    }
    const { token } = await chromeIdentity.getAuthToken({ interactive: true });
    if (!token) throw new Error("Googleの認証情報を取得できませんでした。");
    await signInWithCredential(auth, GoogleAuthProvider.credential(null, token));
    googleAccessToken = token;
  }
  await browser.storage.local.set({ commetAuthRevision: crypto.randomUUID() });
}

export async function logout() {
  await signOut(auth);
  if (googleAccessToken && chromeIdentity) {
    await chromeIdentity.removeCachedAuthToken({ token: googleAccessToken }).catch(() => {});
    googleAccessToken = undefined;
  }
  await browser.storage.local.set({ commetAuthRevision: crypto.randomUUID() });
}
