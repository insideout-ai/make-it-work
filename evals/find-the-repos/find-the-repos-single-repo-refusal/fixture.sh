#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Guard against ever seeding this fixture directly into THIS plugin's own real checkout — see
# evals/go-deep/fresh-onboarding/fixture.sh for the incident this guards against.
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  CWD_TOPLEVEL="$(git rev-parse --show-toplevel)"
  if [ "$CWD_TOPLEVEL" = "$PLUGIN_ROOT" ]; then
    echo "fixture.sh: refusing to seed fixture content into this plugin's own real checkout: $(pwd)" >&2
    echo "fixture.sh: run this from a fresh, empty directory (e.g. a mktemp dir), not from inside $PLUGIN_ROOT." >&2
    exit 1
  fi
fi

cp -R "$SCRIPT_DIR/fixture/." .

# A single, ordinary repo — .git lives right here, and (unlike the happy-path/technical-fallback
# fixtures) there is deliberately no sibling repo and no workspace-root orientation file one level
# up, so Phase 1 must hit its "nothing to shortlist" refusal.
git init -q
git config user.name "fixture"
git config user.email "fixture@example.com"
git add -A
git commit -q -m "notification-center: initial commit"
