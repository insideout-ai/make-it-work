import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { readVerification, traceability, validateVerification } from './verification.mjs';
import { parseState } from './render-status.mjs';

const plan = '# Plan\n\n## Steps\n\n### Step 1 — Implement\n\n## Test Plan\n\n| Scenario | Type | File / command |\n| --- | --- | --- |\n| Happy path | Unit | test.js |\n\n**AC traceability:**\n\n| Acceptance criterion | Test scenario |\n| --- | --- |\n| AC1 saves a record | Happy path |\n\n## Definition of Done\n';
const ledger = () => ({ version: 1, ticket: 'DEMO', plan_version: 1,
  steps: [{ number: 1, checks: [{ type: 'automated', subject: 'Happy path', command: 'npm test -- test.js', result: 'pass', note: 'Named test passed' }] }],
  gate: { mode: 'full-suite', result: 'pass', note: 'npm test: all passing' },
  acceptance: [{ criterion: 'AC1 saves a record', scenario: 'Happy path', status: 'automated', step: 1, note: 'test.js passed' }] });

const manualPlan = plan.replace('## Steps', '## Verification Policy\n\n| Repo | Mode | Decision | Reason |\n| --- | --- | --- | --- |\n| app | manual | user | User selected manual before planning |\n\n## Steps')
  .replace('| Scenario | Type | File / command |\n| --- | --- | --- |\n| Happy path | Unit | test.js |', '| Scenario | Repo | Type | File / command |\n| --- | --- | --- | --- |\n| Happy path | app | Manual | Start app; save record; observe persistence |');
const manualLedger = () => ({ ...ledger(),
  steps: [{ number: 1, checks: [{ type: 'manual', subject: 'Happy path', command: null, result: 'pass', note: 'Saved record in running app and observed persistence' }] }],
  gate: { mode: 'none', result: 'manual-accepted', note: 'User selected manual verification before planning' },
  acceptance: [{ criterion: 'AC1 saves a record', scenario: 'Happy path', status: 'manual', step: 1, note: 'Observed persistence' }] });

test('checks actual step and AC evidence against plan traceability', () => {
  assert.deepEqual(traceability(plan), [{ criterion: 'AC1 saves a record', scenario: 'Happy path' }]);
  assert.equal(validateVerification(ledger(), { ticket: 'DEMO', planVersion: 1, plan, outcome: 'PASSED' }).gate.result, 'pass');
  assert.throws(() => validateVerification({ ...ledger(), steps: [] }, { ticket: 'DEMO', planVersion: 1, plan, outcome: 'PASSED' }), /unknown step/);
  assert.throws(() => validateVerification({ ...ledger(), acceptance: [] }, { ticket: 'DEMO', planVersion: 1, plan, outcome: 'PASSED' }), /do not match/);
  assert.throws(() => validateVerification({ ...ledger(), gate: { mode: 'full-suite', result: 'fail', note: 'failed' } }, { ticket: 'DEMO', planVersion: 1, plan, outcome: 'PASSED' }), /passing gate/);
  const unverified = ledger();
  unverified.acceptance[0] = { criterion: 'AC1 saves a record', scenario: 'Happy path', status: 'unverified', step: null, note: 'Live dependency unavailable' };
  assert.equal(validateVerification(unverified, { ticket: 'DEMO', planVersion: 1, plan, outcome: 'PASSED' }).acceptance[0].status, 'unverified');
});

