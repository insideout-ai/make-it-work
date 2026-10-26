import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { decideNext, validateArtifacts, validateHandoff } from './handoff.mjs';

const base = { version: 1, ticket: 'DEMO-1', plan_version: 1, status: 'done' };
const gaps = (tbd = 0) => ({ ...base, stage: 'gaps', outcome: 'SPEC_SAVED', artifacts: { spec: 'make-it-work/DEMO-1/DEMO-1-spec.md' }, data: { tbd_items: tbd, context_updated: [] } });
const questionsSent = () => ({ ...base, stage: 'gaps', outcome: 'QUESTIONS_SENT', artifacts: { questions: 'make-it-work/DEMO-1/DEMO-1-questions.md' }, data: {} });
const plan = (mode = 'initial', steps = null, recommend = null) => ({ ...base, stage: 'plan', outcome: mode === 'amend' ? 'FIX_PLAN_READY' : 'PLAN_SAVED', artifacts: { plan: 'make-it-work/DEMO-1/DEMO-1-plan.md' }, data: { mode, steps_added: steps, recommend_replan: recommend, context_updated: [] } });
const execute = (outcome, failing = []) => ({ ...base, stage: 'execute', outcome, artifacts: { report: 'make-it-work/DEMO-1/DEMO-1-execute.md' }, data: { discoveries: [], failing_tests: failing, gate: 'full-suite' } });
const finding = (id, route = 'fix', region = 'src/x.js:run', introduced = null) => ({ id, route, region, introduced_by_fix_of: introduced });
const review = (outcome, findings = [], cycle = 1) => ({ ...base, stage: 'review', review_cycle: cycle, outcome, artifacts: { report: 'make-it-work/DEMO-1/DEMO-1-review.md' }, data: { findings, context_gaps: [] } });
const state = (phase, autonomy = 'guided', overrides = {}) => ({ fields: { ticket: 'DEMO-1', phase, autonomy, plan_version: '1', fix_cycle: '0', review_cycle: '1', replans_used: '0', ...overrides } });

test('validates stage results and rejects contradictory outcomes', () => {
  assert.equal(validateHandoff(gaps()).outcome, 'SPEC_SAVED');
  assert.throws(() => validateHandoff({ ...gaps(), data: { tbd_items: '0', context_updated: [] } }), /tbd_items/);
  assert.throws(() => validateHandoff(review('CLEAN', [finding('#1')])), /disagrees/);
  assert.throws(() => validateHandoff(execute('GATE_FAILED')), /failing tests/);
  assert.throws(() => validateHandoff(plan('replan')), /plan_version/);
  assert.throws(() => validateHandoff({ ...gaps(), extra: 1 }), /unknown field/);
});

test('validates real artifact files within the run root', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'implement-handoff-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'make-it-work', 'DEMO-1'), { recursive: true });
  await writeFile(path.join(root, 'make-it-work/DEMO-1/DEMO-1-spec.md'), 'spec');
  assert.equal((await validateArtifacts(gaps(), root)).status, 'done');
  await assert.rejects(validateArtifacts({ ...gaps(), artifacts: { spec: '../make-it-work/DEMO-1/DEMO-1-spec.md' } }, root), /must be under/);
  await assert.rejects(validateArtifacts(plan(), root), /ENOENT/);
  await writeFile(path.join(root, 'make-it-work/DEMO-1/DEMO-1-execute.md'), 'Execute outcome: PASSED\n');
  assert.equal((await validateArtifacts(execute('PASSED'), root)).outcome, 'PASSED');
  await assert.rejects(validateArtifacts(execute('GUARDRAIL'), root), /disagrees with its Markdown report/);
  const verified = { ...execute('PASSED'), artifacts: { report: 'make-it-work/DEMO-1/DEMO-1-execute.md', verification: 'make-it-work/DEMO-1/DEMO-1-verification-v1.json' } };
  await writeFile(path.join(root, 'make-it-work/DEMO-1/DEMO-1-plan.md'), '# Plan\n\n## Steps\n\n### Step 1 — Feature\n\n## Test Plan\n\n**AC traceability:**\n\n| Acceptance criterion | Test scenario |\n| --- | --- |\n| AC1 | Happy path |\n');
  await writeFile(path.join(root, 'make-it-work/DEMO-1/DEMO-1-verification-v1.json'), JSON.stringify({ version: 1, ticket: 'DEMO-1', plan_version: 1,
    steps: [{ number: 1, checks: [{ type: 'automated', subject: 'Happy path', command: 'npm test', result: 'pass', note: 'Passed' }] }],
    gate: { mode: 'full-suite', result: 'pass', note: 'Passed' },
    acceptance: [{ criterion: 'AC1', scenario: 'Happy path', status: 'automated', step: 1, note: 'Passed' }] }));
  assert.equal((await validateArtifacts(verified, root)).outcome, 'PASSED');
  assert.throws(() => decideNext(state('execute', 'guided', { verification_version: '1' }), execute('PASSED')), /require a verification artifact/);
});

