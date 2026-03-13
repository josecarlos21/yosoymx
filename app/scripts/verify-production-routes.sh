#!/usr/bin/env bash
set -euo pipefail

BASE_ORIGIN="${BASE_ORIGIN:-https://yosoymx.com}"
EDITION_SLUG="${EDITION_SLUG:-primera-edicion}"
CHECK_API="${CHECK_API:-1}"

TMP_DIR="$(mktemp -d)"
FAILURES=0

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

header_value() {
  local header_file="$1"
  local header_name="$2"
  awk -v name="$header_name" 'BEGIN { IGNORECASE = 1 }
    $0 ~ "^" name ":" {
      value = $0
      sub(/^[^:]+:[[:space:]]*/, "", value)
      sub(/\r$/, "", value)
      print value
      exit
    }' "$header_file"
}

record_failure() {
  local message="$1"
  printf 'FAIL: %s\n' "$message" >&2
  FAILURES=$((FAILURES + 1))
}

fetch_route() {
  local name="$1"
  local url="$2"
  local expected_type="$3"
  local body_file="$TMP_DIR/${name}.body"
  local header_file="$TMP_DIR/${name}.headers"
  local status

  printf '\n[%s] %s\n' "$name" "$url"
  status="$(
    curl \
      --silent \
      --show-error \
      --location \
      --dump-header "$header_file" \
      --output "$body_file" \
      --write-out '%{http_code}' \
      "$url"
  )"

  local content_type
  local cf_mitigated
  content_type="$(header_value "$header_file" "Content-Type")"
  cf_mitigated="$(header_value "$header_file" "cf-mitigated")"

  printf 'status=%s content-type=%s\n' "$status" "${content_type:-<missing>}"

  if [[ "$status" != "200" ]]; then
    record_failure "$name devolvió HTTP $status"
    return
  fi

  if [[ -n "${cf_mitigated:-}" ]]; then
    record_failure "$name sigue bajo challenge de Cloudflare (cf-mitigated=${cf_mitigated})"
  fi

  if [[ "${content_type,,}" != *"${expected_type,,}"* ]]; then
    record_failure "$name respondió con Content-Type inesperado: ${content_type:-<missing>}"
  fi
}

assert_contains() {
  local name="$1"
  local pattern="$2"
  local body_file="$TMP_DIR/${name}.body"

  if ! grep -Eq "$pattern" "$body_file"; then
    record_failure "$name no contiene el patrón esperado: $pattern"
  fi
}

check_html_page() {
  local name="$1"
  local url="$2"
  fetch_route "$name" "$url" "text/html"
  assert_contains "$name" '<meta[^>]+property="og:title"'
  assert_contains "$name" '<meta[^>]+property="og:image"'
  assert_contains "$name" '<link[^>]+rel="canonical"'
}

check_json_route() {
  local name="$1"
  local url="$2"
  fetch_route "$name" "$url" "application/json"
}

check_plain_html() {
  local name="$1"
  local url="$2"
  fetch_route "$name" "$url" "text/html"
  assert_contains "$name" '<html'
}

check_html_page "vigente" "${BASE_ORIGIN}/gaceta-eje-central"
check_html_page "archivo" "${BASE_ORIGIN}/gaceta-eje-central/archivo"
check_html_page "edicion" "${BASE_ORIGIN}/gaceta-eje-central/edicion/${EDITION_SLUG}"
check_plain_html "privacy" "${BASE_ORIGIN}/privacy"
check_json_route "aasa" "${BASE_ORIGIN}/.well-known/apple-app-site-association"

if [[ "$CHECK_API" == "1" ]]; then
  check_json_route "api-current" "${BASE_ORIGIN}/api/issues/current"
  check_json_route "api-issues" "${BASE_ORIGIN}/api/issues?limit=3"
  check_json_route "api-community" "${BASE_ORIGIN}/api/community?kind=comment&limit=3"
fi

if (( FAILURES > 0 )); then
  printf '\nSe detectaron %d fallas en la verificación.\n' "$FAILURES" >&2
  exit 1
fi

printf '\nVerificación completada sin fallas para %s\n' "$BASE_ORIGIN"
