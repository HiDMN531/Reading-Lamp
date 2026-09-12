# Reading Lamp 1,000篇 語彙レベル監査レポート

監査日: 2026-09-12

## 結論

- 対象: **1,000篇・222,363語**（アプリと同じ空白区切りで再計数）
- 監査用トークン数: **223,311語**（ダッシュ等で連結された語も分割）
- ID重複・欠番: **0件**
- `wordCount`不一致: **0件**
- 運用基準内: **474篇**
- 構文のみ要確認: **140篇**
- 語彙要確認: **261篇**
- 優先確認（語彙指標を2種類以上超過）: **125篇**

語彙難度の中央値はLevel 1からLevel 8にかけて概ね上昇しています。一方、Level 8〜10は指標が重なっており、上位レベル間の差は明確ではありません。またLevel 5〜8は平均文長が長く、語彙そのものより構文の負荷が読みやすさを下げている篇が多くあります。

> 「要確認」は自動的な誤判定や不合格を意味しません。題材固有の語、科学用語、古典の固有名詞などを編集者が確認するための抽出結果です。本文の自動書き換えやレベルの自動付け替えは行っていません。

## 監査方法

- 本文を英単語に分割し、`wordfreq 3.1.1`の英語Zipf頻度で全語を評価
- 文中で大文字になる語を「固有名詞候補」として語彙指標から分離
- 低頻度語: Zipf値4未満（一般コーパスで概ね10万語に1回未満）
- 極低頻度語: Zipf値3未満（概ね100万語に1回未満）
- 長語: アポストロフィを除き8文字以上
- 構文補助指標: 1文あたりの平均語数
- Levelごとに段階的な編集用ガードレールを設定し、1つ超過を「語彙要確認」、2つ以上を「優先確認」とした

この方法は一般英語コーパスに基づく相対監査であり、CEFRや出版社別Graded Readerの公式Headword Family判定ではありません。活用形、複合語、文脈から容易に推測できる語の扱いには限界があります。

## Level別集計

| Lv | 篇数 | 平均語数 | 平均文長・中央値 | 低頻度語・中央値 | 極低頻度語・中央値 | 長語率・中央値 | 基準内 | 構文確認 | 語彙確認 | 優先確認 |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 90 | 61 | 6.8 | 3.3% | 0.0% | 2.2% | 45 | 1 | 36 | 8 |
| 2 | 85 | 125 | 10.3 | 4.9% | 0.0% | 6.4% | 31 | 0 | 25 | 29 |
| 3 | 85 | 145 | 11.9 | 6.3% | 0.5% | 11.3% | 41 | 1 | 25 | 18 |
| 4 | 85 | 168 | 15.9 | 7.6% | 0.7% | 16.8% | 42 | 1 | 22 | 20 |
| 5 | 105 | 235 | 28.8 | 8.4% | 0.9% | 20.0% | 47 | 13 | 24 | 21 |
| 6 | 112 | 252 | 34.2 | 10.6% | 1.2% | 25.6% | 43 | 17 | 35 | 17 |
| 7 | 106 | 280 | 39.5 | 12.8% | 1.5% | 31.0% | 36 | 22 | 41 | 7 |
| 8 | 136 | 300 | 43.8 | 12.5% | 1.6% | 36.4% | 50 | 41 | 42 | 3 |
| 9 | 98 | 276 | 15.2 | 12.1% | 1.3% | 28.1% | 69 | 21 | 7 | 1 |
| 10 | 98 | 307 | 15.4 | 13.7% | 1.7% | 31.6% | 70 | 23 | 4 | 1 |

## 編集用ガードレール

| Lv | 低頻度語率 | 極低頻度語率 | 長語率 | 平均文長 |
|---:|---:|---:|---:|---:|
| 1 | ≤5% | ≤0.5% | ≤5% | ≤12語 |
| 2 | ≤7% | ≤1% | ≤9% | ≤15語 |
| 3 | ≤9% | ≤1.5% | ≤14% | ≤18語 |
| 4 | ≤11% | ≤2% | ≤19% | ≤22語 |
| 5 | ≤13% | ≤2.5% | ≤24% | ≤27語 |
| 6 | ≤15% | ≤3% | ≤30% | ≤32語 |
| 7 | ≤18% | ≤4% | ≤36% | ≤36語 |
| 8 | ≤20% | ≤5% | ≤42% | ≤42語 |
| 9 | ≤22% | ≤6% | ≤46% | ≤46語 |
| 10 | ≤25% | ≤8% | ≤52% | ≤55語 |

## 優先確認篇（上位30件）

