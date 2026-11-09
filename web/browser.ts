import { webSession } from "./bridge";
import type { Message, Results } from "../extension/core/messages";

/** Build-only adapter for existing pet/gacha components. Never shipped in the extension. */
export const browser = {
  runtime: {
    getURL: (path: string) => `/web/${path.replace(/^\//, "")}`,
    sendMessage: async <M extends Message>(
      input: M,
    ): Promise<{ ok: true; value: Results[M["type"]] } | { ok: false; error: string }> => {
      try {
        return { ok: true, value: (await webSession.dispatch(input)) as Results[M["type"]] };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "操作に失敗しました。",
        };
      }
    },
    openOptionsPage: async () => {
      throw new Error("三本線メニューの設定・ログインをご利用ください。");
    },
  },
  storage: {
    onChanged: {
      addListener: webSession.addStorageListener,
      removeListener: webSession.removeStorageListener,
    },
  },
};
