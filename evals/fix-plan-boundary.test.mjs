import { artifactJoin } from '../scripts/lib/artifact-path.mjs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { parseState } from '../skills/implement/scripts/render-status.mjs';
import { validatePlan } from '../scripts/validate-plan.mjs';

test('fix-plan boundary fixture starts with completed implementation, passing checks and a resumable legacy review finding', async t => {
  const root = await mkdtemp(artifactJoin(os.tmpdir(), 'fix-plan-boundary-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const seed = path.resolve('evals/implement/fix-plan-boundary/fixture.sh');
  execFileSync('bash', [seed], { cwd: root, stdio: 'pipe' });
  const statePath = artifactJoin(root, 'make-it-work/DEMO-2/DEMO-2-state.md');
  const state = parseState(await readFile(statePath, 'utf8'), statePath);
  assert.equal(state.fields.phase, 'fix-plan');
  assert.equal(state.fields.autonomy, 'autopilot');
  assert.equal(state.fields.controller_version, undefined);
  const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
  const blobHash = input => execFileSync('git', ['-C', root, 'hash-object', '--stdin'], { input, encoding: 'utf8' }).trim();
  assert.equal(state.fields.head, git('rev-parse', 'HEAD'));
  assert.equal(state.fields.spec_hash, git('hash-object', state.fields.spec));
  const planBytes = await readFile(artifactJoin(root, state.fields.plan), 'utf8');
  assert.equal(state.fields.plan_hash, blobHash(planBytes.replace(/^## Execution Status\s*\n[\s\S]*?(?=^## |$(?![\s\S]))/m, '')));
  const tracked = execFileSync('git', ['-C', root, 'diff', 'HEAD', '--binary', '--', '.', ':!make-it-work']);
  const untracked = execFileSync('git', ['-C', root, 'ls-files', '--others', '--exclude-standard', '-z', '--', '.', ':!make-it-work']).toString().split('\0').filter(Boolean);
  assert.equal(state.fields.worktree_fingerprint, blobHash(Buffer.concat([tracked, Buffer.from(untracked.map(file => git('hash-object', file) + '\n').join(''))])));

  assert.equal(state.audit.at(-1).from, 'review');
  assert.equal(state.audit.at(-1).to, 'fix-plan');
  const plan = await readFile(artifactJoin(root, state.fields.plan), 'utf8');
  assert.equal(validatePlan(plan).valid, true);
  assert.match(plan, /Step 1 of 1 complete/);
  assert.equal(await readFile(artifactJoin(root, 'src/greeting.js'), 'utf8'), await readFile(artifactJoin(root, '.eval-baseline-greeting.js'), 'utf8'));
  assert.match(execFileSync(process.execPath, ['test.js'], { cwd: root }).toString(), /All tests passed/);
  assert.throws(() => execFileSync('bash', [seed], { cwd: root, stdio: 'pipe' }), /Command failed/);
});
