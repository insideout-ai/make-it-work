#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if [ "$(git rev-parse --show-toplevel)" = "$PLUGIN_ROOT" ]; then
    echo "fixture.sh: refusing to seed this plugin checkout; use a disposable directory." >&2
    exit 1
  fi
fi

cp -R "$SCRIPT_DIR/fixture/." .
for repo in backend mf-cp-payroll stale-ui analytics-service no-info; do
  (
    cd "$repo"
    git init -q
    git config user.name "fixture"
    git config user.email "fixture@example.invalid"
    git add -A
    git -c core.hooksPath=/dev/null commit -q -m "$repo: fixture"
  )
done
