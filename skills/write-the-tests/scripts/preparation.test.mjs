import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { planHash } from '../../../scripts/lib/plan.mjs';
import { checkPreparation, recordPreparation, validatePreparation } from './preparation.mjs';
import { executionControl } from '../../execute/scripts/step-control.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'test-preparation-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'test'));
  await writeFile(path.join(root, 'test/change.test.js'), "require('node:assert/strict').equal(1, 2);\n");
  const plan = '# Plan\n\n**Test preparation contract:** 1\n\n## Execution Status\n\n**Mode:** Subagent-Driven\n\n**Progress:** Step 0 of 1 complete\n\n## Steps\n\n### Step 1 — Change behavior\n\n**Files:** `app.js`\n\n**Depends on:** none\n\n**Can run in parallel with:** none\n\n**Verify:** tests pass\n\n**Tests:** app: `test/change.test.js`, node --test, progression should assert 2\n\n## Test Plan\n\n| Scenario | Repo | Type | File / command |\n| --- | --- | --- | --- |\n| New behavior | app | Unit | step 1, test/change.test.js |\n';
  const file = path.join(root, 'plan.md');
  await writeFile(file, plan);
  const entry = { scenario: 'New behavior', step: 1, repo: 'app', cwd: root, file: 'test/change.test.js', command: 'node --test test/change.test.js', kind: 'progression', result: 'expected-red', reason: 'Assertion expects new behavior', evidence: 'observed test output' };
  const input = { version: 1, plan_hash: planHash(plan), status: 'ready', entries: [entry] };
  return { root, file, plan, input, entry };
}

test('real runtime red is saved separately without changing the plan or execution progress', async t => {
  const f = await fixture(t);
  let output;
  try { execFileSync(process.execPath, [f.entry.file], { cwd: f.root, stdio: 'pipe' }); assert.fail('Expected red'); }
  catch (error) { output = error.stderr?.toString(); assert.match(output, /ERR_ASSERTION/); }
  const saved = await recordPreparation(f.file, f.input);
  const result = await checkPreparation(f.file, { file: saved.file });
  assert.equal(result.status, 'ready');
  assert.equal(await readFile(f.file, 'utf8'), f.plan);
  assert.match(await readFile(saved.report, 'utf8'), /expected-red/);
  assert.equal((await executionControl(f.file, { action: 'start', id: 'first', steps: [1] })).active_steps[0], 1);
});

test('direct execution is blocked until current preparation exists', async t => {
  const f = await fixture(t);
  await assert.rejects(executionControl(f.file, { action: 'start', id: 'first', steps: [1] }), /write-the-tests/);
  await recordPreparation(f.file, f.input);
  await writeFile(path.join(f.root, f.entry.file), '// changed assertion\n');
  await assert.rejects(checkPreparation(f.file), /files changed/);
});

test('changed coverage invalidates preparation; execution-status changes do not', async t => {
  const f = await fixture(t);
  await recordPreparation(f.file, f.input);
  await writeFile(f.file, f.plan.replace('Subagent-Driven', 'Inline'));
  assert.equal((await checkPreparation(f.file)).status, 'ready');
  await writeFile(f.file, f.plan + '\nNew requirement\n');
  await assert.rejects(checkPreparation(f.file), /different plan revision/);
});

test('newest interrupted preparation blocks reuse of an earlier ready report', async t => {
  const f = await fixture(t);
  const first = await recordPreparation(f.file, f.input);
  const second = await recordPreparation(f.file, { ...f.input, status: 'blocked', entries: [] });
  assert.notEqual(first.file, second.file);
  await assert.rejects(checkPreparation(f.file), /blocked/);
  await assert.rejects(checkPreparation(f.file, { file: first.file }), /missing/);
  assert.match(await readFile(first.report, 'utf8'), /expected-red/);
});

test('missing coverage, setup failures posing as success and undeclared files are rejected', async t => {
  const f = await fixture(t);
  for (const change of [
    { entries: [] },
    { entries: [{ ...f.entry, kind: 'regression' }] },
    { entries: [{ ...f.entry, file: 'production.js' }] },
    { entries: [{ ...f.entry, result: 'fail' }] },
    { entries: [{ ...f.entry, result: 'not-run', reason: '' }] },
    { status: 'not-applicable' },
  ]) assert.throws(() => validatePreparation({ ...f.input, ...change }, f.plan));
  const unavailable = await recordPreparation(f.file, { ...f.input, entries: [{ ...f.entry, result: 'not-run', reason: 'Database is unavailable' }] });
  assert.equal((await checkPreparation(f.file, { file: unavailable.file })).entries[0].result, 'not-run');
});

test('manual-only plans are exempt preparation, never a manual verification pass', async t => {
  const f = await fixture(t), plan = f.plan.replace('| Unit |', '| Manual |');
  await writeFile(f.file, plan);
  const input = { version: 1, plan_hash: planHash(plan), status: 'not-applicable', entries: [{ scenario: f.entry.scenario, repo: 'app', step: 1, kind: 'manual', result: 'exempt', reason: 'Explicit manual policy' }] };
  await recordPreparation(f.file, input);
  assert.equal((await checkPreparation(f.file)).status, 'not-applicable');
  assert.throws(() => validatePreparation({ ...input, entries: [{ ...input.entries[0], result: 'pass' }] }, plan), /never a verification pass/);
});

test('legacy plans remain executable without new preparation artifacts', async t => {
  const f = await fixture(t);
  await writeFile(f.file, f.plan.replace('**Test preparation contract:** 1', ''));
  assert.equal((await checkPreparation(f.file)).required, false);
  await assert.rejects(checkPreparation(f.file, { required: true }), /write-the-tests/);
});

test('an accepted baseline failure remains explicitly failed and needs a decision', async t => {
  const f = await fixture(t);
  const entry = { ...f.entry, kind: 'regression', result: 'accepted-failure' };
  assert.throws(() => validatePreparation({ ...f.input, entries: [entry] }, f.plan), /decision/);
  await recordPreparation(f.file, { ...f.input, entries: [{ ...entry, decision: 'User accepted unrelated baseline failure in chat' }] });
  assert.equal((await checkPreparation(f.file)).entries[0].result, 'accepted-failure');
});

test('marked runs can prepare an existing legacy-named plan and discover its prefixed reports', async t => {
  const f = await fixture(t), directory = path.join(f.root, 'make-it-work', 'DEMO');
  await mkdir(directory, { recursive: true });
  const file = path.join(directory, 'DEMO-plan.md');
  await writeFile(file, f.plan);
  await writeFile(path.join(directory, 'miw-run.json'), JSON.stringify({ artifact_naming_version: 1 }));
  const saved = await recordPreparation(file, f.input);
  assert.match(path.basename(saved.file), /^miw-DEMO-plan-tests-1.json$/);
  assert.equal((await checkPreparation(file, { file: saved.file })).status, 'ready');
});
