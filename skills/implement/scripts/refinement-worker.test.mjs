import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile, mkdir, rm, symlink, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { initializeWorkflow, applyWorkflow } from './workflow.mjs';
import { digest } from '../../../scripts/lib/artifacts.mjs';
import { refinementWorker } from './refinement-worker.mjs';
import { parseState } from './render-status.mjs';

async function fixture(t, enabled = true) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'refinement-worker-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-C', root, ...args], { stdio: 'pipe' }).toString().trim();
  git('init', '-q', '-b', 'main'); git('config', 'user.email', 'fixture@example.invalid'); git('config', 'user.name', 'Fixture');
  await writeFile(path.join(root, 'source.js'), 'module.exports = 1;\n');
  git('add', '.'); git('commit', '-qm', 'baseline'); git('switch', '-qc', 'DEMO');
  const input = { ticket: 'DEMO', autonomy: 'autopilot', repos: [root], base: 'main', branch_guard: 'Existing feature branch', refinement_worker: enabled };
  const init = await initializeWorkflow(root, input);
  const state = init.state, directory = path.dirname(state);
  await applyWorkflow({ root, statePath: state, input: { id: 'context-1', event: 'context-ready', expected_hash: digest(await readFile(state, 'utf8')), repos: [root], outcome: 'Ticket-scoped context is sufficient.' } });
  const run = (command, data = {}) => refinementWorker(root, state, command, data);
  const file = async (name, value) => { const p = path.join(directory, name); await writeFile(p, typeof value === 'string' ? value : JSON.stringify(value)); return name; };
  const patch = async (key, value) => writeFile(state, (await readFile(state, 'utf8')).replace(new RegExp(`^${key}:.*$`, 'm'), `${key}: ${value}`));
  const handoff = async (n = 1, changes = {}) => {
    await mkdir(path.join(directory, 'DEMO-handoffs'), { recursive: true });
    await file('DEMO-spec.md', '# Spec\nMembers remain allowed.\n');
    return file(`DEMO-handoffs/gaps-${n}.json`, { version: 1, ticket: 'DEMO', stage: 'gaps', plan_version: 1, status: 'done', outcome: 'SPEC_SAVED', artifacts: { spec: 'make-it-work/DEMO/DEMO-spec.md' }, data: { tbd_items: 0, context_updated: [] }, ...changes });
  };
  return { root, state, directory, input, git, run, file, patch, handoff };
}

test('opt-in is explicit and new-run only; ordinary/legacy inspection writes no worker journal', async t => {
  const f = await fixture(t, false);
  assert.deepEqual(await f.run('inspect'), { enabled: false, route: 'inline' });
  await assert.rejects(access(path.join(f.directory, 'DEMO-refinement-worker.json')));
  await assert.rejects(f.run('prepare', { task: 'Refine' }), /absent/);
  for (const override of [{ autonomy: 'guided' }, { refinement_destination: 'slack-send' }, { offline_pending: true }]) {
    await assert.rejects(initializeWorkflow(f.root, { ...f.input, ticket: 'NEW', refinement_worker: true, ...override }), /new local/);
    await assert.rejects(access(path.join(f.root, 'make-it-work/NEW/NEW-state.md')));
  }
  await f.patch('refinement_destination', 'slack-draft');
  assert.deepEqual(await f.run('inspect'), { enabled: false, route: 'inline' });
});

test('prepare is idempotent; attach cannot replace a different runtime and is never liveness proof', async t => {
  const f = await fixture(t);
  const original = await readFile(f.state, 'utf8');
  const first = await f.run('prepare', { task: 'Allow admin, preserving member/guest behavior.' });
  const replay = await f.run('prepare', { task: 'Allow admin, preserving member/guest behavior.' });
  assert.equal(first.id, replay.id);
  assert.equal(replay.status, 'prepared');
  await assert.rejects(f.run('prepare', { task: 'Different task' }), /differs/);
  await f.run('attach', { agent_id: 'actual-runtime-id' });
  await f.run('attach', { agent_id: 'actual-runtime-id' });
  await assert.rejects(f.run('attach', { agent_id: 'other-runtime-id' }), /different runtime/);
  assert.equal(await readFile(f.state, 'utf8'), original);
});

