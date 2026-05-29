# NFC デジタル名刺

書き換え可能 NFC タグから読み込まれるデジタル名刺の MVP。
かざすと名刺ページが開き、アドレス帳登録 / SNS リンク表示が可能。

## スタック

- Next.js 14 (Pages Router) + 静的 export
- Tailwind CSS
- さくらVPS (AlmaLinux 9.4 / Apache) にホスティング

## ローカル開発

```sh
npm install
npm run dev
# http://localhost:3000
```

## 内容を編集

`lib/profile.js` の `profile` オブジェクトだけ書き換える。
名前・肩書・SNS リンク・電話番号などはすべてここ。

```sh
npm run vcard   # public/contact.vcf を再生成(build 時に自動実行)
npm run build   # out/ に静的ファイル生成
```

## デプロイ

```sh
./deploy.sh
```

公開先: **https://ambit.go2020.tokyo/card/**
(既存の `ambit.go2020.tokyo` の Apache vhost に Alias /card で組み込む)

初回セットアップは [DEPLOY.md](./DEPLOY.md)、
iPhone での NFC タグ書き込みは [NFC_WRITE_iPhone.md](./NFC_WRITE_iPhone.md) を参照。

## ディレクトリ

```
pages/
  ├── _app.jsx
  ├── _document.jsx
  └── index.jsx         名刺ページ本体
components/
  └── Icon.jsx          軽量 SVG アイコン
lib/
  ├── profile.js        ★ ここを編集
  └── useOS.js          iOS/Android/Desktop 判定
public/
  ├── avatar.svg
  ├── favicon.svg
  └── contact.vcf       自動生成 (build 時)
scripts/
  └── build-vcard.cjs   vCard 生成スクリプト
styles/
  └── globals.css
```

## 機能(MVP v0.1)

- [x] プロフィール表示(名前/肩書/紹介)
- [x] vCard ワンタップダウンロード
- [x] iOS / Android で主要 CTA を出し分け
- [x] SNS / 外部リンク一覧
- [x] Web Share API での名刺ページ共有
- [x] mailto / tel ネイティブインテント

## 機能(v0.2 / E-Paper デバイス連携)

- [x] **「Now」バナー**: `now.json` を表示して「今ここ / 今これ」を反映
- [x] **トークン付き URL**: ESP32 が `?t=<16hex>` 付き URL を NTAG215 に書き込み
- [x] **訪問者ログ**: トークン経由のアクセスを時刻・IP・地域・OS・画面で記録
- [x] **双方向 vCard 交換**: 相手が任意で .vcf をアップロード → 同じトークンに紐づけ
- [x] **PWA 管理画面**: `/admin/` でスマホから状況設定、`/admin/log/` で履歴確認

## API (PHP, Apache でホスト)

| Endpoint | 用途 | 認証 |
|----------|------|------|
| `POST /card/api/issue-token.php` | ESP32 が新トークン発行 | Bearer |
| `POST /card/api/set.php` | `now.json` 上書き | Bearer |
| `GET  /card/api/log.php` | 交換履歴を取得 | Bearer |
| `GET\|POST /card/api/context.php?t=…` | 訪問者がトークン文脈を取得・記録 | 公開 |
| `POST /card/api/upload-vcard.php?t=…` | 相手が自分の vCard をアップロード | 公開 (token-bound) |

## 連携先

- 電子ペーパー名刺デバイス: <https://github.com/ambit1977/Epaper_test>
  - ESP32 + WeAct 4.2" E-Paper + PN532 + 内蔵 NTAG215
  - `/api/issue-token.php` を叩いて NTAG215 に動的 URL を書き込む
  - `/api/set.php` で「今ここ」を発信、`now.json` に反映

## 次の拡張候補

- Apple Wallet / Google Wallet パス配布
- 動的 OGP / シェアカード自動生成
- AR / Live Activity
- Web Share Target API での vCard 受信改善
