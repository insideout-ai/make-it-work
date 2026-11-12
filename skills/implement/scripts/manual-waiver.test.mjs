import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { initializeWorkflow, applyWorkflow } from './workflow.mjs';
import { digest } from '../../../scripts/lib/artifacts.mjs';
import { planHash } from '../../../scripts/lib/plan.mjs';
import { executionControl } from '../../execute/scripts/step-control.mjs';
import { validateVerification } from './verification.mjs';
import { manualWaiver } from './manual-waiver.mjs';

const plan = `# Plan

## Execution Status

**Mode:** Inline — execute here.

**Progress:** Step 0 of 2 complete.

## Steps

### Step 1 — Implement

- **Files:** \`source.js\`
- **Depends on:** none
- **Can run in parallel with:** none

**Verify:** Unit test.

### Step 2 — Verify manual scenarios

- **Files:** none
- **Depends on:** 1
- **Can run in parallel with:** none

**Verify:** Run M1 against deployment.

## Verification Policy

| Repo | Mode | Decision | Reason |
| --- | --- | --- | --- |
| demo | automated | configured | Existing unit suite |

## Test Plan

| Scenario | Repo | Type | File / command |
| --- | --- | --- | --- |
| U1 | demo | Unit | node --test |
| M1 | demo | Manual | Deployment needed; verify printed date |

**AC traceability:**

| Acceptance criterion | Test scenario |
| --- | --- |
| AC1 | U1 |
| AC2 | M1 |
`;
const decision = { id: 'waive-1', scenarios: ['M1'], source: 'user', via: 'chat', reason: 'Continue without deployment checks' };

test('waiver requires explicit authorization, completed implementation, exact scenarios and an automated policy', () => {
  const ready = plan.replace('Step 0 of', 'Step 1 of');
  assert.equal(manualWaiver(ready, decision, 1).step, 2);
  for (const input of [{ ...decision, source: 'policy' }, { ...decision, scenarios: [] }, { ...decision, scenarios: ['U1'] }]) assert.throws(() => manualWaiver(ready, input, 1));
  assert.throws(() => manualWaiver(plan, decision, 1), /implementation steps/);
  assert.throws(() => manualWaiver(ready.replace('automated | configured', 'manual | user'), decision, 1), /all-manual/);
});

test('stopped execution continues without plan edits, retains unverified clauses and still requires a passing automated gate', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'manual-waiver-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-C', root, ...args], { stdio: 'pipe' });
  git('init', '-b', 'main'); git('config', 'user.email', 'test@example.invalid'); git('config', 'user.name', 'Test');
  await writeFile(path.join(root, 'source.js'), 'export const x = 1;'); git('add', '.'); git('commit', '-m', 'baseline'); git('switch', '-c', 'DEMO');
  const initialized = await initializeWorkflow(root, { ticket: 'DEMO', autonomy: 'autonomous', base: 'main', repos: [root], branch_guard: 'Existing branch' });
  const statePath = initialized.state, directory = path.dirname(statePath), planPath = path.join(directory, 'DEMO-plan.md');
  const ledgerPath = path.join(directory, 'DEMO-verification-v1.json');
  await writeFile(planPath, plan);
  await writeFile(statePath, (await readFile(statePath, 'utf8')).replace('phase: context-check', 'phase: execute').replace('plan: none', 'plan: make-it-work/DEMO/DEMO-plan.md').replace('plan_hash: none', `plan_hash: ${planHash(plan)}`).replace(/^acceptance_evidence_version: 1\n/m, ''));
  const options = { ledgerPath, ticket: 'DEMO', planVersion: 1, dashboardState: statePath };
  await executionControl(planPath, { action: 'start', id: 'code', steps: [1] }, options);
  await executionControl(planPath, { action: 'complete', steps: [{ number: 1, checks: [{ type: 'automated', subject: 'U1', command: 'node --test', result: 'pass', note: 'Unit check passed' }] }] }, options);
  await executionControl(planPath, { action: 'stop', reason: 'execution-failed', detail: 'Deployment unavailable for M1' }, options);
  const checkpoint = async input => applyWorkflow({ root, statePath, input: { expected_hash: digest(await readFile(statePath, 'utf8')), repos: [root], ...input } });
  await checkpoint({ id: 'stop', event: 'stop', reason: 'Deployment unavailable' });
  const before = await readFile(planPath, 'utf8');
  await assert.rejects(checkpoint({ ...decision, id: 'invalid', source: 'policy', event: 'waive-manual-verification' }), /explicit user/);
  const input = { ...decision, event: 'waive-manual-verification' };
  const result = await checkpoint(input);
  assert.equal(result.fields.phase, 'execute');
  assert.equal(result.fields.status, 'In Progress');
  assert.equal(await readFile(planPath, 'utf8'), before);
  const skipped = await executionControl(planPath, { action: 'waive-manual' }, options);
  assert.equal(skipped.manual_verification, 'skipped');
  const ledger = JSON.parse(await readFile(ledgerPath, 'utf8'));
  assert.equal(ledger.steps[1].checks[0].type, 'skipped');
  assert.equal(ledger.acceptance[1].status, 'unverified');
  assert.match(ledger.acceptance[1].note, /Not performed/);
  const completedPlan = await readFile(planPath, 'utf8');
  assert.equal(planHash(completedPlan), planHash(before));
  assert.throws(() => validateVerification(ledger, { ticket: 'DEMO', planVersion: 1, plan: completedPlan, outcome: 'PASSED' }), /gate evidence/);
  ledger.gate = { mode: 'full-suite', result: 'pass', note: 'Unit suite passed', full_suites: [{ repo: 'demo', command: 'node --test', result: 'pass', note: 'Full configured suite passed' }] };
  assert.equal(validateVerification(ledger, { ticket: 'DEMO', planVersion: 1, plan: completedPlan, outcome: 'PASSED' }).acceptance[1].status, 'unverified');
  ledger.gate.result = 'fail';
  assert.throws(() => validateVerification(ledger, { ticket: 'DEMO', planVersion: 1, plan: completedPlan, outcome: 'PASSED' }), /passing gate/);
  await assert.rejects(executionControl(planPath, { action: 'complete', steps: [ledger.steps[1]] }, options), /authorized waive-manual/);
  assert.equal((await executionControl(planPath, { action: 'waive-manual' }, options)).replayed, true);
});
