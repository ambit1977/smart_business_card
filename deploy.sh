#!/bin/bash
# Build locally → rsync to VPS at /var/www/ambit.go2020.tokyo-card/.
# Apache's `Alias /card` maps that directory at https://ambit.go2020.tokyo/card/.
# Requires `sakura-vps` set up in ~/.ssh/config.

set -e

REMOTE_HOST="sakura-vps"
REMOTE_DIR="/var/www/ambit.go2020.tokyo-card"
URL="https://ambit.go2020.tokyo/card/"

echo "▶ Local build"
npm run build

echo "▶ Ensure remote dir exists"
ssh "$REMOTE_HOST" "sudo mkdir -p ${REMOTE_DIR}/_data/vcards && sudo chown -R alma:alma ${REMOTE_DIR}"

echo "▶ Sync out/ (static Next.js export)"
# Keep server-managed data files alive across deploys.
rsync -avz --delete \
  --exclude='.DS_Store' \
  --exclude='now.json' \
  --exclude='_data/' \
  out/ "${REMOTE_HOST}:${REMOTE_DIR}/"

echo "▶ Sync api/ (PHP endpoints, not part of Next.js build)"
rsync -avz \
  --exclude='.DS_Store' \
  api/ "${REMOTE_HOST}:${REMOTE_DIR}/api/"

echo "▶ Ensure _data/.htaccess is in place"
rsync -avz \
  --exclude='.DS_Store' \
  --exclude='*.vcf' \
  --exclude='tokens.jsonl' \
  --exclude='admin_token' \
  _data/.htaccess _data/.gitkeep \
  "${REMOTE_HOST}:${REMOTE_DIR}/_data/" 2>/dev/null || true

echo "▶ Initialize now.json if missing"
ssh "$REMOTE_HOST" "
  if [ ! -f ${REMOTE_DIR}/now.json ]; then
    echo '{\"version\":\"v1\",\"current\":{\"public\":false},\"updated_at\":\"\"}' \
      | sudo tee ${REMOTE_DIR}/now.json > /dev/null
  fi
  sudo touch ${REMOTE_DIR}/_data/tokens.jsonl
"

echo "▶ Permissions"
ssh "$REMOTE_HOST" "
  sudo chown -R alma:apache ${REMOTE_DIR}
  sudo find ${REMOTE_DIR} -type d -exec chmod 755 {} \\;
  sudo find ${REMOTE_DIR} -type f -exec chmod 644 {} \\;
  # Apache needs to write into these:
  sudo chmod 664 ${REMOTE_DIR}/now.json
  sudo chmod 664 ${REMOTE_DIR}/_data/tokens.jsonl
  sudo chmod 775 ${REMOTE_DIR}/_data ${REMOTE_DIR}/_data/vcards
"

echo "✅ Deployed: ${URL}"
echo "   Admin:    ${URL}admin/"
echo "   Log:      ${URL}admin/log/"
echo "   Now API:  ${URL}now.json"
