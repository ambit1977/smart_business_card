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

## 次の拡張候補

- Apple Wallet / Google Wallet パス配布
- 双方向交換(相手の vCard も受け取る)
- 動的 OGP / 訪問解析
- AR / Live Activity