test('routes refinement and planning through the correct autonomy gates', () => {
  assert.deepEqual(decideNext(state('close-the-gaps'), gaps()), { action: 'phase', reason: 'Spec is ready.', phase: 'spec-approval' });
  assert.equal(decideNext(state('close-the-gaps', 'autonomous'), gaps()).phase, 'plan');
  assert.equal(decideNext(state('close-the-gaps', 'autopilot'), gaps(1)).action, 'stop');
  assert.equal(decideNext(state('close-the-gaps'), gaps(1), { choice: 'resolve' }).phase, 'close-the-gaps');
  assert.equal(decideNext(state('close-the-gaps'), gaps(1), { choice: 'proceed' }).phase, 'spec-approval');
  assert.equal(decideNext(state('plan'), plan()).phase, 'plan-approval');
  assert.equal(decideNext(state('plan', 'autonomous'), plan()).phase, 'execute');
  assert.equal(decideNext(state('fix-plan', 'autonomous'), plan('amend', 0)).phase, 'review');
  assert.equal(decideNext(state('fix-plan', 'autonomous'), plan('amend', 2)).phase, 'execute');
  assert.equal(decideNext(state('fix-plan', 'autonomous'), plan('amend', 2, 'wrong design')).operation, 'replan');
});

test('routes execution results and respects fix and replan limits', () => {
  assert.equal(decideNext(state('execute'), execute('PASSED')).phase, 'review');
  assert.equal(decideNext(state('execute', 'autonomous'), execute('GUARDRAIL')).operation, 'replan');
  assert.equal(decideNext(state('execute', 'autopilot'), execute('GUARDRAIL')).action, 'stop');
  assert.equal(decideNext(state('execute', 'autonomous', { replans_used: '2' }), execute('RETRY_LIMIT')).action, 'stop');
  const failed = execute('GATE_FAILED', ['test/x.test.js']);
  assert.equal(decideNext(state('execute'), failed).action, 'triage');
  assert.equal(decideNext(state('execute', 'autonomous'), failed, { relatedFailures: 1 }).phase, 'fix-plan');
  assert.equal(decideNext(state('execute'), failed, { relatedFailures: 1, choice: 'fix-related' }).phase, 'fix-plan');
  assert.equal(decideNext(state('execute', 'autonomous'), failed, { relatedFailures: 0 }).phase, 'review');
  assert.equal(decideNext(state('execute', 'autonomous', { fix_cycle: '3' }), failed, { relatedFailures: 1 }).action, 'stop');
  assert.equal(decideNext(state('execute', 'autopilot'), execute('GATE_NO_RESULT')).action, 'stop');
});

