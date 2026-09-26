# Reading Lamp v2.11.9 暫定更新版

2,570編・374,734語。全校閲完了前のチェックポイントです。

最初にREADING_LAMP_HANDOFF.mdとEDITORIAL_REPORT_2.11.9bb.mdを読んでください。ユーザーの追加指示により、この途中版をGitHubへ反映します。全2,570編のうち現行本文に一致する確認は1,265編で、残る1,305編の校閲は継続中です。これは全件校閲完了・Google Play提出の宣言ではありません。公開判定ゲートは意図どおり未完了を検出します。

```sh
npm test
npm run review:gate
```

review:gateは現在未完了のため終了コード2を返します。故障ではありません。完了記録1,093編、未完了1,477編、実ブラウザ検証済みです。

開発プレビューはpython3 -m http.server 8080で開始。実ブラウザテストはPlaywright/Chromiumを用意したうえでnpm run test:uiを実行します。

共通の文章作成・生成基準はlearning-policy.js。新規追加はs2571から。既存文章のIDやレベルを不用意に変更しないでください。v2.10.0学習版からのID移行のみMERGE_REPORT.mdを参照。v2.10.9以降には移行不要です。

Web公開用のファイル一覧はrelease-assets.json。完全な作業ZIPをそのまま公開フォルダへ置かないでください。署名鍵・署名済みAABは含まれていません。
