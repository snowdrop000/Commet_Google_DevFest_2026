# Commet

XのポストやYouTubeのコメントを投稿前に振り返り、言葉の選び方でキャラクターを育てるChrome拡張です。0.7.0の開発版は TypeScript、React + WXT、Node.js + Hono で動作します。

## ローカルで起動する

Node.js 22.13以上、Chrome、Firebase Emulator用のJava 21を用意します。

```sh
npm ci
cp .env.example .env
```

`.env` の `GEMINI_API_KEY` を設定すると、コメントの6軸判定、改善案、公開YouTube動画の要約を実際のGemini APIで処理します。キーなしで開発する場合は、`demo-commet` のEmulator構成で `COMMET_DEMO_AI=true` を設定します。

次のコマンドをそれぞれ別のターミナルで実行します。

```sh
npm run emulators
npm run dev:api
```

```sh
npm run build
```

1. Chromeの `chrome://extensions` でデベロッパーモードを有効にします。
2. 「パッケージ化されていない拡張機能を読み込む」で `.output/chrome-mv3` を指定します。
3. Commetのポップアップで「開発用ログイン」を押します。
4. 「設定・試着・APIテスト」から、`GET /health` と `POST /v1/analyze` のリクエスト・レスポンスを確認できます。X・YouTubeのタブを再読み込みするとキャラクターが表示されます。

「設定・試着・APIテスト」の「ほしもちの試着」はログインやAPIキーなしで使えます。体の色・柄、目、口、頭の飾り、帽子、学習中の手持ちを組み合わせ、4表情や歩行で確認できます。「以前のノーマルと比較」で新しい立ち絵と見比べられます。SNS上で使う場合は、ログイン後のキャラクリで「F · ほしもち（試作）」と装備を選んで保存します。[素材と生成プロンプト](assets/characters/STAR-PET.md)

拡張の変更を追いながら開発する場合は `npm run dev:extension` を使えます。[従来のAPI不要モック](demo/index.html) はブラウザで直接開けます。

## Firebaseの実プロジェクトで開発する

- SparkプランのFirebaseプロジェクトで、AuthenticationのGoogleプロバイダとCloud Firestoreを有効にします。
- Firebase Webアプリの公開設定を `WXT_FIREBASE_*` に設定します。FirebaseのプロジェクトIDを、サーバー側の `FIREBASE_PROJECT_ID` とそろえます。両方のEmulatorホスト設定を外します。
- 実際に読み込むChrome拡張のIDに紐づくChrome Extension用Google OAuthクライアントを作成し、`WXT_GOOGLE_CLIENT_ID` に設定します。開発と配布で同じ拡張IDを使う場合は `WXT_EXTENSION_PUBLIC_KEY` で公開鍵を指定します。Firebase側で拡張IDを承認済みドメインに追加します。[FirebaseのChrome拡張認証ガイド](https://firebase.google.com/docs/auth/web/chrome-extension)
- HonoはApplication Default CredentialsでFirebase Admin SDKを使用します。ローカルの実プロジェクト接続用に、対象プロジェクトの必要な権限を持つ開発用認証情報を用意します。GeminiキーとAdmin認証情報はサーバー側で管理し、拡張の設定・ビルドに渡しません。

FirestoreへはHonoのAdmin SDKからアクセスします。クライアント用のルールは [firestore.rules](firestore.rules) にあります。UIDごとにレベル、XP、装備、確定コインを保持し、閲覧中の仮コインや送信確認中の精算キュー、表示位置、設定はChrome側に保持します。旧版のSQLite・Chrome内の育成残高は移行対象外です。

## コードレビューの入口

| 場所 | 責務 |
|---|---|
| `shared/` | フロント・バックエンド共通のZodスキーマ、型、育成カタログ |
| `server/app.ts` | Honoのルーティング、認証ミドルウェア、入力検証 |
| `server/service/` | AI分類・動画文脈、成長、コイン精算 |
| `server/repository/` | Gemini HTTP通信、Firestoreトランザクション・日次クォータ |
| `extension/core/` | Firebaseログイン、APIクライアント、精算の再送 |
| `extension/sns/` | SNS別セレクタ、文脈取得、投稿成功の検出、キャラ移動 |
| `extension/ui/`・`extension/entrypoints/` | React UI、WXTのShadow DOM・ポップアップ・設定画面 |

分析結果から確定に必要な数値・分類だけを短期レシートとして保持します。コメントや返信元本文はFirestoreに保存しません。XPとコイン残高は、セッション単位のFirestoreトランザクションで一度だけ更新します。投稿の成功はSNSの表示から確認し、確認できない場合は精算を保留します。

## 利用量と公開版

- Hono APIは1プロセス内でUIDあたり90回／分までです。GeminiはUIDあたり20呼び出し、プロジェクト全体で150呼び出し／日（日本時間）です。動画要約も含み、`COMMET_GEMINI_USER_DAILY`・`COMMET_GEMINI_PROJECT_DAILY` で調整できます。
- 同一の投稿チェックは短時間キャッシュし、動画要約はサーバーメモリで最長7日間・20件まで再利用します。閲覧や入力中のアニメーションはGeminiを呼び出しません。
- 仮コインは有効な閲覧15秒につき1枚、1日60枚までです。非有害の送信は1.5倍、未送信での終了は1.0倍、有害な送信は0倍で確定します。
- ガチャ抽選・スタンプとクールダウンは後続段階です。公開前にCloud Run向けにリクエストベースの課金、最小インスタンス0・最大インスタンス上限、予算アラート、利用可能な支出上限を設定します。[Google Cloudの予算アラート](https://docs.cloud.google.com/billing/docs/how-to/budgets)・[支出上限](https://docs.cloud.google.com/billing/docs/how-to/budgets-spend-caps)
- 0.7.0のAPIはローカル開発を想定しています。Cloud Runへ移す際は `PORT` と `HOST=0.0.0.0` を使い、拡張の接続先・許可ホストと実行サービスアカウントを切り替えます。

## テスト

```sh
npm run typecheck
npm run lint
npm test
npm run test:firebase
npx playwright install chromium
npm run test:e2e
```

Firestore・Auth結合テストとPlaywrightは、それぞれテスト用のローカルサービスを起動します。Playwrightのテスト中はローカルの8765・9099番ポートを空けてください。Playwrightではテスト用のX画面と認証を使います。

[要件の経緯](REQUIREMENTS.md) · [公開版の構成案](ARCHITECTURE.md) · [プライバシー概要](PRIVACY.md)
