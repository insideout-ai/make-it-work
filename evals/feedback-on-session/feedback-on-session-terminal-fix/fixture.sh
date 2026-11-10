#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
mkdir -p make-it-work/DEMO
cp "$SCRIPT_DIR/fixture/DEMO-state.md" make-it-work/DEMO/
cp "$SCRIPT_DIR/fixture/session.txt" session.txt
