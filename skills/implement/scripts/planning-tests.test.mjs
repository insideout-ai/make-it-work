import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { digest } from '../../../scripts/lib/artifacts.mjs';
import { initializeWorkflow } from './workflow.mjs';
import { parseState } from './render-status.mjs';
import { testingReadiness } from './testing-readiness.mjs';
import { prematureImplementation } from './implementation-guard.mjs';
import { authorizePlanningTests, planningReceiptPath } from './planning-tests.mjs';

async function planningFixture(t, { files = {}, dirty = false } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'planning-tests-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-C', root, ...args], { stdio: 'pipe' });
  git('init', '-q', '-b', 'feature');
  await writeFile(path.join(root, 'app.js'), 'module.exports = 1;\n');
  await mkdir(path.join(root, 'test'));
  for (const [file, text] of Object.entries(files)) await writeFile(path.join(root, file), text);
  git('add', '.'); git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'Baseline');
  if (dirty) await writeFile(path.join(root, 'test/policy.test.js'), '// pre-existing local test edits\n');
  const initialized = await initializeWorkflow(root, { ticket: 'DEMO', autonomy: 'autopilot', base: 'main', repos: [root], branch_guard: 'Feature branch' });
  const spec = 'make-it-work/DEMO/DEMO-spec.md';
  await writeFile(path.join(root, spec), '# Spec: return 2\n');
  const statePath = initialized.state;
  await writeFile(statePath, (await readFile(statePath, 'utf8')).replace('phase: context-check', 'phase: plan').replace('mode: none', 'mode: tdd').replace('mode_source: none', 'mode_source: assessed').replace('risk: none', 'risk: medium').replace('risk_rationale: none', 'risk_rationale: Existing caller changes').replace('spec: none', `spec: ${spec}`).replace('spec_hash: none', `spec_hash: ${digest('# Spec: return 2\n')}`));
  const planPath = path.join(root, 'make-it-work/DEMO/DEMO-plan.md');
  await writeFile(planPath, '# Plan\n\n## Steps\n\n### Step 1 — Change behavior\n\n**Tests:** app: `test/policy.test.js`, `app.py`, `app.js`, `test/new.test.js`, `test/other.test.js`, `test/linked.test.js`, `test/é space.test.js`, node --test, progression pending\n');
  const readiness = await testingReadiness(statePath, 'begin');
  await writeFile(path.join(root, readiness.report), '# Readiness\n\n## Verification Policy\n\n| Repo | Mode | Decision | Reason |\n| --- | --- | --- | --- |\n| app | automated | configured | Node runner is available |\n\n## Readiness results\n\n| Repo | Status | Setup | Baseline | Evidence |\n| --- | --- | --- | --- | --- |\n| app | ready | existing | not-run | Guard-only fixture; no baseline run requested here |\n');
  await testingReadiness(statePath, 'complete');
  const currentState = async () => parseState(await readFile(statePath, 'utf8'), statePath);
  const check = async () => prematureImplementation(initialized, await currentState());
  const authorize = (extra = {}) => authorizePlanningTests(statePath, { repo: root, file: 'test/policy.test.js', kind: 'test-file', step: 1, reason: 'Progression assertion for new behavior', ...extra });
  return { root, git, initialized, statePath, planPath, currentState, check, authorize };
}

test('a preauthorized real red test is allowed in Plan/approval but production, other tests and commits stay guarded', async (t) => {
  const f = await planningFixture(t, { files: { 'test/policy.test.js': "const assert = require('node:assert/strict');\nassert.equal(require('../app'), 1);\n" } });
  await f.authorize();
  await writeFile(path.join(f.root, 'test/policy.test.js'), "const assert = require('node:assert/strict');\nassert.equal(require('../app'), 2);\n");
  assert.throws(() => execFileSync(process.execPath, ['test/policy.test.js'], { cwd: f.root, stdio: 'pipe' }), /Command failed/);
  assert.equal(await f.check(), null);
  assert.equal((await f.authorize()).replayed, true);
  await writeFile(f.statePath, (await readFile(f.statePath, 'utf8')).replace('phase: plan', 'phase: plan-approval'));
  assert.equal(await f.check(), null);
  await writeFile(path.join(f.root, 'app.js'), 'module.exports = 2;\n');
  assert.match(await f.check(), /Application files changed/);
  await writeFile(path.join(f.root, 'app.js'), 'module.exports = 1;\n');
  await writeFile(path.join(f.root, 'test/other.test.js'), '// undeclared authorization\n');
  assert.match(await f.check(), /Application files changed/);
  await rm(path.join(f.root, 'test/other.test.js'));
  f.git('add', 'test/policy.test.js');
  assert.equal(await f.check(), null, 'staging changes does not change their scope');
  f.git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'Not permitted during Plan');
  assert.match(await f.check(), /Application files changed/);
});

