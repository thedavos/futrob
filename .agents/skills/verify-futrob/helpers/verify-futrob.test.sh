#!/usr/bin/env bash
# Regression checks for the verify-futrob helper probes. No stack needed:
#   bash .agents/skills/verify-futrob/helpers/verify-futrob.test.sh
set -uo pipefail

# shellcheck source=verify-futrob
source "$(dirname "${BASH_SOURCE[0]}")/verify-futrob"
set +e

failures=0
check() {
  local name="$1" expected="$2" actual="$3"
  if [[ "${actual}" == "${expected}" ]]; then
    echo "ok   ${name}"
  else
    echo "FAIL ${name}: expected ${expected}, got ${actual}"
    failures=$((failures + 1))
  fi
}
binding() {
  if auth_binding_ok; then echo pass; else echo fail; fi
}

# A refused connection reports a single 000, and the binding probe rejects it.
AUTH_SESSION_URL="http://127.0.0.1:1/api/auth/get-session"
check "http_code on refused connection" "000" "$(http_code "${AUTH_SESSION_URL}")"
check "binding rejects refused connection" "fail" "$(binding)"

# Stubbed responses from web's /api/auth/get-session.
respond() {
  STUB_CODE="$1"
  STUB_BODY="$2"
}
http_code() { echo "${STUB_CODE}"; }
http_body() { echo "${STUB_BODY}"; }

respond 500 "Internal Server Error"
check "binding rejects HTTP 500" "fail" "$(binding)"
respond 503 '{"code":"auth.misconfigured"}'
check "binding rejects HTTP 503 misconfigured proxy" "fail" "$(binding)"
respond 401 '{"code":"UNAUTHORIZED"}'
check "binding rejects HTTP 401" "fail" "$(binding)"
respond 200 "null"
check "binding accepts anonymous 200 null" "pass" "$(binding)"

exit "$((failures > 0))"
