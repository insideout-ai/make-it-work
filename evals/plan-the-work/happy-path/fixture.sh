#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
cp -R "$SCRIPT_DIR/fixture/." .

git init -q
git config user.name "fixture"
git config user.email "fixture@example.com"
git checkout -q -b "feature/DEMO-200-snooze"
git add -A
git commit -q -m "demo-tasks: initial commit"
