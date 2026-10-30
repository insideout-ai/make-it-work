import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { digest } from '../scripts/lib/artifacts.mjs';
import { parseState } from '../skills/implement/scripts/render-status.mjs';
import { applyWorkflow } from '../skills/implement/scripts/workflow.mjs';
import { gradeHeadlessLocal, parseGrader, transcriptContext } from './grade-headless.mjs';

const base = path.dirname(fileURLToPath(import.meta.url));
async function fixture(t, scenario) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'autonomy-queue-eval-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  execFileSync('bash', [path.join(base, 'implement/seed-autonomy-fixture.sh'), scenario], { cwd: root });
  const statePath = path.join(root, 'make-it-work/DEMO/DEMO-state.md');
  const state = parseState(await readFile(statePath, 'utf8'), statePath);
  return { root, statePath, state };
}

test('Autopilot-queue eval retains its legacy policy-free refinement wave and grader requires both modes', async (t) => {
  const { root, statePath, state } = await fixture(t, 'autopilot');
  assert.equal(state.fields.autonomy, 'guided'); assert.equal(state.fields.phase, 'close-the-gaps');
  assert.equal(state.pendingInputs[0].policy, undefined);
  const graderPath = path.join(base, 'implement/switch-to-autopilot/graders/saved-mode.md');
  const grader = parseGrader(await readFile(graderPath, 'utf8'), 'saved-mode.md');
  const context = transcriptContext(JSON.stringify({ type: 'result', result: 'Local fixture verification; no model was run.' }), root);
  assert.equal((await gradeHeadlessLocal(grader, context)).passed, false);
  const log = path.join(root, 'make-it-work/DEMO/implement-autopilot-log.jsonl');
  const beforeLog = await readFile(log, 'utf8');
  const queued = await applyWorkflow({ root, statePath, input: { event: 'autonomy', id: 'queue-mode', mode: 'autopilot',
    source: 'user', via: 'chat', expected_hash: digest(await readFile(statePath, 'utf8')) } });
  assert.equal(queued.fields.autonomy, 'guided'); assert.equal(queued.fields.queued_autonomy, 'autopilot');
  assert.deepEqual(queued.pending, state.pendingInputs);
  assert.equal((await gradeHeadlessLocal(grader, context)).passed, true);
  assert.equal(await readFile(log, 'utf8'), beforeLog);
});

test('Guided-queue eval starts inside Autopilot Execute with completed progress', async (t) => {
  const { root, statePath, state } = await fixture(t, 'queued-guided');
  assert.equal(state.fields.autonomy, 'autopilot'); assert.equal(state.fields.phase, 'execute');
  const planPath = path.join(root, state.fields.plan), original = await readFile(planPath, 'utf8');
  assert.match(original, /Step 1 of 1 complete/);
  const grader = parseGrader(await readFile(path.join(base, 'implement/switch-to-guided/graders/saved-mode.md'), 'utf8'), 'saved-mode.md');
  const context = transcriptContext(JSON.stringify({ type: 'result', result: 'Local fixture verification; no model was run.' }), root);
  assert.equal((await gradeHeadlessLocal(grader, context)).passed, false);
  const queued = await applyWorkflow({ root, statePath, input: { event: 'autonomy', id: 'queue-guided', mode: 'guided',
    source: 'user', via: 'chat', expected_hash: digest(await readFile(statePath, 'utf8')) } });
  assert.equal(queued.fields.autonomy, 'autopilot'); assert.equal(queued.fields.queued_autonomy, 'guided');
  assert.equal(queued.fields.status, 'Paused'); assert.equal(await readFile(planPath, 'utf8'), original);
  assert.equal((await gradeHeadlessLocal(grader, context)).passed, true);
});

test('publication Guided fixture retains its independent spec-approval setup', async (t) => {
  const { state } = await fixture(t, 'guided');
  assert.equal(state.fields.phase, 'spec-approval'); assert.equal(state.fields.status, 'Paused');
});
