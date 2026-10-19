import assert from 'node:assert/strict';
import test from 'node:test';
import { testingPolicy, testingScope, validateManualEvidence } from './testing-policy.mjs';

const policyPlan = (rows = '| app | manual | user | User deferred setup |') => `# Plan

## Affected Code

${rows.split('\n').map((row) => '### `' + row.split('|')[1].trim() + '`').join('\n\n')}

### \`qa\` (test scope only)

## Verification Policy

| Repo | Mode | Decision | Reason |
| --- | --- | --- | --- |
${rows}

## Steps

### Step 1 — Change behavior

## Test Plan

| Scenario | Repo | Type | File / command |
| --- | --- | --- | --- |
| Save a record | app | Manual | Start app; save; observe saved record; step 1 |
| Reject invalid input | app | Manual | Enter invalid data; observe error; step 1 |

**AC traceability:**

| Acceptance criterion | Test scenario |
| --- | --- |
| AC1 saves data | Save a record |

## Definition of Done
`;

const manualLedger = () => ({ version: 1, ticket: 'DEMO', plan_version: 1,
  steps: [{ number: 1, checks: ['Save a record', 'Reject invalid input'].map((subject) => ({ type: 'manual', subject, command: null, result: 'pass', note: 'Observed expected behavior in running app' })) }],
  gate: { mode: 'none', result: 'manual-accepted', note: 'User selected manual verification before planning; observed scenarios passed' },
  acceptance: [{ criterion: 'AC1 saves data', scenario: 'Save a record', status: 'manual', step: 1, note: 'Observed record persisted' }] });

test('legacy plans retain legacy gates; resolved policies partition mixed repos', () => {
  assert.deepEqual(testingScope('# Old plan'), { legacy: true });
  assert.throws(() => testingScope('# Old plan', { required: true }), /requires a Verification Policy/);
  assert.deepEqual(testingScope(policyPlan('| app | manual | user | Deferred |\n| api | automated | configured | Existing suite |')), { legacy: false, automated: ['api'], manual: ['app'] });
  assert.deepEqual(testingScope(policyPlan('| app | automated | autonomy-default | Setup verified |')), { legacy: false, automated: ['app'], manual: [] });
  assert.deepEqual(testingScope(policyPlan().replace('### `app`', '### `app` <!-- test repos use (test scope only) -->')), { legacy: false, automated: [], manual: ['app'] });
});

test('manual selection requires an explicit decision and policy covers every product repo', () => {
  assert.throws(() => testingPolicy(policyPlan('| app | manual | autonomy-default | No tests |')), /explicit user/);
  assert.throws(() => testingPolicy(policyPlan().replace('### `app`', '### `other`')), /exactly the affected/);
  assert.throws(() => testingPolicy(policyPlan().replace('manual | user', 'suggested | user')), /Invalid verification mode/);
  assert.throws(() => testingPolicy(policyPlan() + '\n## Verification Policy\n'), /Duplicate/);
  assert.throws(() => testingPolicy(policyPlan('| app | automated | configured | Existing |\n| app | manual | user | Deferred |')), /duplicate verification repo/);
  assert.throws(() => testingPolicy(policyPlan().replace('User deferred setup |', '|')), /Incomplete/);
});

test('manual evidence must cover regression scenarios as well as acceptance criteria', () => {
  assert.doesNotThrow(() => validateManualEvidence(policyPlan(), manualLedger()));
  const missingRegression = manualLedger();
  missingRegression.steps[0].checks.pop();
  assert.throws(() => validateManualEvidence(policyPlan(), missingRegression), /Reject invalid input/);
  const unverified = manualLedger();
  unverified.acceptance[0].status = 'unverified';
  assert.throws(() => validateManualEvidence(policyPlan(), unverified), /every acceptance criterion/);
  assert.throws(() => validateManualEvidence(policyPlan().replace('| Manual |', '| Unit |'), manualLedger()), /requires Manual scenarios/);
  assert.throws(() => validateManualEvidence(policyPlan().replace('Reject invalid input | app', 'Save a record | app'), manualLedger()), /must be unique/);
});
