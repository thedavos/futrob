#!/usr/bin/env bash
# Idempotent Cursor Cloud Agent install. Invoked from .cursor/environment.json.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# npm 11 blocks lifecycle scripts unless allowed. Native binaries for
# workerd / esbuild / sharp must run their install scripts.
if ! grep -qxF 'dangerously-allow-all-scripts=true' "${HOME}/.npmrc" 2>/dev/null; then
  printf '\ndangerously-allow-all-scripts=true\n' >> "${HOME}/.npmrc"
fi

# Prefer nvm Node 24 over a base-image Node 22 that may sit earlier on PATH.
export NVM_DIR="${NVM_DIR:-${HOME}/.nvm}"
if [[ -s "${NVM_DIR}/nvm.sh" ]]; then
  # shellcheck disable=SC1091
  . "${NVM_DIR}/nvm.sh"
  nvm install 24
  nvm use 24
fi

BASHRC="${HOME}/.bashrc"
MARKER="# futrob-cloud-node24"
if [[ -f "$BASHRC" ]] && ! grep -qF "$MARKER" "$BASHRC"; then
  cat >> "$BASHRC" <<'EOF'

# futrob-cloud-node24
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
  nvm use 24 >/dev/null 2>&1 || nvm install 24
fi
EOF
fi

npm ci

if [[ ! -f apps/web/.dev.vars ]]; then
  cp apps/web/.dev.vars.example apps/web/.dev.vars
fi
if [[ ! -f apps/api/.env ]]; then
  cp apps/api/.env.example apps/api/.env
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
if grep -q '^RATE_LIMIT_FINGERPRINT_SECRET=replace-with-an-independent-random-secret$' apps/web/.dev.vars; then
  sed -i.bak "s|^RATE_LIMIT_FINGERPRINT_SECRET=.*|RATE_LIMIT_FINGERPRINT_SECRET=$(openssl rand -hex 32)|" apps/web/.dev.vars
  rm -f apps/web/.dev.vars.bak
fi

# Non-interactive when stdin is not a TTY (Cloud / CI).
CI=1 npx wrangler d1 migrations apply futrob-app --local --cwd apps/web
