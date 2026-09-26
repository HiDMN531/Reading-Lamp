# Reading Lamp 校閲進捗 — v2.11.3 作業版

2026-09-24。全件校閲は継続中で、GitHubには未反映です。

今回はLevel 1の創作・日常・謎解き60編を全文確認し、38編を改稿、22編は本文を維持しました。確認記録は621/2,570編、未完了は1,949編です。これは既存500編のレビューと、前回までの61編、今回60編を本文に対応させた数です。

## 修正内容

- Ben went up on.という不完全な文を、雲に乗る動作として修正。
- 消えた鐘の説明が枝による音だった話、足跡がsafe againとなる話など、謎と結論の食い違いを修正。
- 手掛かりと解決が結び付くよう、登場人物、場所、物の移動、確認の会話を具体化。
- clean toolなどの不自然な表現をspoonなどの自然な語へ変更。
- 初級に不向きな過去完了や抽象的な結びを整理。会話に必要な短い過去形やWould you likeのような定型表現は、機械的に排除せず文脈で判定。
- 創作・幻想の文章として、実在の出来事や一般的な科学法則と混同していないか確認。

## 検証

| 項目 | 結果 |
|---|---:|
| ストック | 2,570編 |
| 総語数 | 375,238語 |
| 今回の全文確認 | 60編 |
| 今回の本文変更 | 38編 |
| 元の2,000編からの累計本文変更 | 142編 |
| 全件の構造エラー | 0 |
| Level 1〜3の文長・構文警告 | 0 |
| 全件の自動注意 | 918編 |
| 現行本文に対応する確認記録 | 621編 |
| 未完了 | 1,949編 |

自動注意は909編から918編に増えました。追加された注意は語彙頻度によるもので、人名、活用形、話の中心となる物の名称などを含みます。例えばlantern、kitten、spoonは、見える光・鈴の音・食事といった文脈で使っています。注意を消すためだけの語の置換や固有名詞の一括除外はしていません。各編の判定理由はreview-progress.jsonに記録しています。

npm test合格。ZIP展開後の自動テストにも合格しました。文章ID、初心者50編、秋20編、追加500編、リワード103件の保持も検証しています。実ブラウザ検証はChromium取得失敗により引き続き未完了で、成功扱いにしていません。Android実機・AAB・Play提出も未実施です。

## 今回の一覧

| ID | タイトル | 本文 |
|---|---|---|
| s331 | A Small Dog and a Big Star | 維持 |
| s332 | Little Boat | 維持 |
| s333 | A Girl and Her Cat | 維持 |
| s367 | My Day | 維持 |
| s368 | A Cup of Tea | 維持 |
| s369 | The Red Umbrella | 改稿 |
| s415 | A Small Light in the Dark | 改稿 |
| s445 | A Quiet Morning | 維持 |
| s485 | Sleepy Moon | 維持 |
| s515 | Breakfast Together | 維持 |
| s555 | The Fox With Two Tails | 維持 |
| s556 | Talking Rock | 維持 |
| s615 | A Cup of Coffee | 維持 |
| s616 | Cleaning My Room | 維持 |
| s695 | The Blue Kite | 改稿 |
| s696 | The Little Red Boat | 改稿 |
| s702 | My Quiet Morning | 改稿 |
| s835 | The Blue Door | 改稿 |
| s836 | A Star in a Cup | 改稿 |
| s837 | The Talking Hat | 改稿 |
| s838 | Ben and the Cloud | 改稿 |
| s852 | The Extra Lunch | 改稿 |
| s853 | Morning at the Bakery | 改稿 |
| s854 | The Lost Glove | 改稿 |
| s855 | A Quiet Birthday | 改稿 |
| s1001 | The Quiet Brass Key | 改稿 |
| s1002 | The Quiet School Bell | 改稿 |
| s1003 | The Quiet Red Violin | 改稿 |
| s1004 | The Quiet Recipe Book | 改稿 |
| s1005 | The Quiet Silver Ticket | 改稿 |
| s1006 | The Quiet Garden Map | 維持 |
| s1007 | The Quiet Museum Coin | 改稿 |
| s1008 | The Quiet Blue Lantern | 改稿 |
| s1009 | The Quiet Harbor Flag | 改稿 |
| s1010 | The Quiet Library Card | 改稿 |
| s1011 | The Quiet Glass Button | 改稿 |
| s1012 | The Quiet Clock Hand | 改稿 |
| s1013 | The Quiet Painted Shell | 改稿 |
| s1014 | The Quiet Paper Crown | 改稿 |
| s1015 | The Quiet Green Bicycle | 改稿 |
| s1016 | The Quiet Stone Bird | 維持 |
| s1017 | The Quiet Sealed Letter | 改稿 |
| s1018 | The Quiet Gold Spoon | 改稿 |
| s1019 | The Quiet Empty Frame | 改稿 |
| s1020 | The Quiet Roof Footprint | 改稿 |
| s1466 | The Cup Beside the Sink | 改稿 |
| s1467 | The Two Red Socks | 改稿 |
| s1489 | The Pebble That Sang | 維持 |
| s1490 | The Cloud in the Barn | 改稿 |
| s1611 | A Room Inside Mina's Coat | 維持 |
| s1614 | Lunch for the New Student | 改稿 |
| s1618 | A Kitten Behind the Wall | 改稿 |
| s1711 | A Star in the Bread Tin | 維持 |
| s1714 | Tea for the Early Driver | 維持 |
| s1718 | Mud on the Clean Floor | 維持 |
| s1811 | The Pocket Cloud | 維持 |
| s1814 | The Last Clean Spoon | 改稿 |
| s1818 | The Wet Red Hat | 改稿 |
| s1911 | The Moon in a Mug | 維持 |
| s1914 | The Blue Sock on the Stairs | 維持 |

各編の前後全文、個別の校閲理由、監査結果はcontent/editorial-batch-2.11.3.json。これはAIによる校閲であり、人間の英語教育専門家による全編認証ではありません。

## 自動継続とGitHub

既存の毎時タスクを維持しています。最新の作業ZIPと進捗ファイルを更新し、次の実行がこの版から続けられるようにしています。全2,570編の言語・事実確認記録と最新ビルドの自動/ブラウザテストが揃い、review:gateが成功した時だけHiDMN531/Reading-Lampのmainへ反映します。今回の作業版はアップロードしていません。
