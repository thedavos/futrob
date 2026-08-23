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
if [[ ! -f apps/auth/.dev.vars ]]; then
  cp apps/auth/.dev.vars.example apps/auth/.dev.vars
fi

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
  if grep -q '^BETTER_AUTH_SECRET=' apps/auth/.dev.vars; then
    sed -i.bak "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=${auth_secret}|" apps/auth/.dev.vars
  else
    printf '\nBETTER_AUTH_SECRET=%s\n' "$auth_secret" >> apps/auth/.dev.vars
  fi
  rm -f apps/auth/.dev.vars.bak
fi
if grep -q '^RATE_LIMIT_FINGERPRINT_SECRET=replace-with-an-independent-random-secret$' apps/web/.dev.vars; then
  sed -i.bak "s|^RATE_LIMIT_FINGERPRINT_SECRET=.*|RATE_LIMIT_FINGERPRINT_SECRET=$(openssl rand -hex 32)|" apps/web/.dev.vars
  rm -f apps/web/.dev.vars.bak
fi
if ! grep -q '^RATE_LIMIT_FINGERPRINT_SECRET=' apps/web/.dev.vars; then
  printf '\nRATE_LIMIT_FINGERPRINT_SECRET=%s\n' "$(openssl rand -hex 32)" >> apps/web/.dev.vars
fi
if ! grep -q '^ENVIRONMENT=' apps/web/.dev.vars; then
  printf '\nENVIRONMENT=development\n' >> apps/web/.dev.vars
fi

if ! grep -q '^FUTROB_API_BASE_URL=' apps/web/.dev.vars; then
  printf '\nFUTROB_API_BASE_URL=http://localhost:8787/api/v1\n' >> apps/web/.dev.vars
fi
if ! grep -q '^FUTROB_AUTH_SERVICE_URL=' apps/web/.dev.vars; then
  printf '\nFUTROB_AUTH_SERVICE_URL=http://localhost:8788\n' >> apps/web/.dev.vars
fi

# Non-interactive when stdin is not a TTY (Cloud / CI).
# apps/auth owns the one migration history for the D1 shared with web.
CI=1 npx wrangler d1 migrations apply futrob-app --local --cwd apps/auth --persist-to ../web/.wrangler/state
