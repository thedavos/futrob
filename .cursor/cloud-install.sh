#!/usr/bin/env bash
# Idempotent Cursor Cloud Agent install. Invoked from .cursor/environment.json.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

NVM_VERSION="v0.40.6"
export NVM_DIR="${NVM_DIR:-${HOME}/.nvm}"

if [[ ! -s "${NVM_DIR}/nvm.sh" ]]; then
  curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" | PROFILE=/dev/null bash
fi
if [[ ! -s "${NVM_DIR}/nvm.sh" ]]; then
  echo "error: nvm did not install ${NVM_DIR}/nvm.sh" >&2
  exit 1
fi
# shellcheck disable=SC1091
. "${NVM_DIR}/nvm.sh"
nvm install 24
nvm use 24
hash -r

node_major="$(node -p 'process.versions.node.split(".")[0]')"
if [[ "${node_major}" -lt 24 ]]; then
  echo "error: Node >= 24 required (engines.node); got $(node --version) from $(command -v node)" >&2
  exit 1
fi

BASHRC="${HOME}/.bashrc"
MARKER="# futrob-cloud-node24"
if [[ ! -f "$BASHRC" ]]; then
  touch "$BASHRC"
fi
if ! grep -qF "$MARKER" "$BASHRC"; then
  cat >> "$BASHRC" <<'EOF'

# futrob-cloud-node24
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
  nvm use 24 >/dev/null 2>&1 || nvm install 24
fi
EOF
fi

# CI prevents Lefthook's dependency postinstall from replacing Cloud Agent hooks.
# Dependency scripts remain fail-closed through package.json allowScripts.
CI=1 npm ci --strict-allow-scripts

if [[ ! -f apps/web/.dev.vars ]]; then
  cp apps/web/.dev.vars.example apps/web/.dev.vars
fi
if [[ ! -f apps/api/.env ]]; then
  cp apps/api/.env.example apps/api/.env
fi
if [[ ! -f apps/auth/.env ]]; then
  cp apps/auth/.env.example apps/auth/.env
fi

# set_env_var FILE KEY VALUE: drop KEY's line and append the new value. No sed
# replacement, so URLs with `&` or `|` survive intact.
set_env_var() {
  grep -v "^$2=" "$1" > "$1.tmp" || true
  printf '%s=%s\n' "$2" "$3" >> "$1.tmp"
  mv "$1.tmp" "$1"
}

web_job="$(sed -n 's/^INTERNAL_JOB_SECRET=//p' apps/web/.dev.vars | head -n 1)"
api_job="$(sed -n 's/^INTERNAL_JOB_SECRET=//p' apps/api/.env | head -n 1)"
placeholder_web='replace-with-the-same-value-as-apps-api'
placeholder_api='local-internal-job-secret-at-least-thirty-two-chars'

if [[ -z "$web_job" || "$web_job" == "$placeholder_web" || -z "$api_job" || "$api_job" == "$placeholder_api" || "$web_job" != "$api_job" ]]; then
  job_secret="$(openssl rand -hex 32)"
  if grep -q '^INTERNAL_JOB_SECRET=' apps/web/.dev.vars; then
    sed -i.bak "s|^INTERNAL_JOB_SECRET=.*|INTERNAL_JOB_SECRET=${job_secret}|" apps/web/.dev.vars
  else
    printf '\nINTERNAL_JOB_SECRET=%s\n' "$job_secret" >> apps/web/.dev.vars
  fi
  if grep -q '^INTERNAL_JOB_SECRET=' apps/api/.env; then
    sed -i.bak "s|^INTERNAL_JOB_SECRET=.*|INTERNAL_JOB_SECRET=${job_secret}|" apps/api/.env
  else
    printf '\nINTERNAL_JOB_SECRET=%s\n' "$job_secret" >> apps/api/.env
  fi
  rm -f apps/web/.dev.vars.bak apps/api/.env.bak
fi

if grep -q '^BETTER_AUTH_SECRET=replace-with-a-local-secret$' apps/web/.dev.vars; then
  sed -i.bak "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=$(openssl rand -hex 32)|" apps/web/.dev.vars
  rm -f apps/web/.dev.vars.bak
fi
auth_secret="$(sed -n 's/^BETTER_AUTH_SECRET=//p' apps/web/.dev.vars | head -n 1)"
if [[ -n "$auth_secret" ]]; then
  set_env_var apps/auth/.env BETTER_AUTH_SECRET "$auth_secret"
fi
# Web forwards the client IP to apps/auth with this shared secret.
web_proxy="$(sed -n 's/^AUTH_PROXY_SECRET=//p' apps/web/.dev.vars | head -n 1)"
auth_proxy="$(sed -n 's/^AUTH_PROXY_SECRET=//p' apps/auth/.env | head -n 1)"
placeholder_proxy='replace-with-a-shared-proxy-secret-of-32-characters'
if [[ -z "$web_proxy" || "$web_proxy" == "$placeholder_proxy" || "$web_proxy" != "$auth_proxy" ]]; then
  proxy_secret="$(openssl rand -hex 32)"
  set_env_var apps/web/.dev.vars AUTH_PROXY_SECRET "$proxy_secret"
  set_env_var apps/auth/.env AUTH_PROXY_SECRET "$proxy_secret"
fi
if ! grep -q '^FUTROB_AUTH_BASE_URL=' apps/web/.dev.vars; then
  printf '\nFUTROB_AUTH_BASE_URL=http://localhost:8788\n' >> apps/web/.dev.vars
fi
# Web BFF rate limits are counted by apps/api (ADR-0034); the fingerprint secret lives there.
rate_limit_secret="$(sed -n 's/^RATE_LIMIT_FINGERPRINT_SECRET=//p' apps/api/.env | head -n 1)"
if [[ -z "$rate_limit_secret" || "$rate_limit_secret" == "replace-with-an-independent-random-secret" ]]; then
  set_env_var apps/api/.env RATE_LIMIT_FINGERPRINT_SECRET "$(openssl rand -hex 32)"
fi
if ! grep -q '^ENVIRONMENT=' apps/web/.dev.vars; then
  printf '\nENVIRONMENT=development\n' >> apps/web/.dev.vars
fi

if ! grep -q '^FUTROB_API_BASE_URL=' apps/web/.dev.vars; then
  printf '\nFUTROB_API_BASE_URL=http://localhost:8787/api/v1\n' >> apps/web/.dev.vars
fi
# Auth, actors and BFF rate limits live in the product Postgres (ADR-0021, ADR-0034).
# apps/auth (Node) reads DATABASE_URL; the web Worker never connects to it.
# apps/api/migrations is the only schema history. This script never invents DATABASE_URL.
database_url="$(sed -n 's/^DATABASE_URL=//p' apps/api/.env 2>/dev/null | head -n 1 || true)"
if [[ -n "$database_url" ]]; then
  set_env_var apps/auth/.env DATABASE_URL "$database_url"
  npm run migrate -w @futrob/api
else
  echo "DATABASE_URL is not set in apps/api/.env: skipping migrations and auth DATABASE_URL." >&2
  echo "Sign-in needs Postgres; set DATABASE_URL, then re-run this script." >&2
fi
