import { artifactJoin } from '../../../scripts/lib/artifact-path.mjs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { digest } from '../../../scripts/lib/artifacts.mjs';
import { parseState } from './render-status.mjs';
import { checkpointDashboard } from './dashboard-checkpoint.mjs';
import { applyWorkflow, initializeWorkflow, planHash, snapshot, transition } from './workflow.mjs';
import { prematureImplementation } from './implementation-guard.mjs';
import { readReviewBaseline } from './review-baseline.mjs';
import { updateLog } from '../../../scripts/decision-log.mjs';

async function fixture(t, { prefix = 'workflow-controller-', init = {}, dirty = false, beforeInit = async () => {} } = {}) {
  const root = await mkdtemp(artifactJoin(os.tmpdir(), prefix));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = (...argv) => execFileSync('git', ['-C', root, ...argv], { stdio: 'pipe' });
  git('init', '-b', 'main'); git('config', 'user.email', 'test@example.invalid'); git('config', 'user.name', 'Test');
  await writeFile(artifactJoin(root, 'source.txt'), 'baseline'); git('add', '.'); git('commit', '-m', 'baseline'); git('switch', '-c', 'DEMO');
  await mkdir(artifactJoin(root, '.claude/skills/domain-demo'), { recursive: true });
  await mkdir(artifactJoin(root, '.claude/rules'), { recursive: true });
  await writeFile(artifactJoin(root, 'CLAUDE.md'), '# Skill Loading Gate\n');
  await writeFile(artifactJoin(root, '.claude/skills/domain-demo/SKILL.md'), '---\nname: domain-demo\n---\n');
  await writeFile(artifactJoin(root, '.claude/rules/product.md'), '# Product');
  await writeFile(artifactJoin(root, '.claude/rules/architecture.md'), '# Architecture');
  if (dirty) {
    await writeFile(artifactJoin(root, 'source.txt'), 'pre-existing local edit');
    await writeFile(artifactJoin(root, 'local.js'), 'pre-existing untracked file');
  }
  await beforeInit(root);
  const result = await initializeWorkflow(root, { ticket: 'DEMO', autonomy: 'autonomous', base: 'main', repos: [root], branch_guard: 'Existing feature branch', ...init });
  const statePath = result.state;
  let id = 0;
  const apply = async (event, extra = {}) => applyWorkflow({ root, statePath, input: {
    event, id: `e${++id}`, expected_hash: digest(await readFile(statePath, 'utf8')), repos: [root], ...extra,
  } });
  return { root, statePath, apply, result };
}
const fields = (phase, overrides = {}) => ({ fields: { ticket: 'DEMO', phase, status: 'In Progress', autonomy: 'autonomous', plan_version: '1', review_cycle: '1', fix_cycle: '0', replans_used: '0', context_updated: 'none', current_activity: 'Working', ...overrides } });
const review = (outcome, findings) => ({ version: 1, ticket: 'DEMO', plan_version: 1, stage: 'review', review_cycle: 1, status: 'done', outcome, artifacts: { report: 'make-it-work/DEMO/DEMO-review.md' }, data: { findings, context_gaps: [] } });

test('initialization saves independent review provenance and resume never recaptures later notes', async t => {
  const f = await fixture(t, { dirty: true });
  const state = parseState(await readFile(f.statePath, 'utf8'));
  const baseline = readReviewBaseline(state.fields);
  const skill = '.claude/skills/domain-demo/SKILL.md';
  assert.ok(baseline.repos[0].changes.some(entry => entry.file === skill && !entry.tracked));
  const enforcement = JSON.parse(state.fields.implementation_baseline);
  assert.ok(!enforcement.repos[0].changes.some(entry => entry.file === skill));
  await writeFile(artifactJoin(f.root, 'later.md'), 'created after the run started');
  await f.apply('pause', { reason: 'Inspect local scope' });
  const resumed = await f.apply('resume', { blocker_resolved: true });
  assert.equal(resumed.fields.review_baseline, state.fields.review_baseline);
  assert.equal(resumed.fields.implementation_baseline, state.fields.implementation_baseline);
  assert.ok(!resumed.fields.review_baseline.includes('later.md'));
  assert.equal(await prematureImplementation(f.result, parseState(await readFile(f.statePath, 'utf8'))), null, 'notes remain exempt from the application guard');
});

test('corrupt advisory baseline does not block state rendering or pause and resume', async t => {
  const f = await fixture(t);
  const original = await readFile(f.statePath, 'utf8');
  await writeFile(f.statePath, original.replace(/^review_baseline: .*$/m, 'review_baseline: {bad'));
  const saved = parseState(await readFile(f.statePath, 'utf8'));
  assert.equal(saved.fields.review_baseline, '{bad');
  await f.apply('pause', { reason: 'Ordinary user pause' });
  const resumed = await f.apply('resume', { blocker_resolved: true });
  assert.equal(resumed.fields.review_baseline, '{bad', 'do not recapture unknown starting history');
});

