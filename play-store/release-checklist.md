# Google Play 公開チェックリスト

## 1. 開発者情報

- [ ] Google Play Consoleの開発者登録を完了する
- [ ] 公開用の運営者名または屋号を確定する
- [ ] 連絡先メール`Reading.Lamp012@gmail.com`を受信確認する
- [ ] 対象年齢を確定する（現在の案は13歳以上）

## 2. Androidアプリ

- [x] アプリID`io.github.hidmn531.readinglamp`でAndroidプロジェクトを作成する
- [x] 署名済みAndroid App Bundle（AAB）を作成する
- [x] ターゲットAPIレベル36を確認する
- [ ] Play App Signingを有効にする
- [x] アップロード鍵をGitの対象外となる`.secrets/`へ作成する
- [ ] `.secrets/reading-lamp-upload.keystore`とパスワードファイルを別の安全な場所へバックアップする
- [ ] Play App Signing証明書のSHA-256フィンガープリントを取得する

署名済みファイルは`play-store/build/reading-lamp-1.0.0.aab`です。このフォルダーはGitの対象外です。アップロード証明書のSHA-256は`FF:C3:9C:D5:B6:33:80:12:14:4A:6F:50:3B:5A:47:31:77:BF:E6:BF:C6:DD:F1:1F:CF:12:19:CB:5D:DD:B5:7A`です。

## 3. Webアプリとの関連付け

- [ ] `https://hidmn531.github.io/.well-known/assetlinks.json`を公開する
- [ ] `assetlinks.json`にアプリIDとPlay App Signing証明書を登録する
- [ ] Android端末でアドレスバーなしの全画面表示を確認する

現在のWeb版はGitHub Pagesのプロジェクトサイトにあります。関連付けファイルはドメイン直下に必要なため、`HiDMN531/hidmn531.github.io`リポジトリを作るか、Reading Lamp用の独自ドメインを設定します。

## 4. ストア掲載

- [ ] 512×512のアプリアイコンを登録する
- [ ] 1024×500のフィーチャーグラフィックを登録する
- [ ] スマートフォンのスクリーンショットを2枚以上登録する
- [ ] `listing-ja.md`の掲載文を入力する
- [ ] プライバシーポリシーURLを登録する
- [ ] アプリのアクセス権、広告、対象年齢、コンテンツレーティングを回答する
- [ ] `data-safety-ja.md`をもとにデータセーフティを回答する

## 5. テストと公開

- [ ] 内部テストでインストール、更新、オフライン読書を確認する
- [ ] AI生成モードを使う場合は実機で確認する
- [ ] 新しい個人アカウントに該当する場合、12人以上で14日間のクローズドテストを行う
- [ ] 本番公開を申請する
