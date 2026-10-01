#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
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
