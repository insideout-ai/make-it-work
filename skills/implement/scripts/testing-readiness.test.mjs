import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { digest } from '../../../scripts/lib/artifacts.mjs';
import { initializeWorkflow, applyWorkflow } from './workflow.mjs';
import { parseState } from './render-status.mjs';
import { authorizePlanningTests } from './planning-tests.mjs';
import { checkTestingReadiness, readinessPaths, testingReadiness } from './testing-readiness.mjs';

const policy = '| Repo | Mode | Decision | Reason |\n| --- | --- | --- | --- |\n| app | automated | configured | Existing Node runner |';
const report = ({ status = 'ready', setup = 'existing', baseline = 'pass', evidence = 'node --test: 1 behavior assertion passed' } = {}) => `# Testing readiness\n\n## Verification Policy\n\n${policy}\n\n## Readiness results\n\n| Repo | Status | Setup | Baseline | Evidence |\n| --- | --- | --- | --- | --- |\n| app | ${status} | ${setup} | ${baseline} | ${evidence} |\n`;
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'readiness-order-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-C', root, ...args], { stdio: 'pipe' });
  git('init', '-q', '-b', 'feature');
  await writeFile(path.join(root, 'app.js'), 'module.exports = 1;\n');
  await mkdir(path.join(root, 'test'));
  git('add', '.'); git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'Baseline');
  const initialized = await initializeWorkflow(root, { ticket: 'DEMO', autonomy: 'autopilot', base: 'main', repos: [root], branch_guard: 'Feature branch' });
  const statePath = initialized.state, dir = path.dirname(statePath), spec = 'make-it-work/DEMO/DEMO-spec.md';
  await writeFile(path.join(root, spec), '# Accepted spec\n');
  await writeFile(statePath, (await readFile(statePath, 'utf8')).replace('phase: context-check', 'phase: plan').replace('mode: none', 'mode: tdd').replace('mode_source: none', 'mode_source: assessed').replace('risk: none', 'risk: medium').replace('risk_rationale: none', 'risk_rationale: Changed behavior').replace('spec: none', `spec: ${spec}`).replace('spec_hash: none', `spec_hash: ${digest('# Accepted spec\n')}`));
  const planPath = path.join(dir, 'DEMO-plan.md');
  await writeFile(planPath, `# Plan\n\n## Execution Status\n\n**Mode:** Inline — execute here.\n\n**Progress:** Step 0 of 1 complete.\n\n## Verification Policy\n\n${policy}\n\n## Steps\n\n### Step 1 — Feature\n\n**Tests:** app: \`test/progression.test.js\`, node --test, progression pending\n\n## Test Plan\n\n**AC traceability:**\n\n| Acceptance criterion | Requirement clause | Test scenario |\n| --- | --- | --- |\n| AC1 | New behavior | Progression |\n`);
  const state = async () => parseState(await readFile(statePath, 'utf8'), statePath);
  const paths = readinessPaths((await state()).fields);
  const save = (text = report()) => writeFile(path.join(root, paths.report), text);
  const check = async (plan = null) => checkTestingReadiness(root, await state(), { plan });
  const authorize = () => authorizePlanningTests(statePath, { repo: root, file: 'test/progression.test.js', kind: 'test-file', step: 1, reason: 'Progression assertion' });
  return { root, statePath, dir, planPath, state, paths, save, check, authorize };
}

test('pending readiness prevents planning test authorization even when a delegate has written ready text', async (t) => {
  const f = await fixture(t);
  await assert.rejects(f.authorize(), /readiness has not begun/);
  await testingReadiness(f.statePath, 'begin'); await f.save();
  await assert.rejects(f.authorize(), /readiness is pending/);
  await assert.rejects(f.check(), /readiness is pending/);
  assert.equal((await f.state()).fields.testing_readiness, 'none');
  await assert.rejects(readFile(path.join(f.root, 'make-it-work/DEMO/DEMO-planning-tests.json')), /ENOENT/);
  await testingReadiness(f.statePath, 'complete');
  assert.equal((await f.check()).ready, true);
  await f.authorize();
});

test('completion is idempotent and accepts later progression-red tests without rewriting the readiness baseline', async (t) => {
  const f = await fixture(t);
  const begun = await testingReadiness(f.statePath, 'begin');
  assert.equal((await testingReadiness(f.statePath, 'begin')).reused, true);
  await f.save(); await testingReadiness(f.statePath, 'complete');
  const saved = await readFile(f.statePath, 'utf8'), sealed = await readFile(path.join(f.root, begun.receipt), 'utf8');
  await testingReadiness(f.statePath, 'complete');
  assert.equal(await readFile(f.statePath, 'utf8'), saved);
  assert.equal(await readFile(path.join(f.root, begun.receipt), 'utf8'), sealed);
  assert.equal((await testingReadiness(f.statePath, 'begin')).reused, true);
  await f.authorize();
  await writeFile(path.join(f.root, 'test/progression.test.js'), "const assert = require('node:assert/strict'); assert.equal(require('../app'), 2);\n");
  assert.throws(() => execFileSync(process.execPath, ['test/progression.test.js'], { cwd: f.root, stdio: 'pipe' }));
  assert.equal((await f.check(await readFile(f.planPath, 'utf8'))).results[0].Baseline, 'pass');
});

test('pending/blocked reports and failed new setup cannot be completed; existing baseline failures stay explicit', async (t) => {
  const f = await fixture(t); await testingReadiness(f.statePath, 'begin');
  for (const data of [{ status: 'pending' }, { status: 'blocked' }, { setup: 'established', baseline: 'fail' }, { setup: 'established', baseline: 'not-run' }]) {
    await f.save(report(data)); await assert.rejects(testingReadiness(f.statePath, 'complete'), /readiness|setup/);
  }
  await f.save(report({ baseline: 'fail', evidence: 'Known pre-existing regression failed; configured runner retained, planning handles the baseline decision' }));
  await testingReadiness(f.statePath, 'complete');
  assert.equal((await f.check()).results[0].Baseline, 'fail');
});

