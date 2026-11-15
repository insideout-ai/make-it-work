#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
mkdir -p make-it-work/DEMO
cp "$SCRIPT_DIR/../../implement/feedback-clean/fixture/fixture-artifacts/DEMO-state.md" make-it-work/DEMO/
cp "$SCRIPT_DIR/../dashboard-html-fixture/clean.html" make-it-work/DEMO/DEMO-status.html
cp -R "$SCRIPT_DIR/fixture/." .
python3 - <<'PY'
from pathlib import Path
p=Path('make-it-work/DEMO/DEMO-state.md')
s=p.read_text().replace('status: In Progress', 'status: Complete').replace('phase: final-sync', 'phase: complete').replace('autonomy: autonomous', 'autonomy: autopilot').replace('plugin_version: 4.6.0', 'plugin_version: 5.7.0\nfeedback_evidence_version: 1')
p.write_text(s.rstrip()+'\n| 7 | 2026-01-01T10:06:00Z | final-sync | complete | Context synchronized; Complete with no fixes or replans |\n')
p=Path('make-it-work/DEMO/earlier-draft.json')
p.with_name('earlier-draft.baseline.json').write_bytes(p.read_bytes())
PY
