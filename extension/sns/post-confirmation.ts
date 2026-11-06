import type { Platform } from "./platforms";

const YOUTUBE_COMMENT =
  "ytd-comment-view-model #content-text, ytd-comment-renderer #content-text, ytm-comment-renderer .comment-text";
const X_TOAST = '[data-testid="toast"]';
const X_SUCCESS =
  /(?:ポスト|返信)(?:を送信しました|が送信されました)|(?:your\s+)?(?:post|reply)\s+was\s+sent/i;

export function watchPost(
  platform: Platform["id"],
  text: string,
  editor: HTMLElement,
  readText: (node: Element) => string,
): Promise<boolean> {
  const selector = platform === "x" ? X_TOAST : YOUTUBE_COMMENT;
  const signature = (node: Element) => {
    const item = node.closest("ytd-comment-view-model, ytd-comment-renderer, ytm-comment-renderer");
    return item?.querySelector<HTMLAnchorElement>('a[href*="lc="]')?.href || null;
  };
  const normalized = (value: string) =>
    String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  const initial = new Set(document.querySelectorAll(selector));
  const initialMatches = [...initial].filter(
    (node) => normalized(readText(node)) === normalized(text),
  );
  const initialIds = new Set(initialMatches.map(signature).filter(Boolean));
  const initialToasts = new Map([...initial].map((node) => [node, readText(node)]));

  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      const nodes = [...document.querySelectorAll(selector)];
      const success =
        platform === "x"
          ? nodes.some(
              (node) =>
                X_SUCCESS.test(readText(node)) && initialToasts.get(node) !== readText(node),
            )
          : (!editor?.isConnected || !readText(editor)) &&
            nodes.some((node) => {
              if (initial.has(node) || normalized(readText(node)) !== normalized(text))
                return false;
              const id = signature(node);
              return id ? !initialIds.has(id) : initialMatches.length === 0;
            });
      if (success) finish(true);
    });
    function finish(confirmed: boolean) {
      clearTimeout(timeout);
      observer.disconnect();
      resolve(confirmed);
    }
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    const timeout = setTimeout(() => finish(false), 10000);
  });
}
