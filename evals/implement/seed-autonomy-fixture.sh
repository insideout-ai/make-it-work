#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../assert-disposable-cwd.sh"
bash "$SCRIPT_DIR/seed-fixture.sh" "$SCRIPT_DIR/feedback-clean/fixture"
node --input-type=module - "$1" <<'JS'
import { readFile, writeFile } from 'node:fs/promises';
const scenario = process.argv[2];
const statePath = 'make-it-work/DEMO/DEMO-state.md';
let state = await readFile(statePath, 'utf8');
const config = {
  guided: { phase: 'spec-approval', autonomy: 'autopilot', status: 'Paused', pause_reason: 'spec approval pending' },
  autopilot: { phase: 'execute', autonomy: 'guided', status: 'Paused', pause_reason: 'last inline step complete; completion gate pending' },
  resume: { phase: 'final-sync', autonomy: 'autopilot', status: 'In Progress', pause_reason: 'none' },
}[scenario];
if (!config) throw new Error('Unknown autonomy fixture');
for (const [key, value] of Object.entries(config)) state = state.replace(new RegExp(`^${key}: .*$`, 'm'), `${key}: ${value}`);
if (scenario === 'guided') {
  state = state.slice(0, state.indexOf('## Audit log')) + `## Audit log

| # | Time | From | To | Outcome / reason |
| --- | --- | --- | --- | --- |
| 1 | 2026-01-01T10:00:00Z | start | context-check | New Guided run on feature branch |
| 2 | 2026-01-01T10:01:00Z | context-check | close-the-gaps | Context complete |
| 3 | 2026-01-01T10:02:00Z | close-the-gaps | spec-approval | Spec ready for approval |
| 4 | 2026-01-01T10:03:00Z | spec-approval | spec-approval | Decision: Autonomy changed guided -> autopilot by explicit chat request |
`;
}
if (scenario === 'autopilot') {
  state = state.replace(/^execution: .*$/m, 'execution: running').replace(/^review: .*$/m, 'review: not-started');
  state = state.slice(0, state.indexOf('## Audit log')) + `## Audit log

| # | Time | From | To | Outcome / reason |
| --- | --- | --- | --- | --- |
| 1 | 2026-01-01T10:00:00Z | start | context-check | New Guided run on feature branch |
| 2 | 2026-01-01T10:01:00Z | context-check | close-the-gaps | Context complete |
| 3 | 2026-01-01T10:02:00Z | close-the-gaps | plan | Spec approved and plan prepared |
| 4 | 2026-01-01T10:03:00Z | plan | execute | Plan approved; inline execution started |
`;
}
if (scenario === 'resume') state += '| 7 | 2026-01-01T10:06:00Z | final-sync | final-sync | Decision: Autonomy changed guided -> autopilot by explicit chat request |\n';
await writeFile(statePath, state);
await writeFile('make-it-work/DEMO/implement-autopilot-log.jsonl', JSON.stringify({ phase: 'fixture', site: 'existing-history', kind: 'checkpoint', chosen: 'Preserve existing history', rationale: 'A previous Autopilot segment already ran.' }) + '\n');
JS
