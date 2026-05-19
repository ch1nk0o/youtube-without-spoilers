#!/usr/bin/env bash
# Полный deploy в Chrome Web Store:
#   1. Билдим zip из текущего manifest.json
#   2. Загружаем в Store через API
#   3. Отправляем на ревью
#
# Требуется .env с credentials (см. .env.example).

set -euo pipefail

cd "$(dirname "$0")"

# --- Loading creds ---
if [[ ! -f .env ]]; then
  echo "❌ Файл .env не найден. Скопируй .env.example → .env и заполни."
  exit 1
fi
set -a; source .env; set +a

for var in EXTENSION_ID GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET GOOGLE_REFRESH_TOKEN; do
  if [[ -z "${!var:-}" ]]; then
    echo "❌ В .env не задан $var"
    exit 1
  fi
done

# --- Building zip ---
echo "📦 Билд zip..."
./build-store-zip.sh

VERSION=$(grep -o '"version": *"[^"]*"' manifest.json | head -1 | sed 's/.*"\([^"]*\)"$/\1/')
ZIP="youtube-without-spoilers-v${VERSION}.zip"

if [[ ! -f "$ZIP" ]]; then
  echo "❌ Zip не создался: $ZIP"
  exit 1
fi

echo "📤 Заливаем $ZIP в Chrome Web Store (extension $EXTENSION_ID)..."

npx --yes chrome-webstore-upload-cli@latest upload \
  --source "$ZIP" \
  --extension-id "$EXTENSION_ID" \
  --client-id "$GOOGLE_CLIENT_ID" \
  --client-secret "$GOOGLE_CLIENT_SECRET" \
  --refresh-token "$GOOGLE_REFRESH_TOKEN"

echo "🚀 Отправляем на ревью..."

npx --yes chrome-webstore-upload-cli@latest publish \
  --extension-id "$EXTENSION_ID" \
  --client-id "$GOOGLE_CLIENT_ID" \
  --client-secret "$GOOGLE_CLIENT_SECRET" \
  --refresh-token "$GOOGLE_REFRESH_TOKEN"

echo ""
echo "✅ Готово. v$VERSION отправлена на ревью."
echo "   Статус: https://chrome.google.com/webstore/devconsole"