test('routes review fixes, repeat offenders, replans, and human decisions', () => {
  assert.equal(decideNext(state('review'), review('CLEAN')).phase, 'final-sync');
  assert.equal(decideNext(state('review', 'autonomous'), review('FIX_REQUIRED', [finding('#1')])).phase, 'fix-plan');
  assert.equal(decideNext(state('review', 'autonomous'), review('REPLAN_REQUIRED', [finding('#1', 'replan')])).operation, 'replan');
  assert.equal(decideNext(state('review', 'autopilot'), review('HUMAN_DECISION', [finding('#1', 'human')])).action, 'stop');
  assert.match(decideNext(state('review', 'guided', { fix_cycle: '3' }), review('HUMAN_DECISION', [finding('#1', 'human')])).reason, /Fix round limit/);
  const previous = review('FIX_REQUIRED', [finding('#1')]);
  const current = review('FIX_REQUIRED', [finding('#2')], 2);
  assert.equal(decideNext(state('review', 'autonomous', { review_cycle: '2' }), current, { previousReview: previous }).operation, 'replan');
  assert.equal(decideNext(state('review', 'autonomous', { fix_cycle: '3', review_cycle: '2' }), current).action, 'stop');
  assert.equal(decideNext(state('review', 'autonomous', { review_cycle: '4' }), review('FIX_REQUIRED', [finding('#2')], 4)).action, 'stop');
});

test('rejects stale or mismatched handoffs before routing', () => {
  assert.throws(() => decideNext(state('execute'), gaps()), /does not match state phase/);
  assert.throws(() => decideNext(state('review'), { ...review('CLEAN'), ticket: 'OTHER' }), /does not match state/);
  assert.equal(decideNext(state('plan'), { version: 1, ticket: 'DEMO-1', plan_version: 1, stage: 'plan', status: 'blocked', code: 'PRE_EXISTING_REGRESSION', reason: 'Baseline test fails' }).action, 'ask');
  assert.throws(() => decideNext(state('execute'), execute('PASSED'), { choice: 'replan' }), /not valid/);
  assert.throws(() => decideNext(state('plan', 'guided', { plan_version: '2' }), plan()), /plan_version/);
});

