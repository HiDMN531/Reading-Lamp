# Reading Lamp 英文改稿レポート — v2.11.1

2026-09-24。統合版v2.11.0を基準に、初級英文の優先修正を実施しました。

## 今回の変更

- Level 1の5編、Level 2の7編：長い文、過去完了、不自然な語法、曖昧な結びを修正。語の意味を文脈でつかめる表現に変更。
- Level 3の12編：架空の人物を実在の伝記のように読める記述を、創作であると本文で明示。抽象的な定型文を、人物・課題・行動・結果が追える短い物語に書き換え。
- 動物の創作3編のcontentTypeと、一部の不適切なsubtopicを修正。
- ポンペイ、ウミガメ、粘土の文字、ブレーメン、アリスの要約は下記の出典と照合。ブレーメンの旧出典リンクは該当話を確認できず、本文が読める公式サイトの掲載版に変更。
- 編集待ちCSVを、現在の全ストックから監査時に自動再作成。レベル順、同レベルではエラー・文長構文の注意を先に表示。

## 数値と確認範囲

| 項目 | 結果 |
|---|---:|
| 総ストック | 2,570編（増減なし） |
| 総語数 | 375,440語 |
| 今回改稿 | 24編 |
| 元の2,000編からの累計改稿 | 72編 |
| 今回対象の文長・構文警告 | 24編 → 0編 |
| 全体の自動注意 | 937編 → 928編 |
| 全体の構造検査エラー | 0編 |
| Level 1〜2の文長・構文警告 | 12編 → 0編 |
| Level 3の文長・構文警告 | 49編 → 37編 |

今回改稿した24編のうち15編には語彙頻度の注意が残ります。固有名詞、動詞の語形、題材に必要な語を含むため、注意を消すためだけの置換や固有名詞の一括除外はしていません。例えばturtleやumbrellaは本文の中心語として繰り返しています。単語頻度は個人の既知語率やCEFR判定ではありません。

全2,570編の自動走査を行いましたが、全編の手作業校閲完了を意味しません。今回の24編もAIによる編集であり、人間の英語教育専門家による認証ではありません。文長基準の通過だけでは、読解のしやすさや事実の正確さは保証されません。

## 互換性と検証

文章ID、タイトル、レベル、ジャンルを維持。初心者50編、秋イベント20編、追加500編の本文とID対応、103リワードを維持。履歴の文章IDは移動しません。過去の読了語数は過去の記録のまま、新しく開く本文には改訂後の語数を使います。

共通学習基準learning-policy.jsとAI生成後の検査は継続。アプリ版2.11.1、Service Workerキャッシュreading-lamp-v84に更新しました。

npm test合格。文章・語数・監査ハッシュ・改訂記録・出典対応・統合互換性・オフライン更新・生成検査を確認。完全版ZIPを展開した状態でもnpm testを再実行し、合格しました。実ブラウザ、Android実機、署名済みAAB、実AI APIは未検証です。Web公開やGoogle Play提出は行っていません。

## 改稿一覧

| ID | Level | タイトル | 語数（前→後） |
|---|---:|---|---:|
| s346 | 2 | Dog and the Ball | 175 → 116 |
| s697 | 1 | A Bird at My Window | 93 → 90 |
| s701 | 1 | The Key Under the Chair | 91 → 93 |
| s716 | 2 | Cooking Rice for Two | 108 → 106 |
| s717 | 2 | A Day in Ancient Pompeii | 105 → 100 |
| s844 | 1 | A Duck in the Rain | 61 → 60 |
| s878 | 2 | A Seat Near the Window | 91 → 97 |
| s1023 | 2 | The Quiet Black Umbrella | 61 → 77 |
| s1351 | 3 | Peter Walsh: The Work Behind the Work | 123 → 107 |
| s1352 | 3 | Inez Silva: The Work Behind the Work | 119 → 104 |
| s1353 | 3 | Omar Reed: The Work Behind the Work | 127 → 100 |
| s1354 | 3 | Keiko Tan: The Work Behind the Work | 120 → 103 |
| s1356 | 3 | Sara Lind: The Work Behind the Work | 146 → 104 |
| s1357 | 3 | Theo Martin: The Work Behind the Work | 117 → 104 |
| s1359 | 3 | Marcus Green: The Work Behind the Work | 121 → 105 |
| s1364 | 3 | Sofia Almeida: The Work Behind the Work | 117 → 111 |
| s1366 | 3 | Fatima Noor: The Work Behind the Work | 119 → 104 |
| s1367 | 3 | Henry Cole: The Work Behind the Work | 117 → 105 |
| s1368 | 3 | Anika Bose: The Work Behind the Work | 114 → 104 |
| s1369 | 3 | Gabriel Stone: The Work Behind the Work | 114 → 102 |
| s1479 | 2 | The Bremen Animals Find a Home | 152 → 126 |
| s1912 | 1 | A Turtle Comes Up for Air | 53 → 53 |
| s1915 | 1 | Clay Held the First Marks | 51 → 57 |
| s1926 | 2 | Alice Follows a White Rabbit | 50 → 74 |

前後の全文、分類、理由、出典、監査結果はcontent/editorial-batch-2.11.1.jsonに保存しています。既存ハッシュとの対応はcontent/revision-log.json、現行の確認範囲はfact_provenance_2570.csvを参照してください。fact_check_all_2000.csvは旧版の履歴であり、現行の確認結果ではありません。

## 出典

- s717：https://pompeiisites.org/en/pompeii-map/analysis/pompeii-after-the-eruption/ / https://pompeiisites.org/en/archaeological-park-of-pompeii/press-kit/ / https://pompeiisites.org/en/press-releases/from-the-12th-august-the-thermopolium-of-regio-v-is-opening-to-the-public/
- s1479：https://www.bremen.eu/tale-of-the-bremen-town-musicians
- s1912：https://www.fisheries.noaa.gov/species/green-turtle
- s1915：https://www.britishmuseum.org/blog/how-write-cuneiform / https://www.britishmuseum.org/blog/library-fit-king
- s1926：https://www.gutenberg.org/files/11/11-h/11-h.htm

s1915は大英博物館の検索結果にある説明を確認しました。本文ページは403となり、全ページを確認したとは扱っていません。改稿の範囲は粘土・植物の茎による記録、乾燥、現存する記録に限っています。ほかの4編は取得できた本文または公式検索結果の該当情報を照合しました。

## 次に進める作業

Level 3の文長・構文注意37編を優先し、その後に語彙頻度の注意を文脈と合わせて確認します。content/editorial-followup.csvには全レベルの928編を収録。注意なしの文章にも校閲で見つかる問題はあり得ます。今回扱わなかった人物記事を含め、残りが事実確認済みであるとの追加認定はしていません。

旧版v2.10.0の学習改善版から移行する場合のID変換はMERGE_REPORT.mdを参照。v2.10.9およびv2.11.0からはID変換不要です。
