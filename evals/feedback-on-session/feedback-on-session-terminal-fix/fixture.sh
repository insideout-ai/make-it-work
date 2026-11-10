#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
mkdir -p make-it-work/DEMO
cp "$SCRIPT_DIR/fixture/DEMO-state.md" make-it-work/DEMO/
cp "$SCRIPT_DIR/fixture/session.txt" session.txt
MIW_FIXTURE_SOURCE="$SCRIPT_DIR" node --input-type=module <<'JS' > feedback-handoff.json
import path from 'node:path';
const { feedbackAction } = await import(path.join(process.env.MIW_FIXTURE_SOURCE, '../../../skills/implement/scripts/feedback-handoff.mjs'));
console.log(JSON.stringify(feedbackAction(path.resolve('make-it-work/DEMO/DEMO-state.md'), { status: 'Complete', phase: 'complete', start_time: '2026-01-01T10:00:00Z' })));
JS
