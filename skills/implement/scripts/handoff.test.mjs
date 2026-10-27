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

test('validates and pauses on exported PM questions without claiming Slack delivery', async (t) => {
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
  for (const autonomy of ['guided', 'autonomous', 'autopilot']) {
    assert.deepEqual(decideNext(state('close-the-gaps', autonomy), questionsSent()), {
      action: 'pause',
      reason: 'Refinement questions prepared for the Product Manager; check delivery status in the questions file.',
      pause_reason: 'Slack refinement pending',
      questions: 'make-it-work/DEMO-1/DEMO-1-questions.md',
    });
  }
});

const implement = (data = {}) => ({ ...base, stage: 'implement', outcome: 'IMPLEMENTED', artifacts: { report: 'make-it-work/DEMO-1/DEMO-1-lightweight.md' }, data: { changed_paths: ['app/src/x.js'], checks: ['npm test: pass'], discoveries: [], risk_signal: null, ...data } });
const adaptive = (phase, autonomy = 'guided', overrides = {}) => state(phase, autonomy, { adaptive_version: '1', risk: 'low', mode: 'lightweight', mode_source: 'assessed', risk_rationale: 'Small local change', escalations: '0', implementation_report: 'none', ...overrides });
const escalated = (reason) => ({ action: 'phase', reason, phase: 'plan', operation: 'escalate' });