test('Autopilot initialization records its verified branch guard without losing prior decisions', async t => {
  const entry = { phase: 'Start', site: 'autonomy-selection', kind: 'checkpoint', chosen: 'autopilot', rationale: 'Selected through the explicit flag.' };
  for (const prior of [[], [entry], [entry, { ...entry, site: 'branch-guard', chosen: 'Existing feature branch' }]]) {
    const f = await fixture(t, { init: { autonomy: 'autopilot' }, beforeInit: async root => {
      if (prior.length) await updateLog({ root, skill: 'implement', ticket: 'DEMO', command: 'write', input: prior });
    } });
    const log = (await readFile(artifactJoin(path.dirname(f.statePath), 'implement-autopilot-log.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line));
    assert.equal(log.filter(item => item.site === 'branch-guard').length, 1);
    assert.equal(log.find(item => item.site === 'branch-guard').chosen, 'Existing feature branch');
    assert.deepEqual(log.slice(0, prior.length), prior);
  }
  const f = await fixture(t);
  await assert.rejects(readFile(artifactJoin(path.dirname(f.statePath), 'implement-autopilot-log.jsonl')), { code: 'ENOENT' });
});

test('fresh runs retain verification decisions only through an explicit user choice', async t => {
  const decision = { decision: 'Manual verification selected; build unavailable', reference: 'Prior run user decision', unverified: ['Endpoint behavior has not been observed'] };
  await assert.rejects(fixture(t, { init: { retained_verification: [decision] } }), /explicit user/);
  const f = await fixture(t, { init: { retained_verification: [decision], source: 'user', via: 'chat' } });
  assert.deepEqual(JSON.parse(f.result.fields.retained_verification), { source: 'user', via: 'chat', decisions: [decision] });
  assert.equal(f.result.fields.ticket_publication, 'none', 'retaining verification never transfers tracker consent');
});

test('an exact approved branch advance clears the guard without absorbing local edits', async t => {
  const f = await fixture(t, { dirty: true });
  const git = (...args) => execFileSync('git', ['-C', f.root, ...args], { stdio: 'pipe' }).toString().trim();
  const from = git('rev-parse', 'HEAD');
  git('switch', '-c', 'approved');
  await writeFile(artifactJoin(f.root, 'upstream.js'), 'export const upstream = true;');
  git('add', 'upstream.js'); git('commit', '-qm', 'Approved upstream change');
  const change = { root: f.root, from_head: from, to_head: git('rev-parse', 'HEAD'), branch: 'approved' };
  const current = async () => parseState(await readFile(f.statePath, 'utf8'));
  assert.match(await prematureImplementation(f.result, await current()), /Application files changed/);
  await f.apply('accept-workspace', { source: 'user', via: 'chat', reason: 'Accept workspace only' });
  assert.match(await prematureImplementation(f.result, await current()), /Application files changed/, 'generic acceptance cannot reset the guard');
  await f.apply('accept-workspace', { source: 'user', via: 'chat', reason: 'Approved exact branch advance', branch_baseline: [change] });
  assert.equal((await current()).fields.branch, 'approved');
  assert.equal(await prematureImplementation(f.result, await current()), null);
  assert.equal(await readFile(artifactJoin(f.root, 'local.js'), 'utf8'), 'pre-existing untracked file');
  assert.equal(await readFile(artifactJoin(f.root, 'source.txt'), 'utf8'), 'pre-existing local edit');
  const acceptedState = await current();
  const receipt = JSON.parse(acceptedState.fields.implementation_baseline);
  for (const corrupted of [{ ...receipt, repos: [] }, { ...receipt, runId: 'another-run' }, { ...receipt, origin_hash: '0'.repeat(64) }]) {
    assert.match(await prematureImplementation(f.result, { ...acceptedState, fields: { ...acceptedState.fields, implementation_baseline: JSON.stringify(corrupted) } }), /binding is invalid/);
  }
  await writeFile(artifactJoin(f.root, 'source.txt'), 'unauthorized edit');
  assert.match(await prematureImplementation(f.result, await current()), /Application files changed/);
});

test('branch baseline acceptance rejects mixed edits and incorrect targets without saving', async t => {
  const f = await fixture(t);
  const git = (...args) => execFileSync('git', ['-C', f.root, ...args], { stdio: 'pipe' }).toString().trim();
  const from = git('rev-parse', 'HEAD');
  await writeFile(artifactJoin(f.root, 'upstream.js'), 'upstream');
  git('add', 'upstream.js'); git('commit', '-qm', 'Advance');
  const change = { root: f.root, from_head: from, to_head: git('rev-parse', 'HEAD'), branch: 'DEMO' };
  const before = await readFile(f.statePath, 'utf8');
  const input = { source: 'user', via: 'chat', reason: 'Approved advance', branch_baseline: [change] };
  await writeFile(artifactJoin(f.root, 'local.js'), 'unapproved');
  await assert.rejects(f.apply('accept-workspace', input), /local application edits/);
  assert.equal(await readFile(f.statePath, 'utf8'), before);
  await rm(artifactJoin(f.root, 'local.js'));
  await writeFile(artifactJoin(f.root, 'source.txt'), 'unapproved tracked change');
  await assert.rejects(f.apply('accept-workspace', input), /local application edits/);
  git('add', 'source.txt');
  await assert.rejects(f.apply('accept-workspace', input), /local application edits/);
  git('restore', '--staged', '--worktree', 'source.txt');
  for (const invalid of [{ ...change, to_head: from }, { ...change, branch: 'other' }, { ...change, from_head: change.to_head }]) {
    await assert.rejects(f.apply('accept-workspace', { ...input, branch_baseline: [invalid] }), /branch baseline/);
    assert.equal(await readFile(f.statePath, 'utf8'), before);
  }
});

test('unsupported late mode downgrade rejects before changing state, dashboard or artifacts', async t => {
  const f = await fixture(t);
  const saved = (await readFile(f.statePath, 'utf8')).replace('phase: context-check', 'phase: execute')
    .replace('status: In Progress', 'status: Stopped').replace('mode: none', 'mode: tdd').replace('mode_source: none', 'mode_source: assessed');
  await writeFile(f.statePath, saved);
  const dashboard = await readFile(f.result.dashboard, 'utf8');
  await assert.rejects(f.apply('mode', { mode: 'lightweight', risk: 'medium', source: 'user', via: 'chat', rationale: 'Review without a build' }), /Cannot switch.*Lightweight/);
  assert.equal(await readFile(f.statePath, 'utf8'), saved);
  assert.equal(await readFile(f.result.dashboard, 'utf8'), dashboard);
  for (const phase of ['plan', 'plan-approval', 'review', 'final-sync', 'final-approval']) {
    assert.throws(() => transition(lightweight(phase, { mode: 'tdd' }), { event: 'mode', mode: 'lightweight', risk: 'medium', source: 'user', via: 'chat', rationale: 'Switch' }), /Cannot switch.*Lightweight/);
  }
});

test('legacy final sync persists context paths, preserves earlier updates and replays without duplicates', async (t) => {
  const { root, statePath, apply } = await fixture(t);
  await writeFile(statePath, (await readFile(statePath, 'utf8')).replace(/^review_scope_version: 1\n/m, '').replace(/^review_context_version: 2\n/m, '').replace('phase: context-check', 'phase: final-sync').replace('review: not-started', 'review: clean').replace('context_updated: none', 'context_updated: .claude/rules/product.md'));
  const input = { event: 'sync-complete', id: 'sync-paths', repos: [root], expected_hash: digest(await readFile(statePath, 'utf8')), context_updated: ['.claude/rules/product.md', '.claude/rules/architecture.md'] };
  const first = await applyWorkflow({ root, statePath, input });
  assert.equal(first.fields.context_updated, '.claude/rules/product.md, .claude/rules/architecture.md');
  assert.equal((await applyWorkflow({ root, statePath, input })).replayed, true);
  assert.equal(parseState(await readFile(statePath, 'utf8')).fields.context_updated, first.fields.context_updated);
  assert.throws(() => transition(fields('final-sync', { review: 'clean' }), { event: 'sync-complete', context_updated: 'docs.md' }), /array/);
  const invalid = await fixture(t);
  const before = await readFile(invalid.statePath, 'utf8');
  await assert.rejects(invalid.apply('sync-complete', { context_updated: [statePath] }), /approved repository/);
  assert.equal(await readFile(invalid.statePath, 'utf8'), before);
  assert.equal(transition(fields('final-sync', { review: 'clean' }), { event: 'sync-complete', context_updated: [] }).fields.context_updated, 'none');
});

test('initializes from the maintained template and never overwrites a run', async (t) => {
  const { root, statePath, result } = await fixture(t);
  assert.equal(result.fields.controller_version, '1');
  assert.equal(result.fields.review_scope_version, '1');
  assert.equal(parseState(await readFile(statePath, 'utf8')).fields.plugin_version, result.fields.plugin_version);
  assert.match(await readFile(result.dashboard, 'utf8'), /DEMO/);
  await assert.rejects(initializeWorkflow(root, { ticket: 'DEMO', autonomy: 'autonomous', base: 'main', repos: [root], branch_guard: 'Existing branch' }), /EEXIST/);
});

test('completion and its replay return the required session-feedback handoff', async (t) => {
  const f = await fixture(t);
  const state = (await readFile(f.statePath, 'utf8')).replace(/^review_scope_version: 1\n/m, '').replace(/^review_context_version: 2\n/m, '')
    .replace(/^final_package_version: 1\n/m, '').replace('phase: context-check', 'phase: final-sync').replace('review: not-started', 'review: clean');
  await writeFile(f.statePath, state);
  const input = { event: 'sync-complete', id: 'legacy-complete-feedback', repos: [f.root], expected_hash: digest(state), context_updated: [] };
  const result = await applyWorkflow({ root: f.root, statePath: f.statePath, input });
  assert.equal(result.fields.status, 'Complete');
  assert.equal(result.next_action.type, 'feedback');
  assert.equal(result.next_action.state, f.statePath);
  assert.equal(result.next_action.runId, result.fields.start_time);
  const replayed = await applyWorkflow({ root: f.root, statePath: f.statePath, input });
  assert.equal(replayed.replayed, true);
  assert.deepEqual(replayed.next_action, result.next_action);
});
test('startup handoff links the created dashboard for all modes and offline pauses, including special path characters', async (t) => {
  for (const autonomy of ['guided', 'autonomous', 'autopilot']) {
    for (const offline_pending of [false, true]) {
      const { result } = await fixture(t, { prefix: 'workflow space #?%-', init: { autonomy, offline_pending } });
      assert.match(await readFile(result.dashboard, 'utf8'), /DEMO/);
      const target = result.startup_message.match(/^\[Open implementation dashboard\]\(<([^>]+)>\)$/)?.[1];
      assert.ok(target, 'The initializer must provide a chat-ready Markdown link');
      assert.equal(decodeURIComponent(target), result.dashboard, 'The link must resolve to the created file, including reserved path characters');
      assert.equal(result.fields.status, offline_pending ? 'Paused' : 'In Progress');
      assert.equal(Object.hasOwn(result.fields, 'startup_message'), false, 'Presentation output must not alter persisted workflow state');
    }
  }
});
test('init CLI prioritizes the startup message in a concise successful handoff', async (t) => {
  const { root } = await fixture(t);
  const inputPath = artifactJoin(root, 'init-cli.json');
  await writeFile(inputPath, JSON.stringify({ ticket: 'CLI', autonomy: 'autonomous', base: 'main', repos: [root], branch_guard: 'Existing branch' }));
  const script = new URL('./workflow.mjs', import.meta.url).pathname;
  const result = JSON.parse(execFileSync(process.execPath, [script, 'init', '--root', root, '--input', inputPath], { encoding: 'utf8' }));
  assert.match(result.startup_message, /^\[Open implementation dashboard\]/);
  assert.equal(result.next_action.type, 'assistant_message');
  assert.equal(result.next_action.text, result.startup_message);
  assert.equal(result.next_action.delivery_status, 'not_sent');
  assert.match(result.next_action.instruction, /standalone assistant response, with no tool calls/);
  assert.match(result.next_action.instruction, /automatically continues Context check without a user reply/);
  assert.equal(result.continuation, 'continue_context_check_without_user_reply');
  assert.equal(result.implementation_baseline[0].root, await realpath(root));
  assert.match(await readFile(result.dashboard, 'utf8'), /CLI/);
  assert.equal(parseState(await readFile(result.state, 'utf8')).fields.autonomy, 'autonomous');
});
test('offline init CLI preserves its genuine answer wait instead of starting Context check', async (t) => {
  const { root } = await fixture(t);
  const inputPath = artifactJoin(root, 'offline-init.json');
  await writeFile(inputPath, JSON.stringify({ ticket: 'OFFLINE', autonomy: 'autonomous', offline_pending: true, base: 'main', repos: [root], branch_guard: 'Existing branch' }));
  const result = JSON.parse(execFileSync(process.execPath, [new URL('./workflow.mjs', import.meta.url).pathname, 'init', '--root', root, '--input', inputPath], { encoding: 'utf8' }));
  assert.equal(result.next_action.type, 'assistant_message');
  assert.equal(result.next_action.text, result.startup_message);
  assert.equal(result.next_action.delivery_status, 'not_sent');
  assert.equal(result.continuation, 'wait_for_offline_answers');
  assert.match(result.startup_message, /Open implementation dashboard/);
  assert.equal(parseState(await readFile(result.state, 'utf8')).fields.status, 'Paused');
});
test('an incomplete draft pauses refinement, survives resume, and advances only after its requirements are resolved', async t => {
  const { root, statePath, apply } = await fixture(t);
  await apply('context-ready');
  const dir = artifactJoin(root, 'make-it-work/DEMO');
  await mkdir(artifactJoin(dir, 'DEMO-handoffs'));
  const spec = 'make-it-work/DEMO/DEMO-spec.md';
  await writeFile(artifactJoin(root, spec), '# Spec\nPayment date only.\nTBD: Sessions table or dashboard?\n');
  const result = n => ({ version: 1, ticket: 'DEMO', plan_version: 1, stage: 'gaps', status: 'done', outcome: 'SPEC_SAVED', artifacts: { spec }, data: { tbd_items: n, context_updated: [] } });
  const handoff = 'make-it-work/DEMO/DEMO-handoffs/gaps-1.json';
  await writeFile(artifactJoin(root, handoff), JSON.stringify(result(1)));
  const paused = await apply('handoff', { handoff });
  assert.equal(paused.fields.status, 'Paused');
  assert.equal(paused.fields.phase, 'close-the-gaps');
  assert.equal(paused.fields.spec, spec);
  assert.notEqual(paused.fields.spec_hash, 'none');
  assert.equal(paused.fields.current_activity, 'none');
  assert.equal(paused.fields.plan, 'none');
  assert.equal(paused.fields.execution, 'not-started');
  assert.match(await readFile(paused.dashboard, 'utf8'), /Draft saved/);
  await assert.rejects(apply('approve', { source: 'user', via: 'chat' }), /Resume/);
  await apply('resume', { blocker_resolved: true });
  await assert.rejects(apply('handoff', { handoff, choice: 'proceed', source: 'user', via: 'chat' }), /not valid/);
  const repeated = await apply('handoff', { handoff });
  assert.equal(repeated.fields.phase, 'close-the-gaps');
  assert.equal(repeated.fields.status, 'Paused');
  await apply('resume', { blocker_resolved: true });
  assert.match(await readFile(artifactJoin(root, spec), 'utf8'), /Payment date only/);
  await writeFile(artifactJoin(root, spec), '# Spec\nPayment date only in the Sessions table.\n');
  const resolved = 'make-it-work/DEMO/DEMO-handoffs/gaps-2.json';
  await writeFile(artifactJoin(root, resolved), JSON.stringify(result(0)));
  await apply('mode', { risk: 'low', mode: 'lightweight', source: 'assessed', rationale: 'Defined display-only scope.' });
  const next = await apply('handoff', { handoff: resolved });
  assert.equal(next.fields.phase, 'lightweight');
  assert.equal(next.fields.status, 'In Progress');
});
test('checkpoint clears activity, increments review once, and preserves unrelated state', async (t) => {
  const { root, statePath, apply } = await fixture(t);
  const ready = await apply('context-ready');
  assert.equal(ready.next_action.phase, 'close-the-gaps');
  assert.match(ready.next_action.instruction, /does not authorize application edits/);
  const dir = artifactJoin(root, 'make-it-work/DEMO');
  await mkdir(artifactJoin(dir, 'DEMO-handoffs'));
  await writeFile(artifactJoin(dir, 'DEMO-spec.md'), '# Spec');
  await writeFile(artifactJoin(dir, 'DEMO-handoffs/gaps-1.json'), JSON.stringify({ version: 1, ticket: 'DEMO', plan_version: 1, stage: 'gaps', status: 'done', outcome: 'SPEC_SAVED', artifacts: { spec: 'make-it-work/DEMO/DEMO-spec.md' }, data: { tbd_items: 0, context_updated: [] } }));
  await checkpointDashboard(statePath, { activity: 'Writing the refined spec.' });
  await apply('mode', { risk: 'medium', mode: 'tdd', source: 'assessed', rationale: 'Touches shared behavior with existing callers.' });
  const next = await apply('handoff', { handoff: 'make-it-work/DEMO/DEMO-handoffs/gaps-1.json' });
  assert.equal(next.fields.phase, 'plan');
  assert.equal(next.fields.current_activity, 'none');
  assert.equal(next.fields.current_activity_updated_at, 'none');
  const html = await readFile(next.dashboard, 'utf8');
  assert.match(html, /Plan is in progress\. No activity details have been reported yet\./);
  assert.doesNotMatch(html.split('<h2>Audit log</h2>')[0], /Writing the refined spec|Last updated:/);
  assert.match(html, /Activity: Writing the refined spec/);
  assert.equal(next.fields.spec_hash, digest('# Spec'));
  assert.equal(parseState(await readFile(statePath, 'utf8')).audit.length, 5);
});
test('status boundaries clear activity and its timestamp; same-phase mode changes preserve both', () => {
  const state = fields('plan', { current_activity: 'Drafting the plan.', current_activity_updated_at: '2026-01-01T10:00:00Z' });
  const mode = transition(state, { event: 'autonomy', mode: 'guided', source: 'user', via: 'chat' });
  assert.equal(mode.fields.current_activity, state.fields.current_activity);
  assert.equal(mode.fields.current_activity_updated_at, state.fields.current_activity_updated_at);
  for (const event of ['pause', 'stop']) {
    const next = transition(state, { event, reason: 'Waiting on a required decision' });
    assert.equal(next.fields.current_activity, 'none');
    assert.equal(next.fields.current_activity_updated_at, 'none');
  }
  const resumed = transition(fields('plan', { ...state.fields, status: 'Paused' }), { event: 'resume', blocker_resolved: true });
  assert.equal(resumed.fields.current_activity, 'none');
  assert.equal(resumed.fields.current_activity_updated_at, 'none');
  const complete = transition(fields('final-approval', { review: 'clean', current_activity_updated_at: '2026-01-01T10:00:00Z' }), { event: 'complete' });
  assert.equal(complete.fields.current_activity_updated_at, 'none');
  assert.equal(complete.fields.current_activity, 'none');
  const legacy = transition(fields('plan'), { event: 'stop', reason: 'Required context missing' });
  assert.ok(!Object.hasOwn(legacy.fields, 'current_activity_updated_at'));
});
test('the latest autonomy request replaces or cancels the queue without changing the active phase policy', () => {
  const start = fields('execute', { autonomy: 'guided' });
  const queued = transition(start, { event: 'autonomy', mode: 'autopilot', source: 'user', via: 'chat' });
  assert.equal(queued.fields.autonomy, 'guided'); assert.equal(queued.fields.queued_autonomy, 'autopilot');
  const replaced = transition(queued, { event: 'autonomy', mode: 'autonomous', source: 'user', via: 'chat' });
  assert.equal(replaced.fields.queued_autonomy, 'autonomous'); assert.match(replaced.reason, /replaces queued autopilot/);
  const cancelled = transition(replaced, { event: 'autonomy', mode: 'guided', source: 'user', via: 'chat' });
  assert.equal(cancelled.fields.queued_autonomy, 'none'); assert.match(cancelled.reason, /queue cancelled/);
  const stopped = transition(queued, { event: 'stop', reason: 'Required fact missing.' });
  assert.equal(stopped.fields.autonomy, 'guided'); assert.equal(stopped.fields.queued_autonomy, 'autopilot');
});
test('a queued Guided mode controls the next approval gate but cannot remove the current phase human decision', () => {
  const start = fields('close-the-gaps', { autonomy: 'autonomous', queued_autonomy: 'guided' });
  const gaps = { version: 1, ticket: 'DEMO', plan_version: 1, stage: 'gaps', status: 'done', outcome: 'SPEC_SAVED', artifacts: { spec: 'make-it-work/DEMO/DEMO-spec.md' }, data: { tbd_items: 0, context_updated: [] } };
  const next = transition(start, { event: 'handoff' }, gaps);
  assert.equal(next.fields.phase, 'spec-approval'); assert.equal(next.fields.autonomy, 'guided'); assert.equal(next.fields.queued_autonomy, 'none');
  const unresolved = transition(fields('close-the-gaps', { autonomy: 'guided', queued_autonomy: 'autopilot' }), { event: 'handoff' }, { ...gaps, data: { ...gaps.data, tbd_items: 1 } });
  assert.equal(unresolved.fields.status, 'Paused'); assert.equal(unresolved.fields.phase, 'close-the-gaps'); assert.equal(unresolved.fields.autonomy, 'guided'); assert.equal(unresolved.fields.queued_autonomy, 'autopilot');
});
test('completion drops a queued change without relabeling the mode that validated the final package', () => {
  const result = transition(fields('final-approval', { autonomy: 'autopilot', queued_autonomy: 'guided', review: 'clean' }), { event: 'complete' });
  assert.equal(result.fields.status, 'Complete'); assert.equal(result.fields.autonomy, 'autopilot'); assert.equal(result.fields.queued_autonomy, 'none');
  assert.match(result.autonomyNote, /no remaining phase/);
  assert.throws(() => transition(result, { event: 'autonomy', mode: 'guided', source: 'user', via: 'chat' }), /no remaining phase/);
});
test('queued mode determines plan approval at the boundary in both directions', () => {
  const plan = { version: 1, ticket: 'DEMO', plan_version: 1, stage: 'plan', status: 'done', outcome: 'PLAN_SAVED',
    artifacts: { plan: 'make-it-work/DEMO/DEMO-plan.md' }, data: { mode: 'initial', steps_added: null, recommend_replan: null, context_updated: [] } };
  for (const [active, queued, phase] of [['autopilot', 'guided', 'plan-approval'], ['guided', 'autopilot', 'execute']]) {
    const next = transition(fields('plan', { autonomy: active, queued_autonomy: queued }), { event: 'handoff' }, plan);
    assert.equal(next.fields.phase, phase); assert.equal(next.fields.autonomy, queued); assert.equal(next.fields.queued_autonomy, 'none');
  }
});
test('render failure leaves durable event; retry refreshes without counting twice', async (t) => {
  const { root, statePath } = await fixture(t);
  const input = { event: 'context-ready', id: 'once', repos: [root], expected_hash: digest(await readFile(statePath, 'utf8')) };
  await assert.rejects(applyWorkflow({ root, statePath, input, render: async () => { throw new Error('renderer failed'); } }), /renderer failed/);
  assert.equal(parseState(await readFile(statePath, 'utf8')).fields.phase, 'close-the-gaps');
  assert.equal((await applyWorkflow({ root, statePath, input })).replayed, true);
  assert.equal(parseState(await readFile(statePath, 'utf8')).audit.length, 2);
  await assert.rejects(applyWorkflow({ root, statePath, input: { ...input, event: 'stop', reason: 'different' } }), /different event/);
});
test('optimistic concurrency and resume reject changed workspace including renamed untracked files', async (t) => {
  const { root, statePath, apply } = await fixture(t);
  await assert.rejects(apply('context-ready', { expected_hash: 'stale' }), /state changed/);
  await writeFile(artifactJoin(root, 'new.txt'), 'same bytes');
  const a = await snapshot([root]); await rename(artifactJoin(root, 'new.txt'), artifactJoin(root, 'renamed.txt'));
  assert.notEqual((await snapshot([root]))[0].fingerprint, a[0].fingerprint);
  await assert.rejects(apply('resume'), /Workspace changed/);
  assert.equal(parseState(await readFile(statePath, 'utf8')).audit.length, 1);
});
test('replans reset counters and enforce limits; zero-step fixes do not consume a round', () => {
  const replan = review('REPLAN_REQUIRED', [{ id: '#1', route: 'replan', region: 'src/run:run', introduced_by_fix_of: null }]);
  const next = transition(fields('review', { fix_cycle: '2', review_cycle: '1' }), { event: 'handoff' }, replan);
  assert.equal(next.fields.plan_version, '2'); assert.equal(next.fields.replans_used, '1'); assert.equal(next.fields.review_cycle, '0'); assert.equal(next.fields.fix_cycle, '0');
  const limited = transition(fields('review', { replans_used: '2' }), { event: 'handoff' }, replan);
  assert.equal(limited.fields.status, 'Stopped');
  const amend = { version: 1, ticket: 'DEMO', plan_version: 1, stage: 'plan', status: 'done', outcome: 'FIX_PLAN_READY', artifacts: { plan: 'make-it-work/DEMO/DEMO-plan.md' }, data: { mode: 'amend', steps_added: 0, recommend_replan: null, context_updated: [] } };
  const zero = transition(fields('fix-plan'), { event: 'handoff' }, amend);
  assert.equal(zero.fields.fix_cycle, '0'); assert.equal(zero.fields.review_cycle, '2');
  assert.throws(() => transition(fields('fix-plan', { fix_cycle: '3' }), { event: 'handoff' }, { ...amend, data: { ...amend.data, steps_added: 1 } }), /limit/);
});
test('approvals cannot be inferred, pending routes do not mutate, and completion cannot skip package check', async (t) => {
  assert.throws(() => transition(fields('plan-approval', { autonomy: 'guided' }), { event: 'skip-approval' }), /cannot be skipped/);
  assert.throws(() => transition(fields('plan-approval'), { event: 'approve' }), /explicit user/);
  assert.equal(transition(fields('plan-approval'), { event: 'approve', source: 'user', via: 'chat' }).fields.phase, 'execute');
  const human = review('HUMAN_DECISION', [{ id: '#1', route: 'human', region: 'src/run:run', introduced_by_fix_of: null }]);
  assert.equal(transition(fields('review'), { event: 'handoff' }, human).pending.action, 'ask');
  const { apply } = await fixture(t);
  await assert.rejects(apply('complete'), /final approval/);
});
test('plan content hash excludes only Execution Status', () => {
  const first = '# Plan\n\n## Execution Status\n\nProgress 0\n\n## Steps\nStep 1';
  assert.equal(planHash(first), planHash(first.replace('Progress 0', 'Progress 1')));
  assert.notEqual(planHash(first), planHash(first.replace('Step 1', 'Step 2')));
});
test('mode changes preserve artifact fingerprints even when a spec changed; normal resume catches that drift', async (t) => {
  const { root, statePath, apply } = await fixture(t);
  const spec = artifactJoin(root, 'make-it-work/DEMO/DEMO-spec.md'); await writeFile(spec, 'Original spec');
  await apply('mode', { risk: 'medium', mode: 'tdd', source: 'assessed', rationale: 'Touches shared behavior with existing callers.' });
  await apply('context-ready', { reuse_spec: true, spec: 'make-it-work/DEMO/DEMO-spec.md', source: 'user', via: 'chat' });
  const previous = parseState(await readFile(statePath, 'utf8')).fields;
  await writeFile(spec, 'Changed spec');
  const changed = await apply('autonomy', { mode: 'guided', source: 'user', via: 'chat' });
  assert.equal(changed.fields.spec_hash, previous.spec_hash); assert.equal(changed.fields.workspace_snapshot, previous.workspace_snapshot);
  await assert.rejects(apply('resume'), /spec changed/);
});
test('queued requests survive render failure and replay, then apply once at a real phase boundary', async (t) => {
  const { root, statePath, apply } = await fixture(t);
  const request = { event: 'autonomy', id: 'queue-guided', expected_hash: digest(await readFile(statePath, 'utf8')), mode: 'guided', source: 'user', via: 'chat' };
  await assert.rejects(applyWorkflow({ root, statePath, input: request, render: async () => { throw new Error('render failed'); } }), /render failed/);
  const saved = parseState(await readFile(statePath, 'utf8'));
  assert.equal(saved.fields.autonomy, 'autonomous'); assert.equal(saved.fields.queued_autonomy, 'guided');
  const replay = await applyWorkflow({ root, statePath, input: request });
  assert.equal(replay.replayed, true);
  assert.equal(parseState(await readFile(statePath, 'utf8')).audit.length, saved.audit.length);
  assert.match(await readFile(replay.dashboard, 'utf8'), /Control: Autonomous · guided queued/);
  const next = await apply('context-ready');
  assert.equal(next.fields.phase, 'close-the-gaps'); assert.equal(next.fields.autonomy, 'guided'); assert.equal(next.fields.queued_autonomy, 'none');
  assert.match(parseState(await readFile(statePath, 'utf8')).audit.at(-1).outcome, /Autonomy applied at phase boundary/);
});
test('the controller retains the existing handoff boundary requiring testing policy before execution', async (t) => {
  const { root, statePath, apply } = await fixture(t);
  await writeFile(artifactJoin(root, 'make-it-work/DEMO/DEMO-spec.md'), '# Spec');
  await apply('mode', { risk: 'medium', mode: 'tdd', source: 'assessed', rationale: 'Touches shared behavior with existing callers.' });
  await apply('context-ready', { reuse_spec: true, spec: 'make-it-work/DEMO/DEMO-spec.md', source: 'user', via: 'chat' });
  const directory = artifactJoin(root, 'make-it-work/DEMO/DEMO-handoffs'); await mkdir(directory);
  await writeFile(artifactJoin(root, 'make-it-work/DEMO/DEMO-plan.md'), '# Plan without readiness policy\n\n**Test coverage contract:** 1\n\n## Regression Impact\n\n| Changed code | Domain | UC / behavior | Decision | Reason / evidence | Test scenarios |\n| --- | --- | --- | --- | --- | --- |\n| src/new.js | new | New flow | Excluded | Independent new code | None |\n\n## Test Plan\n\n| Scenario | Purpose | Type | File / command |\n| --- | --- | --- | --- |\n| Save | Progression | Unit | test.js |\n\n**AC traceability:**\n\n| Acceptance criterion | Requirement clause | Test scenario |\n| --- | --- | --- |\n| AC1 | Save record | Save |\n');
  await writeFile(artifactJoin(directory, 'plan-1.json'), JSON.stringify({ version: 1, ticket: 'DEMO', plan_version: 1, stage: 'plan', status: 'done', outcome: 'PLAN_SAVED', artifacts: { plan: 'make-it-work/DEMO/DEMO-plan.md' }, data: { mode: 'initial', steps_added: null, recommend_replan: null, context_updated: [] } }));
  const before = await readFile(statePath, 'utf8');
  await assert.rejects(apply('handoff', { handoff: 'make-it-work/DEMO/DEMO-handoffs/plan-1.json' }), /Verification Policy/);
  assert.equal(await readFile(statePath, 'utf8'), before);
});
const lightweight = (phase, overrides = {}) => fields(phase, { adaptive_version: '1', risk: 'low', mode: 'lightweight', mode_source: 'assessed', risk_rationale: 'One small helper.', escalations: '0', implementation_report: 'none', review: 'not-started', fix_plan_round_steps: 'none', fix_plan_dispatch: 'none', ...overrides });
const gapsDone = { version: 1, ticket: 'DEMO', plan_version: 1, stage: 'gaps', status: 'done', outcome: 'SPEC_SAVED', artifacts: { spec: 'make-it-work/DEMO/DEMO-spec.md' }, data: { tbd_items: 0, context_updated: [] } };
test('adaptive runs record the assessed mode and route spec acceptance by it', () => {
  const unassessed = lightweight('close-the-gaps', { risk: 'none', mode: 'none', mode_source: 'none', risk_rationale: 'none' });
  assert.throws(() => transition(unassessed, { event: 'handoff' }, gapsDone), /Risk assessment required/);
  assert.throws(() => transition(unassessed, { event: 'mode', risk: 'low', mode: 'tdd', source: 'assessed', rationale: 'x' }), /follow its risk/);
  const assessed = transition(unassessed, { event: 'mode', risk: 'low', mode: 'lightweight', source: 'assessed', rationale: 'One small helper.' });
  assert.equal(assessed.fields.phase, 'close-the-gaps');
  assert.match(assessed.reason, /^Implementation mode: lightweight \(low risk, assessed\)/);
  assert.equal(transition({ fields: assessed.fields }, { event: 'handoff' }, gapsDone).fields.phase, 'lightweight');
  const guided = transition(lightweight('spec-approval', { autonomy: 'guided' }), { event: 'approve', source: 'user', via: 'question' });
  assert.equal(guided.fields.phase, 'lightweight');
  const forced = transition(lightweight('spec-approval', { autonomy: 'guided' }), { event: 'mode', risk: 'low', mode: 'tdd', source: 'user', via: 'question', rationale: 'User chose TDD at spec approval.' });
  assert.equal(forced.fields.mode, 'tdd'); assert.equal(forced.fields.mode_source, 'user');
  assert.equal(transition({ fields: forced.fields }, { event: 'approve', source: 'user', via: 'question' }).fields.phase, 'plan');
  assert.throws(() => transition(lightweight('review', { mode: 'tdd', risk: 'medium' }), { event: 'mode', risk: 'low', mode: 'lightweight', source: 'assessed', rationale: 'x' }), /Only the user/);
  assert.throws(() => transition(lightweight('review'), { event: 'mode', risk: 'high', mode: 'tdd', source: 'assessed', rationale: 'x' }), /Use escalate/);
});
test('Lightweight implementation, direct fixes and escalation are controller-owned', () => {
  const implemented = { version: 1, ticket: 'DEMO', plan_version: 1, stage: 'implement', status: 'done', outcome: 'IMPLEMENTED', artifacts: { report: 'make-it-work/DEMO/DEMO-lightweight.md' }, data: { changed_paths: ['src/a.js'], checks: [], discoveries: [], risk_signal: null } };
  const toReview = transition(lightweight('lightweight', { review_cycle: '0' }), { event: 'handoff' }, implemented);
  assert.equal(toReview.fields.phase, 'review'); assert.equal(toReview.fields.review_cycle, '1');
  assert.equal(toReview.fields.implementation_report, 'make-it-work/DEMO/DEMO-lightweight.md');
  const fix = review('FIX_REQUIRED', [{ id: '#1', route: 'fix', region: 'src/a.js:run', introduced_by_fix_of: null }]);
  const fixing = transition(lightweight('review', { implementation_report: 'make-it-work/DEMO/DEMO-lightweight.md' }), { event: 'handoff' }, fix);
  assert.equal(fixing.fields.phase, 'lightweight'); assert.equal(fixing.fields.fix_cycle, '1');
  const repeat = { ...review('FIX_REQUIRED', [{ id: '#2', route: 'fix', region: 'src/a.js:run', introduced_by_fix_of: '#1' }]), review_cycle: 2 };
  const escalated = transition(lightweight('review', { review_cycle: '2', fix_cycle: '1', replans_used: '0' }), { event: 'handoff', risk: 'medium' }, repeat);
  assert.equal(escalated.fields.phase, 'plan'); assert.equal(escalated.fields.mode, 'tdd'); assert.equal(escalated.fields.escalations, '1');
  assert.equal(escalated.fields.review_cycle, '0'); assert.equal(escalated.fields.fix_cycle, '0'); assert.equal(escalated.fields.risk, 'medium');
  assert.equal(escalated.fields.replans_used, '0'); assert.equal(escalated.fields.plan_version, '1');
  assert.match(escalated.reason, /^Escalation: /);
  assert.throws(() => transition({ fields: escalated.fields }, { event: 'escalate', reason: 'again' }), /no prior escalation/);
  const manual = transition(lightweight('final-approval'), { event: 'escalate', reason: 'The requested change alters the approach.', source: 'user', via: 'chat' });
  assert.equal(manual.fields.phase, 'plan'); assert.equal(manual.reason, 'Escalation: The requested change alters the approach.');
  const change = transition(lightweight('final-approval'), { event: 'lightweight-fix', reason: 'Rename the helper.', source: 'user', via: 'question' });
  assert.equal(change.fields.phase, 'lightweight'); assert.equal(change.fields.fix_cycle, '1');
  assert.throws(() => transition(lightweight('final-approval', { fix_cycle: '3' }), { event: 'lightweight-fix', reason: 'x', source: 'user', via: 'chat' }), /limit/);
  assert.throws(() => transition(lightweight('final-approval', { mode: 'tdd' }), { event: 'lightweight-fix', reason: 'x', source: 'user', via: 'chat' }), /Lightweight change request/);
});


test('spec conflicts invalidate dependent evidence and require explicit resolution in every autonomy mode', () => {
  for (const autonomy of ['guided', 'autonomous', 'autopilot']) {
    const old = fields('review', { autonomy, spec: 'make-it-work/DEMO/DEMO-spec.md', plan: 'make-it-work/DEMO/DEMO-plan.md',
      plan_hash: 'old', execution: 'passed', review: 'clean', execute_report: 'old-execute.md', testing_readiness: 'old-readiness.md' });
    const result = transition(old, { event: 'spec-conflict', reason: 'AC1 requires parity; provider.js:4 contradicts it; confirm intended error behavior.' });
    assert.equal(result.fields.phase, 'close-the-gaps');
    assert.equal(result.fields.status, 'Paused');
    assert.equal(result.fields.spec, old.fields.spec);
    assert.equal(result.fields.spec_previous_plan, old.fields.plan);
    assert.equal(result.fields.plan, 'none');
    assert.equal(result.fields.plan_hash, 'none');
    assert.equal(result.fields.plan_version, '2');
    assert.equal(result.fields.replans_used, '0');
    for (const key of ['execute_report', 'testing_readiness', 'execution_mode']) assert.equal(result.fields[key], 'none');
    for (const key of ['execution', 'review']) assert.equal(result.fields[key], 'not-started');
    assert.throws(() => transition(result, { event: 'resume', blocker_resolved: true }), /explicit user/);
    assert.throws(() => transition(result, { event: 'complete' }), /Resume/);
    const resumed = transition(result, { event: 'resume', blocker_resolved: true, source: 'user', via: 'chat' });
    const refined = transition(resumed, { event: 'handoff' }, { version: 1, ticket: 'DEMO', plan_version: 2, stage: 'gaps', status: 'done', outcome: 'SPEC_SAVED', artifacts: { spec: old.fields.spec }, data: { tbd_items: 0, context_updated: [] } });
    assert.equal(refined.fields.phase, 'spec-approval');
    assert.throws(() => transition(refined, { event: 'skip-approval' }), /cannot be skipped/);
    assert.throws(() => transition(refined, { event: 'approve', source: 'policy' }), /explicit user/);
    const approved = transition(refined, { event: 'approve', source: 'user', via: 'chat' });
    assert.equal(approved.fields.spec_revision_pending, 'false');
    assert.equal(approved.fields.phase, 'plan');
  }
  const initial = transition(fields('plan', { plan: 'none' }), { event: 'spec-conflict', reason: 'AC2 conflicts with the vendor contract.' });
  assert.equal(initial.fields.plan_version, '1');
  assert.throws(() => transition(fields('complete', { status: 'Complete' }), { event: 'spec-conflict', reason: 'Late finding' }), /active dependent work/);
});

test('spec conflict persists an approval wait that Autopilot cannot skip', async (t) => {
  const { root, statePath, apply } = await fixture(t, { init: { autonomy: 'autopilot' } });
  const spec = 'make-it-work/DEMO/DEMO-spec.md';
  await writeFile(artifactJoin(root, spec), '# Accepted spec\nAC1: preserve error parity.\n');
  await apply('mode', { mode: 'tdd', risk: 'medium', source: 'assessed', rationale: 'Requirements affect error parity.' });
  await apply('context-ready', { reuse_spec: true, spec, source: 'user', via: 'chat' });
  const conflict = await apply('spec-conflict', { reason: 'AC1 versus provider.js:4; confirm parity. Snapshot: DEMO-spec-before-conflict-v1.md.' });
  assert.equal(conflict.fields.status, 'Paused');
  await assert.rejects(apply('resume', { blocker_resolved: true }), /explicit user/);
  await apply('resume', { blocker_resolved: true, source: 'user', via: 'chat' });
  // Refinement records the user's decision in the accepted spec before returning.
  await writeFile(artifactJoin(root, spec), '# Revised spec\nAC1: preserve error parity.\nDecision Log: User confirmed parity; correct the implementation approach.\n');
  const handoff = 'make-it-work/DEMO/DEMO-handoffs/gaps-1.json';
  await mkdir(path.dirname(artifactJoin(root, handoff)), { recursive: true });
  await writeFile(artifactJoin(root, handoff), JSON.stringify({ version: 1, ticket: 'DEMO', plan_version: 1, stage: 'gaps', status: 'done', outcome: 'SPEC_SAVED', artifacts: { spec }, data: { tbd_items: 0, context_updated: [] } }));
  const waiting = await apply('handoff', { handoff });
  assert.equal(waiting.fields.phase, 'spec-approval');
  assert.equal(waiting.fields.status, 'Paused');
  await assert.rejects(apply('skip-approval'), /Resume|required|pending|approval/i);
  const pending = JSON.parse(waiting.fields.pending_inputs).find((record) => record.blocking);
  const accepted = await apply('resolve-input', { pending_id: pending.id, answer: 'approve', source: 'user', via: 'chat' });
  assert.equal(accepted.fields.phase, 'plan');
  assert.equal(accepted.fields.spec_revision_pending, 'false');
  assert.match(await readFile(statePath, 'utf8'), /Spec conflict: AC1/);
});

test('a fresh controller rejects a scenario-only plan without advancing state', async (t) => {
  const { root, statePath, apply } = await fixture(t);
  await writeFile(artifactJoin(root, 'make-it-work/DEMO/DEMO-spec.md'), '# Spec');
  await apply('mode', { risk: 'medium', mode: 'tdd', source: 'assessed', rationale: 'Touches shared behavior.' });
  await apply('context-ready', { reuse_spec: true, spec: 'make-it-work/DEMO/DEMO-spec.md', source: 'user', via: 'chat' });
  const dir = artifactJoin(root, 'make-it-work/DEMO/DEMO-handoffs'); await mkdir(dir);
  await writeFile(artifactJoin(root, 'make-it-work/DEMO/DEMO-plan.md'), '# Plan\n\n**Test coverage contract:** 1\n\n## Regression Impact\n\n| Changed code | Domain | UC / behavior | Decision | Reason / evidence | Test scenarios |\n| --- | --- | --- | --- | --- | --- |\n| src/new.js | new | New flow | Excluded | Independent new code | None |\n\n## Test Plan\n\n| Scenario | Purpose | Type | File / command |\n| --- | --- | --- | --- |\n| Save | Progression | Unit | test.js |\n\n**AC traceability:**\n\n| Acceptance criterion | Test scenario |\n| --- | --- |\n| AC1 | Total passes |\n');
  await writeFile(artifactJoin(dir, 'plan-1.json'), JSON.stringify({ version: 1, ticket: 'DEMO', plan_version: 1, stage: 'plan', status: 'done', outcome: 'PLAN_SAVED', artifacts: { plan: 'make-it-work/DEMO/DEMO-plan.md' }, data: { mode: 'initial', steps_added: null, recommend_replan: null, context_updated: [] } }));
  const before = await readFile(statePath, 'utf8');
  assert.equal(parseState(before).fields.acceptance_evidence_version, '1');
  await assert.rejects(apply('handoff', { handoff: 'make-it-work/DEMO/DEMO-handoffs/plan-1.json' }), /Requirement clause column/);
  assert.equal(await readFile(statePath, 'utf8'), before);
});

test('execution-mode records the plan and controller decision together and rejects policy overrides', async t => {
  const f = await fixture(t);
  const planPath = artifactJoin(f.root, 'make-it-work/DEMO/DEMO-plan.md');
  await writeFile(planPath, '# Plan\n\n## Execution Status\n\n**Mode:** Not yet chosen\n- **Subagent-Driven** — fresh agent.\n- **Inline** — here.\n\n**Progress:** Step 0 of 1 complete.\n\n## Steps\n\n### Step 1 — Change\n\n**Verify:** Check.\n');
  await writeFile(f.statePath, (await readFile(f.statePath, 'utf8')).replace('phase: context-check', 'phase: execute').replace('plan: none', 'plan: make-it-work/DEMO/DEMO-plan.md'));
  const result = await f.apply('execution-mode', { mode: 'inline', pause_mode: 'run-straight-through', source: 'user', via: 'chat' });
  assert.equal(result.fields.execution_mode, 'inline');
  assert.equal(result.fields.inline_pause_mode, 'run-straight-through');
  assert.match(await readFile(planPath, 'utf8'), /Inline pause mode:\*\* Run straight through/);
  assert.match(parseState(await readFile(f.statePath, 'utf8')).audit.at(-1).outcome, /Decision: Execution mode inline/);
  await assert.rejects(f.apply('execution-mode', { mode: 'subagent-driven', source: 'policy', via: 'policy' }), /already chosen/);
  assert.throws(() => transition(fields('execute', { autonomy: 'guided' }), { event: 'execution-mode', mode: 'subagent-driven', source: 'policy', via: 'policy' }), /recommended autonomous/);
  assert.throws(() => transition(fields('execute'), { event: 'execution-mode', mode: 'inline', pause_mode: 'run-straight-through', source: 'policy', via: 'policy' }), /recommended autonomous/);
});

test('mode and handoff reject omitted roots without mutation and accept the same event with explicit roots', async t => {
  const f = await fixture(t);
  await f.apply('context-ready');
  const directory = artifactJoin(f.root, 'make-it-work/DEMO');
  await mkdir(artifactJoin(directory, 'DEMO-handoffs'));
  await writeFile(artifactJoin(directory, 'DEMO-spec.md'), '# Spec');
  await writeFile(artifactJoin(directory, 'DEMO-handoffs/gaps-1.json'), JSON.stringify({ version: 1, ticket: 'DEMO', plan_version: 1, stage: 'gaps', status: 'done', outcome: 'SPEC_SAVED', artifacts: { spec: 'make-it-work/DEMO/DEMO-spec.md' }, data: { tbd_items: 0, context_updated: [] } }));
  for (const payload of [
    { event: 'mode', risk: 'low', mode: 'lightweight', source: 'assessed', rationale: 'Bounded change.' },
    { event: 'handoff', handoff: 'make-it-work/DEMO/DEMO-handoffs/gaps-1.json' },
  ]) {
    const before = await readFile(f.statePath, 'utf8');
    const dashboard = await readFile(f.result.dashboard, 'utf8');
    const input = { ...payload, id: `explicit-roots-${payload.event}`, expected_hash: digest(before) };
    await assert.rejects(applyWorkflow({ root: f.root, statePath: f.statePath, input }), error => {
      assert.ok(error.message.includes(`Event "${payload.event}"`));
      assert.match(error.message, /requires explicit repos/);
      assert.match(error.message, /single-repository/);
      return true;
    });
    assert.equal(await readFile(f.statePath, 'utf8'), before);
    assert.equal(await readFile(f.result.dashboard, 'utf8'), dashboard);
    const result = await applyWorkflow({ root: f.root, statePath: f.statePath, input: { ...input, repos: [f.root] } });
    assert.equal(result.fields.mode, 'lightweight');
    assert.equal(result.fields.phase, payload.event === 'mode' ? 'close-the-gaps' : 'lightweight');
  }
});

test('stop and pause inherit exactly the saved repository roots without relaxing ordinary transitions', async t => {
  const f = await fixture(t);
  const event = async (name, id) => applyWorkflow({ root: f.root, statePath: f.statePath, input: {
    event: name, id, reason: 'Context unavailable', expected_hash: digest(await readFile(f.statePath, 'utf8')),
  } });
  const paused = await event('pause', 'pause-saved-roots');
  assert.equal(paused.fields.status, 'Paused');
  assert.equal(JSON.parse(paused.fields.workspace_snapshot).length, 1);
  assert.equal(JSON.parse(paused.fields.workspace_snapshot)[0].root, await realpath(f.root));
  const stopped = await event('stop', 'stop-saved-roots');
  assert.equal(stopped.fields.status, 'Stopped');
  assert.equal(stopped.fields.phase, 'context-check');
  await assert.rejects(event('resume', 'resume-no-roots'), /Resume requires repository/);
});

for (const context of ['absent', 'partial', 'complete', 'unreadable']) {
  test(`context-ready handles ${context} go-deep context without changing inventory semantics`, async (t) => {
    const { root, statePath, apply } = await fixture(t);
    if (context === 'absent') {
      await rm(artifactJoin(root, '.claude'), { recursive: true });
      await rm(artifactJoin(root, 'CLAUDE.md'));
    } else if (context === 'partial') {
      await rm(artifactJoin(root, '.claude/rules/product.md'));
    } else if (context === 'unreadable') {
      await rm(artifactJoin(root, 'CLAUDE.md'));
      await mkdir(artifactJoin(root, 'CLAUDE.md'));
    }
    const before = await readFile(statePath, 'utf8');
    if (context === 'unreadable') {
      await assert.rejects(apply('context-ready'), /Not a regular context file/);
      assert.equal(await readFile(statePath, 'utf8'), before);
      return;
    }
    assert.equal((await apply('context-ready')).fields.phase, 'close-the-gaps');
    const saved = await readFile(statePath, 'utf8');
    if (context === 'complete') assert.doesNotMatch(saved, /Context discovery required/);
    else {
      assert.match(saved, /Context discovery required/);
      assert.match(saved, /product.md/);
      assert.match(saved, /unresolved essential facts remain blockers/);
    }
  });
}

test('Guided plan approval starts preparation, never implementation or test edits', () => {
  const result = transition(fields('plan-approval', { test_writing_version: '1', test_preparation: 'none', test_preparation_report: 'none' }), { event: 'approve', source: 'user', via: 'chat' });
  assert.equal(result.fields.phase, 'write-tests');
  assert.equal(result.fields.execution, undefined);
  assert.equal(transition(fields('plan-approval'), { event: 'approve', source: 'user', via: 'chat' }).fields.phase, 'execute');
});

test('actual controller accepts current preparation, renders its report, and enters execution once', async t => {
  const { recordPreparation } = await import('../../write-the-tests/scripts/preparation.mjs');
  const f = await fixture(t, { beforeInit: async root => {
    await mkdir(artifactJoin(root, 'test'));
    await writeFile(artifactJoin(root, 'test/change.test.js'), '// existing assertions\n');
  } });
  // This legacy-format fixture isolates preparation routing from readiness, coverage and clause-ledger tests.
  await writeFile(f.statePath, (await readFile(f.statePath, 'utf8')).replace('compaction_checkpoint: pending', 'compaction_checkpoint: declined').replace('phase: context-check', 'phase: plan').replace('mode: none', 'mode: tdd').replace('mode_source: none', 'mode_source: assessed').replace(/^testing_readiness(?:_version)?:.*\n/gm, '').replace(/^acceptance_evidence_version:.*\n/m, '').replace(/^test_coverage_version:.*\n/m, ''));
  const directory = path.dirname(f.statePath), planPath = artifactJoin(directory, 'DEMO-plan.md');
  const plan = '# Plan\n\n**Test preparation contract:** 1\n\n## Execution Status\n\n**Mode:** Subagent-Driven\n\n**Progress:** Step 0 of 1 complete\n\n## Steps\n\n### Step 1 — Change\n\n**Files:** `source.txt`\n\n**Depends on:** none\n\n**Can run in parallel with:** none\n\n**Verify:** tests pass\n\n**Tests:** app: `test/change.test.js`, node --test\n\n## Test Plan\n\n| Scenario | Repo | Type | File / command |\n| --- | --- | --- | --- |\n| New behavior | app | Unit | step 1 |\n';
  await writeFile(planPath, plan);
  const handoffs = artifactJoin(directory, 'DEMO-handoffs'); await mkdir(handoffs);
  const planHandoff = artifactJoin(handoffs, 'plan-1.json');
  await writeFile(planHandoff, JSON.stringify({ version: 1, ticket: 'DEMO', stage: 'plan', status: 'done', plan_version: 1, outcome: 'PLAN_SAVED', artifacts: { plan: path.relative(await realpath(f.root), planPath) }, data: { mode: 'initial', steps_added: null, recommend_replan: null, context_updated: [] } }));
  assert.equal((await f.apply('handoff', { handoff: path.relative(await realpath(f.root), planHandoff) })).fields.phase, 'write-tests');
  const saved = await recordPreparation(planPath, { version: 1, plan_hash: planHash(plan), status: 'ready', entries: [{ scenario: 'New behavior', step: 1, repo: 'app', cwd: f.root, file: 'test/change.test.js', command: 'node --test test/change.test.js', kind: 'progression', result: 'expected-red', reason: 'Missing behavior', evidence: 'Fixture assertion evidence' }] });
  await f.apply('preparation-saved', { preparation: path.relative(await realpath(f.root), saved.file) });
  const html = await readFile(f.result.dashboard, 'utf8');
  assert.match(html, /Test Preparation/);
  assert.doesNotMatch(html, /class="test-preparation"|expected-red/);
  assert.match(html, /Test preparation ready · <a[^>]+>View preparation report<\/a>/);
  const preview = await readFile(`${saved.report}.preview.html`, 'utf8');
  assert.match(preview, /expected-red/);
  assert.match(preview, /Open original/);
  assert.match(html, /tests-1.md.preview.html/);
  const testsHandoff = artifactJoin(handoffs, 'tests-1.json');
  await writeFile(testsHandoff, JSON.stringify({ version: 1, ticket: 'DEMO', stage: 'tests', status: 'done', plan_version: 1, outcome: 'TESTS_PREPARED', artifacts: { preparation: path.relative(await realpath(f.root), saved.file), report: path.relative(await realpath(f.root), saved.report) }, data: {} }));
  const input = { event: 'handoff', id: 'accept-tests', expected_hash: digest(await readFile(f.statePath, 'utf8')), repos: [f.root], handoff: path.relative(await realpath(f.root), testsHandoff) };
  const result = await applyWorkflow({ root: f.root, statePath: f.statePath, input });
  assert.equal(result.fields.phase, 'execute');
  assert.equal(result.fields.execution, 'not-started');
  assert.equal((await applyWorkflow({ root: f.root, statePath: f.statePath, input })).replayed, true);
  assert.equal(await readFile(planPath, 'utf8'), plan);
  await writeFile(planPath, plan + '\nCoverage changed outside the workflow checkpoint.\n');
  const { generateDashboard } = await import('./render-status.mjs');
  await generateDashboard(f.statePath);
  assert.match(await readFile(f.result.dashboard, 'utf8'), /Superseded/);
});
