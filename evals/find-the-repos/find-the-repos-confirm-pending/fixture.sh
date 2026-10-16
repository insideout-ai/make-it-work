#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
bash "$SCRIPT_DIR/../find-the-repos-catalog-workspace/fixture.sh"
mkdir -p make-it-work/off-cycle-date-controls
cp "$SCRIPT_DIR/pending-draft.md" make-it-work/off-cycle-date-controls/off-cycle-date-controls-repos.draft.md
