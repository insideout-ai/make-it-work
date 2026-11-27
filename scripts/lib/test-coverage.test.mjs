import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scenarios, validateCoverage, coverageSummary, coverageMarkdown } from './test-coverage.mjs';
const plan = `**Test coverage contract:** 1
## Regression Impact
| Changed code | Domain | UC / behavior | Decision | Reason / evidence | Test scenarios |
| --- | --- | --- | --- | --- | --- |
| app/validator | payments | UC-01 | Required | shared validation called by cards | Cards |
| app/validator | payments | UC-02 | Excluded | refund uses separate validator | None |
## Test Plan
| Scenario | Repo | Purpose | Type | File / command |
| --- | --- | --- | --- | --- |
| New type | app | Progression | Unit | test.js; node --test |
| Cards | app | Regression | Unit | test.js; node --test |
**AC traceability:**
| Acceptance criterion | Test scenario |
| --- | --- |
| New type accepted | New type |
`;
test('shared command preserves scenarios, purposes and baseline limits', () => {
  validateCoverage(plan);
  assert.equal(scenarios(plan).length, 2);
  assert.equal(new Set(scenarios(plan).map(r => r['File / command'])).size, 1);
  const summary = coverageSummary(plan, { entries: [{ scenario: 'Cards', repo: 'app', kind: 'regression', result: 'pass', reason: 'existing assertions passed' }] });
  assert.equal(summary.progression, 1); assert.equal(summary.regression, 1);
  assert.match(summary.scenarios[1].baseline, /^pass/);
  assert.match(coverageMarkdown(summary), /Counts describe planned scenarios/);
  assert.match(coverageSummary(plan).scenarios[1].baseline, /no matching pre-change baseline/);
});
test('legacy plans parse without opting into enforcement', () => {
  const legacy = '## Test Plan\n| Scenario | Type | File / command |\n| --- | --- | --- |\n| Old | Manual | observe |';
  assert.equal(scenarios(legacy)[0].Type, 'Manual'); validateCoverage(legacy);
  assert.equal(coverageSummary(legacy), null);
  assert.throws(() => validateCoverage(legacy, { required: true }), /missing/);
});
test('rejects invalid purpose and impact links without inventing scope', () => {
  for (const broken of [plan.replace('Progression', 'Other'), plan.replace('| Required |', '| Invalid |'), plan.replace('| Cards |\n', '| Unknown |\n'), plan.replace('shared validation called by cards', '')]) assert.throws(() => validateCoverage(broken));
  assert.equal(coverageSummary('bad plan').unavailable, true);
});

test('new mixed manual/automated tables preserve manual evidence requirements', async () => {
  const { validateManualEvidence } = await import('../../skills/implement/scripts/testing-policy.mjs');
  const mixed = plan.replace('| Cards | app | Regression | Unit |', '| Cards | app | Regression | Manual |');
  const policy = [{ Repo: 'app', Mode: 'manual' }];
  assert.throws(() => validateManualEvidence(mixed, { steps: [], acceptance: [] }, policy), /Manual scenarios/);
  const manual = mixed.replace('| New type | app | Progression | Unit |', '| New type | app | Progression | Manual |');
  const ledger = { steps: [{ checks: ['Cards', 'New type'].map(subject => ({ subject, type: 'manual', result: 'pass' })) }], acceptance: [] };
  validateManualEvidence(manual, ledger, policy);
  assert.match(coverageSummary(manual, { entries: [{ scenario: 'Cards', repo: 'app', kind: 'manual', result: 'exempt' }] }).scenarios[1].baseline, /not verified/);
});

test('preparation rejects a purpose mismatch and preserves regression baseline requirements', async () => {
  const { validatePreparation } = await import('../../skills/write-the-tests/scripts/preparation.mjs');
  const { planHash } = await import('./plan.mjs');
  const preparedPlan = '## Steps\n\n### Step 1 — Change\n\n**Tests:** app: `test.js`\n\n' + plan;
  const entry = { scenario: 'Cards', repo: 'app', step: 1, cwd: '/tmp/app', file: 'test.js', command: 'node --test', kind: 'progression', result: 'expected-red', reason: 'wrong kind', evidence: '/tmp/log' };
  const data = { version: 1, plan_hash: planHash(preparedPlan), status: 'blocked', entries: [entry] };
  assert.throws(() => validatePreparation(data, preparedPlan), /disagrees/);
  assert.throws(() => validatePreparation({ ...data, entries: [{ ...entry, kind: 'regression' }] }, preparedPlan), /Only progression/);
  validatePreparation({ ...data, entries: [{ ...entry, kind: 'regression', result: 'not-run', reason: 'database unavailable' }] }, preparedPlan);
});
