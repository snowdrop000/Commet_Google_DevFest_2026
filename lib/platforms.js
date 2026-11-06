(function (root) {
  "use strict";

  const PLATFORM_DEFINITIONS = Object.freeze([
    Object.freeze({
      id: "x",
      name: "X",
      hostnames: ["x.com", "www.x.com", "twitter.com", "www.twitter.com"],
      contentLabel: "投稿",
      composerSelector: [
        '[data-testid="tweetTextarea_0"] [contenteditable="true"]',
        '[data-testid="tweetTextarea_0"][contenteditable="true"]'
      ].join(", "),
      submitSelector: [
        '[data-testid="tweetButton"]',
        '[data-testid="tweetButtonInline"]'
      ].join(", "),
      scopeSelector: '[role="dialog"], form, article'
    }),
    Object.freeze({
      id: "youtube",
      name: "YouTube",
      hostnames: ["youtube.com", "www.youtube.com", "m.youtube.com"],
      contentLabel: "コメント",
      composerSelector: [
        'ytd-comment-simplebox-renderer #contenteditable-root[contenteditable="true"]',
        'ytd-comment-dialog-renderer #contenteditable-root[contenteditable="true"]',
        'ytd-commentbox #contenteditable-root[contenteditable="true"]',
        '#contenteditable-textarea #contenteditable-root[contenteditable="true"]',
        'ytm-comment-simplebox-renderer textarea',
        'ytm-commentbox textarea'
      ].join(", "),
      submitSelector: [
        'ytd-comment-simplebox-renderer #submit-button button',
        'ytd-comment-dialog-renderer #submit-button button',
        'ytd-commentbox #submit-button button',
        'ytm-comment-simplebox-renderer #submit-button button',
        'ytm-commentbox #submit-button button'
      ].join(", "),
      scopeSelector: "ytd-comment-simplebox-renderer, ytd-comment-dialog-renderer, ytd-commentbox, ytm-comment-simplebox-renderer, ytm-commentbox"
    })
  ]);

  function normalizeHostname(hostname) {
    return String(hostname || "").toLowerCase().replace(/\.$/, "");
  }

  function getPlatform(hostname) {
    const normalized = normalizeHostname(hostname);
    return PLATFORM_DEFINITIONS.find((platform) => platform.hostnames.includes(normalized)) || null;
  }

  root.KokoroPlatforms = { PLATFORM_DEFINITIONS, getPlatform };
})(typeof self !== "undefined" ? self : globalThis);