| ID | Lv | タイトル | 低頻度語 | 極低頻度語 | 長語率 | 平均文長 | フラグ |
|---|---:|---|---:|---:|---:|---:|---|
| `s852` | 1 | The Extra Lunch | 7.0% | 3.5% | 7.0% | 8.1 | low-frequency / very-low-frequency / long-words |
| `s426` | 2 | The Busy Squirrel | 8.3% | 4.6% | 10.2% | 15.9 | low-frequency / very-low-frequency / long-words / long-sentence |
| `s497` | 3 | Why Cats Purr | 14.4% | 6.4% | 20.8% | 25.0 | low-frequency / very-low-frequency / long-words / long-sentence |
| `s428` | 4 | Why Peacocks Show Their Feathers | 18.8% | 7.1% | 30.4% | 16.0 | low-frequency / very-low-frequency / long-words |
| `s658` | 2 | How Plants Drink Water | 18.1% | 2.9% | 17.4% | 27.6 | low-frequency / very-low-frequency / long-words / long-sentence |
| `s637` | 2 | Town Crier | 11.7% | 2.3% | 25.0% | 26.2 | low-frequency / very-low-frequency / long-words / long-sentence |
| `s577` | 2 | Woodpecker's Loud Knock | 12.4% | 2.6% | 24.8% | 23.8 | low-frequency / very-low-frequency / long-words / long-sentence |
| `s486` | 2 | The Garden That Grew at Night | 10.0% | 2.9% | 10.7% | 14.4 | low-frequency / very-low-frequency / long-words |
| `s466` | 2 | How Soap Bubbles Form | 13.4% | 2.7% | 14.3% | 18.7 | low-frequency / very-low-frequency / long-words / long-sentence |
| `s536` | 2 | Why Bread Gets Hard | 13.1% | 2.5% | 18.0% | 17.4 | low-frequency / very-low-frequency / long-words / long-sentence |
| `s465` | 1 | Why We Blink | 14.6% | 0.0% | 8.3% | 5.3 | low-frequency / long-words |
| `s656` | 1 | Magnets Stick Together | 14.3% | 0.0% | 10.7% | 4.7 | low-frequency / long-words |
| `s448` | 4 | Broken Umbrella | 17.8% | 5.0% | 22.8% | 17.2 | low-frequency / very-low-frequency / long-words |
| `s578` | 2 | Turtle's Slow Journey | 7.7% | 1.5% | 20.8% | 26.2 | low-frequency / very-low-frequency / long-words / long-sentence |
| `s496` | 2 | Spider's Web | 17.6% | 1.0% | 23.5% | 18.0 | low-frequency / long-words / long-sentence |
| `s880` | 2 | Bread in a Medieval Town | 8.2% | 2.4% | 9.4% | 10.6 | low-frequency / very-low-frequency / long-words |
| `s579` | 3 | The Clever Crow's Trick | 11.8% | 2.0% | 30.7% | 30.6 | low-frequency / very-low-frequency / long-words / long-sentence |
| `s585` | 6 | The Symbiotic Relationship Between Clownfish and Sea Anemones | 18.9% | 6.5% | 36.8% | 37.0 | low-frequency / very-low-frequency / long-words / long-sentence |
| `s559` | 3 | Wishing Bench | 8.3% | 3.8% | 16.5% | 26.8 | very-low-frequency / long-words / long-sentence |
| `s396` | 2 | Why Leaves Fall | 9.6% | 2.1% | 12.8% | 15.6 | low-frequency / very-low-frequency / long-words / long-sentence |
| `s516` | 2 | The Family Recipe Box | 9.0% | 1.0% | 22.0% | 20.4 | low-frequency / long-words / long-sentence |
| `s351` | 3 | A Day at the Farm | 14.8% | 3.8% | 13.1% | 17.3 | low-frequency / very-low-frequency |
| `s580` | 3 | Bat's Nighttime Feast | 21.5% | 1.4% | 30.6% | 28.8 | low-frequency / long-words / long-sentence |
| `s706` | 1 | A Shadow Moves | 2.5% | 1.3% | 5.1% | 8.1 | very-low-frequency / long-words |
| `s581` | 4 | How Salmon Find Their Way Home | 13.8% | 4.0% | 32.8% | 34.8 | low-frequency / very-low-frequency / long-words / long-sentence |
| `s599` | 3 | Town's First Community Center | 10.7% | 0.6% | 32.7% | 31.8 | low-frequency / long-words / long-sentence |
| `s399` | 3 | How We Hear Sounds | 9.8% | 2.9% | 19.6% | 29.1 | low-frequency / very-low-frequency / long-words / long-sentence |
| `s562` | 4 | Weathervane That Remembered | 19.6% | 3.9% | 28.5% | 36.0 | low-frequency / very-low-frequency / long-words / long-sentence |
| `s383` | 2 | A Small Village Long Ago | 7.9% | 0.5% | 20.6% | 18.9 | low-frequency / long-words / long-sentence |
| `s395` | 2 | How Rain Falls | 13.5% | 1.0% | 15.6% | 16.1 | low-frequency / very-low-frequency / long-words / long-sentence |

## 推奨する修正順

1. `priority-review`の125篇を目視し、Level 1〜4から先に語彙を置き換える
2. `syntax-review`を含む篇は、一文一情報を目安に長文を分割する
3. Level 8〜10は「難語の量」だけでなく、抽象度・論理構造・自然さで差を再設計する
4. 再編集後に同じ監査を再実行し、各Levelの中央値と要確認数の変化を比較する

## 詳細データ

`vocabulary_audit_1000.csv`に全1,000篇の指標・フラグ・判定を収録しています。UTF-8 BOM付きのため、Excelでも文字化けせず開けます。
