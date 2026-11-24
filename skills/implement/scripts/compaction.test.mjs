import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, writeFile, rm, realpath } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { initializeWorkflow, applyWorkflow, planHash } from './workflow.mjs';
import { digest } from '../../../scripts/lib/artifacts.mjs';
import { parseState } from './render-status.mjs';
import { artifactJoin } from '../../../scripts/lib/artifact-path.mjs';
import { compactionRequired, compactionHold } from './compaction.mjs';
import { authorizePlanningTests } from './planning-tests.mjs';

async function fixture(t, autonomy = 'autonomous', phase = 'write-tests') {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'miw compact ')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-C', root, ...args], { stdio: 'pipe' });
  git('init', '-b', 'main'); git('config', 'user.email', 'test@example.invalid'); git('config', 'user.name', 'Fixture');
  await writeFile(path.join(root, 'app.js'), '// baseline\n'); git('add', '.'); git('commit', '-m', 'fixture'); git('switch', '-c', 'DEMO');
  const initialized = await initializeWorkflow(root, { ticket: 'DEMO', autonomy, base: 'main', repos: [root], branch_guard: 'Feature branch' });
  const statePath = initialized.state, dir = path.dirname(statePath);
  const spec = artifactJoin(dir, 'DEMO-spec.md'), plan = artifactJoin(dir, 'DEMO-plan.md');
  await writeFile(spec, '# Accepted requirement\n'); await writeFile(plan, '# Accepted plan\n');
  let state = await readFile(statePath, 'utf8');
  const fields = { phase, mode: 'tdd', mode_source: 'assessed', risk: 'medium', risk_rationale: 'Fixture risk assessment', spec: path.relative(root, spec), plan: path.relative(root, plan),
    spec_hash: digest(await readFile(spec)), plan_hash: planHash(await readFile(plan, 'utf8')) };
  for (const [k, v] of Object.entries(fields)) state = state.replace(new RegExp(`^${k}:.*$`, 'm'), `${k}: ${v}`);
  // Readiness itself is covered by its integration suite; this fixture isolates the boundary.
  state = state.replace(/^testing_readiness(?:_version)?:.*\n/gm, '');
  await writeFile(statePath, state);
  let count = 0;
  const apply = async (event, extra = {}) => applyWorkflow({ root, statePath, input: {
    id: `compact-${++count}`, event, expected_hash: digest(await readFile(statePath)), repos: [root], ...extra } });
  const current = async () => parseState(await readFile(statePath, 'utf8'), statePath);
  const answer = (result, value, extra = {}) => apply('resolve-input', { pending_id: result.pending[0].id,
    answer: value, source: 'user', via: 'chat', ...extra });
  return { root, statePath, spec, plan, initialized, apply, answer, current, git };
}
for (const mode of ['guided', 'autonomous']) test(`${mode}: saves offer and continuation, resumes without losing accepted revisions`, async t => {
  const f = await fixture(t, mode, mode === 'guided' ? 'plan-approval' : 'write-tests');
  if (mode === 'guided') {
    await assert.rejects(f.apply('compaction-checkpoint'), /first active TDD/);
    await f.apply('approve', { source: 'user', via: 'chat' });
  }
  await assert.rejects(authorizePlanningTests(f.statePath, {}), /compaction checkpoint/);
  const before = await f.current();
  const offered = await f.apply('compaction-checkpoint', { notes: 'Keep the rejected-alternative rationale in the accepted spec.' });
  assert.equal(offered.fields.phase, 'write-tests'); assert.equal(offered.fields.status, 'Paused');
  assert.equal(offered.pending[0].kind, 'compaction');
  assert.equal(offered.fields.compaction_checkpoint, 'offered');
  assert.match(await readFile(f.initialized.dashboard, 'utf8'), /Compact before implementation/);
  const recoveryPath = path.join(f.root, offered.fields.compaction_recovery);
  const recovery = JSON.parse(await readFile(recoveryPath, 'utf8'));
  assert.equal(recovery.runId, before.fields.start_time); assert.equal(recovery.plan_hash, before.fields.plan_hash);
  assert.match(recovery.notes, /rejected-alternative/);
  const redisplayed = await f.apply('resume', { blocker_resolved: true });
  assert.deepEqual(redisplayed.pending, offered.pending);
  const waiting = await f.answer(offered, 'compact');
  assert.equal(waiting.fields.compaction_checkpoint, 'awaiting-continuation');
  assert.equal(waiting.fields.status, 'Paused');
  assert.match(waiting.next_action.compact_command, /^\/compact /);
  assert.ok(waiting.next_action.compact_command.includes(f.statePath));
  // A new invocation recovers from disk only, with no inherited conversation objects.
  const saved = await f.current();
  const resumed = await applyWorkflow({ root: f.root, statePath: f.statePath, input: {
    id: 'new-context-continue', event: 'resolve-input', expected_hash: digest(await readFile(f.statePath)),
    pending_id: saved.pendingInputs[0].id, answer: 'continue', source: 'user', via: 'chat' } });
  assert.equal(resumed.fields.compaction_checkpoint, 'continued'); assert.equal(resumed.fields.status, 'In Progress');
  assert.equal(resumed.fields.plan_hash, before.fields.plan_hash); assert.equal(resumed.fields.spec_hash, before.fields.spec_hash);
  assert.deepEqual(resumed.pending, []); assert.equal(compactionRequired(resumed.fields), false);
  await assert.rejects(f.apply('compaction-checkpoint'), /first active TDD/);
});
test('declining continues once; queued autonomy does not answer or change the current wait', async t => {
  const f = await fixture(t);
  const offered = await f.apply('compaction-checkpoint');
  await f.apply('autonomy', { mode: 'autopilot', source: 'user', via: 'chat' });
  await assert.rejects(f.answer(offered, 'continue', { source: 'policy', via: 'policy' }), /explicit answer/);
  const result = await f.answer(offered, 'continue');
  assert.equal(result.fields.compaction_checkpoint, 'declined');
  assert.equal(result.fields.autonomy, 'autonomous'); assert.equal(result.fields.queued_autonomy, 'autopilot');
});
test('Autopilot skips without a question; legacy and Lightweight retain their routes', async t => {
  const f = await fixture(t, 'autopilot');
  const result = await f.apply('compaction-checkpoint');
  assert.equal(result.fields.compaction_checkpoint, 'skipped'); assert.deepEqual(result.pending, []);
  assert.equal(result.fields.compaction_recovery, 'none');
  assert.equal(compactionRequired({ phase: 'write-tests' }), false);
  assert.equal(compactionRequired({ ...result.fields, phase: 'lightweight', compaction_checkpoint: 'pending' }), false);
});
for (const changed of ['spec', 'plan', 'source', 'branch', 'recovery', 'missing-recovery']) test(`rejects ${changed} drift without accepting it into a baseline`, async t => {
  const f = await fixture(t);
  const offer = await f.apply('compaction-checkpoint');
  const waiting = await f.answer(offer, 'compact');
  if (changed === 'spec' || changed === 'plan') await writeFile(f[changed], '# changed\n');
  if (changed === 'source') await writeFile(path.join(f.root, 'app.js'), '// changed\n');
  if (changed === 'branch') f.git('switch', '-c', 'other');
  const recovery = path.join(f.root, waiting.fields.compaction_recovery);
  if (changed === 'recovery') await writeFile(recovery, '{}');
  if (changed === 'missing-recovery') await rm(recovery);
  const before = await readFile(f.statePath, 'utf8');
  await assert.rejects(f.answer(waiting, 'continue'), /changed|stale|ENOENT/);
  assert.equal(await readFile(f.statePath, 'utf8'), before);
});