test('CLI validates a handoff and routes it against a saved Markdown state', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'implement-handoff-cli-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const artifacts = path.join(root, 'make-it-work', 'DEMO-1');
  const handoffs = path.join(artifacts, 'DEMO-1-handoffs');
  await mkdir(handoffs, { recursive: true });
  await writeFile(path.join(artifacts, 'DEMO-1-spec.md'), '# Spec\n');
  const handoffPath = path.join(handoffs, 'gaps-1.json');
  await writeFile(handoffPath, JSON.stringify(gaps()));
  const fields = {
    ticket: 'DEMO-1', handoff_version: '1', status: 'In Progress', phase: 'close-the-gaps',
    autonomy: 'guided', start_time: '2026-01-01T10:00:00Z', execution_mode: 'none',
    inline_pause_mode: 'none', spec: 'none', spec_hash: 'none', plan: 'none',
    plan_version: '1', plan_hash: 'none', execution: 'not-started', review: 'not-started',
    review_cycle: '0', fix_cycle: '0', fix_plan_round_steps: 'none', fix_plan_dispatch: 'none',
    replans_used: '0', gate: 'none', pause_reason: 'none', branch: 'demo', base: 'main',
    head: 'abc123', worktree_fingerprint: 'fingerprint', execute_report: 'none',
    context_updated: 'none', current_activity: 'none', real_rows_from: '1',
  };
  const statePath = path.join(artifacts, 'DEMO-1-state.md');
  await writeFile(statePath, `# Workflow state — DEMO-1\n\n\`\`\`\n${Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('\n')}\n\`\`\`\n\n## Known regressions\n\nNone\n\n## Decided findings\n\nNone\n\n## Context discoveries\n\nNone\n\n## Audit log\n\n| # | Time | From | To | Outcome / reason |\n| --- | --- | --- | --- | --- |\n| 1 | 2026-01-01T10:00:00Z | start | close-the-gaps | Refinement started |\n`);
  const cli = path.resolve('skills/implement/scripts/handoff.mjs');
  const valid = JSON.parse(execFileSync(process.execPath, [cli, 'validate', '--handoff', handoffPath, '--root', root], { encoding: 'utf8' }));
  assert.equal(valid.valid, true);
  const next = JSON.parse(execFileSync(process.execPath, [cli, 'next', '--handoff', handoffPath, '--root', root, '--state', statePath], { encoding: 'utf8' }));
  assert.equal(next.phase, 'spec-approval');
  await writeFile(path.join(handoffs, 'gaps-2.json'), JSON.stringify(gaps()));
  assert.throws(() => execFileSync(process.execPath, [cli, 'validate', '--handoff', handoffPath, '--root', root], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }), /stale/);
  const planHandoff = path.join(handoffs, 'plan-1.json');
  await writeFile(planHandoff, JSON.stringify(plan()));
  await writeFile(path.join(artifacts, 'DEMO-1-plan.md'), '# Plan without a verification policy\n');
  const stateText = `# Workflow state — DEMO-1\n\n\`\`\`\n${Object.entries({ ...fields, phase: 'plan', testing_readiness: 'none' }).map(([k, v]) => `${k}: ${v}`).join('\n')}\n\`\`\`\n\n## Known regressions\n\nNone\n\n## Decided findings\n\nNone\n\n## Context discoveries\n\nNone\n\n## Audit log\n\n| # | Time | From | To | Outcome / reason |\n| --- | --- | --- | --- | --- |\n| 1 | 2026-01-01T10:00:00Z | close-the-gaps | plan | Spec ready |\n`;
  await writeFile(statePath, stateText);
  assert.throws(() => execFileSync(process.execPath, [cli, 'next', '--handoff', planHandoff, '--root', root, '--state', statePath], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }), /requires a Verification Policy/);
  await writeFile(path.join(artifacts, 'DEMO-1-plan.md'), '# Plan\n\n## Verification Policy\n\n| Repo | Mode | Decision | Reason |\n| --- | --- | --- | --- |\n| app | automated | configured | Existing runner |\n');
  assert.equal(JSON.parse(execFileSync(process.execPath, [cli, 'next', '--handoff', planHandoff, '--root', root, '--state', statePath], { encoding: 'utf8' })).phase, 'plan-approval');
});

test('validates an execute handoff with the scoped+full gate', () => {
  assert.equal(validateHandoff({ ...execute('PASSED'), data: { ...execute('PASSED').data, gate: 'scoped+full' } }).data.gate, 'scoped+full');
});

test('manual execution routes to review in every mode but missing automated results still stop autopilot', () => {
  const manual = { ...execute('VERIFIED_MANUALLY'),
    artifacts: { report: 'make-it-work/DEMO-1/DEMO-1-execute.md', verification: 'make-it-work/DEMO-1/DEMO-1-verification-v1.json' },
    data: { discoveries: [], failing_tests: [], gate: 'none' } };
  for (const autonomy of ['guided', 'autonomous', 'autopilot']) assert.equal(decideNext(state('execute', autonomy), manual).phase, 'review');
  assert.throws(() => validateHandoff({ ...manual, data: { ...manual.data, gate: 'full-suite' } }), /gate none/);
  assert.throws(() => validateHandoff({ ...manual, artifacts: execute('PASSED').artifacts }), /verification artifact/);
  assert.equal(decideNext(state('execute', 'autopilot'), execute('GATE_NO_RESULT')).action, 'stop');
});

