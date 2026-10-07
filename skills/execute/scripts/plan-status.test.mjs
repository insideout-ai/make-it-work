import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { changePlan, inspectPlan, updatePlan } from './plan-status.mjs';

const SCRIPT = path.join(import.meta.dirname, 'plan-status.mjs');
const TEMPLATE = path.resolve(import.meta.dirname, '../../plan-the-work/references/plan-template.md');
const LEGACY_PLAN = path.resolve(import.meta.dirname, '../../../evals/implement/fixture-base/fixture-artifacts/DEMO-plan.md');

async function fixture() {
  return readFile(TEMPLATE, 'utf8');
}

async function workspace(t, contents) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'plan-status-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const planPath = path.join(directory, 'DEMO-plan.md');
  await writeFile(planPath, contents, { mode: 0o600 });
  return planPath;
}

test('inspects untouched template without modifying it', async () => {
  const plan = await fixture();
  assert.deepEqual(inspectPlan(plan), { mode: 'pending', pauseMode: null, completed: 0, total: null });
});

test('sets initial total, selects subagent mode, and advances one verified step at a time', async () => {
  const original = await fixture();
  let plan = changePlan(original, 'set-total', { total: '3' });
  plan = changePlan(plan, 'set-mode', { mode: 'subagent-driven' });
  plan = changePlan(plan, 'complete-step', { step: '1' });
  assert.deepEqual(inspectPlan(plan), { mode: 'subagent-driven', pauseMode: null, completed: 1, total: 3 });
  assert.match(plan, /\*\*Mode:\*\* Subagent-Driven — dispatch/);
  assert.doesNotMatch(plan, /Not yet chosen/);
  assert.ok(plan.startsWith(original.slice(0, original.indexOf('## Execution Status'))));
  assert.equal(plan.slice(plan.indexOf('## Open Questions & Blockers')), original.slice(original.indexOf('## Open Questions & Blockers')));
  assert.throws(() => changePlan(plan, 'complete-step', { step: '3' }), /Only the next step/);
  assert.throws(() => changePlan(plan, 'set-mode', { mode: 'inline' }), /already chosen/);
  assert.throws(() => changePlan(plan, 'set-pause', { pause: 'straight-through' }), /only be set for Inline/);
});

test('inline pause mode can be backfilled once, and same choice is idempotent', async () => {
  let plan = changePlan(await fixture(), 'set-total', { total: '2' });
  plan = changePlan(plan, 'set-mode', { mode: 'inline' });
  assert.equal(inspectPlan(plan).pauseMode, null);
  plan = changePlan(plan, 'set-pause', { pause: 'after-each-step' });
  assert.deepEqual(inspectPlan(plan), { mode: 'inline', pauseMode: 'after-each-step', completed: 0, total: 2 });
  assert.equal(changePlan(plan, 'set-pause', { pause: 'after-each-step' }), plan);
  assert.throws(() => changePlan(plan, 'set-pause', { pause: 'straight-through' }), /already chosen/);
});

test('existing Inline plan fixture can be inspected and backfilled without changing its progress', async () => {
  const original = await readFile(LEGACY_PLAN, 'utf8');
  assert.deepEqual(inspectPlan(original), { mode: 'inline', pauseMode: null, completed: 1, total: 1 });
  const updated = changePlan(original, 'set-pause', { pause: 'straight-through' });
  assert.deepEqual(inspectPlan(updated), { mode: 'inline', pauseMode: 'straight-through', completed: 1, total: 1 });
  assert.match(updated, /\*\*Progress:\*\* Step 1 of 1 complete\./);
});

test('amend grows total without altering completed count or mode', async () => {
  let plan = changePlan(await fixture(), 'set-total', { total: '2' });
  plan = changePlan(plan, 'set-mode', { mode: 'inline' });
  plan = changePlan(plan, 'complete-step', { step: '1' });
  plan = changePlan(plan, 'set-total', { total: '4' });
  assert.deepEqual(inspectPlan(plan), { mode: 'inline', pauseMode: null, completed: 1, total: 4 });
  assert.throws(() => changePlan(plan, 'set-total', { total: '1' }), /cannot decrease/);
});

test('batch completion and correction have explicit, guarded commands', async () => {
  let plan = changePlan(await fixture(), 'set-total', { total: '5' });
  assert.throws(() => changePlan(plan, 'complete-batch', { through: '1' }), /at least two/);
  plan = changePlan(plan, 'complete-batch', { through: '3' });
  assert.equal(inspectPlan(plan).completed, 3);
  plan = changePlan(plan, 'correct-progress', { completed: '0' });
  assert.equal(inspectPlan(plan).completed, 0);
  assert.throws(() => changePlan(plan, 'correct-progress', { completed: '1' }), /must lower/);
});

test('malformed or duplicate status data is rejected', async () => {
  const plan = await fixture();
  assert.throws(() => inspectPlan(plan + '\n## Execution Status\n'), /exactly one/);
  assert.throws(() => inspectPlan(plan.replace('**Progress:**', '**Other:**')), /one Mode and one Progress/);
  assert.throws(() => inspectPlan(plan.replace('Step 0 of N', 'Step 3 of 2')), /outside its total/);
  assert.throws(() => changePlan(plan.replace('- **Inline**', '- **Other**'), 'set-mode', { mode: 'inline' }), /do not match/);
});

test('CLI writes atomically, preserves file mode, and rejects symlink targets', async (t) => {
  const planPath = await workspace(t, await fixture());
  const run = spawnSync(process.execPath, [SCRIPT, 'set-total', '--plan', planPath, '--total', '3'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(JSON.parse(run.stdout).total, 3);
  assert.equal((await stat(planPath)).mode & 0o777, 0o600);
  const before = await readFile(planPath, 'utf8');
  const bad = spawnSync(process.execPath, [SCRIPT, 'complete-step', '--plan', planPath, '--step', '3'], { encoding: 'utf8' });
  assert.notEqual(bad.status, 0);
  assert.equal(await readFile(planPath, 'utf8'), before);
  const link = planPath + '.link';
  await symlink(planPath, link);
  await assert.rejects(updatePlan(link, 'inspect'), /regular file/);
});

test('CRLF plans retain their line endings', async () => {
  const plan = (await fixture()).replaceAll('\n', '\r\n');
  const updated = changePlan(plan, 'set-total', { total: '2' });
  assert.equal(updated.replaceAll('\r\n', '').includes('\n'), false);
});
