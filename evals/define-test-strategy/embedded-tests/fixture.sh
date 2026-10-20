#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
bash "$SCRIPT_DIR/../../fixtures/seed-embedded-tests.sh"
# Keep a colocated separate test untagged so refresh must classify and tag it.
sed '/@covers/d' embedded-tests/src/test_labels.py > embedded-tests/src/test_labels.tmp
mv embedded-tests/src/test_labels.tmp embedded-tests/src/test_labels.py
git -C embedded-tests add src/test_labels.py
git -C embedded-tests -c user.name=fixture -c user.email=fixture@example.test commit -qm 'Untagged separate test'
