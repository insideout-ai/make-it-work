import { artifactJoin } from '../scripts/lib/artifact-path.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, realpath, rm, access } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { parseState } from '../skills/implement/scripts/render-status.mjs';
import { snapshot } from '../scripts/lib/repo-state.mjs';
import { digest } from '../scripts/lib/artifacts.mjs';

test('worker blocker fixture enters the real opted-in stage with matching fingerprints and no invented agent', async t => {
  const root = await realpath(await mkdtemp(artifactJoin(os.tmpdir(), 'worker-blocker-fixture-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  execFileSync('bash', [path.resolve('evals/implement/refinement-worker-blocked/fixture.sh')], { cwd: root, stdio: 'pipe' });
  const statePath = artifactJoin(root, 'make-it-work/DEMO-REFINE/DEMO-REFINE-state.md');
  const state = parseState(await readFile(statePath, 'utf8'), statePath);
  assert.equal(state.fields.refinement_worker_version, '1');
  assert.equal(state.fields.controller_version, '1');
  assert.equal(state.fields.autonomy, 'autopilot');
  assert.equal(state.fields.phase, 'close-the-gaps');
  assert.equal(state.fields.status, 'In Progress');
  assert.equal(state.fields.spec, 'none');
  assert.equal(state.fields.worktree_fingerprint, digest(JSON.stringify(await snapshot([root]))));
  const map = JSON.parse(await readFile(artifactJoin(root, 'config/required-role-map.json'), 'utf8'));
  assert.equal(map.roles.member, 'member'); assert.equal(map.roles.admin, undefined);
  await assert.rejects(access(artifactJoin(path.dirname(statePath), 'DEMO-REFINE-refinement-worker.json')));
});
