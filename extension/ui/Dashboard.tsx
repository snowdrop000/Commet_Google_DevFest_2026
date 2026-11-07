import { useEffect, useState } from "react";
import { browser } from "wxt/browser";
import { analyzeRequest } from "../../shared/model";
import { defaults, send, type Preferences, type State } from "../core/messages";
import { Pet, Stats } from "./Pet";
import { CharacterLab } from "./CharacterLab";
import { AppearanceForm } from "./AppearanceForm";
import "./wardrobe.css";

export function Dashboard({ developer = false }: { developer?: boolean }) {
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState(defaults);
  const updateState = (value: State) => {
    setState(value);
    setSettings(value.settings);
  };

  useEffect(() => {
    void send({ type: "state" }).then(updateState).catch(showError);
  }, []);
  function showError(error: unknown) {
    setMessage(error instanceof Error ? error.message : "拡張機能に接続できませんでした。");
  }
  async function loginOrLogout() {
    setBusy(true);
    setMessage("");
    try {
      updateState(await send({ type: state?.signedIn ? "logout" : "login" }));
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }
  async function saveSettings(next: Preferences) {
    setSettings(next);
    try {
      await send({ type: "preferences", settings: next });
    } catch (error) {
      showError(error);
    }
  }

  return (
    <main
      className={developer ? "commet commet-shell commet-shell--options" : "commet commet-shell"}
    >
      <h1>Commet</h1>
      <div className="controls">
        <button disabled={!state || busy} className="primary" onClick={() => void loginOrLogout()}>
          {state?.signedIn ? "ログアウト" : state?.emulator ? "開発用ログイン" : "Googleでログイン"}
        </button>
        {!developer && (
          <button onClick={() => void browser.runtime.openOptionsPage()}>
            {state?.profile ? "着せ替え・設定を開く" : "設定・試着・APIテスト"}
          </button>
        )}
      </div>
      <p role="status">
        {message || (state?.signedIn && !state.profile ? "Hono APIの接続を確認してください。" : "")}
      </p>
      {state?.profile && (
        <section aria-label="キャラと育成">
          <div className="commet-profile-summary">
            {!developer && <Pet profile={state.profile} />}
            <Stats profile={state.profile} />
          </div>
          {developer && (
            <AppearanceForm
              key={
                JSON.stringify(state.profile.equippedItems) +
                state.profile.characterType +
                state.profile.name
              }
              pet={state.profile}
              onSave={async (value) => {
                try {
                  const profile = await send({ type: "appearance", appearance: value });
                  setState((current) => current && { ...current, profile });
                  setMessage("キャラ設定を保存しました。");
                } catch (error) {
                  showError(error);
                }
              }}
            />
          )}
        </section>
      )}
      {developer && (
        <>
          {state?.profile ? (
            <details className="commet-trial-details">
              <summary>保存せずに、ほしもちを試着する</summary>
              <CharacterLab />
            </details>
          ) : (
            <CharacterLab />
          )}
          <section>
            <h2>表示・判定の設定</h2>
            {(
              [
                ["followComposer", "コメント欄へ移動する"],
                ["explore", "閲覧中に探索する"],
                ["useContext", "返信元・動画の文脈を使う"],
                ["summarizeVideos", "公開YouTube動画をGeminiで要約する"],
                ["analyzeOnPost", "送信確認後に判定し育成へ反映する"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={settings[key]}
                  onChange={(event) =>
                    void saveSettings({ ...settings, [key]: event.target.checked })
                  }
                />{" "}
                {label}
              </label>
            ))}
            <button onClick={() => void saveSettings({ ...settings, position: null })}>
              キャラを右下に戻す
            </button>
          </section>
          <ApiConsole signedIn={state?.signedIn === true} />
        </>
      )}
    </main>
  );
}

function ApiConsole({ signedIn }: { signedIn: boolean }) {
  const [text, setText] = useState("説明が分かりにくいです。");
  const [videoId, setVideoId] = useState("");
  const [request, setRequest] = useState("");
  const [response, setResponse] = useState("");
  const [busy, setBusy] = useState(false);
  async function run(kind: "health" | "preview") {
    setBusy(true);
    setResponse("");
    try {
      if (kind === "health") {
        setRequest("GET /health");
        setResponse(JSON.stringify(await send({ type: "health" }), null, 2));
      } else {
        const draft = analyzeRequest.parse({
          text,
          summarizeVideos: Boolean(videoId),
          context: videoId ? { platform: "youtube", content: { videoId } } : { platform: "x" },
        });
        setRequest(`POST /v1/analyze\n${JSON.stringify(draft, null, 2)}`);
        setResponse(JSON.stringify(await send({ type: "preview", draft }), null, 2));
      }
    } catch (error) {
      setResponse(error instanceof Error ? error.message : "APIエラー");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="開発用APIテスト">
      <h2>開発用APIテスト</h2>
      <p>localhostのHono APIに送る内容と結果を確認できます。コメント判定にはログインが必要です。</p>
      <label>
        テスト文章
        <textarea value={text} maxLength={5000} onChange={(event) => setText(event.target.value)} />
      </label>
      <label>
        YouTube動画ID（任意）{" "}
        <input
          value={videoId}
          maxLength={11}
          onChange={(event) => setVideoId(event.target.value.trim())}
        />
      </label>
      <div className="controls">
        <button disabled={busy} onClick={() => void run("health")}>
          接続を確認
        </button>
        <button disabled={busy || !signedIn} onClick={() => void run("preview")}>
          コメント判定をテスト
        </button>
      </div>
      {request && <pre aria-label="リクエスト">{request}</pre>}
      {response && <pre aria-label="レスポンス">{response}</pre>}
    </section>
  );
}