test('new and already-dirty tests retain their pre-run baseline and do not authorize deletions', async (t) => {
  const f = await planningFixture(t, { files: { 'test/policy.test.js': '// original\n' }, dirty: true });
  await f.authorize();
  await f.authorize({ file: 'test/new.test.js' });
  await writeFile(path.join(f.root, 'test/policy.test.js'), '// pre-existing local test edits\n// planned assertion\n');
  await writeFile(path.join(f.root, 'test/new.test.js'), '// new planned assertion\n');
  assert.equal(await f.check(), null);
  await rm(path.join(f.root, 'test/policy.test.js'));
  assert.match(await f.check(), /Application files changed/);
});

test('late authorization cannot forgive tests written in an earlier phase or before the checkpoint', async (t) => {
  const f = await planningFixture(t);
  await writeFile(path.join(f.root, 'test/policy.test.js'), '// too early\n');
  assert.match(await f.check(), /Application files changed/);
  await f.authorize();
  assert.match(await f.check(), /Application files changed/);
});

test('embedded test edits preserve production bytes on both sides and cannot widen the region', async (t) => {
  const source = 'def value():\n    return 1\n\nclass ValueTests(unittest.TestCase):\n    def test_value(self):\n        self.assertEqual(value(), 1)\n\ndef other():\n    return 3\n';
  const f = await planningFixture(t, { files: { 'app.py': source } });
  const input = { file: 'app.py', kind: 'embedded', start_line: 4, end_line: 6 };
  await f.authorize(input);
  await writeFile(path.join(f.root, 'app.py'), source.replace('self.assertEqual(value(), 1)', 'self.assertEqual(value(), 2)\n        self.assertIsInstance(value(), int)'));
  assert.equal(await f.check(), null);
  await assert.rejects(f.authorize({ ...input, start_line: 1 }), /Cannot widen/);
  await writeFile(path.join(f.root, 'app.py'), source.replace('return 1', 'return 2').replace('self.assertEqual(value(), 1)', 'self.assertEqual(value(), 2)'));
  assert.match(await f.check(), /Application files changed/);
  await writeFile(path.join(f.root, 'app.py'), source.replace('return 3', 'return 4'));
  assert.match(await f.check(), /Application files changed/);
});

test('authorization rejects wrong phase, source paths, undeclared tests, changed spec and escaping links', async (t) => {
  const f = await planningFixture(t);
  await assert.rejects(f.authorize({ file: 'app.js' }), /dedicated test path/);
  await assert.rejects(f.authorize({ file: 'test/not-declared.test.js' }), /declare the exact/);
  await assert.rejects(f.authorize({ repo: os.tmpdir() }), /approved scope/);
  await symlink(path.join(f.root, 'app.js'), path.join(f.root, 'test/linked.test.js'));
  await assert.rejects(f.authorize({ file: 'test/linked.test.js' }), /regular file/);
  await writeFile(f.statePath, (await readFile(f.statePath, 'utf8')).replace('phase: plan', 'phase: close-the-gaps'));
  await assert.rejects(f.authorize(), /active TDD Plan/);
  await writeFile(f.statePath, (await readFile(f.statePath, 'utf8')).replace('phase: close-the-gaps', 'phase: plan'));
  await writeFile(path.join(f.root, 'make-it-work/DEMO/DEMO-spec.md'), '# changed\n');
  await assert.rejects(f.authorize(), /unchanged accepted spec/);
});

test('run/plan/spec drift, removed declarations and malformed receipts never release the guard', async (t) => {
  const f = await planningFixture(t);
  await f.authorize();
  await writeFile(path.join(f.root, 'test/policy.test.js'), '// planned test\n');
  const receipt = planningReceiptPath(f.statePath), saved = await readFile(receipt, 'utf8');
  for (const field of ['start_time', 'ticket', 'plan_version', 'spec_hash']) {
    const value = JSON.parse(saved); value[field] = 'other'; await writeFile(receipt, JSON.stringify(value));
    assert.match(await f.check(), /Application files changed/);
  }
  await writeFile(receipt, '{'); assert.match(await f.check(), /Application files changed/);
  await writeFile(receipt, saved);
  await writeFile(f.planPath, (await readFile(f.planPath, 'utf8')).replace('`test/policy.test.js`', '`test/new.test.js`'));
  assert.match(await f.check(), /Application files changed/);
});

