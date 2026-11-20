#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
bash "$SCRIPT_DIR/../seed-workspace-fixture.sh" approval
cp api/src/policy.js .eval-api.js
cp web/src/policy.js .eval-web.js
cp unrelated/src/policy.js .eval-unrelated.js
