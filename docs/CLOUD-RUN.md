# Cloud RunとFirebaseの公開設定

対象のGoogle Cloudプロジェクトは `vital-charger-422600-u7`（番号 `561617243505`）です。この文書と設定テンプレートを追加しても、Google Cloud側の有効化や公開は行われません。

## 先に用意するもの

| 設定                     | 確認・設定する場所                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Google Cloudへのアクセス | 対象プロジェクトを操作できるGoogleアカウント                                                               |
| Firebase                 | [Firebaseコンソール](https://console.firebase.google.com/)で既存のGoogle CloudプロジェクトにFirebaseを追加 |
| ログイン                 | Firebase AuthenticationのGoogleプロバイダを有効化                                                          |
| 保存先                   | Firestoreの`(default)`データベースをNative modeで作成。リージョンは作成前に確認                            |
| Firebase Webアプリ       | Firebaseのプロジェクト設定でWebアプリを登録し、`apiKey`・`appId`・`authDomain`・`projectId`を確認          |
| Chromeの認証             | 実際の拡張IDに対応したChrome Extension用OAuthクライアントID                                                |
| Gemini                   | Vertex AI APIを有効化し、実行するアカウントにVertex AIの呼び出し権限を付与                                 |
| Cloud Run                | 請求先、必要なAPI、デプロイ権限、実行サービスアカウント                                                    |

Firebase Webアプリの設定値とOAuthクライアントIDは拡張に含める公開設定です。Vertex AIとFirebase Admin SDKはApplication Default Credentials（ADC）を使います。Cloud Runでは実行サービスアカウントを使用するため、Gemini APIキーや秘密鍵JSONの配置は不要です。

## このプロジェクトのVertex AI設定

`vital-charger-422600-u7`は、承認済みのハッカソン用請求先`Poetomi_DevFest Hackathon`に接続しています。Vertex AI APIは有効化済みです。利用費用はGoogle Cloud側に計上され、クレジットの適用範囲と残高はCloud Billingで確認します。

サーバーの設定は以下です。これらを`WXT_`から始まる変数に入れる必要はありません。

```dotenv
GEMINI_PROVIDER=vertex
GOOGLE_CLOUD_PROJECT=vital-charger-422600-u7
GOOGLE_CLOUD_LOCATION=global
GEMINI_MODEL=gemini-3.1-flash-lite
COMMET_DEMO_AI=false
```

ローカルでは以下のコマンドでADCを用意します。Firebase CLIへのログインとは別の認証です。

```sh
gcloud auth application-default login --project=vital-charger-422600-u7
```

ローカルのFirebase Emulatorを使う場合、`FIREBASE_PROJECT_ID=demo-commet`と両方のEmulatorホストはそのまま使えます。Vertex AIが使う実プロジェクトは`GOOGLE_CLOUD_PROJECT`で別に指定します。`/health`の`provider: "vertex"`で接続方式を確認できますが、実際のAI呼び出しの成功は判定テストで別途確認します。

2026年11月8日の接続確認では、この構成で実際のコメント判定がHTTP 200で成功しました。一方、公開YouTube URLを使う動画要約は公式サンプルの動画でもHTTP 401になっており、原因は未特定です。動画要約が取得できない場合、既存の処理はタイトル・説明文を使ってコメント判定を続け、`videoSource: "page_metadata"`を返します。この場合、映像・音声を参照した判定ではありません。[公式のYouTube動画要約サンプル](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/samples/googlegenaisdk-textgen-with-youtube-video)

従来のDeveloper APIを使う構成では`GEMINI_PROVIDER=developer`と`GEMINI_API_KEY`を設定します。キーはサーバー専用です。Vertex AIを選んだ場合、残っているDeveloper APIキーは使用しません。

## APIをビルドする

```sh
npm ci
npm run typecheck:api
npm run build:api
```

生成物は`dist/server.js`です。`npm start`はこの生成物を起動します。`Dockerfile`はAPIだけをビルドし、実行用イメージには本番依存関係と生成物を含めます。`.env`・拡張機能・ローカルのエミュレーターデータは含めません。ローカル開発は従来の`npm run dev:api`を使います。

## Cloud Runの設定

`gcloud`を利用でき、対象プロジェクトにログインしている環境で作業します。Cloud Shellでも実行できます。以下は準備完了後に使うコマンド例です。リソース作成・課金の有効化はこのリポジトリから自動では行いません。

- Cloud Run Admin、Cloud Build、Artifact Registry、Vertex AIなど、デプロイに必要なAPIを有効にします。
- API用の実行サービスアカウント（例：`commet-api@vital-charger-422600-u7.iam.gserviceaccount.com`）を作ります。Firestore用の`roles/datastore.user`、Vertex AI用の`roles/aiplatform.user`と`roles/serviceusage.serviceUsageConsumer`を付与します。ビルド・デプロイするアカウントにも[ソースデプロイの必要権限](https://docs.cloud.google.com/run/docs/deploying-source-code)が別途必要です。
- サーバーの環境変数には`FIREBASE_PROJECT_ID`と`HOST`を設定します。`PORT`はCloud Runから渡されます。`FIREBASE_AUTH_EMULATOR_HOST`・`FIRESTORE_EMULATOR_HOST`・`COMMET_DEMO_AI=true`は設定しません。

PowerShellでは以下のようにデプロイします。リージョンとサービスアカウントは実際の作成内容に合わせます。

```powershell
gcloud run deploy commet-api `
  --project=vital-charger-422600-u7 `
  --region=asia-northeast1 `
  --source=. `
  --service-account=commet-api@vital-charger-422600-u7.iam.gserviceaccount.com `
  --set-env-vars=FIREBASE_PROJECT_ID=vital-charger-422600-u7,HOST=0.0.0.0,GEMINI_PROVIDER=vertex,GOOGLE_CLOUD_PROJECT=vital-charger-422600-u7,GOOGLE_CLOUD_LOCATION=global `
  --min=0 `
  --max=2 `
  --allow-unauthenticated
```

Cloud RunのHTTPアクセスは公開し、APIの`/v1/*`は既存コードがFirebase IDトークンを検証します。未ログインの操作は401で拒否します。`/health`は疎通確認用です。最大インスタンス数は固定費の上限ではありません。利用量・予算の設定はCloud側で管理します。

公開後に`https://実際のサービスURL/health`で`{"ok":true,"mode":"gemini","provider":"vertex"}`を確認します。起動時のプロバイダ選択を示すもので、デプロイが通ってもFirebaseログイン、Firestoreの保存、実際の判定はそれぞれ確認が必要です。

## 拡張の公開設定

`.env.production.example`を参考に、必要な値を設定した`.env.cloud.local`を作ります。公開用の設定は`npm run build:cloud`で読み込むので、通常の`npm run build`と`.env`はローカル開発に使えます。

- `WXT_API_BASE_URL`：Cloud Runが実際に発行したHTTPSのサービスURL。末尾の`/health`や`/v1`は含めません。
- `WXT_FIREBASE_*`：同じFirebaseプロジェクトのWebアプリ設定値。
- `WXT_GOOGLE_CLIENT_ID`：Chrome Extension用OAuthクライアントID。
- `WXT_EXTENSION_PUBLIC_KEY`：必要に応じて拡張IDを固定する公開鍵。秘密鍵は使いません。

Firebaseの承認済みドメインには実際の拡張IDに対応する`chrome-extension://拡張ID`を登録します。OAuthクライアントの拡張IDも一致させます。[Chrome拡張のFirebase認証](https://firebase.google.com/docs/auth/web/chrome-extension)

```sh
npm run build:cloud
```

WXTはcloudモードのビルド時に`.env.cloud.local`を読みます。API接続先とManifestの接続許可は同じ`WXT_API_BASE_URL`から作られます。本番プロジェクトで接続先が未設定の場合はビルドで停止します。設定後は`.output/chrome-mv3`を再読み込みします。

GitHubへのpushとCloud Runへのデプロイは別です。自動反映する場合は、後からCloud Buildなどの連携を設定します。
