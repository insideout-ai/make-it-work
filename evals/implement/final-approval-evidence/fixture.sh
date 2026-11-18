#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
bash "$SCRIPT_DIR/../seed-delivery-fixture.sh" prepare
node --input-type=module <<'JS'
import { readFile, writeFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const run = 'make-it-work/DEMO/';
const statePath = run + 'DEMO-state.md';
// The approval case represents the accepted administrator scope after final sync.
await writeFile(run + 'DEMO-spec.md', '# Refined spec — policy decision\n\nMembers and administrators may proceed. Every other supported role is denied.\n');
const specHash = execFileSync('git', ['hash-object', run + 'DEMO-spec.md'], { encoding: 'utf8' }).trim();
let state = await readFile(statePath, 'utf8');
state = state.replace(/^phase: .*$/m, 'phase: final-approval')
  .replace(/^status: .*$/m, 'status: In Progress')
  .replace(/^autonomy: .*$/m, 'autonomy: guided')
  .replace(/^spec_hash: .*$/m, `spec_hash: ${specHash}`);
await writeFile(statePath, state);
await writeFile(run + 'DEMO-review.md', '# Independent review — CLEAN\n\n' + await readFile(run + 'DEMO-evidence.md', 'utf8'));
for (const suffix of ['final-draft.json', 'final-package.md', 'final-package.json', 'final-approval.json', 'delivery-plan.md', 'delivery-plan.json', 'delivery-progress.json']) {
  await rm(run + 'DEMO-' + suffix, { force: true });
}
JS
