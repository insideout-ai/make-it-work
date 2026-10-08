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
  await mkdir(path.join(root, 'make-it-work'));
  await writeFile(path.join(root, 'make-it-work/DEMO-verification-v1.json'), JSON.stringify(ledger()));
  const planPath = path.join(root, 'make-it-work/DEMO-plan.md');
  await writeFile(planPath, plan);
  assert.equal((await readVerification(root, 'make-it-work/DEMO-verification-v1.json', { ticket: 'DEMO', planVersion: 1, plan, outcome: 'PASSED' })).ticket, 'DEMO');
  const cli = path.resolve('skills/implement/scripts/verification.mjs');
  const result = JSON.parse(execFileSync(process.execPath, [cli, 'check', '--root', root, '--file', 'make-it-work/DEMO-verification-v1.json',
    '--ticket', 'DEMO', '--plan-version', '1', '--plan', planPath, '--outcome', 'PASSED'], { encoding: 'utf8' }));
  assert.equal(result.valid, true);
  await assert.rejects(readVerification(root, '../DEMO-verification-v1.json', { ticket: 'DEMO', planVersion: 1 }), /Invalid verification artifact path/);
});
