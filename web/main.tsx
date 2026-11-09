import {
  createElement,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { createRoot } from "react-dom/client";
import { Overlay } from "../extension/ui/Overlay";
import { Pet } from "../extension/ui/Pet";
import { platforms, type Platform } from "../extension/sns/platforms";
import { readText, replaceDraft } from "../extension/sns/composer";
import { newProfile } from "../shared/game";
import { webSession } from "./bridge";
import { firebaseConfigured } from "./auth";
import { youtubeId } from "./video";
import { LoginDialog } from "./LoginDialog";
import "../extension/ui/fonts";
import "../extension/ui/style.css";
import "../extension/ui/wardrobe.css";
import "../extension/ui/overlay.css";
import "../extension/ui/theme.css";
import "./web.css";

const examples = [
  ["応援・感謝", "説明がとても丁寧で、参考になりました。ありがとうございます！"],
  ["改善を提案", "手順が少しわかりにくかったので、例えば図を添えて説明してほしいです。"],
  ["きつい表現", "お前は無能。もう動画を出すな。"],
] as const;
const posterPet = newProfile();
type Post = { id: string; text: string };

function ExtensionOverlay({
  platform,
  generation,
  video,
}: {
  platform: Platform;
  generation: number;
  video: string;
}) {
  useEffect(() => {
    const host = document.createElement("commet-pet");
    host.dataset.webExtension = "true";
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.querySelector<HTMLLinkElement>("link[data-commet-styles]");
    if (style) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = style.href;
      shadow.append(link);
    }
    const mount = document.createElement("div");
    shadow.append(mount);
    document.body.append(host);
    const root = createRoot(mount);
    root.render(<Overlay platform={platform} />);
    return () => {
      root.unmount();
      host.remove();
    };
  }, [platform, generation, video]);
  return null;
}

