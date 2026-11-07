#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Guard against ever seeding this fixture directly into THIS plugin's own
# real checkout — a wrong `cd` before invoking this script must fail loudly
# here rather than silently `cp -R`/`git commit`/`git checkout -b` into the
# shared repo. This is cheap insurance for a real, previously-observed
# failure mode: this exact mistake happened once during this suite's own
# development (ran with cwd left at the plugin root), committing in-progress
# work from several concurrent sessions and switching the shared repo's
# checked-out branch. Deliberately narrow (compares git toplevels, not just
# "is this a git work tree at all") because a `claude plugin eval --scaffold`
# sandbox's cwd can itself be inside an unrelated git work tree — that case
# must still be allowed to proceed.
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

# The fixture's own skill/rule files are staged under claude-dir/ (not .claude/)
# so they aren't picked up by any live Claude Code session's skill-discovery
# scan while sitting in this plugin's own working tree. Promote it to .claude/
# only now, inside the scaffolded run dir.
mv claude-dir .claude

# Fixed dates so commit hashes are stable across runs.
DATE="2026-01-15T12:00:00"

git init -q -b main
GIT_AUTHOR_NAME="fixture" GIT_AUTHOR_EMAIL="fixture@example.com" \
GIT_COMMITTER_NAME="fixture" GIT_COMMITTER_EMAIL="fixture@example.com" \
GIT_AUTHOR_DATE="$DATE" GIT_COMMITTER_DATE="$DATE" \
git add -A
GIT_AUTHOR_NAME="fixture" GIT_AUTHOR_EMAIL="fixture@example.com" \
GIT_COMMITTER_NAME="fixture" GIT_COMMITTER_EMAIL="fixture@example.com" \
GIT_AUTHOR_DATE="$DATE" GIT_COMMITTER_DATE="$DATE" \
git commit -q -m "Initial state: task create/complete with soft-delete-safe lookup"

git checkout -q -b feature/TASK-100-clear-assignee-on-complete
# The feature-branch replacement for completeTask.js lives next to this
# script, not under fixture/ — it must never appear in the initial commit's
# tree (as `completeTask.feature.js`), only as the one file this commit
# changes, so the diff this skill reviews looks like a real PR's diff.
cp "$SCRIPT_DIR/completeTask.feature.js" src/tasks/completeTask.js
git add -A
DATE2="2026-01-16T09:30:00"
GIT_AUTHOR_NAME="fixture" GIT_AUTHOR_EMAIL="fixture@example.com" \
GIT_COMMITTER_NAME="fixture" GIT_COMMITTER_EMAIL="fixture@example.com" \
GIT_AUTHOR_DATE="$DATE2" GIT_COMMITTER_DATE="$DATE2" \
git commit -q -m "TASK-100: clear assignee when completing a task"