test('checks a ledger file stays inside the run root', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'verification-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'make-it-work', 'DEMO'), { recursive: true });
  await writeFile(path.join(root, 'make-it-work/DEMO/DEMO-verification-v1.json'), JSON.stringify(ledger()));
  const planPath = path.join(root, 'make-it-work/DEMO/DEMO-plan.md');
  await writeFile(planPath, plan);
  assert.equal((await readVerification(root, 'make-it-work/DEMO/DEMO-verification-v1.json', { ticket: 'DEMO', planVersion: 1, plan, outcome: 'PASSED' })).ticket, 'DEMO');
  const cli = path.resolve('skills/implement/scripts/verification.mjs');
  const result = JSON.parse(execFileSync(process.execPath, [cli, 'check', '--root', root, '--file', 'make-it-work/DEMO/DEMO-verification-v1.json',
    '--ticket', 'DEMO', '--plan-version', '1', '--plan', planPath, '--outcome', 'PASSED'], { encoding: 'utf8' }));
  assert.equal(result.valid, true);
  const statePath = path.join(root, 'make-it-work/DEMO/DEMO-state.md');
  const fixture = await readFile('evals/implement/feedback-clean/fixture/fixture-artifacts/DEMO-state.md', 'utf8');
  await writeFile(statePath, fixture);
  const before = parseState(fixture);
  const auditedArgs = [cli, 'check', '--root', root, '--file', 'make-it-work/DEMO/DEMO-verification-v1.json',
    '--ticket', 'DEMO', '--plan-version', '1', '--plan', planPath, '--outcome', 'PASSED', '--state', statePath];
  execFileSync(process.execPath, auditedArgs);
  const saved = await readFile(statePath, 'utf8');
  const state = parseState(saved);
  assert.deepEqual(state.fields, before.fields);
  assert.equal(state.audit.at(-1).note.kind, 'result');
  assert.match(state.audit.at(-1).outcome, /Gate: pass; acceptance: 1\/1 verified/);
  execFileSync(process.execPath, auditedArgs);
  assert.equal(await readFile(statePath, 'utf8'), saved);
  await writeFile(path.join(root, 'make-it-work/DEMO/DEMO-verification-v1.json'), JSON.stringify({ ...ledger(), acceptance: [] }));
  assert.throws(() => execFileSync(process.execPath, auditedArgs, { stdio: 'pipe' }));
  assert.equal(await readFile(statePath, 'utf8'), saved);
  await assert.rejects(readVerification(root, '../DEMO-verification-v1.json', { ticket: 'DEMO', planVersion: 1 }), /Invalid verification artifact path/);
});

test('accepts a scoped+full verification gate', () => {
  const scoped = { ...ledger(), gate: { mode: 'scoped+full', result: 'pass', note: 'scoped then full suite passed' } };
  assert.equal(validateVerification(scoped, { ticket: 'DEMO', planVersion: 1, plan, outcome: 'PASSED' }).gate.mode, 'scoped+full');
});

test('manual completion requires an authorized policy and observed evidence, never an automated pass', () => {
  const options = { ticket: 'DEMO', planVersion: 1, plan: manualPlan, outcome: 'VERIFIED_MANUALLY' };
  assert.equal(validateVerification(manualLedger(), options).gate.result, 'manual-accepted');
  assert.throws(() => validateVerification(manualLedger(), { ...options, plan }), /all-manual policy/);
  assert.throws(() => validateVerification(manualLedger(), { ...options, plan: null }), /requires the plan/);
  assert.throws(() => validateVerification(manualLedger(), { ...options, plan: manualPlan.replace('manual | user', 'manual | autonomy-default') }), /explicit user/);
  assert.throws(() => validateVerification(ledger(), options), /accepted manual gate/);
  assert.throws(() => validateVerification({ ...manualLedger(), gate: { mode: 'none', result: 'pass', note: 'Nothing ran' } }, { ...options, outcome: 'PASSED' }), /absent automated gate cannot pass/);
  const unverified = manualLedger();
  unverified.acceptance = [{ ...unverified.acceptance[0], status: 'unverified', step: null }];
  assert.throws(() => validateVerification(unverified, options), /every acceptance criterion/);
  const wrongType = manualLedger();
  wrongType.steps = ledger().steps;
  wrongType.acceptance = ledger().acceptance;
  assert.throws(() => validateVerification(wrongType, options), /no passing evidence/);
});

test('mixed policies require manual observations in addition to a passing automated gate', () => {
  const mixedPlan = manualPlan.replace('| app | manual | user | User selected manual before planning |', '| app | manual | user | User selected manual before planning |\n| api | automated | configured | Existing runner |');
  const mixedLedger = { ...manualLedger(), gate: { mode: 'scoped+full', result: 'pass', note: 'API suite passed; app verified manually', full_suites: [{ repo: 'api', command: 'npm test', result: 'pass', note: 'API full suite executed and passed' }] } };
  const options = { ticket: 'DEMO', planVersion: 1, plan: mixedPlan, outcome: 'PASSED' };
  assert.equal(validateVerification(mixedLedger, options).gate.result, 'pass');
  assert.throws(() => validateVerification({ ...mixedLedger, steps: [{ number: 1, checks: [{ type: 'exempt', subject: 'Other check', command: null, result: 'exempt', note: 'No runtime change' }] }], acceptance: [{ ...ledger().acceptance[0], status: 'unverified', step: null }] }, options), /no passing evidence/);
  assert.throws(() => validateVerification({ ...manualLedger(), gate: { ...manualLedger().gate, full_suites: mixedLedger.gate.full_suites } }, { ...options, outcome: 'VERIFIED_MANUALLY' }), /absent gate/);
  assert.throws(() => validateVerification({ ...mixedLedger, gate: { ...mixedLedger.gate, full_suites: [] } }, options), /every automated product repo/);
  assert.throws(() => validateVerification({ ...mixedLedger, gate: { ...mixedLedger.gate, full_suites: [{ repo: 'api', command: null, result: 'not-run', note: 'Missing service' }] } }, options), /did not all pass/);
});

