#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Safety guard: this script runs `git init`/`git add -A`/`git commit` below.
# It must only ever run inside a disposable `mktemp -d` directory (per
# evals/execute/README.md), never against the real plugin repo or any
# directory that is already a git repo. Deliberately not using `git
# rev-parse` here — a kept `claude plugin eval` sandbox can have a `.git`
# ABOVE the sandboxed cwd, which would make rev-parse report a false
# ancestor and defeat this check.
if [ -e ".git" ]; then
  echo "REFUSING to seed fixture: $(pwd) already has a .git — this script is for seeding a disposable fixture copy only. Run it inside a fresh 'mktemp -d' directory, never an existing repo." >&2
  exit 1
fi
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd -P)"
case "$(pwd -P)" in
  "$REPO_ROOT"|"$REPO_ROOT"/*)
    echo "REFUSING to seed fixture: cwd ($(pwd -P)) is inside the plugin repo ($REPO_ROOT) — this script must only run inside a disposable 'mktemp -d' directory, never the real repo." >&2
    exit 1
    ;;
esac

cp -R "$SCRIPT_DIR/fixture/." .

# A real .git is required: both execute's own Phase 0 point 1 repo/workspace
# detection AND run-regression's own independent Phase 0 detection (invoked
# inline from execute's Phase 4) hard-stop with "Could not identify the
# project root" when no .git is present.
git init -q
git add -A
GIT_AUTHOR_NAME="fixture" GIT_AUTHOR_EMAIL="fixture@example.com" \
GIT_COMMITTER_NAME="fixture" GIT_COMMITTER_EMAIL="fixture@example.com" \
git commit -q -m "tiny-greeter: Step 1 already done (Mode: Inline, Progress: 1 of 2)"