test('validates the Lightweight implement handoff and its report artifact', async (t) => {
  assert.equal(validateHandoff(implement()).outcome, 'IMPLEMENTED');
  assert.equal(validateHandoff(implement({ risk_signal: 'Touches the payment ledger' })).data.risk_signal, 'Touches the payment ledger');
  assert.throws(() => validateHandoff({ ...implement(), outcome: 'PASSED' }), /Invalid implement outcome/);
  assert.throws(() => validateHandoff(implement({ changed_paths: [''] })), /changed_paths/);
  assert.throws(() => validateHandoff(implement({ checks: 'npm test' })), /checks/);
  assert.throws(() => validateHandoff(implement({ discoveries: undefined })), /discoveries/);
  assert.throws(() => validateHandoff(implement({ risk_signal: '' })), /risk_signal/);
  assert.throws(() => validateHandoff(implement({ gate: 'none' })), /unknown field: gate/);
  assert.throws(() => validateHandoff({ ...implement(), artifacts: { plan: 'make-it-work/DEMO-1/DEMO-1-plan.md' } }), /unknown field/);
  assert.throws(() => validateHandoff({ ...implement(), review_cycle: 1 }), /Only Review/);
  assert.throws(() => validateHandoff({ ...implement(), plan_version: 0 }), /positive plan_version/);
  assert.equal(validateHandoff({ version: 1, ticket: 'DEMO-1', plan_version: 1, stage: 'implement', status: 'blocked', reason: 'Build broke' }).status, 'blocked');
  const root = await mkdtemp(path.join(os.tmpdir(), 'implement-lightweight-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'make-it-work', 'DEMO-1'), { recursive: true });
  await assert.rejects(validateArtifacts(implement(), root), /ENOENT/);
  await writeFile(path.join(root, 'make-it-work/DEMO-1/DEMO-1-lightweight.md'), '# Lightweight report\n');
  assert.equal((await validateArtifacts(implement(), root)).outcome, 'IMPLEMENTED');
  await writeFile(path.join(root, 'make-it-work/DEMO-1/DEMO-1-execute.md'), 'Execute outcome: PASSED\n');
  await assert.rejects(validateArtifacts({ ...implement(), artifacts: { report: 'make-it-work/DEMO-1/DEMO-1-execute.md' } }, root), /does not match implement/);
});

test('routes adaptive refinement by assessed mode and requires an assessment', () => {
  assert.throws(() => decideNext(adaptive('close-the-gaps', 'autonomous', { risk: 'none', mode: 'none', mode_source: 'none' }), gaps()), /Risk assessment required before routing/);
  assert.throws(() => decideNext(adaptive('close-the-gaps', 'guided', { risk: 'none', mode: 'none', mode_source: 'none' }), gaps(1)), /Risk assessment required/);
  assert.equal(decideNext(adaptive('close-the-gaps', 'autonomous', { risk: 'none', mode: 'none', mode_source: 'none' }), questionsSent()).action, 'pause');
  assert.equal(decideNext(adaptive('close-the-gaps', 'guided'), gaps()).phase, 'spec-approval');
  assert.equal(decideNext(adaptive('close-the-gaps', 'guided', { mode: 'tdd', risk: 'high' }), gaps()).phase, 'spec-approval');
  for (const autonomy of ['autonomous', 'autopilot']) {
    assert.equal(decideNext(adaptive('close-the-gaps', autonomy), gaps()).phase, 'lightweight');
    assert.equal(decideNext(adaptive('close-the-gaps', autonomy, { mode: 'tdd', risk: 'medium' }), gaps()).phase, 'plan');
  }
  assert.equal(decideNext(adaptive('close-the-gaps', 'autonomous'), gaps(1), { choice: 'proceed' }).phase, 'lightweight');
  assert.equal(decideNext(adaptive('close-the-gaps', 'autonomous', { mode: 'tdd', risk: 'high' }), gaps(1), { choice: 'proceed' }).phase, 'plan');
  assert.equal(decideNext(adaptive('close-the-gaps', 'guided'), gaps(1), { choice: 'proceed' }).phase, 'spec-approval');
  assert.equal(decideNext(adaptive('close-the-gaps', 'autopilot'), gaps(1)).action, 'stop');
  assert.throws(() => decideNext(adaptive('close-the-gaps', 'autonomous', { adaptive_version: '2' }), gaps()), /Unsupported adaptive_version/);
});

test('routes Lightweight implementation to review and requires the lightweight phase', () => {
  for (const autonomy of ['guided', 'autonomous', 'autopilot']) {
    assert.deepEqual(decideNext(adaptive('lightweight', autonomy), implement()), { action: 'phase', reason: 'Lightweight implementation finished.', phase: 'review' });
  }
  assert.equal(decideNext(adaptive('lightweight', 'autonomous'), implement({ risk_signal: 'Shared schema change' })).phase, 'review');
  assert.equal(decideNext(adaptive('lightweight', 'autonomous'), { version: 1, ticket: 'DEMO-1', plan_version: 1, stage: 'implement', status: 'blocked', reason: 'Build broke' }).action, 'stop');
  assert.throws(() => decideNext(adaptive('execute', 'autonomous', { mode: 'tdd' }), implement()), /does not match state phase/);
  assert.throws(() => decideNext(adaptive('lightweight', 'autonomous'), execute('PASSED')), /does not match state phase/);
});

test('escalates Lightweight runs on request and rejects invalid escalations', () => {
  assert.deepEqual(decideNext(adaptive('lightweight', 'autonomous'), implement(), { escalate: 'Touches money movement' }), escalated('Touches money movement'));
  assert.deepEqual(decideNext(adaptive('review', 'guided'), review('CLEAN'), { escalate: 'Risk signal confirmed' }), escalated('Risk signal confirmed'));
  assert.deepEqual(decideNext(adaptive('lightweight', 'autopilot'), { version: 1, ticket: 'DEMO-1', plan_version: 1, stage: 'implement', status: 'blocked', reason: 'Build broke' }, { escalate: 'Failure suggests wider risk' }), escalated('Failure suggests wider risk'));
  assert.deepEqual(decideNext(adaptive('close-the-gaps', 'autonomous'), gaps(), { escalate: 'Reassessed' }), escalated('Reassessed'));
  assert.throws(() => decideNext(adaptive('lightweight', 'autonomous'), implement(), { escalate: '' }), /escalate reason/);
  assert.throws(() => decideNext(adaptive('lightweight', 'autonomous', { escalations: '1' }), implement(), { escalate: 'Again' }), /Escalation requires/);
  assert.throws(() => decideNext(adaptive('execute', 'autonomous', { mode: 'tdd', escalations: '0' }), execute('PASSED'), { escalate: 'Already TDD' }), /Escalation requires/);
  assert.throws(() => decideNext(state('execute', 'autonomous'), execute('PASSED'), { escalate: 'Old run' }), /Escalation requires/);
  assert.throws(() => decideNext(adaptive('lightweight', 'autonomous'), { ...implement(), ticket: 'OTHER' }, { escalate: 'Bad handoff' }), /does not match state/);
  assert.throws(() => decideNext(adaptive('review', 'guided'), review('HUMAN_DECISION', [finding('#1', 'human')]), { escalate: 'x', choice: 'stop' }), /not both/);
});

test('routes Lightweight review fixes, early-replan triggers, and human decisions', () => {
  const fix = { action: 'phase', reason: 'Review findings need a Lightweight fix.', phase: 'lightweight', operation: 'fix' };
  for (const autonomy of ['guided', 'autonomous', 'autopilot']) {
    assert.equal(decideNext(adaptive('review', autonomy), review('CLEAN')).phase, 'final-sync');
    assert.deepEqual(decideNext(adaptive('review', autonomy), review('FIX_REQUIRED', [finding('#1')])), fix);
    assert.deepEqual(decideNext(adaptive('review', autonomy, { fix_cycle: '2' }), review('FIX_REQUIRED', [finding('#1')])), fix);
    assert.equal(decideNext(adaptive('review', autonomy, { fix_cycle: '3' }), review('FIX_REQUIRED', [finding('#1')])).reason, 'Fix round limit reached.');
    assert.deepEqual(decideNext(adaptive('review', autonomy), review('REPLAN_REQUIRED', [finding('#1', 'replan')])), escalated('Review requires replanning. Escalating to TDD.'));
    assert.deepEqual(decideNext(adaptive('review', autonomy), review('FIX_REQUIRED', [finding('#2', 'fix', 'src/y.js:go', '#1')])), escalated('Review found a repeat offender. Escalating to TDD.'));
  }
  const previous = review('FIX_REQUIRED', [finding('#1')]);
  const sameRegion = review('FIX_REQUIRED', [finding('#2')], 2);
  assert.equal(decideNext(adaptive('review', 'guided', { review_cycle: '2', fix_cycle: '1' }), sameRegion, { previousReview: previous }).operation, 'escalate');
  assert.deepEqual(decideNext(adaptive('review', 'guided', { review_cycle: '2', fix_cycle: '1' }), review('FIX_REQUIRED', [finding('#2', 'fix', 'src/z.js:other')], 2), { previousReview: previous }), fix);
  assert.throws(() => decideNext(adaptive('review', 'autonomous', { review_cycle: '2' }), sameRegion, { previousReview: review('FIX_REQUIRED', [finding('#1')], 2) }), /Previous review/);
  assert.equal(decideNext(adaptive('review', 'autonomous', { review_cycle: '4' }), review('FIX_REQUIRED', [finding('#1')], 4)).reason, 'Review limit reached.');
  assert.equal(decideNext(adaptive('review', 'autonomous', { review_cycle: '4' }), review('REPLAN_REQUIRED', [finding('#1', 'replan')], 4)).reason, 'Review limit reached.');

  const human = review('HUMAN_DECISION', [finding('#1', 'human')]);
  assert.equal(decideNext(adaptive('review', 'autopilot'), human).action, 'stop');
  assert.deepEqual(decideNext(adaptive('review', 'guided'), human).choices, ['decide-and-escalate', 'stop']);
  assert.deepEqual(decideNext(adaptive('review', 'autonomous', { fix_cycle: '3' }), human, { choice: 'decide-and-escalate' }), escalated('Human findings decided. Escalating to TDD.'));
  assert.equal(decideNext(adaptive('review', 'guided'), human, { choice: 'stop' }).action, 'stop');
  assert.throws(() => decideNext(adaptive('review', 'guided'), human, { choice: 'decide-and-fix' }), /not valid/);
  const humanReplan = review('REPLAN_REQUIRED', [finding('#1', 'human'), finding('#2', 'replan')]);
  assert.equal(decideNext(adaptive('review', 'autonomous'), humanReplan, { choice: 'decide-and-escalate' }).operation, 'escalate');
  assert.equal(decideNext(adaptive('review', 'autopilot'), humanReplan).action, 'stop');

  // A user downgrade after an escalation leaves no escalation budget: triggers stop instead.
  const spent = { mode_source: 'user', escalations: '1' };
  assert.deepEqual(decideNext(adaptive('review', 'autonomous', spent), review('FIX_REQUIRED', [finding('#1')])), fix);
  assert.deepEqual(decideNext(adaptive('review', 'autonomous', spent), review('REPLAN_REQUIRED', [finding('#1', 'replan')])), { action: 'stop', reason: 'Review requires replanning. Escalation limit reached.' });
  assert.equal(decideNext(adaptive('review', 'guided', spent), human, { choice: 'decide-and-escalate' }).action, 'stop');
});

test('adaptive TDD runs route review and execution exactly like runs without adaptive_version', () => {
  const tdd = (phase, autonomy, overrides = {}) => adaptive(phase, autonomy, { mode: 'tdd', risk: 'high', ...overrides });
  const cases = [
    ['review', 'autonomous', review('FIX_REQUIRED', [finding('#1')]), {}],
    ['review', 'guided', review('FIX_REQUIRED', [finding('#1')]), { fix_cycle: '1' }],
    ['review', 'autonomous', review('REPLAN_REQUIRED', [finding('#1', 'replan')]), {}],
    ['review', 'guided', review('HUMAN_DECISION', [finding('#1', 'human')]), {}],
    ['review', 'autonomous', review('FIX_REQUIRED', [finding('#2', 'fix', 'src/y.js:go', '#1')]), {}],
    ['execute', 'autonomous', execute('GUARDRAIL'), {}],
    ['plan', 'guided', plan(), {}],
  ];
  for (const [phase, autonomy, handoff, overrides] of cases) {
    assert.deepEqual(decideNext(tdd(phase, autonomy, overrides), handoff), decideNext(state(phase, autonomy, overrides), handoff));
    assert.deepEqual(decideNext(tdd(phase, autonomy, { ...overrides, escalations: '1' }), handoff), decideNext(state(phase, autonomy, overrides), handoff));
  }
});

test('CLI routes a Lightweight implement handoff and passes --escalate', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'implement-lightweight-cli-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const artifacts = path.join(root, 'make-it-work', 'DEMO-1');
  const handoffs = path.join(artifacts, 'DEMO-1-handoffs');
  await mkdir(handoffs, { recursive: true });
  await writeFile(path.join(artifacts, 'DEMO-1-lightweight.md'), '# Lightweight report\n');
  const handoffPath = path.join(handoffs, 'implement-1.json');
  await writeFile(handoffPath, JSON.stringify(implement()));
  const fields = {
    ticket: 'DEMO-1', handoff_version: '1', status: 'In Progress', phase: 'lightweight',
    autonomy: 'autonomous', start_time: '2026-01-01T10:00:00Z', execution_mode: 'none',
    inline_pause_mode: 'none', spec: 'make-it-work/DEMO-1/DEMO-1-spec.md', spec_hash: 'abc', plan: 'none',
    plan_version: '1', plan_hash: 'none', execution: 'not-started', review: 'not-started',
    review_cycle: '0', fix_cycle: '0', fix_plan_round_steps: 'none', fix_plan_dispatch: 'none',
    replans_used: '0', gate: 'none', pause_reason: 'none', branch: 'demo', base: 'main',
    head: 'abc123', worktree_fingerprint: 'fingerprint', execute_report: 'none',
    context_updated: 'none', current_activity: 'none', real_rows_from: '1',
    adaptive_version: '1', risk: 'low', mode: 'lightweight', mode_source: 'assessed',
    risk_rationale: 'Small local change', escalations: '0', implementation_report: 'make-it-work/DEMO-1/DEMO-1-lightweight.md',
  };
  const statePath = path.join(artifacts, 'DEMO-1-state.md');
  const writeState = (overrides = {}) => writeFile(statePath, `# Workflow state — DEMO-1\n\n\`\`\`\n${Object.entries({ ...fields, ...overrides }).map(([k, v]) => `${k}: ${v}`).join('\n')}\n\`\`\`\n\n## Known regressions\n\nNone\n\n## Decided findings\n\nNone\n\n## Context discoveries\n\nNone\n\n## Audit log\n\n| # | Time | From | To | Outcome / reason |\n| --- | --- | --- | --- | --- |\n| 1 | 2026-01-01T10:00:00Z | close-the-gaps | lightweight | Spec ready |\n`);
  await writeState();
  const cli = path.resolve('skills/implement/scripts/handoff.mjs');
  const run = (...extra) => JSON.parse(execFileSync(process.execPath, [cli, 'next', '--handoff', handoffPath, '--root', root, '--state', statePath, ...extra], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  assert.equal(JSON.parse(execFileSync(process.execPath, [cli, 'validate', '--handoff', handoffPath, '--root', root], { encoding: 'utf8' })).stage, 'implement');
  assert.equal(run().phase, 'review');
  assert.deepEqual(run('--escalate', 'Touches shared auth'), escalated('Touches shared auth'));
  await writeState({ escalations: '1', mode_source: 'user' });
  assert.throws(() => run('--escalate', 'Again'), /Escalation requires/);
  const misnamed = path.join(handoffs, 'execute-1.json');
  await writeFile(misnamed, JSON.stringify(implement()));
  assert.throws(() => execFileSync(process.execPath, [cli, 'validate', '--handoff', misnamed, '--root', root], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }), /implement-<N>\.json/);
});
