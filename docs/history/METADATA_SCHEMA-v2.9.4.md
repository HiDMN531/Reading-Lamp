# Reading Lamp 教材メタデータ仕様 v1

更新日: 2026-09-14

## 目的

各文章の公開可否、内容分類、原典、語彙監査、事実確認の状態を本文とは分けて管理します。アプリは `editorialStatus` が厳密に `published` の文章だけを文章バンクへ読み込みます。

## フィールド

| フィールド | 型 | 必須 | 意味 |
|---|---|---:|---|
| `subtopic` | string | 必須 | 大分類 `topic` の内側にある教材内容。空文字不可 |
| `contentType` | string | 必須 | 文章形式を示す管理用分類 |
| `editorialStatus` | string | 必須 | 編集工程。出題可能なのは `published` のみ |
| `factChecked` | boolean | 必須 | 独立した事実確認が完了したか |
| `reviewedAt` | string | 必須 | 最終編集確認日。`YYYY-MM-DD` |
| `sourceWork` | string / null | 必須 | 古典リテリングの原典名。オリジナル文章は `null` |
| `vocabularyVersion` | string | 必須 | 適用済み語彙監査基準の版 |

## `editorialStatus` の運用

| 値 | 用途 | アプリ出題 |
|---|---|---:|
| `draft` | 作成途中 | しない |
| `reviewed` | 編集確認済み・公開前 | しない |
| `published` | 公開承認済み | する |
| `archived` | 公開終了 | しない |

公開前に `draft` → `reviewed` → `published` の順で更新します。公開を止める場合は文章を削除せず `archived` にします。これによりIDと既存履歴を維持できます。

## `contentType` の管理値

- `narrative-fiction`
- `explanatory-nonfiction`
- `historical-narrative`
- `classic-retelling`
- `mystery-fiction`
- `travel-vignette`
- `fictional-biography`

## 現在の登録状況

- 全2,000篇に7フィールドを設定
- `editorialStatus: "published"`: 2,000篇
- `vocabularyVersion: "v2"`: 2,000篇
- `reviewedAt: "2026-09-14"`: 2,000篇
- 原典名付きの古典リテリング: 192篇・78原典
- オリジナル文章の `sourceWork`: `null`
- `factChecked: true`: 2,000篇
- `factChecked: false`: 0篇

`reviewedAt` と `vocabularyVersion` は全件編集判定・語彙監査を表し、外部資料と照合する事実確認とは別工程です。全2,000篇について、外部資料・原典との照合、または明示的な創作・仮想事例として外部事実が混入していないことの確認を完了しています。篇別の確認区分と根拠は `fact_check_all_2000.csv` に記録します。

## 更新方法

`scripts/add_metadata.js` はメタデータがない篇に現在の分類ルールを適用し、全篇の必須項目と古典の原典名を検証します。既に設定された公開状態、事実確認、確認日、語彙版、分類は維持するため、再実行しても `draft` を勝手に再公開したり `factChecked` を戻したりしません。実行前には `stories.json` のバックアップまたは版管理を確保してください。

## 公開時チェック

1. ID、Level、Topic、タイトル、本文、`wordCount` を検証する
2. 7つの教材メタデータが揃っていることを確認する
3. `sourceWork` が古典リテリングで設定され、それ以外で `null` であることを確認する
4. 語彙監査と編集確認を終え、日付と版を更新する
5. 公開承認後にだけ `editorialStatus` を `published` にする
6. 事実確認を別途完了した篇だけ `factChecked` を `true` にする
