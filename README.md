# Commet

XのポストやYouTubeのコメントを投稿前に振り返り、言葉の選び方でキャラクターを育てるChrome拡張です。0.7.0の開発版は TypeScript、React + WXT、Node.js + Hono で動作します。

## ローカルで起動する

Node.js 22.13以上、Chrome、Firebase Emulator用のJava 21を用意します。

```sh
npm ci
cp .env.example .env
```

コメントの安全性4項目・貢献度4項目の判定、改善案、公開YouTube動画の要約は、Vertex AI経由またはDeveloper APIキーで実行できます。Vertex AIを使う場合は`.env`に`GEMINI_PROVIDER=vertex`・実プロジェクトの`GOOGLE_CLOUD_PROJECT`・`GOOGLE_CLOUD_LOCATION=global`を設定し、`gcloud auth application-default login`で開発用認証を用意します。Developer APIを使う場合は`GEMINI_PROVIDER=developer`と`GEMINI_API_KEY`を設定します。実APIを使わず開発する場合は、`demo-commet`のEmulator構成でキーを未設定にし、`GEMINI_PROVIDER=developer`・`COMMET_DEMO_AI=true`を設定します。

動画要約を取得できない場合はタイトル・説明文を使って判定します。Vertex AIで確認できた範囲と動画読み込みの制限は、[接続確認の記録](docs/CLOUD-RUN.md#このプロジェクトのvertex-ai設定)を参照してください。

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

SNS上では、歩くほしもちの下にコイン数と三本線のボタンが表示されます。コイン数は確定コインと閲覧中の仮コインの合計です。三本線から投稿チェック・育成状況・着せ替え・ガチャ・設定を開けます。「設定・ログイン」は同じSNSページ内の小さなダイアログで開き、ログインしても別タブや全画面の設定へ移動しません。確定と仮の内訳はメニュー下部で確認できます。メニューは外側のクリックやEscキーで閉じられ、ほしもちをドラッグすると表示位置を変えられます。

コメント入力中は入力欄のそばへ移動し、欄の方向へ身を乗り出して、目線・うなずき・まばたきで文章を読んでいるように動きます。試着画面では表情のボタン（ノーマル・喜ぶ・悲しむ・考える）や「歩く」「読む」を押して確認できます。

ログイン後は、コメント入力中にキャラクターをクリックすると投稿前判定が行われ、結果に応じて表情が変わります。ドラッグは表示位置の移動として扱い、書き直すと読む姿勢に戻ります。育成ステータスの表示名は「ぬくもり・知恵・愛嬌」です。

新規キャラのステータスはすべて10から始まります。投稿成功時に評価に応じたXPを獲得し、能力はレベルアップ時に成長します。旧アカウントは新制度への初回移行時にレベル・XP・3能力を初期化し、所持品・装備・コイン・ガチャ履歴は保持します。[評価・報酬・育成と移行の仕様](docs/Gemini_Rewards.md)

初期所持は基本のスキン・目・口・星飾り・本などの基本セットです。着せ替えと試着には所持しているアイテムだけが表示されます。ガチャ下の「今日のかけら交換」では、その日の交換対象だけ名前と見た目を確認できます。ガチャ限定品や全スキンの一覧は表示しません。ガチャ・交換・育成で獲得したアイテムは、装備・保存できるようになります。

名前はログイン後の「着せ替え」の「なまえ」から、1〜12文字で何度でも変更できます。保存するとメニューの名前にも反映されます。未ログイン時は試着モードで、保存にはCommetへのログインが必要です。

使用キャラはほしもちだけです。旧キャラA〜Eの素材・定義・既存の保存データは残し、選択・描画・拡張への素材配布から外しています。旧キャラのプロフィールも画面上ではほしもちとして表示し、元の保存データは自動で書き換えません。着せ替え保存時には以前の名前・種類・装備を `legacyAppearance` に一度だけ保管します。所持品・育成・コインも保持します。

拡張機能の設定画面にある「ほしもちの試着」は、ログイン前は基本セット、ログイン後は所持品で表情や歩行を確認できます。旧開発版で自動配布されていた装備は初回アクセス時に整理し、ガチャの獲得履歴と育成報酬は保持します。[素材と生成プロンプト](assets/characters/STAR-PET.md)

拡張の変更を追いながら開発する場合は `npm run dev:extension` を使えます。[従来のAPI不要モック](demo/index.html) はブラウザで直接開けます。

## Firebaseの実プロジェクトで開発する

Cloud Runで公開する場合は、[Cloud RunとFirebaseの公開設定](docs/CLOUD-RUN.md)を参照してください。API用Dockerfile・`npm run build:api`・公開用の環境変数テンプレートを用意しています。

- SparkプランのFirebaseプロジェクトで、AuthenticationのGoogleプロバイダとCloud Firestoreを有効にします。
- Firebase Webアプリの公開設定を `WXT_FIREBASE_*` に設定します。FirebaseのプロジェクトIDを、サーバー側の `FIREBASE_PROJECT_ID` とそろえます。両方のEmulatorホスト設定を外します。
- 実際に読み込むChrome拡張のIDに紐づくChrome Extension用Google OAuthクライアントを作成し、`WXT_GOOGLE_CLIENT_ID` に設定します。開発と配布で同じ拡張IDを使う場合は `WXT_EXTENSION_PUBLIC_KEY` で公開鍵を指定します。Firebase側で拡張IDを承認済みドメインに追加します。[FirebaseのChrome拡張認証ガイド](https://firebase.google.com/docs/auth/web/chrome-extension)
- HonoはApplication Default CredentialsでFirebase Admin SDKを使用します。ローカルの実プロジェクト接続用に、対象プロジェクトの必要な権限を持つ開発用認証情報を用意します。GeminiキーとAdmin認証情報はサーバー側で管理し、拡張の設定・ビルドに渡しません。

FirestoreへはHonoのAdmin SDKからアクセスします。クライアント用のルールは [firestore.rules](firestore.rules) にあります。UIDごとにレベル、XP、装備、確定コインを保持し、閲覧中の仮コインや送信確認中の精算キュー、表示位置、設定はChrome側に保持します。旧版のSQLite・Chrome内の育成残高は移行対象外です。

## コードレビューの入口

| 場所                                      | 責務                                                      |
| ----------------------------------------- | --------------------------------------------------------- |
| `shared/`                                 | フロント・バックエンド共通のZodスキーマ、型、育成カタログ |
| `server/app.ts`                           | Honoのルーティング、認証ミドルウェア、入力検証            |
| `server/service/`                         | AI分類・動画文脈、成長、コイン精算                        |
| `server/repository/`                      | Gemini HTTP通信、Firestoreトランザクション・日次クォータ  |
| `extension/core/`                         | Firebaseログイン、APIクライアント、精算の再送             |
| `extension/sns/`                          | SNS別セレクタ、文脈取得、投稿成功の検出、キャラ移動       |
| `extension/ui/`・`extension/entrypoints/` | React UI、WXTのShadow DOM・ポップアップ・設定画面         |

分析結果から確定に必要な数値・分類だけを短期レシートとして保持します。コメントや返信元本文はFirestoreに保存しません。XPとコイン残高は、セッション単位のFirestoreトランザクションで一度だけ更新します。投稿の成功はSNSの表示から確認し、確認できない場合は精算を保留します。

## 利用量と公開版

- Hono APIは1プロセス内でUIDあたり90回／分までです。Geminiは既定でUIDあたり20呼び出し、プロジェクト全体で150呼び出し／日（日本時間）です。動画要約も含み、`COMMET_GEMINI_USER_DAILY`・`COMMET_GEMINI_PROJECT_DAILY` で調整できます。ローカル検証でCommet独自の日次上限を無効にする場合は、無料枠のプロジェクトを利用していることを確認し、`.env` に `COMMET_GEMINI_QUOTA_ENABLED=false` を設定してAPIを再起動してください。未設定時は上限が有効です。Google側のAPI利用制限は引き続き適用されます。
- 同一の投稿チェックは短時間キャッシュし、動画要約はサーバーメモリで最長7日間・20件まで再利用します。閲覧や入力中のアニメーションはGeminiを呼び出しません。
- 仮コインは有効な閲覧15秒につき1枚、1日60枚までです。投稿成功時は安全・Q=0なら1.0倍、安全・Q=1または2なら1.5倍、有害なら0倍、要確認なら暫定1.0倍で確定します。未投稿での終了は1.0倍です。評価・報酬・育成の詳細は [Gemini_Rewards.md](docs/Gemini_Rewards.md) を参照してください。
- ガチャは確定コイン10枚で1回引けます。獲得したアイテムだけが着せ替えに追加され、重複はかけらになります。未獲得スキンを見せる演出プレビューはありません。スタンプとクールダウンは後続段階です。公開前にCloud Run向けにリクエストベースの課金、最小インスタンス0・最大インスタンス上限、予算アラート、利用可能な支出上限を設定します。[Google Cloudの予算アラート](https://docs.cloud.google.com/billing/docs/how-to/budgets)・[支出上限](https://docs.cloud.google.com/billing/docs/how-to/budgets-spend-caps)
- 「星のかけら」はレア度を問わず共通です。ガチャ重複時の獲得数はN 1個・R 3個・SR 5個・UR 8個です。「今日のかけら交換」はサーバー側で各ユーザーの所持済みを候補から除外し、未所持品から最大6点を選びます。スキン・帽子・その他を各2点優先し、カテゴリの未所持品が不足した場合は他カテゴリで埋めます。交換・獲得後は別の未所持品で枠を補充します。交換可能な未所持品が6点未満なら残りだけを表示し、すべて所持している場合はその旨を案内します。必要数はN 3個・R 5個・SR 10個・UR 20個です。日替わりの抽選順は日本時間の午前0時に更新し、同じ日・同じ所持状況なら再読み込みでも候補は変わりません。開いたままでも自動更新します。交換はコインやガチャ回数に影響しません。
- 特別なモチーフの一部はガチャ限定です。対象は `shared/gacha.ts` の `gachaOnlyItems` で管理し、交換候補には含めません。獲得後は「ガチャ限定」の表示が付きます。旧アイテム別・レア度別のかけらは、現在の個数を合算して星のかけらへ一度だけ引き継ぎます。以前に確定した抽選・交換は当時の結果を再表示し、再加算・再消費しません。交換要求と結果は保存され、通信切断や再読み込み後も「交換結果を確認」から二重消費せず再確認できます。
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
