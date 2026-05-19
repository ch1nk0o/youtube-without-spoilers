#!/usr/bin/env bash
# Собирает чистый zip для загрузки в Chrome Web Store.
# Включает только то, что реально нужно расширению.
# Исключает: dev/build-файлы, документацию, исходники иконок.

set -euo pipefail

cd "$(dirname "$0")"

VERSION=$(grep -o '"version": *"[^"]*"' manifest.json | head -1 | sed 's/.*"\([^"]*\)"$/\1/')
OUT="youtube-without-spoilers-v${VERSION}.zip"

rm -f "$OUT"

zip -r "$OUT" \
  manifest.json \
  background.js \
  content.js \
  styles.css \
  popup.html \
  popup.css \
  popup.js \
  icons/icon16.png \
  icons/icon48.png \
  icons/icon128.png \
  _locales/en/messages.json \
  _locales/ru/messages.json \
  -x "*.DS_Store"

echo
echo "✓ Готово: $OUT"
ls -lh "$OUT"
echo
echo "Загружай этот файл в Chrome Web Store Developer Dashboard."
