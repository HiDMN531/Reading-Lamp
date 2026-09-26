# Reading Lamp 校閲進捗 — v2.11.5 作業版

2026-09-24。v2.11.4の保存版から継続。全2,570編中、現行本文・レベルなどのハッシュに一致する確認記録は641編、未完了1,929編。GitHubへは未反映。

## 今回の10編

Level 1の s355, s356, s357, s391, s392, s393, s425, s465, s535, s656 を全文校閲した。9編で本文または分類・題名を改稿し、s535は本文維持。前後全文、個別理由、一次・公式出典、監査結果を `content/editorial-batch-2.11.5.json` に保存。本文の改訂ハッシュは `content/revision-log.json`、現行出典は `content/current-provenance.json` と `fact_provenance_2570.csv` に反映した。

- 学校・町の3編は架空事例と明示し、`illustrative-fiction` へ分類。「全員が親切」「すべての人に良い」のような無限定の主張を改め、行動と結末を具体化。
- 水と氷は液体・固体の違いと温度による変化、太陽は地球の自転による見かけの動き、植物は根からの吸水を示す。毎日必ず水やりをするという表現を削除。
- カエルは架空の一場面と一般的な行動を区別し、鳴き声と昆虫食を確認。まばたきは涙の膜が広がる説明へ修正。磁石は材質によって引かれ方が異なるため、材質不明のスプーンを鉄釘に変更し、引力と反発の両方を示す。
- 語彙の自動注意は920編。例えば `frog` や `blink` は説明する題材そのもので、本文内の繰り返しと文脈で意味を補える。注意の判断は各編の `warningDisposition` に記録。

参照した主な一次・公式資料：[USGSの水循環](https://water.usgs.gov/edu/watercycle-kids-beg.html)、[NASAの地球の自転](https://starchild.gsfc.nasa.gov/docs/StarChild/questions/question14.html)、[NASAの植物と日光](https://www.nasa.gov/earth-and-climate/nasas-ecostress-mission-sees-plants-waking-up-from-space/)、[USDAの植物の根](https://aglab.ars.usda.gov/let-s-get-to-work/plant-growth-and-osmosis)、[Smithsonianのカエル](https://www.nationalzoo.si.edu/animals/gray-tree-frog)、[NEIの涙とまばたき](https://www.nei.nih.gov/eye-health-information/healthy-vision/how-eyes-work/how-tears-work)、[NASAの磁石](https://pwg.gsfc.nasa.gov/Education/wmfield.html)。各編の出典の割り当てはバッチ記録を参照。

## 検証

ストック2,570編、総語数375,234語。学習監査で構造エラー0、注意920編。類似度監査の最大値0.5188、0.8以上0。`npm test` 合格。実Chromium 153で `npm run test:ui` 合格。リワード通知が次の読書画面の操作を覆う問題を見つけ、読書画面へ移る際に前回分の通知を閉じるよう修正した。獲得済みリワードはコレクションに残る。修正後、初心者・10編目・秋イベントのUIフローが通過。

`npm run review:gate` は641編が承認済み、1,929編の校閲未了としてリリースを止める。最終版ではバージョン/SWを更新した後で自動・実ブラウザテストを再実行する。Android実機、AAB署名、Google Play申請は別作業として未確認。

全文校閲はAIによる作業であり、人間の英語教育専門家による全編認証ではない。
