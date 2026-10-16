#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"

# Same go-deep-shaped project as dts-migrate-autopilot, but with none of the
# old-version outputs and no tests at all — exercises Phase 1's fresh path
# (nothing found, so no menu) and a from-scratch test-strategy skill.
cp -R "$SCRIPT_DIR/../dts-migrate-autopilot/fixture/." .
rm -f .claude/rules/testing-strategy.md
rm -rf __tests__
mkdir -p __tests__
: > __tests__/.gitkeep

# Strip the old Rules Files row and checklist item 1, then renumber the
# remaining checklist items 2-6 to 1-5 (portable: no `sed -i`).
grep -v -e '^- `\.claude/rules/testing-strategy\.md` —' \
  -e '^1\. Check the regression/coverage status' CLAUDE.md > CLAUDE.md.tmp
awk '
  /^Before every commit:$/ { in_list = 1; print; next }
  in_list && /^[2-6]\. / { n = substr($0, 1, 1) - 1; print n substr($0, 2); next }
  { print }
' CLAUDE.md.tmp > CLAUDE.md.tmp2
rm CLAUDE.md.tmp
mv CLAUDE.md.tmp2 CLAUDE.md

git init -q
git add -A
GIT_AUTHOR_NAME="fixture" GIT_AUTHOR_EMAIL="fixture@example.com" \
GIT_COMMITTER_NAME="fixture" GIT_COMMITTER_EMAIL="fixture@example.com" \
git commit -q -m "mini task tracker: go-deep has run, no test-strategy output or tests exist yet"
