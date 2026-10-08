import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { decideNext, validateArtifacts, validateHandoff } from './handoff.mjs';

const base = { version: 1, ticket: 'DEMO-1', plan_version: 1, status: 'done' };
const gaps = (tbd = 0) => ({ ...base, stage: 'gaps', outcome: 'SPEC_SAVED', artifacts: { spec: 'make-it-work/DEMO-1-spec.md' }, data: { tbd_items: tbd, context_updated: [] } });
const plan = (mode = 'initial', steps = null, recommend = null) => ({ ...base, stage: 'plan', outcome: mode === 'amend' ? 'FIX_PLAN_READY' : 'PLAN_SAVED', artifacts: { plan: 'make-it-work/DEMO-1-plan.md' }, data: { mode, steps_added: steps, recommend_replan: recommend, context_updated: [] } });
const execute = (outcome, failing = []) => ({ ...base, stage: 'execute', outcome, artifacts: { report: 'make-it-work/DEMO-1-execute.md' }, data: { discoveries: [], failing_tests: failing, gate: 'full-suite' } });
const finding = (id, route = 'fix', region = 'src/x.js:run', introduced = null) => ({ id, route, region, introduced_by_fix_of: introduced });
const review = (outcome, findings = [], cycle = 1) => ({ ...base, stage: 'review', review_cycle: cycle, outcome, artifacts: { report: 'make-it-work/DEMO-1-review.md' }, data: { findings, context_gaps: [] } });
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
  await mkdir(path.join(root, 'make-it-work'));
  await writeFile(path.join(root, 'make-it-work/DEMO-1-spec.md'), 'spec');
  assert.equal((await validateArtifacts(gaps(), root)).status, 'done');
  await assert.rejects(validateArtifacts({ ...gaps(), artifacts: { spec: '../make-it-work/DEMO-1-spec.md' } }, root), /escapes project root/);
  await assert.rejects(validateArtifacts(plan(), root), /ENOENT/);
  await writeFile(path.join(root, 'make-it-work/DEMO-1-execute.md'), 'Execute outcome: PASSED\n');
  assert.equal((await validateArtifacts(execute('PASSED'), root)).outcome, 'PASSED');
  await assert.rejects(validateArtifacts(execute('GUARDRAIL'), root), /disagrees with its Markdown report/);
  const verified = { ...execute('PASSED'), artifacts: { report: 'make-it-work/DEMO-1-execute.md', verification: 'make-it-work/DEMO-1-verification-v1.json' } };
  await writeFile(path.join(root, 'make-it-work/DEMO-1-plan.md'), '# Plan\n\n## Steps\n\n### Step 1 — Feature\n\n## Test Plan\n\n**AC traceability:**\n\n| Acceptance criterion | Test scenario |\n| --- | --- |\n| AC1 | Happy path |\n');
  await writeFile(path.join(root, 'make-it-work/DEMO-1-verification-v1.json'), JSON.stringify({ version: 1, ticket: 'DEMO-1', plan_version: 1,
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
  const artifacts = path.join(root, 'make-it-work');
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
});
