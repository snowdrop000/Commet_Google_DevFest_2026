(function (root) {
  "use strict";

  const YOUTUBE_COMMENT = "ytd-comment-view-model #content-text, ytd-comment-renderer #content-text, ytm-comment-renderer .comment-text";
  const X_TOAST = '[data-testid="toast"]';
  const X_SUCCESS = /(?:ポスト|返信)(?:を送信しました|が送信されました)|(?:your\s+)?(?:post|reply)\s+was\s+sent/i;

  function watch(platform, text, editor, readText) {
    const selector = platform === "x" ? X_TOAST : YOUTUBE_COMMENT;
    const signature = (node) => {
      const item = node.closest("ytd-comment-view-model, ytd-comment-renderer, ytm-comment-renderer");
      return item?.querySelector('a[href*="lc="]')?.href || null;
    };
    const normalized = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const initial = new Set(document.querySelectorAll(selector));
    const initialMatches = [...initial].filter((node) => normalized(readText(node)) === normalized(text));
    const initialIds = new Set(initialMatches.map(signature).filter(Boolean));
    const initialToasts = new Map([...initial].map((node) => [node, readText(node)]));

    return new Promise((resolve) => {
      let timeout;
      const observer = new MutationObserver(() => {
        const nodes = [...document.querySelectorAll(selector)];
        const success = platform === "x"
          ? nodes.some((node) => X_SUCCESS.test(readText(node)) && initialToasts.get(node) !== readText(node))
          : (!editor?.isConnected || !readText(editor)) && nodes.some((node) => {
            if (initial.has(node) || normalized(readText(node)) !== normalized(text)) return false;
            const id = signature(node);
            return id ? !initialIds.has(id) : initialMatches.length === 0;
          });
        if (success) finish(true);
      });
      function finish(confirmed) {
        clearTimeout(timeout);
        observer.disconnect();
        resolve(confirmed);
      }
      observer.observe(document.body, { subtree: true, childList: true, characterData: true });
      timeout = setTimeout(() => finish(false), 10000);
    });
  }

  root.CommetPostConfirmation = { watch };
})(globalThis);
