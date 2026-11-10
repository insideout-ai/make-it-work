#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
bash "$SCRIPT_DIR/../seed-dashboard-html.sh" clean
cp "$SCRIPT_DIR/fixture/review.md" make-it-work/DEMO/DEMO-review.md
cp "$SCRIPT_DIR/fixture/implementation.md" make-it-work/DEMO/DEMO-lightweight.md
cp "$SCRIPT_DIR/fixture/package.md" make-it-work/DEMO/DEMO-final-package.md
cp "$SCRIPT_DIR/fixture/weak-review.json" make-it-work/DEMO/weak-review.json
cp "$SCRIPT_DIR/fixture/session.txt" session.txt
python3 - <<'PY'
from pathlib import Path
p=Path('make-it-work/DEMO/DEMO-status.html')
s=p.read_text().replace('<body><main>', '<body><main>\n<img alt="Logo" src="data:image/png;base64,'+'A'*26000+'">')
s=s.replace('<p>Browser verification: pending. No browser observations recorded.</p>', '<p>Implementation complete.</p>')
s=s.replace('</main>', '<p>Workflow feedback: make-it-work/implement-feedback.md is cumulative. Keep it to review or share.</p>\n</main>')
p.write_text(s)
PY
