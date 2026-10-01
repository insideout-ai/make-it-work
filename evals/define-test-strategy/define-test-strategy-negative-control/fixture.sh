#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Reuses extend-autopilot's fixture verbatim — same starting state, the only
# difference is the prompt (no --autopilot), so this proves the interactive
# path still blocks instead of silently completing.
cp -R "$SCRIPT_DIR/../extend-autopilot/fixture/." .

git init -q
git add -A
GIT_AUTHOR_NAME="fixture" GIT_AUTHOR_EMAIL="fixture@example.com" \
GIT_COMMITTER_NAME="fixture" GIT_COMMITTER_EMAIL="fixture@example.com" \
git commit -q -m "mini task tracker: go-deep has run, testing-strategy.md already exists and is complete"
