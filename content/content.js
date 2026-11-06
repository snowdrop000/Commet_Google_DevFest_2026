(function () {
  "use strict";

  if (window.__kokoroPetLoaded) return;
  window.__kokoroPetLoaded = true;

  const platform = KokoroPlatforms.getPlatform(location.hostname);
  if (!platform) return;

  let pet = { ...KokoroGame.DEFAULT_PET };
  let settings = { analyzeOnPost: true, followComposer: true, explore: true };
  let activeComposer = null;
  let analyzing = false;
  let pendingPost = null;
  let lastActivity = Date.now();
  let pageId = crypto.randomUUID();
  let route = routeKey();
  let position = null;
  let checkedDraft = null;
  let pageLeaving = false;

  const host = document.createElement("div");
  host.id = "kokoropet-root";
  host.innerHTML = `
    <section class="kp-card" data-open="true" aria-label="Commet 投稿チェック">
      <button class="kp-collapse" type="button" aria-label="パネルを開閉">−</button>
      <div class="kp-pet-wrap">
        <div class="kp-level">LV.<span data-level>1</span></div>
        <div class="kp-pet character-a skin-base" data-mood="idle" aria-label="ピクセルキャラクター">
          <span class="kp-sprite"></span>
          <span class="kp-hat" data-hat></span>
          <span class="kp-item-badge" data-item-badge></span>
        </div>
        <span class="kp-coin" data-coin aria-hidden="true">●</span>
      </div>
      <div class="kp-main">
        <div class="kp-heading"><strong data-name>ココロ</strong><span class="kp-badge" data-platform></span></div>
        <div class="kp-tabs" role="tablist" aria-label="表示内容">
          <button type="button" role="tab" data-view-button="check" aria-selected="true">投稿チェック</button>
          <button type="button" role="tab" data-view-button="status" aria-selected="false">育成状況</button>
        </div>
        <div class="kp-view" data-view-panel="check">
          <p class="kp-message" data-message>投稿する前に、ことばを一緒に見直そう。</p>
          <div class="kp-result" data-result hidden>
            <div class="kp-result-title" data-result-title></div>
            <p data-reason></p>
            <div class="kp-scores" data-scores hidden>
              <span>有害性 <b data-score-harm>0</b>/10</span>
              <span>敬意 <b data-score-respect>0</b>/10</span>
              <span>建設性 <b data-score-constructive>0</b>/10</span>
              <span>共感 <b data-score-empathy>0</b>/10</span>
            </div>
            <p class="kp-context" data-context></p>
            <details data-improvement hidden>
              <summary>改善案を見る</summary>
              <p data-suggestion></p>
              <button class="kp-copy" type="button" data-apply>改善案を入力欄に反映</button>
            </details>
          </div>
          <button class="kp-analyze" type="button" data-analyze>
            <span class="kp-spark">✦</span><span data-button-label></span>
          </button>
          <p class="kp-note">本文と必要最小限の返信・動画文脈を判定します。</p>
        </div>
        <p class="kp-wallet">探索コイン <span data-pending>仮 0</span> ・ <span data-confirmed>確定 0</span><small data-settlement></small></p>
        <div class="kp-view kp-status-view" data-view-panel="status" hidden>
          <div class="kp-status-head"><b>LV.<span data-status-level>1</span></b><span>XP <strong data-status-xp>0 / 30</strong></span></div>
          <div class="kp-xp-track"><i data-status-xp-bar></i></div>
          <div class="kp-status-row"><span>♡ 思いやり</span><div><i data-status-empathy-bar></i></div><b data-status-empathy>50</b></div>
          <div class="kp-status-row"><span>◇ 考える力</span><div><i data-status-critical-bar></i></div><b data-status-critical>50</b></div>
          <div class="kp-status-row"><span>♢ しなやかさ</span><div><i data-status-resilience-bar></i></div><b data-status-resilience>50</b></div>
          <p class="kp-status-meta"><span data-status-posts>0</span>投稿 ・ <span data-status-streak>0</span>日連続</p>
        </div>
      </div>
    </section>`;
  document.documentElement.appendChild(host);

  const card = host.querySelector(".kp-card");
  const analyzeButton = host.querySelector("[data-analyze]");
  const collapseButton = host.querySelector(".kp-collapse");
  const improvement = host.querySelector("[data-improvement]");
  const applyButton = host.querySelector("[data-apply]");
  const viewButtons = [...host.querySelectorAll("[data-view-button]")];
  const motion = CommetMotion.create({
    panel: host, handle: host.querySelector(".kp-pet-wrap"),
    onPosition: (value) => { position = value; chrome.storage.local.set({ petPosition: value }); }
  });

  host.querySelector("[data-platform]").textContent = `${platform.name}・ことば育成中`;
  setAnalyzeButtonLabel();

  hydrate();
  motion.wake();
  setInterval(tick, 4000);
  document.addEventListener("visibilitychange", tick);
  addEventListener("blur", tick);
  addEventListener("focus", () => { lastActivity = Date.now(); tick(); });
  addEventListener("pagehide", () => {
    pageLeaving = true;
    chrome.runtime.sendMessage({ type: "COIN_LEAVE", pageId }).catch(() => {});
  });
  addEventListener("pageshow", (event) => {
    if (event.persisted) { pageLeaving = false; pageId = crypto.randomUUID(); tick(); }
  });
  for (const event of ["pointerdown", "keydown", "wheel"]) {
    document.addEventListener(event, () => { lastActivity = Date.now(); }, { passive: true });
  }

  collapseButton.addEventListener("click", () => {
    const open = card.dataset.open !== "false";
    card.dataset.open = String(!open);
    collapseButton.textContent = open ? "+" : "−";
  });

  viewButtons.forEach((button) => button.addEventListener("click", () => {
    switchView(button.dataset.viewButton);
  }));

  analyzeButton.addEventListener("click", async () => {
    const text = getCurrentText();
    if (!text) {
      showMessage(`${platform.name}の${platform.contentLabel}欄に文章を入力してね。`, "sad");
      return;
    }
    await analyze(text, false, activeComposer);
  });

  applyButton.addEventListener("click", () => {
    const draft = checkedDraft;
    if (!draft?.editor?.isConnected || readComposerText(draft.editor) !== draft.text) {
      showMessage("文章が変わりました。もう一度チェックしてね。", "idle");
      return;
    }
    draft.editor.focus();
    if (draft.editor instanceof HTMLTextAreaElement) {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(draft.editor, draft.suggestion);
      draft.editor.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      const range = document.createRange();
      range.selectNodeContents(draft.editor);
      const selection = getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      if (!document.execCommand("insertText", false, draft.suggestion)) {
        showMessage("入力欄を更新できませんでした。改善案をコピーして使ってね。", "idle");
        return;
      }
    }
    improvement.open = false;
    improvement.hidden = true;
    checkedDraft = null;
    showMessage("改善案を入力しました。投稿前にもう一度チェックできます。", "idle");
  });

  document.addEventListener("focusin", (event) => {
    if (isComposer(event.target)) activeComposer = event.target;
  }, true);

  document.addEventListener("input", (event) => {
    if (!isComposer(event.target)) return;
    activeComposer = event.target;
    if (checkedDraft?.editor === activeComposer) {
      checkedDraft = null;
      improvement.hidden = true;
    }
    const wasTyping = host.dataset.typing === "true";
    updateTyping();
    if (!wasTyping) tick();
  }, true);

  document.addEventListener("focusout", () => setTimeout(() => {
    updateTyping();
    tick();
  }, 0), true);

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.(platform.submitSelector);
    if (button && !isDisabled(button)) watchPost(button);
  }, true);
  document.addEventListener("keydown", (event) => {
    if (platform.id === "x" && event.key === "Enter" && (event.metaKey || event.ctrlKey)
      && !event.isComposing && isComposer(event.target)) watchPost(event.target);
  }, true);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.pet?.newValue) {
      pet = KokoroGame.sanitizePet(changes.pet.newValue);
      renderPet();
    }
    if (changes.settings?.newValue) settings = { ...settings, ...changes.settings.newValue };
    if (changes.petPosition) position = changes.petPosition.newValue || null;
    if (changes.settings || changes.petPosition) motion.configure({ ...settings, position });
    if (changes.coinsConfirmed) renderCoins(null, changes.coinsConfirmed.newValue || 0);
  });

  async function hydrate() {
    const response = await chrome.runtime.sendMessage({ type: "GET_STATE" }).catch(() => null);
    if (!response?.ok) return;
    pet = KokoroGame.sanitizePet(response.pet);
    settings = { ...settings, ...response.settings };
    ({ petPosition: position = null } = await chrome.storage.local.get("petPosition"));
    motion.configure({ ...settings, position });
    renderCoins(0, response.coinsConfirmed);
    renderPet();
    tick();
  }

  function updateTyping() {
    const editor = document.activeElement;
    const typing = isComposer(editor) && Boolean(readComposerText(editor));
    host.dataset.typing = String(typing);
    motion.focus(typing ? editor : null);
  }

  function routeKey() {
    return location.pathname + (platform.id === "youtube" ? new URL(location.href).searchParams.get("v") || "" : "");
  }

  function currentPage() {
    const nextRoute = routeKey();
    if (route !== nextRoute) {
      chrome.runtime.sendMessage({ type: "COIN_LEAVE", pageId }).catch(() => {});
      route = nextRoute;
      pageId = crypto.randomUUID();
      renderCoins(0);
      motion.wake();
    }
    return pageId;
  }

  async function tick() {
    if (pageLeaving) return;
    const id = currentPage();
    const active = settings.explore && !document.hidden && document.hasFocus()
      && host.dataset.typing !== "true" && !pendingPost && Date.now() - lastActivity < 60000;
    const result = await chrome.runtime.sendMessage({ type: "COIN_TICK", pageId: id, active }).catch(() => null);
    if (id !== pageId) return;
    if (result?.ok) {
      renderCoins(result.pending, result.confirmed);
      if (result.picked_up && active) motion.explore(host.querySelector(".kp-pet"), host.querySelector("[data-coin]"));
    } else if (settings.explore && !host.querySelector("[data-settlement]").textContent) {
      host.querySelector("[data-settlement]").textContent = "探索にはPythonサーバーへの接続が必要です。";
    }
  }

  function renderCoins(pending, confirmed) {
    if (Number.isInteger(pending)) host.querySelector("[data-pending]").textContent = `仮 ${pending}`;
    if (Number.isInteger(confirmed)) host.querySelector("[data-confirmed]").textContent = `確定 ${confirmed}`;
  }

  async function watchPost(origin) {
    if (pendingPost) return;
    const editor = findComposer(origin);
    const text = readComposerText(editor);
    if (text.length < 2) return;
    const context = buildContext(editor);
    const message = { pageId: currentPage(), postId: crypto.randomUUID() };
    pendingPost = message.postId;
    const confirmation = CommetPostConfirmation.watch(platform.id, text, editor, readComposerText);
    try {
      const attempt = await chrome.runtime.sendMessage({ type: "POST_ATTEMPT", ...message });
      if (!attempt?.ok) return;
      if (await confirmation && settings.analyzeOnPost) {
        await analyze(text, true, editor, { ...message, context });
      } else {
        await chrome.runtime.sendMessage({ type: "POST_UNVERIFIED", ...message });
        host.querySelector("[data-settlement]").textContent = "投稿の確認または判定ができず、精算は保留です。";
        renderCoins(0);
      }
    } catch (_error) {
      host.querySelector("[data-settlement]").textContent = "投稿の精算結果を確認できませんでした。";
    } finally {
      pendingPost = null;
      tick();
    }
  }

  function isComposer(element) {
    return element instanceof HTMLElement
      && (element.isContentEditable || element.tagName === "TEXTAREA")
      && element.matches(platform.composerSelector);
  }

  function getCurrentText() {
    if (activeComposer?.isConnected) return readComposerText(activeComposer);
    const candidates = [...document.querySelectorAll(platform.composerSelector)];
    const visible = candidates.find((node) => isVisible(node) && readComposerText(node));
    return readComposerText(visible);
  }

  function readComposerText(element) {
    return String(element?.value || element?.innerText || element?.textContent || "").trim();
  }

  function isVisible(element) {
    return Boolean(element?.getClientRects().length);
  }

  function isDisabled(button) {
    return button.matches(":disabled")
      || button.getAttribute("aria-disabled") === "true"
      || Boolean(button.closest('[aria-disabled="true"]'));
  }

  function setAnalyzeButtonLabel(loading = false) {
    host.querySelector("[data-button-label]").textContent = loading
      ? "Geminiが考え中…"
      : `この${platform.contentLabel}をチェック`;
  }

  async function analyze(text, commit, origin, post = {}) {
    if (!commit && analyzing) return;
    if (!commit) analyzing = true;
    analyzeButton.disabled = true;
    setAnalyzeButtonLabel(true);
    card.classList.add("is-loading");

    try {
      const editor = findComposer(origin);
      const context = post.context || buildContext(editor);
      const response = await chrome.runtime.sendMessage({ type: "ANALYZE_CONTENT", text, ...post, context });
      if (!response?.ok) throw new Error(response?.error || "判定できませんでした。");
      if (response.pet) pet = KokoroGame.sanitizePet(response.pet);
      renderPet();
      renderAnalysis(response.analysis, response.demo, commit, response.contextUsed);
      checkedDraft = !commit && response.analysis.suggestion ? { editor, text, suggestion: response.analysis.suggestion } : null;
      applyButton.hidden = !checkedDraft;
      if (response.settlement) {
        const { status, multiplier, awarded } = response.settlement;
        renderCoins(0);
        host.querySelector("[data-settlement]").textContent = status === "settled"
          ? `${multiplier.toFixed(1)}倍で ${awarded} 枚確定`
          : status === "queued" ? "接続後に精算します。" : "判定を保留しました。";
      }
    } catch (error) {
      showMessage(error.message || "判定できませんでした。", "sad");
    } finally {
      if (!commit) analyzing = false;
      analyzeButton.disabled = analyzing;
      setAnalyzeButtonLabel();
      card.classList.remove("is-loading");
    }
  }

  function renderPet() {
    const petNode = host.querySelector(".kp-pet");
    const equipment = pet.equippedItems || KokoroGame.DEFAULT_PET.equippedItems;
    petNode.className = `kp-pet character-${pet.characterType} ${String(equipment.skin).replaceAll("_", "-")}`;
    petNode.dataset.mood = pet.mood || "idle";
    host.querySelector("[data-level]").textContent = pet.level;
    host.querySelector("[data-name]").textContent = pet.name;
    host.querySelector("[data-status-level]").textContent = pet.level;
    const requiredXp = KokoroGame.xpNeeded(pet.level);
    host.querySelector("[data-status-xp]").textContent = `${pet.xp} / ${requiredXp}`;
    host.querySelector("[data-status-xp-bar]").style.width = `${Math.min(100, pet.xp / requiredXp * 100)}%`;
    host.querySelector("[data-status-empathy]").textContent = pet.empathy;
    host.querySelector("[data-status-critical]").textContent = pet.criticalThinking;
    host.querySelector("[data-status-resilience]").textContent = pet.resilience;
    host.querySelector("[data-status-empathy-bar]").style.width = `${pet.empathy}%`;
    host.querySelector("[data-status-critical-bar]").style.width = `${pet.criticalThinking}%`;
    host.querySelector("[data-status-resilience-bar]").style.width = `${pet.resilience}%`;
    host.querySelector("[data-status-posts]").textContent = pet.totalPosts;
    host.querySelector("[data-status-streak]").textContent = pet.streak;
    const hat = host.querySelector("[data-hat]");
    const badge = host.querySelector("[data-item-badge]");
    hat.dataset.item = equipment.hat;
    badge.dataset.item = equipment.badge;
    hat.textContent = equipment.hat === "hat_none" ? "" : KokoroGame.ITEM_CATALOG[equipment.hat]?.icon || "";
    badge.textContent = equipment.badge === "badge_none" ? "" : KokoroGame.ITEM_CATALOG[equipment.badge]?.icon || "";
  }

  function switchView(view) {
    const selected = view === "status" ? "status" : "check";
    viewButtons.forEach((button) => {
      button.setAttribute("aria-selected", String(button.dataset.viewButton === selected));
    });
    host.querySelectorAll("[data-view-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.viewPanel !== selected;
    });
  }

  function renderAnalysis(analysis, demo, committed, contextUsed) {
    const rule = KokoroGame.CATEGORY_RULES[analysis.category] || KokoroGame.CATEGORY_RULES.neutral;
    const result = host.querySelector("[data-result]");
    result.hidden = false;
    result.dataset.tone = analysis.category;
    host.querySelector("[data-result-title]").textContent = `${rule.label}${demo ? "（デモ）" : ""}`;
    host.querySelector("[data-reason]").textContent = analysis.reason;
    host.querySelector("[data-score-harm]").textContent = analysis.harm?.severity ?? analysis.toxicity ?? 0;
    host.querySelector("[data-score-respect]").textContent = analysis.dialogueStyle?.respect ?? 0;
    host.querySelector("[data-score-constructive]").textContent = analysis.constructivenessScore ?? 0;
    host.querySelector("[data-score-empathy]").textContent = analysis.empathyScore ?? 0;
    host.querySelector("[data-scores]").hidden = false;
    host.querySelector("[data-context]").textContent = contextLabel(analysis, contextUsed);
    const newUnlocks = Array.isArray(pet.lastResult?.newUnlocks) ? pet.lastResult.newUnlocks : [];
    const rewardNames = newUnlocks.map((id) => KokoroGame.ITEM_CATALOG[id]?.name).filter(Boolean);
    host.querySelector("[data-message]").textContent = committed
      ? rewardNames.length
        ? `🎁 ${rewardNames.join("・")}を獲得したよ！`
        : `${platform.contentLabel}を経験値に反映したよ。`
      : "これは投稿前のプレビュー。まだステータスは変わらないよ。";
    improvement.hidden = !analysis.suggestion || !["abusive", "unconstructive_criticism"].includes(analysis.category);
    improvement.open = false;
    host.querySelector("[data-suggestion]").textContent = analysis.suggestion || "";

    const petNode = host.querySelector(".kp-pet");
    petNode.dataset.mood = rule.mood;
    setTimeout(() => {
      if (petNode.isConnected) petNode.dataset.mood = pet.mood || "idle";
    }, 5000);
  }

  function showMessage(message, mood) {
    host.querySelector("[data-message]").textContent = message;
    host.querySelector(".kp-pet").dataset.mood = mood;
  }

  function buildContext(origin) {
    return platform.id === "youtube" ? buildYouTubeContext(origin) : buildXContext(origin);
  }

  function buildXContext(origin) {
    const composer = findComposer(origin);
    let scope = composer?.closest('[role="dialog"], article') || origin?.closest?.('[role="dialog"], article') || document;
    let texts = textContents(scope, '[data-testid="tweetText"]', composer);
    let usedPageFallback = false;

    // 投稿詳細ページのインライン返信欄では、返信元が欄の外側にある場合がある。
    if (!texts.length && /\/status\/\d+/.test(location.pathname)) {
      scope = document;
      texts = textContents(scope, '[data-testid="tweetText"]', composer).slice(0, 8);
      usedPageFallback = true;
    }

    const isReplySurface = Boolean(
      composer?.closest("article")
      || (composer?.closest('[role="dialog"]') && texts.length)
      || (/\/status\/\d+/.test(location.pathname) && composer && !composer.closest('[role="dialog"]'))
    );
    const parentText = isReplySurface ? (usedPageFallback ? texts[0] : texts.at(-1)) || "" : "";
    const threadRootText = isReplySurface && texts.length > 1 && texts[0] !== parentText ? texts[0] : "";

    return {
      platform: "x",
      reply: { isReply: isReplySurface, parentText, threadRootText },
      content: { sourceText: threadRootText || parentText }
    };
  }

  function buildYouTubeContext(origin) {
    const composer = findComposer(origin);
    const replyScope = composer?.closest([
      "ytd-comment-thread-renderer",
      "ytd-comment-view-model",
      "ytd-comment-renderer",
      "ytd-comment-dialog-renderer",
      "ytm-comment-thread-renderer",
      "ytm-commentbox"
    ].join(", ")) || origin?.closest?.("ytd-comment-thread-renderer, ytd-comment-dialog-renderer, ytm-comment-thread-renderer, ytm-commentbox");
    const parentTexts = replyScope ? textContents(replyScope, "#content-text, .comment-text", composer) : [];
    const isTopLevel = Boolean(composer?.closest("ytd-comment-simplebox-renderer, ytm-comment-simplebox-renderer"));
    const isReply = Boolean(replyScope && !isTopLevel);
    const videoId = getYouTubeVideoId();

    return {
      platform: "youtube",
      reply: {
        isReply,
        parentText: isReply ? parentTexts[0] || "" : "",
        threadRootText: ""
      },
      content: {
        videoId,
        url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : "",
        title: firstText([
          "h1.ytd-watch-metadata yt-formatted-string",
          "h1.title yt-formatted-string",
          'meta[name="title"]',
          'meta[property="og:title"]'
        ]),
        description: firstText([
          "#description-inline-expander",
          "#description",
          'meta[name="description"]',
          'meta[property="og:description"]'
        ])
      }
    };
  }

  function findComposer(origin) {
    if (isComposer(origin)) return origin;
    const scope = origin?.closest?.(platform.scopeSelector) || document;
    if (activeComposer?.isConnected && scope.contains(activeComposer)) return activeComposer;
    return [...scope.querySelectorAll(platform.composerSelector)]
      .find((node) => isVisible(node) && readComposerText(node));
  }

  function textContents(scope, selector, composer) {
    return [...scope.querySelectorAll(selector)]
      .filter((node) => node !== composer && !node.contains(composer) && !composer?.contains(node))
      .map((node) => readNodeText(node))
      .filter(Boolean)
      .filter((text, index, all) => all.indexOf(text) === index)
      .slice(0, 8);
  }

  function readNodeText(node) {
    if (!node) return "";
    if (node instanceof HTMLMetaElement) return String(node.content || "").trim();
    return String(node.innerText || node.textContent || "").replace(/\s+/g, " ").trim();
  }

  function firstText(selectors) {
    for (const selector of selectors) {
      const value = readNodeText(document.querySelector(selector));
      if (value) return value;
    }
    return "";
  }

  function getYouTubeVideoId() {
    const fromQuery = new URL(location.href).searchParams.get("v");
    if (fromQuery) return fromQuery.slice(0, 20);
    return location.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]+)/)?.[1] || "";
  }

  function contextLabel(analysis, used) {
    if (analysis.context?.quality === "insufficient") return "文脈不足のため、ステータスは下がりません";
    const labels = [];
    if (used?.reply) labels.push("返信元");
    if (used?.threadRoot) labels.push("スレッド元");
    if (used?.video === "gemini_video") labels.push("動画要約");
    else if (used?.video === "page_metadata" || used?.content) labels.push("元コンテンツ");
    return labels.length ? `${labels.join("・")}を考慮` : "本文を中心に判定";
  }
})();
