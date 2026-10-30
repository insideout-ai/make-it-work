import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { digest } from '../../../scripts/lib/artifacts.mjs';
import { parseState } from './render-status.mjs';
import { checkpointDashboard } from './dashboard-checkpoint.mjs';
import { applyWorkflow, initializeWorkflow, planHash, snapshot, transition } from './workflow.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'workflow-controller-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = (...argv) => execFileSync('git', ['-C', root, ...argv], { stdio: 'pipe' });
  git('init', '-b', 'main'); git('config', 'user.email', 'test@example.invalid'); git('config', 'user.name', 'Test');
  await writeFile(path.join(root, 'source.txt'), 'baseline'); git('add', '.'); git('commit', '-m', 'baseline'); git('switch', '-c', 'DEMO');
  await mkdir(path.join(root, '.claude/skills/domain-demo'), { recursive: true });
  await mkdir(path.join(root, '.claude/rules'), { recursive: true });
  await writeFile(path.join(root, 'CLAUDE.md'), '# Skill Loading Gate\n');
  await writeFile(path.join(root, '.claude/skills/domain-demo/SKILL.md'), '---\nname: domain-demo\n---\n');
  await writeFile(path.join(root, '.claude/rules/product.md'), '# Product');
  await writeFile(path.join(root, '.claude/rules/architecture.md'), '# Architecture');
  const result = await initializeWorkflow(root, { ticket: 'DEMO', autonomy: 'autonomous', base: 'main', repos: [root], branch_guard: 'Existing feature branch' });
  const statePath = result.state;
  let id = 0;
  const apply = async (event, extra = {}) => applyWorkflow({ root, statePath, input: {
    event, id: `e${++id}`, expected_hash: digest(await readFile(statePath, 'utf8')), repos: [root], ...extra,
  } });
  return { root, statePath, apply, result };
}
const fields = (phase, overrides = {}) => ({ fields: { ticket: 'DEMO', phase, status: 'In Progress', autonomy: 'autonomous', plan_version: '1', review_cycle: '1', fix_cycle: '0', replans_used: '0', context_updated: 'none', current_activity: 'Working', ...overrides } });
const review = (outcome, findings) => ({ version: 1, ticket: 'DEMO', plan_version: 1, stage: 'review', review_cycle: 1, status: 'done', outcome, artifacts: { report: 'make-it-work/DEMO/DEMO-review.md' }, data: { findings, context_gaps: [] } });

test('initializes from the maintained template and never overwrites a run', async (t) => {
  const { root, statePath, result } = await fixture(t);
  assert.equal(result.fields.controller_version, '1');
  assert.equal(parseState(await readFile(statePath, 'utf8')).fields.plugin_version, result.fields.plugin_version);
  assert.match(await readFile(result.dashboard, 'utf8'), /DEMO/);
  await assert.rejects(initializeWorkflow(root, { ticket: 'DEMO', autonomy: 'autonomous', base: 'main', repos: [root], branch_guard: 'Existing branch' }), /EEXIST/);
});
test('checkpoint clears activity, increments review once, and preserves unrelated state', async (t) => {
  const { root, statePath, apply } = await fixture(t);
  await apply('context-ready');
  const dir = path.join(root, 'make-it-work/DEMO');
  await mkdir(path.join(dir, 'DEMO-handoffs'));
  await writeFile(path.join(dir, 'DEMO-spec.md'), '# Spec');
  await writeFile(path.join(dir, 'DEMO-handoffs/gaps-1.json'), JSON.stringify({ version: 1, ticket: 'DEMO', plan_version: 1, stage: 'gaps', status: 'done', outcome: 'SPEC_SAVED', artifacts: { spec: 'make-it-work/DEMO/DEMO-spec.md' }, data: { tbd_items: 0, context_updated: [] } }));
  await checkpointDashboard(statePath, { activity: 'Writing the refined spec.' });
  await apply('mode', { risk: 'medium', mode: 'tdd', source: 'assessed', rationale: 'Touches shared behavior with existing callers.' });
  const next = await apply('handoff', { handoff: 'make-it-work/DEMO/DEMO-handoffs/gaps-1.json' });
  assert.equal(next.fields.phase, 'plan');
  assert.equal(next.fields.current_activity, 'none');
  assert.equal(next.fields.current_activity_updated_at, 'none');
  const html = await readFile(next.dashboard, 'utf8');
  assert.match(html, /Plan is in progress\. No activity details have been reported yet\./);
  assert.doesNotMatch(html, /Writing the refined spec|Last updated:/);
  assert.equal(next.fields.spec_hash, digest('# Spec'));
  assert.equal(parseState(await readFile(statePath, 'utf8')).audit.length, 4);
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
  assert.equal(unresolved.pending.action, 'ask'); assert.equal(unresolved.fields.autonomy, 'guided'); assert.equal(unresolved.fields.queued_autonomy, 'autopilot');
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
  await writeFile(path.join(root, 'new.txt'), 'same bytes');
  const a = await snapshot([root]); await rename(path.join(root, 'new.txt'), path.join(root, 'renamed.txt'));
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
  const spec = path.join(root, 'make-it-work/DEMO/DEMO-spec.md'); await writeFile(spec, 'Original spec');
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
  assert.match(await readFile(replay.dashboard, 'utf8'), /Autonomy: autonomous · guided queued/);
  const next = await apply('context-ready');
  assert.equal(next.fields.phase, 'close-the-gaps'); assert.equal(next.fields.autonomy, 'guided'); assert.equal(next.fields.queued_autonomy, 'none');
  assert.match(parseState(await readFile(statePath, 'utf8')).audit.at(-1).outcome, /Autonomy applied at phase boundary/);
});
test('the controller retains the existing handoff boundary requiring testing policy before execution', async (t) => {
  const { root, statePath, apply } = await fixture(t);
  await writeFile(path.join(root, 'make-it-work/DEMO/DEMO-spec.md'), '# Spec');
  await apply('mode', { risk: 'medium', mode: 'tdd', source: 'assessed', rationale: 'Touches shared behavior with existing callers.' });
  await apply('context-ready', { reuse_spec: true, spec: 'make-it-work/DEMO/DEMO-spec.md', source: 'user', via: 'chat' });
  const directory = path.join(root, 'make-it-work/DEMO/DEMO-handoffs'); await mkdir(directory);
  await writeFile(path.join(root, 'make-it-work/DEMO/DEMO-plan.md'), '# Plan without readiness policy');
  await writeFile(path.join(directory, 'plan-1.json'), JSON.stringify({ version: 1, ticket: 'DEMO', plan_version: 1, stage: 'plan', status: 'done', outcome: 'PLAN_SAVED', artifacts: { plan: 'make-it-work/DEMO/DEMO-plan.md' }, data: { mode: 'initial', steps_added: null, recommend_replan: null, context_updated: [] } }));
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
