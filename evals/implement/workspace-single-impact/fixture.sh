#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# The shared seeder sources assert-disposable-cwd.sh before mutations.
bash "$SCRIPT_DIR/../seed-workspace-fixture.sh" single-impact
