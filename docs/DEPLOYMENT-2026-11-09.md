# Cloud Runの初回公開

実施日：2026年11月9日（日本時間）

## 公開済みのAPI

| 項目 | 内容 |
| --- | --- |
| プロジェクト | `vital-charger-422600-u7` |
| リージョン | `asia-northeast1` |
| サービス | `commet-api` |
| URL | https://commet-api-561617243505.asia-northeast1.run.app |
| 稼働確認 | https://commet-api-561617243505.asia-northeast1.run.app/health |
| 最新リビジョン | `commet-api-00004-jwg` |
| 初回リビジョン／ビルド | `commet-api-00001-tbj`／`d5df8cff-1cc3-4d3d-866d-ea31bfd37bb4` |
| 最新イメージのダイジェスト | `sha256:3e19e9149ac8c21137cfb186377928b4fd0f358e8dc12fc1280cb43f58c6ffb2` |
| 実行アカウント | `commet-api@vital-charger-422600-u7.iam.gserviceaccount.com` |
| ビルドアカウント | `commet-build@vital-charger-422600-u7.iam.gserviceaccount.com` |
| 実行リソース | CPU 1、メモリ512MiB、最小0・最大2インスタンス、同時処理20、タイムアウト240秒 |
| AI | Vertex AI、global、`gemini-3.1-flash-lite` |
| Gemini日次上限 | UIDごと20回、プロジェクト全体150回の呼び出し。動画要約も別の呼び出しとして数える |

ローカルmainの作業ツリーをDockerfileからビルドして公開した。GitHubへのpushや自動デプロイ連携は実施していない。`.gcloudignore`で送信対象をAPI・共通コード・必要なビルドファイルに限定し、`.env`・認証ファイル・開発用ツール・拡張素材は送信していない。

同日、最新の着せ替えカタログを拡張とそろえるため、APIを再ビルドして第2リビジョンへ更新した。初回の依存関係とpackage-lockが変わっていないことを確認し、初回イメージのダイジェストを固定した上でAPIバンドルを更新した。最新カタログで85件のテスト・型検査・Lintを再確認している。

第3リビジョンでは、約65分の動画が10秒で打ち切られていた問題を修正した。動画要約120秒・拡張150秒・Cloud Run180秒の時間制限をそろえ、長い判定中だけ拡張のサービスワーカーを維持する処理を追加した。動画要約を取得できずタイトル・説明文を使う場合も、参照元を画面に表示する。[調査結果と検証](analysis/youtube-video-timeout.md)

第4リビジョンでは、本番ログでコメント判定も10秒で打ち切られていたことを確認し、コメント60秒・拡張210秒・Cloud Run240秒へ修正した。動画要約は120秒を維持。全区間の音声と5秒間隔の映像で要約し、生成された文章の長さ超過は上限内に整形する。93件のテスト、実ブラウザの35秒応答、型検査・Lint・ビルドが成功し、対象動画の要約を使った判定もローカルAPIと実Vertex AIで約51秒で完了した。

Cloud RunのHTTP入口は公開している。`/health`は公開の稼働確認用であり、`/v1/*`はアプリ内でFirebase IDトークンを検証する。

## 確認結果

- APIと拡張の型検査、Lint、APIビルド、85件のテストが成功した。
- Cloud BuildによるLinux/Node.js 22環境での型検査・ビルドも成功した。
- 本番`/health`がHTTP 200で`{"ok":true,"mode":"gemini","provider":"vertex"}`を返した。
- 未ログインと不正なトークンでの`/v1/profile`はHTTP 401で拒否された。
- 本番用拡張を隔離したブラウザへ読み込み、実際の拡張ID、OAuthクライアント、Googleログインボタン、本番APIへの接続を確認した。開発用ログインが表示されず、Emulatorモードが無効であることも確認した。
- 利用者本人のChromeでGoogleログインが成功したとの確認を受領した。本番Cloud Runのリクエストログでも、ログイン後の`GET /v1/profile`と`POST /v1/coins/tick`がHTTP 200になっていることを確認した。トークン・コメント本文・個人情報を取得せず、リクエストのパス・メソッド・ステータスだけを照合した。
- 利用者の通常操作後、本番ログで`PATCH /v1/profile/appearance`と`POST /v1/analyze`のHTTP 200も確認した。さらに利用者本人から、着せ替え保存の成功と、第4リビジョンへの更新後に同じYouTube動画で判定が成功し「動画要約を考慮」と表示されたことの確認を受領した。HTTP 200だけでなく、画面上でも実際に動画要約が使われたことを確認した。
- Cloud CLI用アクセストークンはアプリ向けのOAuthクライアントと用途が異なり、Googleから`access_token audience is not for this project`として拒否された。実際のChrome拡張用OAuthクライアントでのログインは上記の通り成功している。

追加の一時Cloud Run JobによるFirestoreのテスト書き込み・削除は、自動承認審査で拒否されたため実施していない。本番の正常なアプリログインを使う通常操作で確認する。

## 拡張側の準備と残作業

`.env.cloud.local`の`WXT_API_BASE_URL`に本番URLを設定済み。Firebase Webアプリの公開設定も設定済み。秘密鍵を保存せずに生成した公開鍵を使って、本番APIへ接続する未パッケージ拡張の確認用IDを固定した。

```text
hpgbfepopahahbphdanciggkonhfkbbl
```

このIDはChromeウェブストアから発行されたIDではない。ウェブストアに公開する場合は、ストアで発行されるID・公開鍵とOAuthクライアントをそろえる。

OAuthクライアントIDを受領し、`.env.cloud.local`へ反映済み。

```text
561617243505-808bsued59b0ua8ll9ao66redcpl72f2.apps.googleusercontent.com
```

Firebase Authenticationの承認済みドメインへの`chrome-extension://hpgbfepopahahbphdanciggkonhfkbbl`追加は、ユーザーから具体的な追加の明示承認を得た後に実施した。追加後に設定を読み戻し、既存の承認済みドメインが保持されていることを確認済み。

`npm run build:cloud`の生成物は`.output/chrome-mv3-cloud`。Manifestの固定ID・OAuthクライアント・本番APIホスト許可を照合し、サーバー専用の秘密情報が生成物に含まれていないことも検査した。

共有用ZIPは`.output/commet-0.7.0-cloud-20261109.zip`（最終修正後のSHA-256：`62bdd5864dda3cb775f8bde94479d1590847a73caff330999f8b55394c6ca513`）。

本番用フォルダの読み込み、実際のGoogleアカウントによるログイン、着せ替え保存、動画要約を使うコメント判定まで確認済み。利用者本人の画面で「動画要約を考慮」と表示されることも確認でき、本番環境の一連の動作確認は完了した。Chromeウェブストアでの一般配布は別工程。

更新時のコマンドは[CLOUD-RUN.md](CLOUD-RUN.md)を参照。
