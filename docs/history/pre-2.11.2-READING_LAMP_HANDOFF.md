# Reading Lamp v2.11.1 引き継ぎ

2026-09-24。現行は2,570編・375,440語、103リワード。SWはreading-lamp-v84。

最初にREADME.md、EDITORIAL_REPORT_2.11.1.mdを読む。統合経緯はMERGE_REPORT.md（v2.11.0当時の数字）。v2.10.9のUI・初心者導線・秋イベント・Android構成と、学習改善版の500編・生成品質検査を統合済み。

今回24編を改稿：Level 1が5編、Level 2が7編、Level 3が12編。既存2000編からの累計改稿72編。初級の文長・構文を整理し、Level 3の架空人物12編を創作と明示した。前後全文と理由はcontent/editorial-batch-2.11.1.json。

IDはs001〜s2570。次回追加はs2571。v2.10.9のs2001〜s2070を保持し、学習版v2.10.0の500編はs2071〜s2570へ移動済み。今回ID変更なし。ID移行ツールはv2.10.0の学習版バックアップ専用で、v2.10.9・v2.11.0には使用しない。

自動注意928編。Level 1〜2の文長・構文注意0編、Level 3には37編残る。これは全編校閲完了や語彙の完全適合を意味しない。次回はLevel 3の残る37編を優先する。content/editorial-followup.csvは全レベルの候補で、scripts/audit_learning.pyが自動再作成する。人物記事の残りも創作と実在の区別を別途点検する。

本文変更時はwordCount・監査・改訂ハッシュ・現行出典記録・語数ゲート・version・SW・release-assetsを更新する。baseline-2.9.4.jsonは変更しない。現行出典はfact_provenance_2570.csv。fact_check_all_2000.csvは旧版の履歴資料。

npm test合格。完全版ZIP展開後も再実行して合格。実ブラウザ・実機・AABビルド・実AI APIは未確認。Chromium未導入のため前回の実画面テストは未完了。署名鍵とAABは含まれない。Android版1.0.0/code 1とWeb版2.11.1を混同しない。

公開やPlay提出は未実施。依頼に応じて実機確認、公開準備へ進める。
