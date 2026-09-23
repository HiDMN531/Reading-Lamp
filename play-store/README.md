# Google Play公開資料

このフォルダーには、Reading LampをGoogle Playへ登録する際に使う文章と画像をまとめています。

- `listing-ja.md`：ストア掲載文と基本情報
- `data-safety-ja.md`：データセーフティ申告案
- `release-checklist.md`：公開までの確認順
- `assetlinks-template.json`：Web版とAndroid版を関連付けるファイルのひな型
- `assets/play-icon-512.png`：512×512アプリアイコン
- `assets/feature-graphic-1024x500.png`：1024×500フィーチャーグラフィック
- `assets/screenshots/`：1080×1920スマートフォン画像5枚

`assetlinks-template.json`の`PLAY_APP_SIGNING_SHA256`は、Play App Signingを有効にした後、Play Consoleに表示されるSHA-256証明書フィンガープリントへ置き換えます。完成したファイルは`https://hidmn531.github.io/.well-known/assetlinks.json`で公開します。
