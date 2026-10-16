#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
cp -R "$SCRIPT_DIR/../../fixtures/multi-repo-workspace/." .

# payments-api is onboarded from scratch: drop its test-strategy skill and
# every `@covers` line in qa-automation, so the run must detect the QA repo
# and write the tags itself. ledger-api keeps its strategy.
rm -rf payments-api/claude-dir/skills/test-strategy
find qa-automation/tests -name '*.test.js' | while read -r f; do
  grep -v '@covers' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
done

for repo in payments-api qa-automation ledger-api; do
  (
    cd "$repo"
    if [ -d claude-dir ]; then
      mv claude-dir .claude
    fi
    git init -q
    git add -A
    git -c user.email=eval@example.com -c user.name=eval commit -qm fixture
  )
done
