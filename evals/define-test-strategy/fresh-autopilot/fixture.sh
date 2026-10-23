#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"

# Fresh project with configured tooling but no tests.
cp -R "$SCRIPT_DIR/../fresh-tests/fixture/." .
rm -rf __tests__
mkdir -p __tests__
: > __tests__/.gitkeep

git init -q
git add -A
GIT_AUTHOR_NAME="fixture" GIT_AUTHOR_EMAIL="fixture@example.com" \
GIT_COMMITTER_NAME="fixture" GIT_COMMITTER_EMAIL="fixture@example.com" \
git commit -q -m "mini task tracker: go-deep has run, no test-strategy output or tests exist yet"