const clausePlan = plan.replace('| Acceptance criterion | Test scenario |\n| --- | --- |\n| AC1 saves a record | Happy path |',
  '| Acceptance criterion | Requirement clause | Test scenario |\n| --- | --- | --- |\n| AC1 saves a record | Amount includes prepaid products | Happy path |\n| AC1 saves a record | Excludes cancelled orders | Happy path |');
const clauseLedger = () => ({ ...ledger(),
  steps: [{ number: 1, checks: [{ ...ledger().steps[0].checks[0], assertions: [
    { clause: 'Amount includes prepaid products', expected: '100 service + 25 prepaid = 125', observed: '125', source: 'test.js:12 assert.equal(total, 125)' },
  ] }] }],
  acceptance: [
    { ...ledger().acceptance[0], clause: 'Amount includes prepaid products' },
    { ...ledger().acceptance[0], clause: 'Excludes cancelled orders', status: 'unverified', step: null, note: 'No cancelled-order assertion has run.' },
  ] });
const clauseOptions = { ticket: 'DEMO', planVersion: 1, plan: clausePlan, outcome: 'PASSED', requireClauses: true };

test('a passing scenario cannot verify a compound requirement without evidence for each clause', () => {
  const value = clauseLedger();
  assert.equal(validateVerification(value, clauseOptions).acceptance[1].status, 'unverified');
  value.acceptance[1] = { ...value.acceptance[1], status: 'automated', step: 1 };
  assert.throws(() => validateVerification(value, clauseOptions), /Acceptance evidence is missing/);
  value.steps[0].checks[0].assertions.push({ clause: 'Excludes cancelled orders', expected: 'Cancelled 50 does not change total 125', observed: '125 with cancelled order', source: 'test.js:19 assert.equal(totalWithCancelled, 125)' });
  assert.equal(validateVerification(value, clauseOptions).acceptance.every((row) => row.status === 'automated'), true);
});

test('clause contract rejects downgrade, missing/extra/duplicate rows, and incomplete assertion evidence', () => {
  assert.throws(() => validateVerification(ledger(), clauseOptions), /requirement clause/);
  assert.throws(() => validateVerification(clauseLedger(), { ...clauseOptions, plan }), /Requirement clause column/);
  assert.throws(() => validateVerification({ ...clauseLedger(), acceptance: clauseLedger().acceptance.slice(0, 1) }, clauseOptions), /do not match/);
  assert.throws(() => traceability(clausePlan.replace('| Excludes cancelled orders |', '| Amount includes prepaid products |')), /Duplicate AC/);
  for (const field of ['expected', 'observed', 'source', 'clause']) {
    const value = clauseLedger(); delete value.steps[0].checks[0].assertions[0][field];
    assert.throws(() => validateVerification(value, clauseOptions), /assertion/);
  }
  const wrong = clauseLedger(); wrong.steps[0].checks[0].assertions[0].clause = 'Some other requirement';
  assert.throws(() => validateVerification(wrong, clauseOptions), /Acceptance evidence is missing/);
  const noAssertions = clauseLedger(); delete noAssertions.steps[0].checks[0].assertions;
  assert.throws(() => validateVerification(noAssertions, clauseOptions), /Acceptance evidence is missing/);
  // Even without a state marker, clause rows cannot claim name-only verification.
  assert.throws(() => validateVerification(noAssertions, { ...clauseOptions, requireClauses: false }), /Acceptance evidence is missing/);
});

test('manual observations and multiple scenarios keep independent clause evidence', () => {
  const value = clauseLedger();
  value.steps[0].checks[0] = { ...value.steps[0].checks[0], type: 'manual', command: null };
  value.acceptance[0].status = 'manual';
  assert.equal(validateVerification(value, clauseOptions).acceptance[0].status, 'manual');
  const otherScenario = clausePlan.replace('| Excludes cancelled orders | Happy path |', '| Excludes cancelled orders | Cancellation |');
  value.acceptance[1] = { ...value.acceptance[1], scenario: 'Cancellation', status: 'manual', step: 1 };
  value.steps[0].checks[0].assertions.push({ clause: 'Excludes cancelled orders', expected: '125', observed: '125', source: 'Browser walkthrough: order 2 cancelled; total observed' });
  assert.throws(() => validateVerification(value, { ...clauseOptions, plan: otherScenario }), /Acceptance evidence is missing/);
  value.steps[0].checks.push({ ...value.steps[0].checks[0], subject: 'Cancellation' });
  assert.equal(validateVerification(value, { ...clauseOptions, plan: otherScenario }).acceptance[1].status, 'manual');
});
