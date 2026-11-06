# KokoroPet 本番アーキテクチャ

この文書は旧称KokoroPet時点の公開版構想です。Commet 0.7.0ではReact + WXTのChrome拡張からNode.js + Hono APIを呼び出し、Firebase AuthenticationとFirestoreを使います。現行の構成と起動手順は [README.md](README.md) を参照してください。

- 文書バージョン: 0.1
- 対象: Chrome拡張MVP 0.5.0から公開ベータへの移行
- 更新日: 2026-11-06

## 1. 全体構成図

```mermaid
flowchart LR
    person([利用者])

    subgraph browser[Chrome / SNS]
        sns[X・YouTube<br/>投稿・返信欄]
        cs[Content Script<br/>DOM検出・文脈取得<br/>介入UI・キャラクター]
        sw[Background Service Worker<br/>認証・API通信<br/>ローカルキャッシュ]
        popup[Popup / Options<br/>育成・装備・設定]
        local[(chrome.storage.local<br/>未同期設定・短期キャッシュ<br/>オフラインデモ)]

        sns <--> cs
        cs <--> sw
        popup <--> sw
        sw <--> local
    end

    hosting[Firebase Hosting<br/>紹介・規約・プライバシー<br/>Webデモ]
    auth[Firebase Authentication<br/>Googleログイン・ID token]

    subgraph cloud[Google Cloud / 信頼できるサーバー境界]
        lb[External Application Load Balancer<br/>+ Cloud Armor<br/>利用拡大後]
        api[Cloud Run / FastAPI<br/>認証・入力検証・レート制限<br/>プロンプト・判定・ゲームルール]
        firestore[(Cloud Firestore<br/>ペット・成長・所持品<br/>日次上限・ガチャ天井)]
        secret[Secret Manager<br/>Gemini APIキー]
        logging[Cloud Logging<br/>本文なし構造化ログ]
        sdp[Sensitive Data Protection<br/>個人情報検出・マスキング<br/>将来]
    end

    gemini[Gemini API<br/>6軸分析・言い換え<br/>動画文脈要約]

    person --> sns
    person --> popup
    person --> auth
    person --> hosting
    auth -- ID token --> sw
    sw -- 公開ベータ: HTTPS<br/>Bearer ID token + 最小限の本文・文脈 --> api
    sw -. 利用拡大後 .-> lb
    lb -. serverless NEG .-> api
    api -- ID token検証 --> auth
    secret -- 実行時参照 --> api
    api -- 構造化出力要求 --> gemini
    gemini -- JSON候補 --> api
    api <--> firestore
    api -- 本文を除くログ --> logging
    api -. 必要性評価後 .-> sdp
    sw -. ローカル開発MVPのみ<br/>公開版では廃止 .-> gemini

    classDef client fill:#E8F4FF,stroke:#4A90E2,color:#14334A;
    classDef secure fill:#EAF8EF,stroke:#3A9D5D,color:#173F26;
    classDef future fill:#FFF4DF,stroke:#D58A1F,color:#5A3A0A,stroke-dasharray: 5 4;
    classDef external fill:#F3EEFF,stroke:#7E57C2,color:#322251;
    class cs,sw,popup,local,sns client;
    class api,firestore,secret,logging secure;
    class lb,sdp future;
    class auth,hosting,gemini external;
```

実線は公開ベータで使用する経路、破線はローカルMVPまたは将来導入する経路を表す。公開版ではGemini APIキーを拡張機能へ配布せず、すべてCloud Runから呼び出す。

## 2. 投稿前チェックのシーケンス

```mermaid
sequenceDiagram
    actor U as 利用者
    participant X as X / YouTube
    participant C as Content Script
    participant B as Background Worker
    participant A as Firebase Auth
    participant R as Cloud Run / FastAPI
    participant G as Gemini API
    participant F as Firestore

    U->>X: コメントを入力してチェック
    X->>C: 本文・取得可能な文脈
    C->>B: analyze要求
    B->>A: ID token取得・更新
    A-->>B: ID token
    B->>R: POST /v1/analyze
    R->>R: 認証・入力長・レート制限を検証
    R->>G: 6軸分析をJSON Schema付きで要求
    G-->>R: 構造化JSON候補
    R->>R: 値検証・分類・介入ルール適用
    R->>F: 本文なしの短期分析レシートをTTL付きで保存
    F-->>R: analysis_id
    R-->>B: analysis_id・判定・言い換え・介入種別
    B-->>C: 表示用結果
    C-->>U: キャラ表情とフィードバック

    alt 高リスク
        C-->>U: クールダウン・書き換え・中止・そのまま投稿
    else 通常
        C-->>U: 通常の送信導線
    end

    U->>C: 送信／書き換え／中止を選択
    C->>B: growth/apply要求 + 冪等キー
    B->>R: POST /v1/growth/apply
    R->>F: トランザクションで成長・上限・報酬を更新
    F-->>R: 確定後プロフィール
    R-->>B: 更新結果
    B-->>C: 表示用の更新結果
    C-->>U: XP・ステータス・報酬を表示
```

