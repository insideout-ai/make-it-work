#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../assert-disposable-cwd.sh"
scenario="$1"
if [ "$scenario" = "guided" ]; then
  bash "$SCRIPT_DIR/seed-autonomy-fixture.sh" guided
elif [ "$scenario" = "resume" ]; then
  bash "$SCRIPT_DIR/seed-autonomy-fixture.sh" resume
else
  echo "Unknown publication fixture: $scenario" >&2
  exit 1
fi
node --input-type=module - "$SCRIPT_DIR/../../skills/implement/scripts/ticket-publication.mjs" "$scenario" <<'JS'
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { initializePublication, updatePublication } = await import(pathToFileURL(process.argv[2]));
const scenario = process.argv[3];
const statePath = 'make-it-work/DEMO/DEMO-state.md';
let state = await readFile(statePath, 'utf8');
const workflow_start = state.match(/^start_time: (.+)$/m)[1];
const original_description = 'Original requirement: allow members to proceed and deny guests.';
let journal = initializePublication({ ticket: 'DEMO', workflow_start }, {
  target: { tracker: 'jira', site: 'https://tracker.example.test', issue: 'DEMO', url: 'https://tracker.example.test/browse/DEMO' },
  original_description,
  mode: scenario === 'guided' ? 'updates' : 'comments',
  decision: { source: 'user', text: scenario === 'guided' ? 'Allow these updates for DEMO during this run.' : 'Comments and attachments only for DEMO during this run.' },
});
journal.run_id = 'fixture-run';
const capabilities = { description: true, comment: true, attachment: true };
if (scenario === 'guided') state = state.replace(/^autonomy: .*$/m, 'autonomy: guided');
if (scenario === 'resume') {
  const plan = await readFile('make-it-work/DEMO/DEMO-plan.md', 'utf8');
  let result = updatePublication(journal, 'prepare', { kind: 'attachment', key: 'plan-v1', content: plan, filename: 'DEMO-plan-v1-fixture.md', capabilities });
  const planID = result.result.operation.id;
  result = updatePublication(result.journal, 'begin', { operation_id: planID, capabilities });
  result = updatePublication(result.journal, 'record', { operation_id: planID, status: 'succeeded', evidence: 'Upload confirmed before the prior session ended', receipt: { id: 'attachment-existing-17' } });
  result = updatePublication(result.journal, 'prepare', { kind: 'comment', key: 'completion', content: 'Implementation ready for review; tests passed and review is clean.', capabilities });
  const commentID = result.result.operation.id;
  result = updatePublication(result.journal, 'begin', { operation_id: commentID, capabilities });
  journal = updatePublication(result.journal, 'record', { operation_id: commentID, status: 'unknown', evidence: 'Connection lost after sending the completion comment; remote result is unknown' }).journal;
}
const journalPath = 'make-it-work/DEMO/DEMO-ticket-publication-fixture-run.json';
state = state.replace(/^ticket: DEMO$/m, `ticket: DEMO\nticket_publication: ${journalPath}`);
await writeFile(journalPath, JSON.stringify(journal, null, 2) + '\n');
await writeFile(statePath, state);
JS
