#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
cp -R "$SCRIPT_DIR/fixture/." .
git init -q
git add -A
git -c user.email=eval@example.invalid -c user.name="Eval Fixture" commit -q -m "fixture" >/dev/null
