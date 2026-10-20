#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
bash "$SCRIPT_DIR/../../fixtures/seed-embedded-tests.sh"
mkdir -p embedded-tests/make-it-work/DEMO-EMBED
cp "$SCRIPT_DIR/spec.md" embedded-tests/make-it-work/DEMO-EMBED/DEMO-EMBED-spec.md
git -C embedded-tests add make-it-work
git -C embedded-tests -c user.name=fixture -c user.email=fixture@example.test commit -qm 'Discount validation specification'
