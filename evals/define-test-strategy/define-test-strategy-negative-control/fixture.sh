#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
# Fresh onboarding without --autopilot must pause for location confirmation.
cp -R "$SCRIPT_DIR/../fresh-tests/fixture/." .

git init -q
git add -A
GIT_AUTHOR_NAME="fixture" GIT_AUTHOR_EMAIL="fixture@example.com" \
GIT_COMMITTER_NAME="fixture" GIT_COMMITTER_EMAIL="fixture@example.com" \
git commit -q -m "mini task tracker: tests exist, no test-strategy output"
