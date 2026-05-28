#!/bin/bash
# ローカルでビルド → VPS の /var/www/ambit.go2020.tokyo-card/ に rsync で配置
# Apache 側で Alias /card → このディレクトリにマップしている前提
# 前提: ~/.ssh/config に `sakura-vps` が設定済み

set -e

REMOTE_HOST="sakura-vps"
REMOTE_DIR="/var/www/ambit.go2020.tokyo-card"
URL="https://ambit.go2020.tokyo/card/"

echo "▶ ローカルビルド"
npm run build

echo "▶ リモートディレクトリ確認: ${REMOTE_HOST}:${REMOTE_DIR}"
ssh "$REMOTE_HOST" "sudo mkdir -p ${REMOTE_DIR} && sudo chown alma:alma ${REMOTE_DIR}"

echo "▶ rsync で out/ を転送"
rsync -avz --delete \
  --exclude='.DS_Store' \
  out/ "${REMOTE_HOST}:${REMOTE_DIR}/"

echo "▶ パーミッション調整"
ssh "$REMOTE_HOST" "sudo chown -R alma:apache ${REMOTE_DIR} && sudo find ${REMOTE_DIR} -type d -exec chmod 755 {} \\; && sudo find ${REMOTE_DIR} -type f -exec chmod 644 {} \\;"

echo "✅ デプロイ完了: ${URL}"
