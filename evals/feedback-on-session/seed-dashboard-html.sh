#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../assert-disposable-cwd.sh"
case "${1:-}" in clean|contradictory|noisy|missing) ;; *) exit 64 ;; esac
mkdir -p make-it-work/DEMO
cp "$SCRIPT_DIR/dashboard-html-fixture/DEMO-state.md" make-it-work/DEMO/
cp "$SCRIPT_DIR/dashboard-html-fixture/session.txt" session.txt
if [ "$1" != missing ]; then
  cp "$SCRIPT_DIR/dashboard-html-fixture/$1.html" make-it-work/DEMO/DEMO-status.html
fi