test('manual artifact validation binds the report, selected plan policy, observations and gate', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'manual-handoff-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const dir = path.join(root, 'make-it-work', 'DEMO-1');
  await mkdir(dir, { recursive: true });
  const manual = { ...execute('VERIFIED_MANUALLY'),
    artifacts: { report: 'make-it-work/DEMO-1/DEMO-1-execute.md', verification: 'make-it-work/DEMO-1/DEMO-1-verification-v1.json' },
    data: { discoveries: [], failing_tests: [], gate: 'none' } };
  const manualPlan = '# Plan\n\n## Verification Policy\n\n| Repo | Mode | Decision | Reason |\n| --- | --- | --- | --- |\n| app | manual | user | User deferred setup |\n\n## Steps\n\n### Step 1 — Feature\n\n## Test Plan\n\n| Scenario | Repo | Type | File / command |\n| --- | --- | --- | --- |\n| Happy path | app | Manual | Start app; save; observe record |\n\n**AC traceability:**\n\n| Acceptance criterion | Test scenario |\n| --- | --- |\n| AC1 | Happy path |\n';
  const evidence = { version: 1, ticket: 'DEMO-1', plan_version: 1,
    steps: [{ number: 1, checks: [{ type: 'manual', subject: 'Happy path', command: null, result: 'pass', note: 'Observed saved record' }] }],
    gate: { mode: 'none', result: 'manual-accepted', note: 'Selected manual policy; observed scenarios' },
    acceptance: [{ criterion: 'AC1', scenario: 'Happy path', status: 'manual', step: 1, note: 'Observed saved record' }] };
  await writeFile(path.join(dir, 'DEMO-1-plan.md'), manualPlan);
  await writeFile(path.join(dir, 'DEMO-1-execute.md'), 'Execute outcome: VERIFIED_MANUALLY\n');
  await writeFile(path.join(dir, 'DEMO-1-verification-v1.json'), JSON.stringify(evidence));
  assert.equal((await validateArtifacts(manual, root)).outcome, 'VERIFIED_MANUALLY');
  await writeFile(path.join(dir, 'DEMO-1-plan.md'), manualPlan.replace('manual | user', 'automated | configured'));
  await assert.rejects(validateArtifacts(manual, root), /all-manual policy/);
  await writeFile(path.join(dir, 'DEMO-1-plan.md'), manualPlan);
  await writeFile(path.join(dir, 'DEMO-1-verification-v1.json'), JSON.stringify({ ...evidence, gate: { mode: 'full-suite', result: 'pass', note: 'Reported suite' } }));
  await assert.rejects(validateArtifacts(manual, root), /accepted manual gate/);
});

test('validates and pauses on questions sent to the Product Manager in Slack', async (t) => {
  assert.equal(validateHandoff(questionsSent()).outcome, 'QUESTIONS_SENT');
  assert.throws(() => validateHandoff({ ...questionsSent(), data: { tbd_items: 0 } }), /unknown field/);
  assert.throws(() => validateHandoff({ ...questionsSent(), artifacts: { spec: 'make-it-work/DEMO-1/DEMO-1-spec.md' } }), /unknown field|questions/);
  assert.throws(() => validateHandoff({ ...gaps(), artifacts: { questions: 'make-it-work/DEMO-1/DEMO-1-questions.md' } }), /unknown field|spec/);
  const root = await mkdtemp(path.join(os.tmpdir(), 'implement-handoff-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'make-it-work', 'DEMO-1'), { recursive: true });
  await assert.rejects(validateArtifacts(questionsSent(), root), /ENOENT/);
  await writeFile(path.join(root, 'make-it-work/DEMO-1/DEMO-1-questions.md'), '# Offline Questions');
  assert.equal((await validateArtifacts(questionsSent(), root)).outcome, 'QUESTIONS_SENT');
  await writeFile(path.join(root, 'make-it-work/DEMO-1/DEMO-1-spec.md'), 'spec');
  await assert.rejects(validateArtifacts({ ...questionsSent(), artifacts: { questions: 'make-it-work/DEMO-1/DEMO-1-spec.md' } }, root), /does not match/);
  for (const autonomy of ['guided', 'autonomous']) {
    assert.deepEqual(decideNext(state('close-the-gaps', autonomy), questionsSent()), {
      action: 'pause',
      reason: 'Questions sent to the Product Manager in Slack; waiting for replies.',
      pause_reason: 'Slack refinement pending',
      questions: 'make-it-work/DEMO-1/DEMO-1-questions.md',
    });
  }
});
