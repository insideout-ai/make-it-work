#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"

# Same go-deep-shaped project as extend-autopilot, but with NO existing
# testing-strategy.md and NO existing tests at all — exercises Phase 1's
# case (a) "fresh" path (no menu) and a from-scratch Phase 2 generation,
# including the .claude/-protected write that plain `claude plugin eval`
# cannot grant. This is why this case needs the manual
# --dangerously-skip-permissions path (see this directory's README).
cp -R "$SCRIPT_DIR/../extend-autopilot/fixture/." .
rm -f .claude/rules/testing-strategy.md
rm -rf __tests__
mkdir -p __tests__
: > __tests__/.gitkeep

git init -q
git add -A
GIT_AUTHOR_NAME="fixture" GIT_AUTHOR_EMAIL="fixture@example.com" \
GIT_COMMITTER_NAME="fixture" GIT_COMMITTER_EMAIL="fixture@example.com" \
git commit -q -m "mini task tracker: go-deep has run, no test-strategy file or tests exist yet"
