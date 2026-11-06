import type { SourceContext } from "../../shared/model";
import type { Platform } from "./platforms";

export function isComposer(
  element: EventTarget | null,
  platform: Platform,
): element is HTMLElement {
  return (
    element instanceof HTMLElement &&
    element.matches(platform.composerSelector) &&
    (element.isContentEditable || element instanceof HTMLTextAreaElement)
  );
}

export function readText(node: Element | null | undefined): string {
  if (node instanceof HTMLTextAreaElement) return node.value.trim();
  if (node instanceof HTMLMetaElement) return node.content.trim();
  return (node instanceof HTMLElement ? node.innerText : node?.textContent || "").trim();
}

export function composerNear(origin: Element | null, platform: Platform): HTMLElement | undefined {
  if (isComposer(origin, platform)) return origin;
  const scope = origin?.closest(platform.scopeSelector) || document;
  const matches = [...scope.querySelectorAll<HTMLElement>(platform.composerSelector)];
  return matches.find((node) => node.getClientRects().length && readText(node));
}

export function replaceDraft(editor: HTMLElement, text: string) {
  editor.focus();
  if (editor instanceof HTMLTextAreaElement) {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(
      editor,
      text,
    );
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }
  const range = document.createRange();
  range.selectNodeContents(editor);
  const selection = getSelection();
  if (!selection) return false;
  selection.removeAllRanges();
  selection.addRange(range);
  return document.execCommand("insertText", false, text);
}

const limit = (value: string, length = 1200) => value.replace(/\s+/g, " ").slice(0, length);

export function contextFor(
  platform: Platform,
  editor: HTMLElement,
  useContext: boolean,
): SourceContext {
  return platform.id === "x" ? xContext(editor, useContext) : youtubeContext(editor, useContext);
}

function xContext(editor: HTMLElement, useContext: boolean): SourceContext {
  const dialog = editor.closest('[role="dialog"]');
  const localPost = editor.closest("article") ?? dialog?.querySelector("article");
  const detailsPage = /\/status\/\d+\/?$/.test(location.pathname);
  const isReply = Boolean(localPost || (detailsPage && !dialog));
  if (!useContext || !isReply) return { platform: "x", reply: { isReply } };
  // Only inspect the post associated with the composer or the status in the URL.
  const post =
    localPost ||
    [...document.querySelectorAll('article[data-testid="tweet"]')].find((item) =>
      [...item.querySelectorAll<HTMLAnchorElement>('a[href*="/status/"]')].some(
        (link) => new URL(link.href).pathname === location.pathname && link.querySelector("time"),
      ),
    );
  const parentText = limit(readText(post?.querySelector('[data-testid="tweetText"]')));
  return { platform: "x", reply: { isReply, parentText }, content: { sourceText: parentText } };
}

function youtubeContext(editor: HTMLElement, useContext: boolean): SourceContext {
  const parent = editor.closest(
    "ytd-comment-thread-renderer, ytd-comment-view-model, ytd-comment-renderer, ytm-comment-thread-renderer",
  );
  const isReply =
    !editor.closest("ytd-comment-simplebox-renderer, ytm-comment-simplebox-renderer") &&
    Boolean(
      parent || editor.closest("ytd-commentbox, ytd-comment-dialog-renderer, ytm-commentbox"),
    );
  if (!useContext) return { platform: "youtube", reply: { isReply } };
  const current = new URL(location.href);
  const id =
    current.searchParams.get("v") || current.pathname.match(/^\/shorts\/([\w-]+)/)?.[1] || "";
  return {
    platform: "youtube",
    reply: {
      isReply,
      parentText: isReply
        ? limit(readText(parent?.querySelector("#content-text, .comment-text")))
        : "",
    },
    content: {
      ...(/^[A-Za-z0-9_-]{11}$/.test(id) && { videoId: id }),
      title: limit(
        readText(
          document.querySelector(
            "h1.ytd-watch-metadata yt-formatted-string, h1.title, meta[name=title]",
          ),
        ),
        300,
      ),
      description: limit(
        readText(document.querySelector("#description-inline-expander, meta[name=description]")),
      ),
    },
  };
}
