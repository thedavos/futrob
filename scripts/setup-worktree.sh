#!/usr/bin/env bash
# Copia a un worktree nuevo los archivos ignorados listados en .worktreeinclude.
# T3 Code lo ejecuta desde t3.json (runOnWorktreeCreate) con T3CODE_PROJECT_ROOT y T3CODE_WORKTREE_PATH.
set -euo pipefail
src="${T3CODE_PROJECT_ROOT:?T3CODE_PROJECT_ROOT no definido}"
dst="${T3CODE_WORKTREE_PATH:-$PWD}"
list="$dst/.worktreeinclude"
[ -f "$list" ] || { echo "sin .worktreeinclude"; exit 0; }
[ "$(cd "$src" && pwd -P)" = "$(cd "$dst" && pwd -P)" ] && exit 0
while IFS= read -r line || [ -n "$line" ]; do
  path="${line%%#*}"; path="$(echo "$path" | xargs)"
  [ -z "$path" ] && continue
  if [ ! -f "$src/$path" ]; then echo "omitido (no existe): $path"; continue; fi
  if [ -e "$dst/$path" ]; then echo "omitido (ya existe): $path"; continue; fi
  mkdir -p "$(dirname "$dst/$path")"
  cp -p "$src/$path" "$dst/$path"
  echo "copiado: $path"
done < "$list"