function DemoApp() {
  const session = useSyncExternalStore(webSession.subscribe, webSession.getSnapshot);
  const [site, setSite] = useState<"youtube" | "x">(() =>
    new URL(location.href).searchParams.get("sns") === "x" ? "x" : "youtube",
  );
  const [video, setVideo] = useState(() => {
    const id = new URL(location.href).searchParams.get("v") || "";
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : "";
  });
  const [url, setUrl] = useState(video ? `https://www.youtube.com/watch?v=${video}` : "");
  const [notice, setNotice] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const platform = platforms.find((value) => value.id === site)!;
  function updateRoute(nextSite: string, nextVideo: string) {
    const url = new URL(location.href);
    url.searchParams.set("sns", nextSite);
    if (nextVideo && nextSite === "youtube") url.searchParams.set("v", nextVideo);
    else url.searchParams.delete("v");
    history.replaceState(null, "", url);
    webSession.closePages();
  }
  function switchSite(next: "youtube" | "x") {
    if (next === site) return;
    updateRoute(next, video);
    setSite(next);
    setNotice("");
    window.scrollTo(0, 0);
  }
  function fillExample(text: string) {
    const editor = document.querySelector<HTMLElement>(platform.composerSelector);
    if (editor) {
      editor.scrollIntoView({ block: "center", behavior: "smooth" });
      replaceDraft(editor, text);
    }
  }
  async function login() {
    setAuthBusy(true);
    setNotice("");
    try {
      await webSession.dispatch({
        type: session.googleSignedIn || session.demoSignedIn ? "logout" : "login",
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "ログインできませんでした。");
    } finally {
      setAuthBusy(false);
    }
  }
  function chooseVideo(event: FormEvent) {
    event.preventDefault();
    try {
      const id = youtubeId(url) || "";
      updateRoute(site, id);
      setVideo(id);
      setNotice(
        id
          ? "この動画の文脈で体験できます。Gemini判定では動画要約を利用します。"
          : "サンプル動画画面に戻しました。",
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "動画URLを確認してください。");
    }
  }
  return (
    <>
      <div className="demo-toolbar" aria-label="Web体験版の操作">
        <a className="demo-brand" href="/">
          ✦ Commet <small>Web体験版</small>
        </a>
        <div className="demo-switch" aria-label="SNSを切り替える">
          <button aria-pressed={site === "youtube"} onClick={() => switchSite("youtube")}>
            YouTube
          </button>
          <button aria-pressed={site === "x"} onClick={() => switchSite("x")}>
            X
          </button>
        </div>
        <label>
          判定方法
          <select
            aria-label="判定方法"
            value={session.mode}
            onChange={(e) => webSession.setMode(e.target.value as "sample" | "gemini")}
          >
            <option value="sample">サンプル（AI未使用）</option>
            <option value="gemini" disabled={!session.googleSignedIn && !session.demoSignedIn}>
              Gemini{session.googleSignedIn || session.demoSignedIn ? "" : "（ログイン後）"}
            </option>
          </select>
        </label>
        <select aria-label="例文を入力" value="" onChange={(e) => fillExample(e.target.value)}>
          <option value="" disabled>
            例文を入力…
          </option>
          {examples.map(([label, text]) => (
            <option key={label} value={text}>
              {label}
            </option>
          ))}
        </select>
        <button
          onClick={() => document.querySelector<HTMLElement>(platform.composerSelector)?.focus()}
        >
          {site === "youtube" ? "コメント欄へ" : "返信欄へ"}
        </button>
        <button disabled={!firebaseConfigured || authBusy} onClick={() => void login()}>
          {authBusy
            ? "確認中…"
            : session.googleSignedIn || session.demoSignedIn
              ? "ログアウト"
              : "ログイン"}
        </button>
        {session.demoSignedIn && <span className="demo-account-label">審査用アカウント</span>}
        <button
          className="demo-reset"
          onClick={() => {
            if (confirm("このブラウザの体験データを最初に戻しますか？")) {
              webSession.reset();
              setNotice("体験データを初期化しました。コイン30枚・星のかけら20個から体験できます。");
            }
          }}
        >
          最初から
        </button>
      </div>
      <div className="demo-guide">
        <span>
          <b>拡張版と同じほしもちが、この画面で動きます。</b> コメントを入力 →
          ほしもちをクリックしてチェック。三本線から育成・着せ替え・ガチャを開けます。
        </span>
        <small>架空のSNS画面です。投稿・育成はこのブラウザ内の体験用です。</small>
      </div>
      {notice && (
        <p className="demo-notice" role="status">
          {notice}
        </p>
      )}
      {site === "youtube" && (
        <form className="demo-video-setting" onSubmit={chooseVideo}>
          <label htmlFor="video-url">公開YouTube動画で試す（任意）</label>
          <input
            id="video-url"
            type="url"
            value={url}
            maxLength={300}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
          />
          <button>反映</button>
          <span>空欄なら架空の動画。動画要約はログイン後のGemini判定で使えます。</span>
        </form>
      )}
      {site === "youtube" ? <Youtube key={"youtube-" + video} video={video} /> : <XPage />}
      <footer className="demo-footer">
        Commet Web体験版 · Poetomi
        <span>
          サンプル判定は簡易ルールです。Gemini判定は入力文・文脈をAPIへ送信します。育成・所持品はブラウザ内に保存し、本番データは変更しません。
        </span>
      </footer>
      <ExtensionOverlay platform={platform} generation={session.generation} video={video} />
      <LoginDialog />
    </>
  );
}

function Youtube({ video }: { video: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const editor = useRef<HTMLTextAreaElement>(null);
  const [hasText, setHasText] = useState(false);
  const [liked, setLiked] = useState(false);
  function submit(event: FormEvent) {
    event.preventDefault();
    const text = readText(editor.current);
    if (!text) return;
    setPosts((current) => [{ id: crypto.randomUUID(), text }, ...current]);
    if (editor.current) editor.current.value = "";
    setHasText(false);
  }
  return (
    <div className="yt-page">
      <header className="yt-header">
        <div className="yt-brand">
          <span>☰</span>
          <b>
            <i aria-hidden="true">▶</i>YouTube<sup>JP</sup>
          </b>
        </div>
        <form onSubmit={(e) => e.preventDefault()} className="yt-search">
          <input aria-label="動画を検索" placeholder="検索" />
          <button aria-label="検索">⌕</button>
        </form>
        <span className="sns-avatar">P</span>
      </header>
      <div className="yt-layout">
        <main className="yt-main">
          <div className="yt-player">
            {video ? (
              <iframe
                title="選択したYouTube動画"
                src={`https://www.youtube-nocookie.com/embed/${video}`}
                allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              <>
                <div className="yt-player-poster">
                  <div>
                    <small>LEARN A LITTLE. GROW A LITTLE.</small>
                    <h1>ことばと、いっしょに育つ。</h1>
                    <p>ほしもちとつくる、やさしいSNS体験。</p>
                  </div>
                  <div className="commet yt-poster-pet">
                    <Pet profile={posterPet} mood="happy" />
                  </div>
                </div>
                <div className="yt-player-controls">
                  <span>▶ ▷ ◖</span>
                  <small>0:00 / 3:12 （体験用の架空動画）</small>
                  <span>⚙ ▣ ⛶</span>
                </div>
              </>
            )}
          </div>
          <h1 className="title yt-video-title">
            {video ? "選択した公開YouTube動画" : "Geminiではじめる、やさしいSNS体験｜ほしもちラボ"}
          </h1>
          <div className="yt-channel-row">
            <span className="sns-avatar peach">✦</span>
            <div>
              <b>ほしもちラボ</b>
              <small>チャンネル登録者数 1.24万人 · 架空のチャンネル</small>
            </div>
            <button
              className="yt-subscribe"
              onClick={(e) => {
                e.currentTarget.textContent =
                  e.currentTarget.textContent === "登録済み" ? "チャンネル登録" : "登録済み";
              }}
            >
              チャンネル登録
            </button>
            <div className="yt-video-actions">
              <button aria-pressed={liked} onClick={() => setLiked(!liked)}>
                ♡ {liked ? 125 : 124}
              </button>
              <button
                onClick={() => void navigator.clipboard?.writeText(location.href).catch(() => {})}
              >
                共有 ↗
              </button>
            </div>
          </div>
          <div className="yt-description">
            <b>1.2万回視聴 2026/11/9</b>
            <p id="description-inline-expander">
              {video
                ? ""
                : "日々の学びを、もっと楽しく。生成AIとキャラクター育成を組み合わせて、投稿する前にことばを見直す仕組みを紹介します。この動画画面はCommetの体験用です。"}
            </p>
          </div>
          <section className="yt-comments" aria-label="動画のコメント">
            <div className="yt-comments-heading">
              <h2>{128 + posts.length} 件のコメント</h2>
              <span>☷ 並べ替え</span>
            </div>
            {createElement(
              "ytm-comment-simplebox-renderer",
              { className: "yt-compose" },
              <>
                <span className="sns-avatar">P</span>
                <form onSubmit={submit}>
                  <label htmlFor="youtube-comment">コメントを追加…</label>
                  <textarea
                    id="youtube-comment"
                    ref={editor}
                    aria-label="コメント"
                    maxLength={5000}
                    placeholder="コメントを追加…"
                    onInput={() => setHasText(Boolean(readText(editor.current)))}
                  />
                  <p className="sns-demo-hint">
                    この画面にのみ表示され、YouTubeには投稿されません。
                  </p>
                  <div id="submit-button" className="yt-compose-actions">
                    <button
                      type="button"
                      onClick={() => {
                        if (editor.current) replaceDraft(editor.current, "");
                        setHasText(false);
                      }}
                    >
                      キャンセル
                    </button>
                    <button type="submit" disabled={!hasText}>
                      コメント
                    </button>
                  </div>
                </form>
              </>,
            )}
            {posts.map((post) =>
              createElement(
                "ytd-comment-renderer",
                { key: post.id, className: "yt-comment" },
                <>
                  <span className="sns-avatar">P</span>
                  <div>
                    <b>
                      @you <small>たった今 · 体験投稿</small>
                    </b>
                    <a href={`?sns=youtube${video ? "&v=" + video : ""}&lc=${post.id}`}>
                      <time>たった今</time>
                    </a>
                    <p id="content-text">{post.text}</p>
                    <span className="yt-comment-actions">♡ ♧ 返信</span>
                  </div>
                </>,
              ),
            )}
            {[
              ["@community_member", "説明がわかりやすくて、すぐ試してみたくなりました！", "18"],
              ["@learning_days", "入力欄で一緒に読んでくれるの、かわいいですね。", "9"],
              ["@star_traveler", "小さな気づきを育てていけるのが楽しそう。", "5"],
            ].map(([name, text, likes], i) => (
              <article className="yt-comment" key={name}>
                <span className={`sns-avatar tint-${i}`}>{name[1].toUpperCase()}</span>
                <div>
                  <b>
                    {name} <small>{i + 1}時間前</small>
                  </b>
                  <p>{text}</p>
                  <span className="yt-comment-actions">♡ {likes} ♧ 返信</span>
                </div>
              </article>
            ))}
          </section>
        </main>
        <aside className="yt-recommendations" aria-label="おすすめ動画">
          <div className="yt-filter">
            <b>すべて</b>
            <span>関連動画</span>
            <span>最近のアップロード</span>
          </div>
          {[
            "Chrome拡張、はじめの一歩。",
            "Geminiでできること、やってみた。",
            "やさしいUIをつくる工夫",
            "ことばを見直す、小さな習慣",
            "ほしもちの育て方",
            "わたしたちのDevFest制作記録",
          ].map((title, i) => (
            <article key={title}>
              <div className={`yt-thumbnail tint-${i % 3}`}>
                <span>{i % 2 ? "✦" : "▷"}</span>
                <small>{["8:24", "12:03", "5:18"][i % 3]}</small>
              </div>
              <div>
                <h3>{title}</h3>
                <p>ほしもちラボ</p>
                <p>
                  {i + 1}.2万回視聴 · {i + 1}日前
                </p>
              </div>
            </article>
          ))}
        </aside>
      </div>
    </div>
  );
}

function XPage() {
  const editor = useRef<HTMLDivElement>(null);
  const [hasText, setHasText] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [toast, setToast] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    const text = readText(editor.current);
    if (!text) return;
    setPosts((current) => [{ id: crypto.randomUUID(), text }, ...current]);
    if (editor.current) editor.current.textContent = "";
    setHasText(false);
    setToast("ポストが送信されました（この体験画面内のみ）");
    setTimeout(() => setToast(""), 4500);
  }
  return (
    <div className="x-page">
      <nav className="x-sidebar" aria-label="X風ナビゲーション">
        <strong>𝕏</strong>
        {[
          "⌂ ホーム",
          "⌕ 話題を検索",
          "♧ 通知",
          "✉ メッセージ",
          "☷ リスト",
          "♙ プロフィール",
          "⋯ もっと見る",
        ].map((text) => (
          <span key={text}>{text}</span>
        ))}
        <button onClick={() => editor.current?.focus()}>ポストする</button>
        <div className="x-account">
          <span className="sns-avatar">P</span>
          <b>
            あなた<small>@you · 体験用</small>
          </b>
        </div>
      </nav>
      <main className="x-feed">
        <header>
          <h1>ホーム</h1>
          <div>
            <b>おすすめ</b>
            <span>フォロー中</span>
          </div>
        </header>
        <article className="x-post" data-testid="tweet">
          <span className="sns-avatar peach">✦</span>
          <div className="x-post-body">
            <b>
              ほしもちラボ <i>✓</i>
              <small>@hoshimochi_lab · 1時間</small>
            </b>
            <p data-testid="tweetText">
              新しいことを学ぶとき、どんな工夫をしていますか？
              <br />
              小さな気づきも、誰かと共有すると楽しくなりますね。✧
            </p>
            <div className="x-post-actions">♧ 12 ↻ 24 ♡ 128 ▥ 2.4万</div>
            <form className="x-compose" onSubmit={submit}>
              <label htmlFor="x-comment">ほしもちラボに返信</label>
              <div
                id="x-comment"
                ref={editor}
                data-testid="tweetTextarea_0"
                role="textbox"
                aria-label="返信"
                aria-multiline="true"
                contentEditable
                suppressContentEditableWarning
                onInput={() => setHasText(Boolean(readText(editor.current)))}
              />
              <p className="sns-demo-hint">この画面にのみ表示され、Xには投稿されません。</p>
              <div className="x-compose-actions">
                <span>▧ ☷ ☺ ♧</span>
                <button type="submit" data-testid="tweetButtonInline" disabled={!hasText}>
                  返信する
                </button>
              </div>
            </form>
          </div>
        </article>
        {posts.map((post) => (
          <article className="x-post" key={post.id} data-testid="tweet">
            <span className="sns-avatar">P</span>
            <div className="x-post-body">
              <b>
                あなた <small>@you · たった今 · 体験投稿</small>
              </b>
              <p data-testid="tweetText">{post.text}</p>
              <div className="x-post-actions">♧ ↻ ♡ ▥</div>
            </div>
          </article>
        ))}
        {[
          "Gemini APIを使ったChrome拡張機能の作り方をまとめました。まずは小さく動かしてみるところから。",
          "つい強く書きそうになった言葉を、一度読み返してみる。それだけでも伝わり方が変わることがあります。",
          "きょうの小さな発見：一緒に読んでくれる相棒がいると、文章を書く時間が少し楽しくなる。",
        ].map((text, i) => (
          <article className="x-post" key={text}>
            <span className={`sns-avatar tint-${i}`}>{["T", "L", "S"][i]}</span>
            <div className="x-post-body">
              <b>
                {["Tech Creator", "Learning Days", "Star Traveler"][i]}
                <small> @community · {i + 2}時間</small>
              </b>
              <p>{text}</p>
              <div className="x-post-actions">♧ 8 ↻ 15 ♡ 42 ▥ 1,240</div>
            </div>
          </article>
        ))}
      </main>
      <aside className="x-trends">
        <input placeholder="検索" aria-label="X風の検索" />
        <section>
          <h2>いまどうしてる？</h2>
          {["#DevFest", "#生成AI", "#ほしもち", "#Chrome拡張"].map((value, i) => (
            <div key={value}>
              <small>日本のトレンド</small>
              <b>{value}</b>
              <small>{i + 1},240 件のポスト</small>
            </div>
          ))}
        </section>
        <section>
          <h2>体験のヒント</h2>
          <p>返信欄に入力すると、ほしもちが読みにきます。</p>
          <p>ほしもちをクリックしてチェック。三本線から着せ替えやガチャを開けます。</p>
        </section>
      </aside>
      {toast && (
        <div data-testid="toast" role="status" className="x-toast">
          {toast}
        </div>
      )}
    </div>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<DemoApp />);