## 3. 責務分離

| レイヤー | 決めること | 決めないこと |
|---|---|---|
| Content Script | 対象入力欄、返信元の取得、UI表示、送信操作の一時停止 | AI分類、XP、ガチャ結果 |
| Background Worker | 認証状態、API通信、再試行、ローカルキャッシュ | 信頼できるゲーム状態の最終値 |
| Gemini API | 6軸スコア候補、理由、言い換え、動画要約 | 最終分類、投稿禁止、報酬量 |
| Cloud Run | 入出力検証、最終分類、介入判断、報酬・ガチャルール | SNS投稿の削除やアカウント処罰 |
| Firestore | クラウド上のゲーム状態の正本 | 投稿本文・返信元本文の保存 |

## 4. データ配置

| データ | 保存先 | 保持方針 |
|---|---|---|
| 投稿本文・返信元本文 | Cloud Runメモリ | 分析中だけ。Firestoreとログへ保存しない |
| Gemini出力 | 応答中のCloud Runメモリ | 値検証後、必要最小限の結果だけクライアントへ返す |
| ペット・XP・ステータス・所持品 | Firestore | UID単位。ゲーム状態の正本 |
| API設定・未同期設定 | `chrome.storage.local` | 端末ローカル。公開版にGemini APIキーを置かない |
| 動画要約キャッシュ | 原則ローカル、将来再評価 | 7日TTL、最大20件。本文のサーバー永続化は行わない |
| 運用ログ | Cloud Logging | 本文・プロンプト・トークン・シークレットを除外 |
| 短期分析レシート | Firestore | UID、分類、確信度、有効期限、消費済み状態のみ。本文なし、TTL削除 |
| 重複防止情報 | Firestore | イベントIDと、必要時のみ復元不能・短期TTLの文章指紋 |

## 5. セキュリティ境界

1. Content Scriptと`chrome.storage.local`は改ざんされ得るクライアント領域として扱う。
2. Cloud RunはFirebase ID token、JSONスキーマ、文字数、列挙値、冪等キーを検証する。
3. Firestoreへのゲーム状態更新はCloud Runのサービスアカウントだけが行う。
4. Gemini APIキーはSecret Managerで管理し、Cloud Runサービスアカウントに参照権限だけを与える。
5. AI出力は信頼せず、0〜10の範囲、必須項目、分類条件をCloud Runで再検証する。
6. 強い介入は高い有害性・確信度・十分な文脈がそろう場合に限定し、常に誤判定報告と最終的な投稿選択を残す。
7. Cloud Armor導入時はExternal Application Load Balancerとserverless NEGをCloud Runの前段に置き、Cloud Runのingressをロードバランサー経由へ制限する。

## 6. 導入ロードマップ

| フェーズ | 導入内容 | 完了条件 |
|---|---|---|
| 0: 現行MVP | 拡張機能、ローカル保存、Gemini直結、APIなしデモ | ローカルでX／YouTubeモックを体験できる |
| 1: 安全な公開ベータ | Firebase Auth、Cloud Run、Secret Manager、Gemini | 拡張にAPIキーを置かず、認証済み分析ができる |
| 2: 同期と不正対策 | Firestore、ゲーム状態正本、冪等性、日次上限 | 複数端末でも二重報酬や残高改ざんが起きない |
| 3: 公開運用 | Firebase Hosting、Cloud Logging、アラート、規約 | 公開情報と障害監視がそろう |
| 4: 利用拡大 | Load Balancer、Cloud Armor、必要に応じてSensitive Data Protection | 負荷・攻撃・個人情報リスクの評価基準を満たす |

## 7. 設計判断

- Firebase Hostingは拡張機能本体の配布先ではなく、紹介、規約、プライバシーポリシー、Webデモに使用する。拡張機能本体はChromeウェブストアで配布する。
- Firebase Authenticationは公開ベータのクラウド分析と同期で必須とし、APIなしデモはログイン不要で残す。
- Cloud ArmorはCloud Runへ直接付けるのではなく、External Application Load Balancerを経由して適用する。
- Sensitive Data Protectionは全リクエストへ初日から適用せず、検出対象、精度、遅延、費用を評価してから導入する。
- ユーザーが投稿した事実を拡張機能だけで完全には証明できないため、報酬不正対策は冪等性、活動日上限、類似文除外、短期イベント履歴を組み合わせる。

## 8. 参考資料

- [Cloud Run: Authenticating users](https://docs.cloud.google.com/run/docs/authenticating/end-users)
- [Cloud Run: Configure secrets for services](https://docs.cloud.google.com/run/docs/configuring/services/secrets)
- [Gemini API: Structured outputs](https://ai.google.dev/gemini-api/docs/structured-output)
- [Cloud Armor: Integrate with other Google products](https://docs.cloud.google.com/armor/docs/integrating-cloud-armor)
- [Sensitive Data Protection: De-identifying sensitive data](https://docs.cloud.google.com/sensitive-data-protection/docs/deidentify-sensitive-data)
- [Cloud Logging: Structured logging](https://docs.cloud.google.com/logging/docs/structured-logging)
