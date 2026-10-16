#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
cp -R "$SCRIPT_DIR/fixture/." .
for repo in backend checkbox-ui code-only-api words-only summary-viewer health-probe; do
  (
    cd "$repo"
    git init -q
    git config user.name fixture
    git config user.email fixture@example.invalid
    git add -A
    git -c core.hooksPath=/dev/null commit -q -m "$repo: fixture"
  )
done
