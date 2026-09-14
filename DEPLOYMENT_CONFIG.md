# 品質改善用エンドポイントの設定

`config.json`の値は初期状態で空です。この状態では、匿名利用集計と未送信の文章報告は外部へ送られず、利用者の端末内だけに保存されます。

公開時に自動収集を有効にする場合は、アプリと同一オリジンにHTTPSの受信APIを用意して、次のように相対URLを設定します。

```json
{
  "analyticsEndpoint": "/api/anonymous-usage",
  "storyReportEndpoint": "/api/story-reports"
}
```

## 匿名利用集計

`analyticsEndpoint`には`POST`で次を送ります。

- `schemaVersion`
- ランダムに生成した`anonymousInstallId`
- `appVersion`
- 最大90日分の日別イベント件数、レベル別件数、ジャンル別件数

文章ID、文章タイトル、読書時刻、自由入力、APIキーは含みません。受信に成功したら、APIは2xxを返してください。アプリは送信済み集計を端末から削除します。

## 文章問題報告

`storyReportEndpoint`には`POST`で`queueId`と報告内容を送ります。受信側は`queueId`を一意キーとして扱い、再送されても重複登録しないでください。2xx応答を受けた報告だけが端末の送信待ちから削除されます。

報告には文章ID、タイトル、ジャンル、レベル、問題の種類、利用者が任意で入力した補足が含まれます。管理画面では文章IDごとに集約し、重大な報告がある文章を`editorialStatus: "published"`から外して再審査できる運用を推奨します。

## セキュリティ

- エンドポイントはアプリと同一オリジンに限定されています。
- リクエスト本文のサイズ制限、レート制限、JSONスキーマ検証を受信側で行ってください。
- IPアドレスやUser-Agentを分析目的で長期保存しない運用を推奨します。
- `config.json`を変更したらService Workerのキャッシュ名も更新してください。
