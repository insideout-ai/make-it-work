#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
cp -R "$SCRIPT_DIR/../../fixtures/multi-repo-workspace/." .

# Onboard payments-api from scratch; leave ledger-api's current strategy alone.
rm -rf payments-api/claude-dir/skills/test-strategy

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
