#!/usr/bin/env bash
# Generate all Habita icons from the best available source.
# Uses macOS sips. For best quality, add a 1024x1024 PNG at apps/mobile/assets/logo-source-1024.png
# and run again (script will prefer it over favicon.ico).

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAVICON="$ROOT/src/app/favicon.ico"
SOURCE_HIRES="$ROOT/apps/mobile/assets/logo-source-1024.png"
PUBLIC="$ROOT/public"
MOBILE_ASSETS="$ROOT/apps/mobile/assets"
TMP="/tmp/habita-icon-gen"

mkdir -p "$TMP" "$PUBLIC" "$MOBILE_ASSETS"

if [[ -f "$SOURCE_HIRES" ]]; then
  echo "Using high-res source: $SOURCE_HIRES"
  sips -s format png "$SOURCE_HIRES" --out "$TMP/source.png"
else
  echo "Using favicon.ico (for best results add logo-source-1024.png in apps/mobile/assets/)"
  if [[ ! -f "$FAVICON" ]]; then
    echo "Error: favicon.ico not found at $FAVICON"
    exit 1
  fi
  sips -s format png "$FAVICON" --out "$TMP/source.png"
fi

SOURCE="$TMP/source.png"
# Ensure we have at least 512px for web icons (upscale if from favicon)
W=$(sips -g pixelWidth "$SOURCE" | awk '/pixelWidth/{print $2}')
if [[ -n "$W" ]] && [[ "$W" -lt 512 ]]; then
  sips -z 512 512 "$SOURCE" --out "$TMP/source-512.png"
  SOURCE="$TMP/source-512.png"
fi

echo "Generating web icons..."
sips -z 192 192 "$SOURCE" --out "$PUBLIC/icon-192.png"
sips -z 512 512 "$SOURCE" --out "$PUBLIC/icon-512.png"

echo "Generating mobile assets (3x resolution for sharpness on retina)..."
# Header/avatar: displayed at 32pt → asset 96px
sips -z 96 96 "$SOURCE" --out "$MOBILE_ASSETS/logo-32.png"
# Onboarding/welcome: displayed at 48–80pt → asset 144px
sips -z 144 144 "$SOURCE" --out "$MOBILE_ASSETS/logo.png"
sips -z 144 144 "$SOURCE" --out "$MOBILE_ASSETS/logo-48.png"
# Larger uses: 96pt → 288px
sips -z 288 288 "$SOURCE" --out "$MOBILE_ASSETS/logo-96.png"

echo "Done. Web: public/icon-192.png, icon-512.png. Mobile: apps/mobile/assets/logo*.png"
