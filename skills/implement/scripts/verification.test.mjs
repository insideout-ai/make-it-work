import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { readVerification, traceability, validateVerification } from './verification.mjs';

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
