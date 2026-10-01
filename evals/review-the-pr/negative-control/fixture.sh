#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Guard against ever seeding this fixture directly into THIS plugin's own
# real checkout — see the sibling autopilot-bare/fixture.sh for why this
# guard exists (a real incident during this suite's own development) and why
# it's narrowed to this plugin's own toplevel rather than "any git work tree"
# (an eval sandbox's cwd can itself be an unrelated git work tree).
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
mv claude-dir .claude
# Deliberately no `git init` here: this case's whole point is that, without
# --autopilot, review-the-pr stops at Step 0 (asks for the PR link) before it
# ever runs a git command, so there is nothing for git to operate on.
