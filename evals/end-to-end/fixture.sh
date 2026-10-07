#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../assert-disposable-cwd.sh"
if [ -e .git ]; then
  echo "end-to-end fixture: refusing to seed an existing Git repo" >&2
  exit 1
fi
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cp "$PLUGIN_ROOT/evals/implement/fixture-base/CLAUDE.md" .
cp -R "$PLUGIN_ROOT/evals/implement/fixture-base/.claude" .
cp -R "$PLUGIN_ROOT/evals/implement/fixture-base/src" .
cp -R "$SCRIPT_DIR/fixture/." .
git init -q -b main
git add -A
GIT_AUTHOR_NAME='Eval Fixture' GIT_AUTHOR_EMAIL='eval@example.invalid' \
GIT_COMMITTER_NAME='Eval Fixture' GIT_COMMITTER_EMAIL='eval@example.invalid' \
git commit -q -m 'Baseline policy project'
git switch -q -c feature/DEMO-101-admin-access
node --test
