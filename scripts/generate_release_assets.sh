#!/bin/zsh
set -euo pipefail

ROOT="/Users/joseca/Documents/Investigacion y newsletter"
PUBLIC="$ROOT/app/public"
IOS_ASSETS="$ROOT/ios/GacetaIOS/Resources/Assets.xcassets"
RELEASE="$ROOT/release/app-store"
TMP_DIR="/tmp/gaceta-release-assets"

mkdir -p \
  "$RELEASE/ios/icons" \
  "$RELEASE/ios/launch" \
  "$RELEASE/ios/screenshots/iphone-6.9" \
  "$RELEASE/ios/screenshots/ipad-13" \
  "$RELEASE/web/brand" \
  "$RELEASE/web/og" \
  "$RELEASE/metadata/es-MX" \
  "$RELEASE/deeplinks"

rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"

render_svg() {
  local input="$1"
  local output="$2"
  mkdir -p "$(dirname "$output")"
  sips -s format png "$input" --out "$output" >/dev/null
}

resize_square() {
  local input="$1"
  local output="$2"
  local size="$3"
  mkdir -p "$(dirname "$output")"
  sips -z "$size" "$size" "$input" --out "$output" >/dev/null
}

copy_file() {
  local input="$1"
  local output="$2"
  mkdir -p "$(dirname "$output")"
  cp "$input" "$output"
}

BRAND_MARK_SVG="$PUBLIC/brand/brand-mark.svg"
BRAND_MARK_MONO_SVG="$PUBLIC/brand/brand-mark-mono.svg"
BRAND_WORDMARK_SVG="$PUBLIC/brand/brand-wordmark.svg"
OG_DEFAULT_SVG="$PUBLIC/brand/og-default.svg"
OG_EDITION_SVG="$PUBLIC/brand/og-edition.svg"
LAUNCH_SVG="$PUBLIC/brand/launch-preview.svg"
BRAND_MARK_MASTER="$TMP_DIR/brand-mark-master.png"
BRAND_MARK_MONO_MASTER="$TMP_DIR/brand-mark-mono-master.png"

render_svg "$BRAND_MARK_SVG" "$BRAND_MARK_MASTER"
render_svg "$BRAND_MARK_MONO_SVG" "$BRAND_MARK_MONO_MASTER"

render_svg "$OG_DEFAULT_SVG" "$PUBLIC/og-default.png"
render_svg "$OG_DEFAULT_SVG" "$RELEASE/web/og/og-default-1200x630.png"
render_svg "$OG_EDITION_SVG" "$PUBLIC/og-edition.png"
render_svg "$OG_EDITION_SVG" "$PUBLIC/og-image-nota.png"
render_svg "$OG_EDITION_SVG" "$RELEASE/web/og/og-edition-1200x630.png"

resize_square "$BRAND_MARK_MASTER" "$PUBLIC/favicon-32.png" 32
resize_square "$BRAND_MARK_MASTER" "$PUBLIC/favicon-48.png" 48
resize_square "$BRAND_MARK_MASTER" "$PUBLIC/apple-touch-icon.png" 180
resize_square "$BRAND_MARK_MASTER" "$PUBLIC/web-app-manifest-192.png" 192
resize_square "$BRAND_MARK_MASTER" "$PUBLIC/web-app-manifest-512.png" 512

resize_square "$BRAND_MARK_MASTER" "$IOS_ASSETS/BrandMark.imageset/brand-mark@1x.png" 120
resize_square "$BRAND_MARK_MASTER" "$IOS_ASSETS/BrandMark.imageset/brand-mark@2x.png" 240
resize_square "$BRAND_MARK_MASTER" "$IOS_ASSETS/BrandMark.imageset/brand-mark@3x.png" 360
resize_square "$BRAND_MARK_MONO_MASTER" "$IOS_ASSETS/BrandMarkMono.imageset/brand-mark-mono@1x.png" 120
resize_square "$BRAND_MARK_MONO_MASTER" "$IOS_ASSETS/BrandMarkMono.imageset/brand-mark-mono@2x.png" 240
resize_square "$BRAND_MARK_MONO_MASTER" "$IOS_ASSETS/BrandMarkMono.imageset/brand-mark-mono@3x.png" 360

copy_file "$IOS_ASSETS/AppIcon.appiconset/appicon-1024.png" "$RELEASE/ios/icons/appicon-1024.png"
copy_file "$BRAND_MARK_MONO_MASTER" "$RELEASE/ios/icons/brand-mark-mono-1024.png"
copy_file "$BRAND_MARK_MASTER" "$RELEASE/web/brand/brand-mark-1024.png"
render_svg "$BRAND_WORDMARK_SVG" "$RELEASE/web/brand/brand-wordmark-1440x512.png"
render_svg "$LAUNCH_SVG" "$RELEASE/ios/launch/launch-preview-1290x2796.png"

copy_file "$PUBLIC/favicon.svg" "$RELEASE/web/brand/favicon.svg"
copy_file "$PUBLIC/favicon-32.png" "$RELEASE/web/brand/favicon-32.png"
copy_file "$PUBLIC/favicon-48.png" "$RELEASE/web/brand/favicon-48.png"
copy_file "$PUBLIC/apple-touch-icon.png" "$RELEASE/web/brand/apple-touch-icon.png"
copy_file "$PUBLIC/web-app-manifest-192.png" "$RELEASE/web/brand/web-app-manifest-192.png"
copy_file "$PUBLIC/web-app-manifest-512.png" "$RELEASE/web/brand/web-app-manifest-512.png"
copy_file "$PUBLIC/safari-pinned-tab.svg" "$RELEASE/web/brand/safari-pinned-tab.svg"
copy_file "$BRAND_MARK_SVG" "$RELEASE/web/brand/brand-mark.svg"
copy_file "$BRAND_MARK_MONO_SVG" "$RELEASE/web/brand/brand-mark-mono.svg"
copy_file "$BRAND_WORDMARK_SVG" "$RELEASE/web/brand/brand-wordmark.svg"

copy_file "$PUBLIC/.well-known/apple-app-site-association" "$RELEASE/deeplinks/apple-app-site-association"

echo "Assets de release generados en $RELEASE"