test('stopping a stale optional wait cancels it without recording an answer or repeating the offer', async t => {
  const f = await fixture(t);
  const offer = await f.apply('compaction-checkpoint');
  await f.answer(offer, 'compact');
  const stopped = await f.apply('stop', { reason: 'Revalidate changed requirements before continuing.' });
  assert.equal(stopped.fields.compaction_checkpoint, 'cancelled');
  assert.equal(stopped.fields.status, 'Stopped'); assert.deepEqual(stopped.pending, []);
  assert.equal(compactionRequired(stopped.fields), false);
  assert.match((await f.current()).audit.at(-1).outcome, /cancelled without an answer/);
});

test('checkpoint render failure is recoverable by replaying the same event without duplicating its question', async t => {
  const f = await fixture(t);
  const input = { id: 'render-replay', event: 'compaction-checkpoint', expected_hash: digest(await readFile(f.statePath)), repos: [f.root] };
  await assert.rejects(applyWorkflow({ root: f.root, statePath: f.statePath, input, render: async () => { throw new Error('render failed'); } }), /render failed/);
  const before = await f.current();
  const replay = await applyWorkflow({ root: f.root, statePath: f.statePath, input });
  assert.equal(replay.replayed, true); assert.equal(replay.pending.length, 1);
  assert.equal(replay.next_action.checkpoint, 'offered'); assert.equal((await f.current()).audit.length, before.audit.length);
});

test('native hook evidence blocks dispatch and unsafe compaction while leaving questions and legacy runs usable', () => {
  const fields = { compaction_version: '1', compaction_checkpoint: 'pending', phase: 'write-tests' };
  assert.match(compactionHold({ tool_name: 'Agent' }, fields), /before dispatching/);
  const checkpoint = { tool_name: 'Bash', tool_input: { command: 'node workflow.mjs apply --input compaction-checkpoint.json' } };
  assert.match(compactionHold(checkpoint, fields, { agents: [{}] }), /prior workers/);
  assert.equal(compactionHold(checkpoint, fields), null);
  assert.equal(compactionHold({ tool_name: 'AskUserQuestion' }, fields), null);
  assert.equal(compactionHold({ tool_name: 'Agent' }, { phase: 'write-tests' }), null);
  assert.equal(compactionHold({ tool_name: 'Agent' }, { ...fields, compaction_checkpoint: 'continued' }), null);
});
