#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
cp -R "$SCRIPT_DIR/fixture/." .
git init -q -b main
git add -A
git -c core.hooksPath=/dev/null -c user.name=fixture -c user.email=fixture@example.test commit -qm 'Sessions app before payment-date display'
node --test
