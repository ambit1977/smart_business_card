# NFC デジタル名刺 - VPS デプロイ手順

既存の `ambit.go2020.tokyo` のサブパス **`/card/`** に配信する。
新しい DNS や証明書は不要(既存の SSL 証明書をそのまま使う)。

最終 URL: **`https://ambit.go2020.tokyo/card/`**

---

## 0. 前提

- ローカルから `ssh sakura-vps` で接続可能(`~/.ssh/config` 設定済み)
- VPS 上で Apache 2.4 系が稼働中で、`ambit.go2020.tokyo` の vhost が既に存在
- `https://ambit.go2020.tokyo/` が既にアクセス可能

---

## 1. VPS 側の準備(初回のみ)

```sh
ssh sakura-vps

# 名刺アプリ用ディレクトリ作成
sudo mkdir -p /var/www/ambit.go2020.tokyo-card
sudo chown alma:alma /var/www/ambit.go2020.tokyo-card
```

---

## 2. Apache vhost に Alias を追加

`ambit.go2020.tokyo` の vhost ファイルを開く。
さくらVPS では通常 `/etc/httpd/conf.d/httpd-vhosts.conf` (HTTP) と
`/etc/httpd/conf.d/httpd-vhosts-le-ssl.conf` (HTTPS) に分かれている。

```sh
# どこに ambit.go2020.tokyo の定義があるか確認
sudo grep -rn "ambit.go2020.tokyo" /etc/httpd/conf.d/
```

該当する `<VirtualHost ...>` ブロック(443 側=SSL 側でOK。両方あれば両方)に、
次の **Alias と Directory ブロック** を追加する:

```apache
    # /card → NFC デジタル名刺
    Alias /card /var/www/ambit.go2020.tokyo-card

    <Directory /var/www/ambit.go2020.tokyo-card>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted

        # 静的 export の SPA フォールバック
        <IfModule mod_rewrite.c>
            RewriteEngine On
            RewriteBase /card/
            RewriteCond %{REQUEST_FILENAME} !-f
            RewriteCond %{REQUEST_FILENAME} !-d
            RewriteRule ^ /card/index.html [L]
        </IfModule>

        # vCard を正しい MIME で配信(iOS は連絡先アプリで開く)
        AddType text/vcard .vcf

        # 静的アセットの長期キャッシュ
        <FilesMatch "\.(js|css|svg|png|jpg|woff2)$">
            Header set Cache-Control "public, max-age=31536000, immutable"
        </FilesMatch>
    </Directory>
```

設定テスト & リロード:

```sh
sudo apachectl configtest
sudo systemctl reload httpd
```

疎通確認(中身はまだ空):

```sh
curl -I https://ambit.go2020.tokyo/card/
# → 403 (空ディレクトリで Indexes 無効) or 404 が返れば Alias は効いている
```

---

## 3. 初回デプロイ

ローカル(このリポジトリ)で:

```sh
./deploy.sh
```

これだけで:
1. `npm run build` → `out/` を再生成(vCard も自動更新)
2. `rsync` で `sakura-vps:/var/www/ambit.go2020.tokyo-card/` に同期
3. オーナーを `alma:apache` に揃える

完了後ブラウザで:

**https://ambit.go2020.tokyo/card/**

を開いて名刺ページが表示されることを確認。

---

## 4. NFC タグへの書き込み

NFC タグに書き込む URL:

```
https://ambit.go2020.tokyo/card/
```

→ **iPhone での書き込み手順は [NFC_WRITE_iPhone.md](./NFC_WRITE_iPhone.md)**

---

## 5. 内容を更新したいとき

```sh
# 1. lib/profile.js を編集(名前/肩書/SNS リンクなど)
# 2. デプロイ
./deploy.sh
```

vCard (`public/contact.vcf`) は `npm run build` 内で自動再生成されるので、
プロフィールデータの変更は **`lib/profile.js` の編集だけ** で完結する。

---

## トラブルシュート

### `/card/` で 404 が出る
- `sudo ls /var/www/ambit.go2020.tokyo-card/` に `index.html` があるか
- `sudo apachectl -S | grep ambit` で vhost が読まれているか
- `sudo journalctl -u httpd -n 50` でエラーログ確認

### 静的アセット(CSS/JS)が 404
- HTML 内の `href="/card/..."` と Alias の `/card` が一致しているか
- `next.config.js` の `basePath` を変えた場合は再 build 必須

### vCard をブラウザが開いてしまう(ダウンロードされない)
- iOS Safari は `text/vcard` を直接連絡先アプリで開く ← 想定動作
- Android Chrome / デスクトップでは保存ダイアログが出る

### rsync で permission denied
```sh
ssh sakura-vps "sudo chown -R alma:alma /var/www/ambit.go2020.tokyo-card"
./deploy.sh
```

### Apache configtest で `Alias` 重複エラー
- 同名 Alias が既存設定にないか確認
- 必要なら `Alias /card2 ...` など別名で

---

## 構成サマリ

```
NFC タグ (URL: https://ambit.go2020.tokyo/card/)
       ↓ かざす
さくらVPS Apache (既存の ambit.go2020.tokyo vhost)
       ↓ Alias /card
/var/www/ambit.go2020.tokyo-card/
       ├── index.html
       ├── contact.vcf   (アドレス帳登録)
       ├── avatar.svg
       ├── favicon.svg
       └── _next/static/...
```

**最終更新**: 2026-05-28 (MVP v0.1)