test('approved sibling test edits stay scoped and older initializer baselines fail closed', async (t) => {
  const f = await planningFixture(t), sibling = await planningFixture(t);
  const selected = [...JSON.parse(f.initialized.fields.workspace_snapshot), ...JSON.parse(sibling.initialized.fields.workspace_snapshot)];
  await writeFile(f.statePath, (await readFile(f.statePath, 'utf8')).replace(/^workspace_snapshot:.*$/m, `workspace_snapshot: ${JSON.stringify(selected)}`));
  f.initialized.implementation_baseline.push(...sibling.initialized.implementation_baseline);
  await testingReadiness(f.statePath, 'begin', { restart: true });
  await testingReadiness(f.statePath, 'complete');
  await f.authorize({ repo: sibling.root });
  await writeFile(path.join(sibling.root, 'test/policy.test.js'), '// planned sibling test\n');
  assert.equal(await f.check(), null);
  const old = { ...f.initialized, implementation_baseline: f.initialized.implementation_baseline.map(({ changes, ...entry }) => entry) };
  assert.match(await prematureImplementation(old, await f.currentState()), /Application files changed/);
  await writeFile(path.join(f.root, 'app.js'), '// changed product\n');
  assert.match(await f.check(), /Application files changed/);
});

test('literal Unicode paths and clean-filtered tracked tests preserve their original Git baseline', async (t) => {
  const f = await planningFixture(t, { files: { 'test/policy.test.js': '// baseline\n' } });
  f.git('config', 'core.autocrlf', 'true');
  await writeFile(path.join(f.root, 'test/policy.test.js'), '// baseline\r\n');
  await f.authorize();
  await f.authorize({ file: 'test/é space.test.js' });
  await writeFile(path.join(f.root, 'test/policy.test.js'), '// baseline\r\n// planned assertion\r\n');
  await writeFile(path.join(f.root, 'test/é space.test.js'), '// planned assertion\n');
  assert.equal(await f.check(), null);
});

test('a nonstandard test path needs a separate-test identity in an approved repo map', async (t) => {
  const f = await planningFixture(t, { files: { 'verify.js': '// existing test\n' } });
  await writeFile(f.planPath, (await readFile(f.planPath, 'utf8')).replace('**Tests:**', '**Tests:** `verify.js`, '));
  await assert.rejects(f.authorize({ file: 'verify.js' }), /dedicated test path/);
  await mkdir(path.join(f.root, '.claude/testing'), { recursive: true });
  const mapPath = path.join(f.root, '.claude/testing/test-map.json');
  const map = { schemaVersion: 1, productRepo: 'app', repos: [{ id: 'app', root: '.' }], tokens: [], locations: [{ id: 'local', repo: 'app', paths: ['.'], config: [], complete: false, assessedTokens: [] }], tests: [{ id: 'verify', location: 'local', file: 'verify.js', identity: 'Existing behavior checks', placement: 'embedded', granularity: 'file', selector: null }], mappings: [], decisions: [], snapshots: {} };
  await writeFile(mapPath, JSON.stringify(map));
  await assert.rejects(f.authorize({ file: 'verify.js' }), /dedicated test path/);
  map.tests[0].placement = 'separate'; await writeFile(mapPath, JSON.stringify(map));
  await f.authorize({ file: 'verify.js' });
  await writeFile(path.join(f.root, 'verify.js'), '// extended test\n');
  assert.equal(await f.check(), null);
});

test('replans, escalations and fix planning after implementation require no startup authorization', async (t) => {
  const f = await planningFixture(t);
  const saved = await readFile(f.statePath, 'utf8');
  for (const route of ['execute', 'lightweight']) for (const phase of ['plan', 'fix-plan']) {
    await writeFile(f.statePath, saved.replace('phase: plan', `phase: ${phase}`).trimEnd() + `\n| ${parseState(saved).audit.length + 1} | ${new Date(parseState(saved).audit.at(-1).epoch + 1).toISOString()} | plan | ${route} | Implementation authorized |\n`);
    assert.equal((await f.authorize()).required, false);
    await assert.rejects(readFile(planningReceiptPath(f.statePath)), /ENOENT/);
  }
});

test('executable doctest edits stay within their declared source region', async (t) => {
  const source = 'def value():\n    """Return a value.\n\n    >>> value()\n    1\n    """\n    return 1\n';
  const f = await planningFixture(t, { files: { 'app.py': source } });
  await f.authorize({ file: 'app.py', kind: 'embedded', start_line: 4, end_line: 5 });
  await writeFile(path.join(f.root, 'app.py'), source.replace('    1\n    """', '    2\n    """'));
  assert.equal(await f.check(), null);
  await writeFile(path.join(f.root, 'app.py'), source.replace('return 1', 'return 2'));
  assert.match(await f.check(), /Application files changed/);
});

test('legacy states without controller baseline metadata keep their original planning path', async (t) => {
  const f = await planningFixture(t);
  await writeFile(f.statePath, (await readFile(f.statePath, 'utf8')).replace(/^controller_version:.*\n/m, '').replace(/^workspace_snapshot:.*\n/m, ''));
  assert.equal((await f.authorize()).required, false);
  await assert.rejects(readFile(planningReceiptPath(f.statePath)), /ENOENT/);
});
