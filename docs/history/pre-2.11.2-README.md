# Reading Lamp v2.11.1 英文改稿版

2,570編・375,440語、初心者向け50編、秋の20編、リワード103件。

v2.11.0から24編を改稿しました。現行の変更・検証・残課題はEDITORIAL_REPORT_2.11.1.mdを参照。MERGE_REPORT.mdはv2.11.0時点の統合履歴です。

ユーザー提供のv2.10.9のUI・初心者導線・使い方・WPM説明・秋イベント・Android/Play準備資料に、このチャットの学習改善版v2.10.0の48編の修正、500編の追加、共通学習基準と生成後検査を統合しました。

**最初にMERGE_REPORT.mdを読んでください。両版でs2001以降が衝突するため、学習改善版v2.10.0で読書記録を作った場合は、同梱ツールでバックアップ変換が必要です。v2.10.9のIDは維持しています。**

## 実行と検証

```sh
python3 -m http.server 8080
npm test
```

http://localhost:8080/ を開いて確認します。ファイル直開きではPWAの保存・更新は確認できません。

```sh
npm install
npx playwright install chromium
npm run test:ui
```

実画面テストにはChromiumが必要。この作業環境では実行未完了です。必要ならREADING_LAMP_BROWSER環境変数で実行ファイルを指定できます。

## 次の文章追加

s2571から開始。learning-policy.jsの基準をscripts/create_authoring_brief.jsで取得し、原稿を作成・編集確認後、scripts/import_stories.jsでレビューと照合します。本文・レベル等を改稿したら再レビュー。直接のJSON変更もリリース検証の対象です。

現在のリリース専用の期待件数・追加範囲はvalidate_current_release.jsとvalidate_corpus.jsにあります。次版ではそれらと監査・版番号・SWキャッシュ・説明資料を一緒に更新してください。

```sh
python3 -m pip install -r requirements-audit.txt
python3 scripts/audit_learning.py
python3 scripts/audit_similarity.py
npm test
```

## 資料

- MERGE_REPORT.md：統合内容、ID対応、保存データの移行
- READING_LAMP_HANDOFF.md：次回開発の入口
- learning_audit_2570.csv：現在の全件監査
- fact_provenance_2570.csv：確認範囲・旧版からの継承
- ENGLISH_LEARNING_REVIEW.md：統合前2,500編のレビュー。歴史資料として参照
- content/reviews-500.json：統合後のIDに対応した追加500編のレビュー
- docs/history/：元の両版の説明
- android-twa/：Android TWAプロジェクト。Web版とは別にバージョン管理
- play-store/：ストア掲載文・申告案・公開準備

公開用ZIPにはWebで必要なファイルだけを収録。完全版ZIPは開発用です。署名済みAABや署名鍵は含めません。
