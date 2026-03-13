#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IOS_DIR="$ROOT_DIR/ios"
PROJECT_YML="$IOS_DIR/project.yml"
PROJECT_PATH="$IOS_DIR/GacetaIOS.xcodeproj"
SCHEME="${SCHEME:-GacetaIOS}"
SIMULATOR_NAME="${SIMULATOR_NAME:-iPhone 16 Pro Max}"
TEST_DESTINATION="${TEST_DESTINATION:-}"
MARKETING_VERSION="${MARKETING_VERSION:-}"
CURRENT_PROJECT_VERSION="${CURRENT_PROJECT_VERSION:-}"
RUN_TESTS="${RUN_TESTS:-1}"

current_marketing_version="$(sed -n 's/^[[:space:]]*MARKETING_VERSION: //p' "$PROJECT_YML" | head -n 1)"
current_project_version="$(sed -n 's/^[[:space:]]*CURRENT_PROJECT_VERSION: //p' "$PROJECT_YML" | head -n 1)"

find_simulator_udid() {
  local device_name="$1"
  xcrun simctl list devices available | grep -F "$device_name (" | head -n 1 | sed -E 's/.*\(([0-9A-F-]+)\).*/\1/'
}

if [[ -z "$MARKETING_VERSION" ]]; then
  MARKETING_VERSION="$current_marketing_version"
fi

if [[ -z "$CURRENT_PROJECT_VERSION" ]]; then
  CURRENT_PROJECT_VERSION="$((current_project_version + 1))"
fi

ARCHIVE_PATH="${ARCHIVE_PATH:-/tmp/GacetaIOS-release-v${MARKETING_VERSION}-${CURRENT_PROJECT_VERSION}.xcarchive}"

if ! command -v xcodegen >/dev/null 2>&1; then
  echo "xcodegen no está instalado. Instálalo antes de preparar el release." >&2
  exit 1
fi

/usr/bin/python3 - "$PROJECT_YML" "$MARKETING_VERSION" "$CURRENT_PROJECT_VERSION" <<'PY'
from pathlib import Path
import re
import sys

project_yml = Path(sys.argv[1])
marketing_version = sys.argv[2]
build_version = sys.argv[3]

content = project_yml.read_text()
content = re.sub(r"^(\s*MARKETING_VERSION: ).*$", rf"\g<1>{marketing_version}", content, flags=re.MULTILINE)
content = re.sub(r"^(\s*CURRENT_PROJECT_VERSION: ).*$", rf"\g<1>{build_version}", content, flags=re.MULTILINE)
project_yml.write_text(content)
PY

(
  cd "$IOS_DIR"
  xcodegen generate
)

if [[ "$RUN_TESTS" == "1" ]]; then
  if [[ -z "$TEST_DESTINATION" ]]; then
    simulator_udid="$(find_simulator_udid "$SIMULATOR_NAME")"
    if [[ -z "$simulator_udid" ]]; then
      echo "No se encontró el simulador \"$SIMULATOR_NAME\"." >&2
      exit 1
    fi
    TEST_DESTINATION="id=$simulator_udid"
  fi

  xcodebuild \
    -project "$PROJECT_PATH" \
    -scheme "$SCHEME" \
    -destination "$TEST_DESTINATION" \
    test
fi

xcodebuild \
  -project "$PROJECT_PATH" \
  -scheme "$SCHEME" \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE_PATH" \
  archive

cat <<EOF

Release preparado.
- MARKETING_VERSION: $MARKETING_VERSION
- CURRENT_PROJECT_VERSION: $CURRENT_PROJECT_VERSION
- Archive: $ARCHIVE_PATH

Siguiente paso:
1. Abrir Xcode Organizer
2. Validar assets y firma
3. Subir a TestFlight interno
EOF