test('scope/spec/plan/report and policy drift invalidate completion without advancing workflow', async (t) => {
  const f = await fixture(t); await testingReadiness(f.statePath, 'begin'); await f.save(); await testingReadiness(f.statePath, 'complete');
  const savedState = await readFile(f.statePath, 'utf8'), savedReport = await readFile(path.join(f.root, f.paths.report), 'utf8');
  await f.save(savedReport + '\nLate worker write\n'); await assert.rejects(f.check(), /changed after completion/);
  await f.save(savedReport);
  const plan = await readFile(f.planPath, 'utf8');
  await assert.rejects(f.check(plan.replace('Existing Node runner', 'Different choice')), /policy differs/);
  await writeFile(path.join(f.dir, 'DEMO-spec.md'), '# changed\n'); await assert.rejects(f.check(), /unchanged accepted spec/);
  await writeFile(path.join(f.dir, 'DEMO-spec.md'), '# Accepted spec\n');
  await writeFile(f.statePath, savedState.replace('plan_version: 1', 'plan_version: 2')); await assert.rejects(f.check(), /has not begun/);
  await writeFile(f.statePath, savedState.replace('"branch":"feature"', '"branch":"other"')); await assert.rejects(f.check(), /pending or stale/);
  await writeFile(f.statePath, savedState);
  assert.equal((await f.check()).ready, true);
});

test('controller refuses a completed plan until readiness is complete', async (t) => {
  const f = await fixture(t), handoffs = path.join(f.dir, 'DEMO-handoffs'); await mkdir(handoffs);
  const handoff = 'make-it-work/DEMO/DEMO-handoffs/plan-1.json';
  await writeFile(path.join(f.root, handoff), JSON.stringify({ version: 1, ticket: 'DEMO', stage: 'plan', plan_version: 1, status: 'done', outcome: 'PLAN_SAVED', artifacts: { plan: 'make-it-work/DEMO/DEMO-plan.md' }, data: { mode: 'initial', steps_added: null, recommend_replan: null, context_updated: [] } }));
  const before = await readFile(f.statePath, 'utf8');
  const run = () => applyWorkflow({ root: f.root, statePath: f.statePath, input: { event: 'handoff', id: 'plan-ready', handoff, repos: [f.root], expected_hash: digest(before) } });
  await assert.rejects(run(), /readiness has not begun/);
  assert.equal(await readFile(f.statePath, 'utf8'), before);
  await testingReadiness(f.statePath, 'begin'); await f.save(); await testingReadiness(f.statePath, 'complete');
  const result = await applyWorkflow({ root: f.root, statePath: f.statePath, input: { event: 'handoff', id: 'plan-ready', handoff, repos: [f.root], expected_hash: digest(await readFile(f.statePath, 'utf8')) } });
  assert.equal(result.fields.phase, 'execute');
});

test('explicit manual policy and legacy runs preserve their existing choices', async (t) => {
  const f = await fixture(t); await testingReadiness(f.statePath, 'begin');
  await f.save(report({ status: 'manual', setup: 'manual', baseline: 'not-applicable', evidence: 'User explicitly deferred tooling' }).replace('automated | configured | Existing Node runner', 'manual | user | User explicitly deferred tooling'));
  await testingReadiness(f.statePath, 'complete'); assert.equal((await f.check()).policy[0].Mode, 'manual');
  await writeFile(f.statePath, (await readFile(f.statePath, 'utf8')).replace(/^testing_readiness_version:.*\n/m, ''));
  await rm(path.join(f.root, f.paths.receipt));
  assert.equal((await f.check()).required, false);
  assert.equal((await testingReadiness(f.statePath, 'begin')).required, false);
});

test('Guided approval cannot enter Execute with a late readiness write, and does not consume the approval', async (t) => {
  const f = await fixture(t); await testingReadiness(f.statePath, 'begin'); await f.save(); await testingReadiness(f.statePath, 'complete');
  await writeFile(f.statePath, (await readFile(f.statePath, 'utf8')).replace('autonomy: autopilot', 'autonomy: guided'));
  const handoffs = path.join(f.dir, 'DEMO-handoffs'); await mkdir(handoffs);
  const handoff = 'make-it-work/DEMO/DEMO-handoffs/plan-1.json';
  await writeFile(path.join(f.root, handoff), JSON.stringify({ version: 1, ticket: 'DEMO', stage: 'plan', plan_version: 1, status: 'done', outcome: 'PLAN_SAVED', artifacts: { plan: 'make-it-work/DEMO/DEMO-plan.md' }, data: { mode: 'initial', steps_added: null, recommend_replan: null, context_updated: [] } }));
  const apply = async (input) => applyWorkflow({ root: f.root, statePath: f.statePath, input: { repos: [f.root], expected_hash: digest(await readFile(f.statePath, 'utf8')), ...input } });
  const waiting = await apply({ event: 'handoff', id: 'plan-ready', handoff });
  const before = await readFile(f.statePath, 'utf8'), savedReport = await readFile(path.join(f.root, f.paths.report), 'utf8');
  await f.save(savedReport + '\nLate readiness-worker update\n');
  const answer = { event: 'resolve-input', id: 'approve-plan', pending_id: waiting.pending[0].id, answer: 'approve', source: 'user', via: 'chat' };
  await assert.rejects(apply(answer), /changed after completion/);
  assert.equal(await readFile(f.statePath, 'utf8'), before);
  await f.save(savedReport);
  assert.equal((await apply(answer)).fields.phase, 'execute');
});
