import { artifactJoin } from '../../../scripts/lib/artifact-path.mjs';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { readVerification, traceability, validateVerification } from './verification.mjs';
import { parseState } from './render-status.mjs';
import { checkpointResult } from './dashboard-checkpoint.mjs';
import { digest } from '../../../scripts/lib/artifacts.mjs';

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
  const root = await mkdtemp(artifactJoin(os.tmpdir(), 'verification-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(artifactJoin(root, 'make-it-work', 'DEMO'), { recursive: true });
  await writeFile(artifactJoin(root, 'make-it-work/DEMO/DEMO-verification-v1.json'), JSON.stringify(ledger()));
  const planPath = artifactJoin(root, 'make-it-work/DEMO/DEMO-plan.md');
  await writeFile(planPath, plan);
  assert.equal((await readVerification(root, 'make-it-work/DEMO/DEMO-verification-v1.json', { ticket: 'DEMO', planVersion: 1, plan, outcome: 'PASSED' })).ticket, 'DEMO');
  const cli = path.resolve('skills/implement/scripts/verification.mjs');
  const result = JSON.parse(execFileSync(process.execPath, [cli, 'check', '--root', root, '--file', 'make-it-work/DEMO/DEMO-verification-v1.json',
    '--ticket', 'DEMO', '--plan-version', '1', '--plan', planPath, '--outcome', 'PASSED'], { encoding: 'utf8' }));
  assert.equal(result.valid, true);
  const statePath = artifactJoin(root, 'make-it-work/DEMO/DEMO-state.md');
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
  await writeFile(artifactJoin(root, 'make-it-work/DEMO/DEMO-verification-v1.json'), JSON.stringify({ ...ledger(), acceptance: [] }));
  assert.throws(() => execFileSync(process.execPath, auditedArgs, { stdio: 'pipe' }));
  assert.equal(await readFile(statePath, 'utf8'), saved);
  await assert.rejects(readVerification(root, '../DEMO-verification-v1.json', { ticket: 'DEMO', planVersion: 1 }), /Invalid verification artifact path/);
});

test('accepts a scoped+full verification gate', () => {
  const scoped = { ...ledger(), gate: { mode: 'scoped+full', result: 'pass', note: 'scoped then full suite passed' } };
  assert.equal(validateVerification(scoped, { ticket: 'DEMO', planVersion: 1, plan, outcome: 'PASSED' }).gate.mode, 'scoped+full');
});

test('documented complete gate satisfies policy and omitted suite evidence fails', async () => {
  const doc = await readFile(new URL('../references/verification.md', import.meta.url), 'utf8');
  const gate = JSON.parse(doc.match(/<!-- workflow-findings: full-suite-gate-example -->\s*```json\n([\s\S]*?)\n```/)[1]);
  const policyPlan = plan.replace('## Steps', '## Verification Policy\n\n| Repo | Mode | Decision | Reason |\n| --- | --- | --- | --- |\n| api | automated | configured | Existing runner |\n\n## Steps');
  const options = { ticket: 'DEMO', planVersion: 1, plan: policyPlan, outcome: 'PASSED' };
  assert.equal(validateVerification({ ...ledger(), gate }, options).gate.result, 'pass');
  delete gate.full_suites;
  assert.throws(() => validateVerification({ ...ledger(), gate }, options), /every automated product repo/);
});

