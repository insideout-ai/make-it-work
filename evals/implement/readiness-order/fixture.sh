#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
bash "$SCRIPT_DIR/../plan-agent-wait/fixture.sh"
rm make-it-work/DEMO-WAIT/DEMO-WAIT-spec.md
rmdir make-it-work/DEMO-WAIT
mkdir -p make-it-work/DEMO-READY
cat > make-it-work/DEMO-READY/DEMO-READY-spec.md <<'SPEC'
# Accepted spec — DEMO-READY

Allow administrators to proceed; members remain allowed and guests remain denied.
For this focused run, pause in Write Tests after readiness, completed planning and an authorized administrator progression test confirmed red with saved preparation evidence. Do not implement the behavior or enter Execute.
SPEC
