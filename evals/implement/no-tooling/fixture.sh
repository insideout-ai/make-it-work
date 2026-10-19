#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
cp -R "$SCRIPT_DIR/../fixture-base/." .
cp "$SCRIPT_DIR/fixture/package.json" package.json
git init -q -b main
git add -A
git -c user.name=fixture -c user.email=fixture@example.test commit -qm 'Policy app without test tooling or strategy'
