# 教材メタデータ v3

必須：id, level (1..10), topic, title, text, wordCount, subtopic, contentType, editorialStatus, factChecked, reviewedAt, sourceWork, vocabularyVersion。

- `wordCount` はアプリ互換の空白区切り語数。
- 既存s001〜s2000の `vocabularyVersion: v2` は維持。新規はv3。
- 新規の `learningPolicyVersion` は `er-2026-09-23`。
- 出題は `editorialStatus: published` のみ。新原稿はdraftで用意し検証付き取込みでpublishedへ移行。
- `sourceWork` は古典のみ必須。その他はnull。
- `factScope` はfictional-vignette / explicit-imagined-example / source-retelling / verified-external-claimsなど。外部事実を含む場合はレビューに資料を要求。
- `contentType` は従来の分類に加え、observation-vignette、illustrative-fiction、historical-fictionを許可。科学の架空実験を実在研究として分類しない。
- `factChecked` は互換フィールド。確認の範囲と根拠は `fact_provenance_2570.csv` が正。旧版からの継承を今回の再確認とみなさない。

レビューは原稿とは別配列で保存し、id / contentDigest / policyVersion / decision / method / reviewedAt / vocabulary / grammar / coherence / facts / originality / sources を持つ。

`contentDigest` は `scripts/import_stories.js` の関数で計算。ID、レベル、ジャンル、題名、本文、原典、種別、事実区分、小テーマ、語数に結びつく。どれかを変えると承認は失効する。レビューを済ませずにハッシュだけ更新してはいけない。

`method` はAI-assisted-editorialまたはhuman-editorial。今回のレビューは前者。`decision` がapprovedで必要な説明がある場合だけ取込み可能。これはレビューの存在・整合性を検査する機構で、説明が真実かを機械的に証明するものではない。

次回の追加はs2571から。既存IDを再利用・振り直ししない。

統合時に継承したs2001〜s2070のv2メタデータ、starterOrder、seasonalEventを維持。学習改善版のv3追加文はs2071〜s2570。
