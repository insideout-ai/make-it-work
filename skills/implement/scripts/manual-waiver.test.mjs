import { artifactJoin } from '../../../scripts/lib/artifact-path.mjs';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile, realpath } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { initializeWorkflow, applyWorkflow } from './workflow.mjs';
import { digest } from '../../../scripts/lib/artifacts.mjs';
import { planHash } from '../../../scripts/lib/plan.mjs';
import { executionControl } from '../../execute/scripts/step-control.mjs';
import { validateVerification } from './verification.mjs';
import { prepareScope, approveScope, runScope } from './workspace-scope.mjs';
import { generateDashboard, parseState } from './render-status.mjs';
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

for (const workspace of [false, true]) test(`authorized manual skip survives ${workspace ? 'workspace' : 'single-repo'} rendering, handoff and replay without claiming verification`, async t => {
  const root = await realpath(await mkdtemp(artifactJoin(os.tmpdir(), 'manual-waiver-')));
  const repo = workspace ? path.join(root, 'demo') : root;
  await mkdir(repo, { recursive: true });
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-C', repo, ...args], { stdio: 'pipe' });
  git('init', '-b', 'main'); git('config', 'user.email', 'test@example.invalid'); git('config', 'user.name', 'Test');
  await writeFile(artifactJoin(repo, 'source.js'), 'export const x = 1;'); git('add', '.'); git('commit', '-m', 'baseline'); git('switch', '-c', 'DEMO');
  if (workspace) {
    await mkdir(path.join(root, 'make-it-work/DEMO'), { recursive: true });
    await writeFile(artifactJoin(root, 'make-it-work/DEMO/DEMO-repos.md'), '# Selected demo repository\n');
    const preview = await prepareScope(root, { ticket: 'DEMO', report: 'make-it-work/DEMO/DEMO-repos.md', repos: [{ id: 'demo', base: 'main', reason: 'source.js owns the fixture behavior' }] });
    await approveScope(root, 'DEMO', preview.hash, { source: 'user', via: 'chat' });
    await runScope(root, 'DEMO', preview.hash);
  }
  const initialized = await initializeWorkflow(root, { ticket: 'DEMO', autonomy: 'autonomous', base: 'main', repos: [repo], branch_guard: 'Existing branch' });
  const statePath = initialized.state, directory = path.dirname(statePath), planPath = artifactJoin(directory, 'DEMO-plan.md');
  const ledgerPath = artifactJoin(directory, 'DEMO-verification-v1.json');
  await writeFile(planPath, plan);
  await writeFile(statePath, (await readFile(statePath, 'utf8')).replace('phase: context-check', 'phase: execute').replace('plan: none', 'plan: make-it-work/DEMO/DEMO-plan.md').replace('plan_hash: none', `plan_hash: ${planHash(plan)}`).replace(/^acceptance_evidence_version: 1\n/m, ''));
  const options = { ledgerPath, ticket: 'DEMO', planVersion: 1, dashboardState: statePath };
  await executionControl(planPath, { action: 'start', id: 'code', steps: [1] }, options);
  await executionControl(planPath, { action: 'complete', steps: [{ number: 1, checks: [{ type: 'automated', subject: 'U1', command: 'node --test', result: 'pass', note: 'Unit check passed' }] }] }, options);
  await executionControl(planPath, { action: 'stop', reason: 'execution-failed', detail: 'Deployment unavailable for M1' }, options);
  const checkpoint = async input => applyWorkflow({ root, statePath, input: { expected_hash: digest(await readFile(statePath, 'utf8')), repos: [repo], ...input } });
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
  ledger.gate.result = 'pass';
  await writeFile(ledgerPath, JSON.stringify(ledger));
  await writeFile(artifactJoin(directory, 'DEMO-execute.md'), 'Execute outcome: PASSED\n');
  const handoffs = path.join(directory, 'DEMO-handoffs'); await mkdir(handoffs);
  const handoff = artifactJoin(handoffs, 'execute-1.json');
  await writeFile(handoff, JSON.stringify({ version: 1, ticket: 'DEMO', stage: 'execute', plan_version: 1,
    status: 'done', outcome: 'PASSED', artifacts: { report: path.relative(root, artifactJoin(directory, 'DEMO-execute.md')),
      verification: path.relative(root, ledgerPath) }, data: { discoveries: [], failing_tests: [], gate: 'full-suite' } }));
  const event = { id: 'waived-execute-handoff', event: 'handoff', expected_hash: digest(await readFile(statePath, 'utf8')),
    repos: [repo], handoff: path.relative(root, handoff) };
  await assert.rejects(applyWorkflow({ root, statePath, input: event, render: async () => { throw new Error('Simulated render failure after state save'); } }), /Simulated render failure/);
  const saved = parseState(await readFile(statePath, 'utf8'));
  assert.equal(saved.fields.phase, 'review'); assert.equal(saved.fields.execution, 'passed');
  const beforeReplay = await readFile(statePath, 'utf8');
  const review = await applyWorkflow({ root, statePath, input: event });
  assert.equal(review.replayed, true); assert.equal(review.fields.review_cycle, '1');
  assert.equal(await readFile(statePath, 'utf8'), beforeReplay);
  // Exercise terminal rendering as well: no scope journal is needed to read the ledger here.
  await writeFile(statePath, beforeReplay.replace(/^phase: review$/m, 'phase: final-approval'));
  const evidenceBefore = await readFile(ledgerPath, 'utf8');
  await generateDashboard(statePath);
  const page = await readFile(initialized.dashboard, 'utf8');
  assert.match(page, /1 of 2 verified/);
  assert.equal(await readFile(ledgerPath, 'utf8'), evidenceBefore);
  const validState = await readFile(statePath, 'utf8');
  const invalid = structuredClone(ledger); delete invalid.steps[1].checks[0].authorization;
  await writeFile(ledgerPath, JSON.stringify(invalid));
  await assert.rejects(generateDashboard(statePath), /skip authorization|authorization/i);
  assert.equal(await readFile(statePath, 'utf8'), validState);
  const wrongStep = structuredClone(ledger); wrongStep.steps[0].checks = [wrongStep.steps[1].checks[0]];
  await writeFile(ledgerPath, JSON.stringify(wrongStep));
  await assert.rejects(generateDashboard(statePath), /Only a manual-verification step/);
  await writeFile(ledgerPath, evidenceBefore);
  await rm(planPath);
  await assert.rejects(generateDashboard(statePath), /ENOENT/);
  await writeFile(planPath, completedPlan);
  assert.equal(await readFile(statePath, 'utf8'), validState);
  assert.equal(parseState(await readFile(statePath, 'utf8')).fields.phase, 'final-approval');

});
