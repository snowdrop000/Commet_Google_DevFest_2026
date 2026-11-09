# Vertex AIのYouTube動画読み込みで発生した401

確認日：2026年11月9日（日本時間）

## 結論

対象プロジェクト`vital-charger-422600-u7`では、Vertex AIのサービスIDが未初期化だった。公式の`generateServiceIdentity`を実行した後、同じユーザー認証・モデル・YouTube URL・リクエスト本文で、HTTP 401がHTTP 200に変わった。アプリの動画要約コードとコメント判定コードの変更は不要だった。

Google内部のYouTube取得処理の実装までは確認できないが、今回のプロジェクトで不足していた初期化処理と、その実施による復旧を実測で確認した。

## 症状と切り分け

エラーは`HTTP 401 / UNAUTHENTICATED`で、本文は以下だった。

```text
Request is missing required authentication credential. Expected OAuth 2 access token,
login cookie or other valid authentication credential.
```

同一のADCで、`gemini-3.1-flash-lite`のglobalエンドポイントに短いリクエストを送った。動画の比較では冒頭3秒だけを指定した。

| 条件 | 初期化前の結果 |
| --- | --- |
| テキストのみ | HTTP 200 |
| 公開Cloud Storage動画（`gs://`） | HTTP 200、VIDEO入力を確認 |
| 同じ公開動画のHTTPS MP4 URL | HTTP 200、VIDEO入力を確認 |
| 公開YouTube動画`jNQXAC9IVRw` | HTTP 401 |
| 同じ動画の`youtu.be`形式 | HTTP 401 |
| Google公式サンプルの動画`3KtWfp0UopM` | HTTP 401 |
| YouTube入力、APIを`v1beta1`へ変更 | HTTP 401 |
| YouTube入力、公式サンプル掲載の`gemini-3.5-flash`へ変更 | HTTP 401 |

YouTubeの失敗は、JSONスキーマやシステム指示を外した最小リクエストでも再現した。HTTPリダイレクトも発生していなかった。API全体の認証不備・動画全般の未対応・アプリのJSON出力指定が主原因という説明では、これらの差を説明できなかった。

## 不足していた初期化

`service-561617243505@gcp-sa-aiplatform.iam.gserviceaccount.com`のサービスエージェントを調べたところ、初期化前はNOT_FOUNDだった。Vertex AI API自体はすでに有効だった。

Googleの公式資料では、サービスエージェントは最初の非同期ジョブなどで作成され、明示的な作成もできると説明されている。APIを有効にしてテキストのオンライン推論に成功するだけでは、今回必要なサービスIDの初期化が完了していなかった。

今回実行した処理は、公式Service Usage APIの以下の呼び出し。

```text
POST https://serviceusage.googleapis.com/v1beta1/projects/561617243505/services/aiplatform.googleapis.com:generateServiceIdentity
```

対応する公式CLIコマンドは以下。このプロジェクトでは実施済み。

```sh
gcloud beta services identity create --service=aiplatform.googleapis.com --project=vital-charger-422600-u7
```

アプリのユーザーに追加のYouTube権限を要求する変更や、プロジェクトIAMポリシーの手動変更は行っていない。サービスエージェントはGoogle管理のアカウントであり、Cloud Runの実行サービスアカウントや開発者のADCとは区別する。

## 復旧の確認

- 初期化直後、同じYouTube入力がHTTP 200になり、入力の利用量にAUDIOとVIDEOの両方が記録された。
- アプリの`VertexGeminiRepository.video()`でも、切り出しなしの公開動画を要約できた。HTTP 200、JSONスキーマ検証成功、要約368文字を確認した。
- 隔離したローカルAPIから実際の`POST /v1/analyze`を実行し、HTTP 200、`demo: false`、`videoSource: "gemini_video"`を確認した。動画要約を渡したコメント判定のS・Q・XP・コイン倍率も共通スキーマに適合した。

以上はこのプロジェクト・公開サンプル動画での確認であり、すべての動画を読み込めることを保証するものではない。動画要約の失敗時は従来通りタイトル・説明文に切り替わる。失敗結果のキャッシュは60秒なので、以前から起動しているAPIでは期限後に再試行するか、APIを再起動して確認する。

## 参照

- [Google：Vertex AIのサービスエージェント](https://docs.cloud.google.com/vertex-ai/docs/general/access-control#service-agents)
- [Google：サービスIDの作成API](https://docs.cloud.google.com/service-usage/docs/reference/rest/v1beta1/services/generateServiceIdentity)
- [Google：YouTube動画要約の公式サンプル](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/samples/googlegenaisdk-textgen-with-youtube-video)
