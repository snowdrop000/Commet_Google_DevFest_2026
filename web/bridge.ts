import { demoStore } from "./model";
import { WebExtensionSession } from "./extension-session";
import { analyzeWithGemini, observeLogin, requestWebLogin, logout, currentLoginKind } from "./auth";

let storage: Storage | undefined;
try {
  storage = globalThis.localStorage;
} catch {
  /* private browsing */
}
export const webSession = new WebExtensionSession(demoStore, {
  storage,
  analyze: analyzeWithGemini,
  login: async () => {
    await requestWebLogin();
    webSession.setAuthentication(await currentLoginKind());
  },
  logout: async () => {
    await logout();
  },
});
observeLogin((kind) => webSession.setAuthentication(kind));
