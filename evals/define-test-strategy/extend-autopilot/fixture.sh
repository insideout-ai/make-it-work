#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
cp -R "$SCRIPT_DIR/fixture/." .

# Phase 0's workspace detection needs a `.git` here to resolve this as a
# single-repo project root; without it, the skill stops at "Could not
# identify the project root" before ever reaching Phase 1.
git init -q
git add -A
GIT_AUTHOR_NAME="fixture" GIT_AUTHOR_EMAIL="fixture@example.com" \
GIT_COMMITTER_NAME="fixture" GIT_COMMITTER_EMAIL="fixture@example.com" \
git commit -q -m "mini task tracker: go-deep has run, testing-strategy.md already exists and is complete"
