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
  'queued-guided': { phase: 'execute', autonomy: 'autopilot', status: 'Paused', pause_reason: 'last inline step complete; completion gate pending' },
  autopilot: { phase: 'close-the-gaps', autonomy: 'guided', status: 'Paused', pause_reason: 'Refinement wave 2 needs answers.' },
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
if (scenario === 'queued-guided') {
  state = state.replace(/^execution: .*$/m, 'execution: running').replace(/^review: .*$/m, 'review: not-started');
  state = state.slice(0, state.indexOf('## Audit log')) + `## Audit log

| # | Time | From | To | Outcome / reason |
| --- | --- | --- | --- | --- |
| 1 | 2026-01-01T10:00:00Z | start | context-check | New Autopilot run on feature branch |
| 2 | 2026-01-01T10:01:00Z | context-check | close-the-gaps | Context complete |
| 3 | 2026-01-01T10:02:00Z | close-the-gaps | plan | Spec ready and plan prepared |
| 4 | 2026-01-01T10:03:00Z | plan | execute | Inline execution started |
`;
}
if (scenario === 'autopilot') {
  const pending = { version: 1, id: 'wave-2', kind: 'question', phase: 'close-the-gaps',
    question: 'Please answer the independent refinement questions.', choices: [], multi_select: false,
    blocking: true, waiting_for: 'user', requested_at: '2026-01-01T10:04:00Z',
    questions: [
      { id: 'Q5', question: 'Which trigger?', choices: [{ id: 'manual', label: 'Manual (Recommended)' }, { id: 'scheduled', label: 'Scheduled' }] },
      { id: 'Q6', question: 'What should the empty state say?', choices: [] },
    ], continuation: { event: 'resume-stage' } };
  state = state.replace(/^phase: .*$/m, `phase: close-the-gaps\npending_inputs: ${JSON.stringify([pending])}`);
  state = state.slice(0, state.indexOf('## Audit log')) + `## Audit log

| # | Time | From | To | Outcome / reason |
| --- | --- | --- | --- | --- |
| 1 | 2026-01-01T10:00:00Z | start | context-check | New Guided run on feature branch |
| 2 | 2026-01-01T10:01:00Z | context-check | close-the-gaps | Context complete |
| 3 | 2026-01-01T10:04:00Z | close-the-gaps | close-the-gaps | Awaiting refinement wave 2 [pending-input: wave-2] |
`;
  await writeFile('make-it-work/DEMO/pending-wave-before.json', JSON.stringify(pending));
}
if (scenario === 'resume') state += '| 7 | 2026-01-01T10:06:00Z | final-sync | final-sync | Decision: Autonomy changed guided -> autopilot by explicit chat request |\n';
await writeFile(statePath, state);
await writeFile('make-it-work/DEMO/implement-autopilot-log.jsonl', JSON.stringify({ phase: 'fixture', site: 'existing-history', kind: 'checkpoint', chosen: 'Preserve existing history', rationale: 'A previous Autopilot segment already ran.' }) + '\n');
JS