test('manual completion requires an authorized policy and observed evidence, never an automated pass', () => {
  const options = { ticket: 'DEMO', planVersion: 1, plan: manualPlan, outcome: 'VERIFIED_MANUALLY' };
  assert.equal(validateVerification(manualLedger(), options).gate.result, 'manual-accepted');
  assert.throws(() => validateVerification(manualLedger(), { ...options, plan }), /all-manual policy/);
  assert.throws(() => validateVerification(manualLedger(), { ...options, plan: null }), /requires the plan/);
  assert.equal(validateVerification(manualLedger(), { ...options, plan: manualPlan.replace('manual | user', 'manual | autonomy-default') }).gate.result, 'manual-accepted');
  assert.throws(() => validateVerification({ ...manualLedger(), steps: [] }, { ...options, plan: manualPlan.replace('manual | user', 'manual | autonomy-default') }), /unknown step|passing evidence/);
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


async function auditedFixture(t) {
  const root = await mkdtemp(artifactJoin(os.tmpdir(), 'verification-audit-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = artifactJoin(root, 'make-it-work/DEMO');
  await mkdir(directory, { recursive: true });
  const statePath = artifactJoin(directory, 'DEMO-state.md');
  const dashboard = artifactJoin(directory, 'DEMO-status.html');
  const fixture = await readFile('evals/implement/feedback-clean/fixture/fixture-artifacts/DEMO-state.md', 'utf8');
  await writeFile(statePath, fixture.replace('phase: final-sync', 'phase: final-approval').replace('real_rows_from: 1', 'real_rows_from: 1\nverification_version: 1\nfinal_package_version: 1'));
  await writeFile(artifactJoin(directory, 'DEMO-plan.md'), plan);
  const relative = 'make-it-work/DEMO/DEMO-verification-v1.json';
  await writeFile(artifactJoin(root, relative), JSON.stringify(ledger()));
  await writeFile(dashboard, 'previous dashboard');
  const argv = [path.resolve('skills/implement/scripts/verification.mjs'), 'check', '--root', root, '--file', relative,
    '--ticket', 'DEMO', '--plan-version', '1', '--plan', artifactJoin(directory, 'DEMO-plan.md'), '--outcome', 'PASSED', '--state', statePath];
  return { root, directory, statePath, dashboard, argv };
}

test('audited CLI completes when the existing final dashboard imports verification again', async t => {
  const f = await auditedFixture(t);
  const run = spawnSync(process.execPath, f.argv, { encoding: 'utf8', timeout: 15000 });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(JSON.parse(run.stdout).valid, true);
  assert.doesNotMatch(run.stderr, /unsettled top-level await/i);
  assert.match(await readFile(f.dashboard, 'utf8'), /Acceptance verification/);
  const saved = await readFile(f.statePath, 'utf8');
  assert.match(parseState(saved).audit.at(-1).outcome, /Verification ledger validated/);
  const retry = spawnSync(process.execPath, f.argv, { encoding: 'utf8', timeout: 15000 });
  assert.equal(retry.status, 0, retry.stderr);
  assert.equal(await readFile(f.statePath, 'utf8'), saved);
});


const invoke = argv => spawnSync(process.execPath, argv, { encoding: 'utf8', timeout: 15000 });
async function retryReporting(f, result) {
  const input = path.join(f.root, 'retained-result-note.json');
  await writeFile(input, JSON.stringify(result.checkpoint.retry.input));
  return invoke([path.resolve('skills/implement/scripts/dashboard-checkpoint.mjs'), 'result', '--state', result.checkpoint.retry.state, '--input', input]);
}

test('dashboard failure returns valid evidence and a reporting-only retry without duplicate audit rows', async t => {
  const f = await auditedFixture(t), initial = parseState(await readFile(f.statePath, 'utf8'));
  await rm(f.dashboard); await symlink(path.join(f.root, 'absent-target'), f.dashboard);
  const run = invoke(f.argv);
  assert.equal(run.status, 0, run.stderr);
  const result = JSON.parse(run.stdout);
  assert.equal(result.valid, true); assert.equal(result.checkpoint.status, 'pending');
  assert.match(result.checkpoint.warning, /regular file/);
  const recorded = await readFile(f.statePath, 'utf8');
  assert.deepEqual(parseState(recorded).fields, initial.fields);
  assert.equal(parseState(recorded).audit.length, initial.audit.length + 1);
  // Retry consumes the retained note, not the original verification command.
  // Missing evidence remains visibly missing in the refreshed view.
  await rm(f.dashboard); await writeFile(f.dashboard, 'previous dashboard');
  await rm(artifactJoin(f.directory, 'DEMO-verification-v1.json'));
  const retry = await retryReporting(f, result);
  assert.equal(retry.status, 0, retry.stderr); assert.ok(JSON.parse(retry.stdout).dashboard);
  assert.equal(await readFile(f.statePath, 'utf8'), recorded);
  assert.equal((await retryReporting(f, result)).status, 0);
  assert.equal(await readFile(f.statePath, 'utf8'), recorded);
});

test('audit conflict preserves the validation result and retry cannot overwrite the conflicting note', async t => {
  const f = await auditedFixture(t), original = await readFile(f.statePath, 'utf8');
  const id = `verification:${digest(JSON.stringify(ledger()))}:PASSED`;
  await checkpointResult(f.statePath, { id, text: 'Different historical result', reference: 'historical.json' });
  const conflicting = await readFile(f.statePath, 'utf8');
  const run = invoke(f.argv), result = JSON.parse(run.stdout);
  assert.equal(run.status, 0, run.stderr); assert.equal(result.valid, true);
  assert.match(result.checkpoint.warning, /different result/);
  assert.equal(await readFile(f.statePath, 'utf8'), conflicting);
  const rejected = await retryReporting(f, result);
  assert.equal(rejected.status, 1); assert.match(rejected.stderr, /different result/);
  assert.equal(await readFile(f.statePath, 'utf8'), conflicting);
  // After the actual conflict is repaired, retain the exact validated result.
  await writeFile(f.statePath, original);
  assert.equal((await retryReporting(f, result)).status, 0);
  const recovered = parseState(await readFile(f.statePath, 'utf8'));
  assert.equal(recovered.audit.at(-1).note.id, id);
  assert.deepEqual(recovered.fields, parseState(original).fields);
});

test('invalid evidence and mismatched state remain failures without successful output or audit mutation', async t => {
  for (const problem of ['evidence', 'ticket', 'plan-version']) {
    const f = await auditedFixture(t);
    if (problem === 'evidence') await writeFile(artifactJoin(f.directory, 'DEMO-verification-v1.json'), JSON.stringify({ ...ledger(), acceptance: [] }));
    else {
      const state = await readFile(f.statePath, 'utf8');
      await writeFile(f.statePath, problem === 'ticket' ? state.replace('ticket: DEMO', 'ticket: OTHER') : state.replace('plan_version: 1', 'plan_version: 2'));
    }
    const original = await readFile(f.statePath, 'utf8'), run = invoke(f.argv);
    assert.equal(run.status, 1, problem); assert.equal(run.stdout, '');
    assert.ok(run.stderr.trim()); assert.doesNotMatch(run.stderr, /unsettled top-level await/i);
    assert.equal(await readFile(f.statePath, 'utf8'), original);
    assert.equal(await readFile(f.dashboard, 'utf8'), 'previous dashboard');
  }
});
