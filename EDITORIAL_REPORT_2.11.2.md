# Reading Lamp 校閲進捗 — v2.11.2 作業版

2026-09-24。校閲は継続中です。全確認完了前なのでGitHubにはまだ反映していません。

## 今回の結果

- Level 3の残り37編を改稿。語法、構文、話のつながり、歴史・科学の断定を修正。
- Level 1〜3の文長・構文警告は0編。全体の自動注意は928編から909編へ減少。
- 総ストック2,570編、374,856語。元の2,000編に対する累計改稿は107編。
- 初心者50編、秋イベント20編、追加500編の本文とID、103リワードを維持。
- npm test合格。完全版ZIPを展開した状態でも同じテストに合格。

文長警告がなくなっても、全編校閲完了ではありません。909編の注意には固有名詞や語形も含まれるため、注意数をゼロにすること自体を目標にしません。

## 完了条件と現在の位置

全2,570編について、本文とレベルに対応する校閲記録、語彙・構文・文脈の判定、事実や創作の区別、必要な出典確認を残します。文章を変えた場合、古い確認記録は無効になります。

新規500編の既存の承認記録と、v2.11.1の24編・今回37編を引き継ぎ、現在の本文と対応する確認記録は561編です。残り2,009編には、この完了条件に対応する記録がまだ必要です。過去の一部修正や自動検査だけを全校閲完了として数えていません。

さらに、最新版に対する自動テストと実ブラウザテストを必須条件にしました。review:gateが成功するまでは自動アップロードしません。今回、Chromiumのダウンロードが壊れたファイルを返し、実ブラウザテストは未完了です。Android実機・署名済みAAB・Play審査は別途未確認で、GitHub反映をPlay公開完了とは扱いません。

## GitHub

アップ先：HiDMN531/Reading-Lamp、main。書き込み権限を確認済み。確認時点のHEAD：544f00170bb1ca2950c02ba950492dd9e0cace39。GitHubのv2.10.9と提供ZIPは、テキストの改行コード差を除いて同じ内容です。

アップロード直前に再度リモートを確認し、後から入った変更は統合します。強制プッシュや既存ファイルの一括削除は行いません。未完了の現在版はアップしません。

## 今回の37編

- s350 / Fast Rabbit：Explicit animal fiction; remove universal predator-escape advice.
- s361 / A School for Everyone：Correct possessive grammar; concrete school planning; avoid universal guaranteed success.
- s362 / Clean River Project：Separate litter removal from industrial pollution; do not equate appearance with water safety.
- s363 / A Small Farm Grows Big：Correct countable noun comparison; describe a limited fictional farming trial rather than guaranteed growth.
- s375 / A Rainy Day at Home：Replace awkward sipping phrase and long participle chains with connected actions.
- s386 / A King and His People：Remove fictitious historians and universal success; keep fictional historical setting clear.
- s427 / How Snails Move：Retain muscular foot and mucus mechanism; remove claims about safe sharp edges and almost any surface.
- s437 / A Well for the Village：Avoid assuming any well is clean; fictional site assessment, water testing and maintenance.
- s467 / Why Metal Feels Cold：Limit example to thermal equilibrium below skin temperature; correct tense and always-cold claim.
- s487 / Door With No Handle：Preserve magic door plot; add a concrete ending and remove clause stacking.
- s507 / The Neighborhood Watch：Retain uncertainty about crime reduction; replace vague praise with a concrete social outcome.
- s537 / How Our Skin Protects Us：Present-tense biological explanation; no medical treatment advice or absolute protection claim.
- s560 / Painter's Missing Color：Replace abstract repetition with a coherent search and open-ended artistic outcome.
- s598 / School Supply Drive：Concrete donation sequence, recipient choice and planning record.
- s600 / The Volunteer Tutoring Program：Remove much more students error and general success guarantees; show individual learning differences.
- s619 / Surprise Visit：Fix dangling opening and dense backstory; preserve reunion and next contact.
- s639 / The Lighthouse Keeper's Daughter：Adult fictional daughter; remove invented historical first and unverified ships-saved claims.
- s1197 / A Rainy Day in Lisbon：Remove implausible unsupported tram-to-coast and sea-view route; match rainy title; fictional visit.
- s1202 / A Rainy Day in Mexico City：Clear gate-finding sequence; match rainy title; invented event, not actual city directions.
- s1207 / A Rainy Day in Prague：Clear view, reflection and bells; match rainy title; fictional visit, not guaranteed viewing instructions.
- s1212 / A Rainy Day in Dubrovnik：Replace midday heat mismatch with rain and wet path; fictional visit with concrete outcome.
- s1470 / The Borrowed Blue Pen：Replace goal-restatement template with lost-object clues and resolution.
- s1472 / The Quiet Seat on the Bus：Resolve contradiction between no free seat and merely making room; concrete safe seating sequence.
- s1482 / Robin Hood and the Poor Farmer：Original legend-inspired episode explicitly labeled; do not falsely claim this plot is a verified book summary.
- s1494 / The Library of Sleeping Maps：Remove repeated result and abstract template; concrete magic action and ending.
- s1507 / Drains Beneath an Ancient City：Name relevant archaeological city; remove each-home and unverified health outcome generalizations.
- s1508 / The Runner on the Mountain Road：Identify Inka chaski relay and accurate memorized messages; remove repetitive abstract template.
- s1510 / The Assembly Beside the Rock：Identify Thingvellir and Law Speaker; avoid equating early assembly with modern democracy.
- s1511 / Rules for the Market Bell：Explicit historical fiction instead of unnamed asserted historical event.
- s1513 / Messages Along the Wire：Concrete telegraph code mechanism; remove invented event and repetitive formula.
- s1514 / The First Public Vaccine Line：Explicit local fictional first clinic; remove global-first implication and unsupported medical outcome.
- s1540 / The Warm Air Balloon Bag：Teacher-led imagined demonstration; buoyancy must exceed total weight, not simply warm air rises.
- s1541 / The Green Leaf Test：Include destarching and controlled comparison; no invented real experiment; source retrieved as search excerpts only.
- s1552 / Lunch for Every Child：Explicit fictional planning; include resource and food requirements; remove universal causal claim.
- s1739 / Bread from the Shared Oven：Explicit fictional visit; contextual explanation of dough and shared oven; shorter clauses.
- s1932 / A Cup Returned with a Note：Natural coworker wording; clear mistaken borrowing, apology and result.
- s1933 / The Charter at Runnymede：Accurate 1215 dispute, failed agreement and later legacy; no modern rights attribution.

出典・全文の前後比較・確認範囲はcontent/editorial-batch-2.11.2.json、現行出典一覧はfact_provenance_2570.csv。s1541は検索結果の説明による照合で、取得できなかった全文を読んだとは扱いません。s1482は伝説に着想を得た新作と明記し、原作の特定場面の要約という誤った扱いを修正しました。

今回もAIによる校閲です。人間の専門校閲者による全編認証とは異なります。
