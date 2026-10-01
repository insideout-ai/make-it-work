#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Guard against ever seeding this fixture directly into THIS plugin's own
# real checkout — a wrong `cd` before invoking this script must fail loudly
# here rather than silently `cp -R`/`git commit`/`git checkout -b` into the
# shared repo. Retrofitted after a sibling skill's eval suite hit exactly
# this mistake once during its own development (ran with cwd left at the
# plugin root), committing in-progress work from several concurrent sessions
# and switching the shared repo's checked-out branch. Deliberately narrow
# (compares git toplevels, not just "is this a git work tree at all")
# because a `claude plugin eval --scaffold` sandbox's cwd can itself be
# inside an unrelated git work tree — that case must still be allowed to
# proceed.
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
