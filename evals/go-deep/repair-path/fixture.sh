#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Guard against ever seeding this fixture directly into THIS plugin's own
# real checkout — a wrong `cd` before invoking this script must fail loudly
# here rather than silently `cp -R`/`git commit`/`git checkout -b` into the
# shared repo. This matters especially here: this script runs real `git
# init`/`add`/`commit` below, which is exactly the failure mode a sibling
# skill's eval suite hit for real once during this plugin's own development
# (ran with cwd left at the plugin root), committing in-progress work from
# several concurrent sessions and switching the shared repo's checked-out
# branch. Deliberately narrow (compares git toplevels, not just "is this a
# git work tree at all") because a `claude plugin eval --scaffold` sandbox's
# cwd can itself be inside an unrelated git work tree — that case must still
# be allowed to proceed.
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

# Backdate the initial commit well past any staleness-rescan window (max 90
# days) go-deep's autopilot policy might pick, so the re-scan reports zero
# flagged skills instead of flagging everything as "recently touched".
BACKDATE="$(date -u -v-120d '+%Y-%m-%dT%H:%M:%S' 2>/dev/null || date -u -d '120 days ago' '+%Y-%m-%dT%H:%M:%S')"

git init -q
git add -A
GIT_AUTHOR_NAME="fixture" GIT_AUTHOR_EMAIL="fixture@example.com" \
GIT_COMMITTER_NAME="fixture" GIT_COMMITTER_EMAIL="fixture@example.com" \
GIT_AUTHOR_DATE="$BACKDATE" GIT_COMMITTER_DATE="$BACKDATE" \
git commit -q -m "already onboarded, missing domain-notifications skill"