test('parent services only bounded informational requests, with replay and tamper protection', async t => {
  const f = await fixture(t); const a = await f.run('prepare', { task: 'Refine' }); await f.run('attach', { agent_id: 'agent-1' });
  const request = { version: 1, assignment_id: a.id, id: 'draft', kind: 'activity', text: 'Drafting the refined spec in the worker.' };
  const file = await f.file('request.json', request);
  const reply = await f.run('service', { request: file });
  const state = parseState(await readFile(f.state, 'utf8'), f.state);
  assert.equal(state.fields.phase, 'close-the-gaps'); assert.equal(state.fields.status, 'In Progress');
  assert.equal(state.fields.current_activity, request.text);
  assert.equal((await f.run('service', { request: file })).reply, reply.reply);
  assert.equal(parseState(await readFile(f.state, 'utf8'), f.state).audit.length, state.audit.length);
  await f.file(file, { ...request, text: 'Changed' });
  await assert.rejects(f.run('service', { request: file }), /reused/);
  for (const kind of ['permission', 'approval', 'publish', 'shell']) {
    await f.file(file, { ...request, id: kind, kind });
    await assert.rejects(f.run('service', { request: file }), /Unsupported worker request/);
  }
  await f.file(file, { ...request, id: 'context', kind: 'context-update', text: 'Update affected local context', reason: 'Spec resolves a discovered local documentation gap.' });
  await f.run('service', { request: file });
  const final = parseState(await readFile(f.state, 'utf8'), f.state);
  assert.match(final.audit.at(-1).outcome, /source: autopilot/);
  assert.equal(final.fields.phase, 'close-the-gaps');
  await f.file(file, { ...request, id: 'spoof', source: 'user' });
  await assert.rejects(f.run('service', { request: file }), /Unknown/);
});

test('stale phases, autonomy, queued choices and changed application scope reject work', async t => {
  for (const [key, value] of [['phase', 'plan'], ['autonomy', 'guided'], ['queued_autonomy', 'guided'], ['plan_version', '2']]) {
    const f = await fixture(t); await f.run('prepare', { task: 'Refine' }); await f.patch(key, value);
    await assert.rejects(f.run('attach', { agent_id: 'agent-1' }), /Stale/);
    await f.run('cancel', { reason: 'Parent reconciled the completed runtime after a changed choice.' });
    assert.equal((await f.run('inspect')).status, 'cancelled');
  }
  const f = await fixture(t); await f.run('prepare', { task: 'Refine' });
  await writeFile(path.join(f.root, 'source.js'), 'module.exports = 2;\n');
  await assert.rejects(f.run('attach', { agent_id: 'agent-1' }), /application files changed/);
});

test('accept preserves v1 handoffs and state; rejects duplicates with changed outputs and newer versions', async t => {
  const f = await fixture(t); await f.handoff(1);
  await f.run('prepare', { task: 'Refine' }); await f.run('attach', { agent_id: 'agent-1' });
  await assert.rejects(f.run('accept', { handoff: 'DEMO-handoffs/gaps-1.json' }), /after dispatch/);
  const result = await f.handoff(2);
  const before = await readFile(f.state, 'utf8');
  await f.run('accept', { handoff: result });
  assert.equal((await f.run('accept', { handoff: result })).replay, true);
  assert.equal(await readFile(f.state, 'utf8'), before);
  await f.file('DEMO-spec.md', '# Changed after return');
  await assert.rejects(f.run('accept', { handoff: result }), /artifact changed/);
});

test('hard stops use unchanged handoffs; wrong stage, Slack delivery, and escaping artifacts fail', async t => {
  const f = await fixture(t); await f.run('prepare', { task: 'Refine' }); await f.run('attach', { agent_id: 'agent-1' });
  const bad = await f.handoff(1, { ticket: 'OTHER' });
  await assert.rejects(f.run('accept', { handoff: bad }));
  const blocked = await f.handoff(2, { status: 'blocked', outcome: undefined, artifacts: undefined, data: undefined, reason: 'Required project skill unavailable.' });
  assert.equal((await f.run('accept', { handoff: blocked })).status, 'blocked');
  const g = await fixture(t);
  const outside = path.join(g.root, 'outside.json'); await writeFile(outside, '{}');
  await g.run('prepare', { task: 'Refine' }); await g.run('attach', { agent_id: 'agent-2' });
  await symlink(outside, path.join(g.directory, 'escape.json'));
  await assert.rejects(g.run('service', { request: 'escape.json' }), /escapes/);
  await assert.rejects(g.run('service', { request: '../../outside.json' }), /escapes/);
});


test('opt-in controller routing requires an accepted result, then preserves normal phase/idempotence', async t => {
  const f = await fixture(t); await f.run('prepare', { task: 'Refine' }); await f.run('attach', { agent_id: 'agent-1' });
  const handoff = await f.handoff();
  const apply = (event, extra = {}) => readFile(f.state, 'utf8').then(markdown => applyWorkflow({ root: f.root, statePath: f.state,
    input: { id: event, event, expected_hash: digest(markdown), repos: [f.root], ...extra } }));
  await assert.rejects(apply('handoff', { handoff: `make-it-work/DEMO/${handoff}` }), /Accept the refinement worker result/);
  await f.run('accept', { handoff });
  await apply('mode', { source: 'assessed', risk: 'low', mode: 'lightweight', rationale: 'One bounded policy change.' });
  const input = { id: 'handoff', event: 'handoff', expected_hash: digest(await readFile(f.state, 'utf8')), repos: [f.root], handoff: `make-it-work/DEMO/${handoff}` };
  const result = await applyWorkflow({ root: f.root, statePath: f.state, input });
  assert.equal(result.fields.phase, 'lightweight');
  const replay = await applyWorkflow({ root: f.root, statePath: f.state, input });
  assert.equal(replay.fields.phase, 'lightweight');
});

