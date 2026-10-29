#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../assert-disposable-cwd.sh"
bash "$SCRIPT_DIR/seed-fixture.sh" "$SCRIPT_DIR/feedback-clean/fixture"
node --input-type=module - "$SCRIPT_DIR/../../skills/implement/scripts" "${1:-prepare}" <<'JS'
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const [scripts, scenario] = process.argv.slice(2);
if (!['prepare', 'decline', 'stale'].includes(scenario)) throw new Error('Unknown delivery scenario');
const root = process.cwd();
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const statePath = path.join(root, 'make-it-work/DEMO/DEMO-state.md');
const command = (file, action, ...args) => JSON.parse(execFileSync(process.execPath,
  [path.join(scripts, file), action, '--root', root, '--state', statePath, ...args], { encoding: 'utf8' }));
// Any accidental push resolves to an empty local fixture remote, never a live host.
const remote = path.join(root, '.git/fixture-origin.git');
git('init', '-q', '--bare', remote);
git('remote', 'add', 'origin', 'https://github.com/example/delivery-fixture.git');
git('config', `url.${remote}.insteadOf`, 'https://github.com/example/delivery-fixture.git');
await writeFile('src/policy.js', "function canProceed(role) {\n  return role === 'member' || role === 'admin';\n}\n\nmodule.exports = { canProceed };\n");
let state = await readFile(statePath, 'utf8');
state = state.replace('ticket: DEMO', 'ticket: DEMO\nfinal_package_version: 1')
  .replace(/^phase: .*$/m, 'phase: final-approval').replace(/^autonomy: .*$/m, 'autonomy: autopilot');
await writeFile(statePath, state);
const draft = path.join(root, 'make-it-work/DEMO/DEMO-final-draft.json');
await writeFile(draft, JSON.stringify({ commit_message: 'DEMO: Allow administrators',
  pr_title: 'DEMO: Allow administrators', pr_description: 'Allow administrators while preserving member access and guest denial.' }));
command('final-package.mjs', 'build', '--draft', draft, '--repo', root);
state = state.replace(/^phase: .*$/m, 'phase: complete').replace(/^status: .*$/m, 'status: Complete');
state += '| 7 | 2026-01-01T10:06:00Z | final-sync | final-approval | Context synced; package built |\n';
state += '| 8 | 2026-01-01T10:07:00Z | final-approval | complete | Implementation complete |\n';
await writeFile(statePath, state);
command('deliver.mjs', 'offer');
await writeFile('make-it-work/DEMO/fixture-baseline.json', JSON.stringify({ head: git('rev-parse', 'HEAD') }));
if (scenario === 'stale') await writeFile('src/policy.js', '// Edited after final packaging.\n' + await readFile('src/policy.js', 'utf8'));
JS
