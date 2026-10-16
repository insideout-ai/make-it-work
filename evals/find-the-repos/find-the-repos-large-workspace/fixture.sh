#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
cp "$SCRIPT_DIR/fixture/LARGE-400-spec.md" .
for index in {1..40}; do
  printf -v repo 'repo-%02d' "$index"
  mkdir "$repo"
  cp -R "$SCRIPT_DIR/fixture/common/." "$repo/"
  if [ "$index" -eq 40 ]; then
    mkdir "$repo/src"
    cp "$SCRIPT_DIR/fixture/export.ts" "$repo/src/export.ts"
  fi
  (
    cd "$repo"
    git init -q
    git config user.name fixture
    git config user.email fixture@example.invalid
    git add -A
    git -c core.hooksPath=/dev/null commit -q -m "$repo: fixture"
  )
done
