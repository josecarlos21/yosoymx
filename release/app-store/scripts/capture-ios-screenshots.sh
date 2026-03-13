#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
IOS_DIR="$ROOT_DIR/ios"
PROJECT_PATH="$IOS_DIR/GacetaIOS.xcodeproj"
SCHEME="${SCHEME:-GacetaIOS}"
BUNDLE_ID="${BUNDLE_ID:-com.yosoymx.gacetaejecentral}"
DERIVED_DATA="${DERIVED_DATA:-$ROOT_DIR/.deriveddata/gacetaios-screenshots}"
WAIT_SECONDS="${WAIT_SECONDS:-4}"
IPHONE_DEVICE="${IPHONE_DEVICE:-iPhone 16 Pro Max}"
IPAD_DEVICE="${IPAD_DEVICE:-iPad Pro 13-inch (M4)}"
DEVICE_FILTER="${DEVICE_FILTER:-all}"
OUTPUT_ROOT="${OUTPUT_ROOT:-$ROOT_DIR/release/app-store/ios/screenshots}"

declare -a CAPTURES=(
  "01-portada|https://yosoymx.com/gaceta-eje-central"
  "02-ruta|https://yosoymx.com/gaceta-eje-central/ruta"
  "03-biblioteca|https://yosoymx.com/gaceta-eje-central/biblioteca"
  "04-comunidad|https://yosoymx.com/gaceta-eje-central/comunidad"
  "05-soporte|https://yosoymx.com/gaceta-eje-central/contacto"
)

find_udid() {
  local device_name="$1"
  xcrun simctl list devices available | grep -F "$device_name (" | head -n 1 | sed -E 's/.*\(([0-9A-F-]+)\).*/\1/'
}

build_app() {
  xcodebuild \
    -project "$PROJECT_PATH" \
    -scheme "$SCHEME" \
    -destination "generic/platform=iOS Simulator" \
    -derivedDataPath "$DERIVED_DATA" \
    build >/tmp/gacetaios-screenshot-build.log
}

boot_and_prepare() {
  local udid="$1"
  xcrun simctl boot "$udid" >/dev/null 2>&1 || true
  xcrun simctl bootstatus "$udid" -b
  xcrun simctl status_bar "$udid" override \
    --time 9:41 \
    --batteryState charged \
    --batteryLevel 100 \
    --wifiBars 3 \
    --cellularBars 4 >/dev/null 2>&1 || true
}

capture_for_device() {
  local device_name="$1"
  local output_dir="$2"
  local udid
  local app_path="$DERIVED_DATA/Build/Products/Debug-iphonesimulator/GacetaIOS.app"

  udid="$(find_udid "$device_name")"
  if [[ -z "$udid" ]]; then
    echo "No se encontró el simulador \"$device_name\"." >&2
    return 1
  fi

  mkdir -p "$output_dir"
  boot_and_prepare "$udid"
  xcrun simctl uninstall "$udid" "$BUNDLE_ID" >/dev/null 2>&1 || true
  xcrun simctl install "$udid" "$app_path"

  for capture in "${CAPTURES[@]}"; do
    local name="${capture%%|*}"
    local route="${capture#*|}"
    local output_path="$output_dir/${name}.png"

    xcrun simctl terminate "$udid" "$BUNDLE_ID" >/dev/null 2>&1 || true
    SIMCTL_CHILD_APP_STORE_SCREENSHOT_MODE=1 \
    SIMCTL_CHILD_SCREENSHOT_ROUTE="$route" \
      xcrun simctl launch "$udid" "$BUNDLE_ID" >/tmp/"$name"-launch.log

    sleep "$WAIT_SECONDS"
    xcrun simctl io "$udid" screenshot "$output_path" >/dev/null
    printf 'Captura guardada: %s\n' "$output_path"
  done

  xcrun simctl terminate "$udid" "$BUNDLE_ID" >/dev/null 2>&1 || true
  xcrun simctl status_bar "$udid" clear >/dev/null 2>&1 || true
}

build_app

case "$DEVICE_FILTER" in
  all)
    capture_for_device "$IPHONE_DEVICE" "$OUTPUT_ROOT/iphone-6.9"
    capture_for_device "$IPAD_DEVICE" "$OUTPUT_ROOT/ipad-13"
    ;;
  iphone)
    capture_for_device "$IPHONE_DEVICE" "$OUTPUT_ROOT/iphone-6.9"
    ;;
  ipad)
    capture_for_device "$IPAD_DEVICE" "$OUTPUT_ROOT/ipad-13"
    ;;
  *)
    echo "DEVICE_FILTER debe ser all, iphone o ipad." >&2
    exit 1
    ;;
esac

printf '\nCapturas de App Store actualizadas en %s\n' "$OUTPUT_ROOT"
