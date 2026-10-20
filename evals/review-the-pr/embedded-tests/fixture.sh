#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
bash "$SCRIPT_DIR/../../fixtures/seed-embedded-tests.sh"
git -C embedded-tests branch -M main
git -C embedded-tests switch -qc feature/DEMO-901-boundary-tests
cp "$SCRIPT_DIR/account.py" embedded-tests/src/account.py
cp "$SCRIPT_DIR/test_labels.py" embedded-tests/src/test_labels.py
git -C embedded-tests add src
git -C embedded-tests -c user.name=fixture -c user.email=fixture@example.test commit -qm 'DEMO-901: add boundary regression assertions'