test('unknown opt-in versions and actual branch changes cannot silently fall back', async t => {
  const f = await fixture(t); await f.patch('refinement_worker_version', '9');
  await assert.rejects(f.run('inspect'), /Unsupported/);
  const g = await fixture(t); await g.run('prepare', { task: 'Refine' }); g.git('switch', '-qc', 'OTHER');
  await assert.rejects(g.run('attach', { agent_id: 'agent-1' }), /branch, HEAD/);
});


test('parent can request a newer corrected result only before the phase is consumed', async t => {
  const f = await fixture(t); await f.run('prepare', { task: 'Refine' }); await f.run('attach', { agent_id: 'agent-1' });
  await f.run('accept', { handoff: await f.handoff(1) });
  await f.run('revise', { reason: 'Spec omitted the explicit guest-denial criterion.' });
  await assert.rejects(f.run('accept', { handoff: 'DEMO-handoffs/gaps-1.json' }), /after dispatch/);
  await f.run('accept', { handoff: await f.handoff(2) });
  const saved = JSON.parse(await readFile(path.join(f.directory, 'DEMO-refinement-worker.json'), 'utf8'));
  assert.equal(saved.history.length, 1); assert.match(saved.history[0].result.path, /gaps-1.json$/);
  assert.equal(saved.agent_id, 'agent-1');
  await f.patch('phase', 'plan');
  await assert.rejects(f.run('revise', { reason: 'Too late' }), /Stale/);
});


test('local context updates stay in approved scope and are bound after return', async t => {
  const f = await fixture(t); await f.run('prepare', { task: 'Refine' }); await f.run('attach', { agent_id: 'agent-1' });
  await mkdir(path.join(f.root, 'docs')); await writeFile(path.join(f.root, 'docs/domain.md'), '# Updated local fact');
  const handoff = await f.handoff(1, { data: { tbd_items: 0, context_updated: ['docs/domain.md'] } });
  await f.run('accept', { handoff });
  await writeFile(path.join(f.root, 'docs/domain.md'), '# Changed after return');
  await assert.rejects(f.run('accept', { handoff }), /Returned context changed/);
});


test('reconciled cancellation recovers through the existing inline controller path', async t => {
  const f = await fixture(t); await f.run('prepare', { task: 'Refine' }); await f.run('attach', { agent_id: 'fixture-finished-agent' });
  const before = await readFile(f.state, 'utf8');
  await f.run('cancel', { reason: 'Fixture runtime is unavailable; preserve partial work for inline recovery.' });
  assert.equal(await readFile(f.state, 'utf8'), before);
  const apply = async (event, extra = {}) => applyWorkflow({ root: f.root, statePath: f.state,
    input: { id: event, event, expected_hash: digest(await readFile(f.state, 'utf8')), repos: [f.root], ...extra } });
  await apply('mode', { source: 'assessed', risk: 'low', mode: 'lightweight', rationale: 'Bounded local policy change.' });
  const handoff = await f.handoff();
  const result = await apply('handoff', { handoff: `make-it-work/DEMO/${handoff}` });
  assert.equal(result.fields.phase, 'lightweight');
  assert.equal((await f.run('inspect')).status, 'cancelled');
});


test('stale returned work can be cancelled without discarding its receipt or changing workflow state', async t => {
  const f = await fixture(t); await f.run('prepare', { task: 'Refine' }); await f.run('attach', { agent_id: 'finished-agent' });
  await f.run('accept', { handoff: await f.handoff() });
  const journal = path.join(f.directory, 'DEMO-refinement-worker.json');
  const returned = JSON.parse(await readFile(journal, 'utf8'));
  await f.patch('queued_autonomy', 'guided');
  await assert.rejects(f.run('revise', { reason: 'Choice changed' }), /Stale/);
  const state = await readFile(f.state, 'utf8');
  await f.run('cancel', { reason: 'Finished runtime reconciled; queued user choice invalidates the returned result.' });
  const cancelled = JSON.parse(await readFile(journal, 'utf8'));
  assert.equal(cancelled.status, 'cancelled');
  assert.deepEqual(cancelled.result, returned.result);
  assert.deepEqual(cancelled.artifacts, returned.artifacts);
  assert.deepEqual(cancelled.context_artifacts, returned.context_artifacts);
  assert.equal(cancelled.agent_id, returned.agent_id);
  assert.equal(await readFile(f.state, 'utf8'), state);
});
