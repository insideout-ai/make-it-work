#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
bash "$SCRIPT_DIR/../../fixtures/seed-embedded-tests.sh"
# A new independent label assertion requires targeted reassessment, not tagging.
node "$SCRIPT_DIR/../../fixtures/seed-test-map.mjs" embedded-tests --changed-label
