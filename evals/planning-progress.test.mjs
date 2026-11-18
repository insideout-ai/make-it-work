import { artifactJoin } from '../scripts/lib/artifact-path.mjs';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { parseGrader } from './grade-headless.mjs';

const caseDir = path.resolve('evals/implement/planning-progress');

test('workflow fixtures leave accepted artifacts untracked so guarded writers can save evidence', async (t) => {
  for (const [fixture, directory, spec] of [
    ['evals/plan-the-work/embedded-tests/fixture.sh', 'embedded-tests', 'DEMO-EMBED/DEMO-EMBED-spec.md'],
    ['evals/write-the-tests/standalone/fixture.sh', 'test-preparation', 'TEST-1/TEST-1-spec.md'],
  ]) {
    const root = await mkdtemp(artifactJoin(os.tmpdir(), 'workflow-artifact-fixture-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    execFileSync('bash', [path.resolve(fixture)], { cwd: root });
    const project = artifactJoin(root, directory);
    assert.match(await readFile(artifactJoin(project, 'make-it-work', spec), 'utf8'), /discount/i);
    assert.equal(execFileSync('git', ['ls-files', '--', 'make-it-work'], { cwd: project, encoding: 'utf8' }), '');
    assert.equal(spawnSync('git', ['check-ignore', '-q', 'make-it-work/probe.md'], { cwd: project }).status, 0);
  }
});

test('planning progress fixture has a passing protected baseline and a real missing behavior', async (t) => {
  const root = await mkdtemp(artifactJoin(os.tmpdir(), 'planning-progress-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  const output = execFileSync('bash', [artifactJoin(caseDir, 'fixture.sh')], { cwd: root, env, encoding: 'utf8' });
  assert.match(output, /pass 2/);
  const same = async (file, baseline) => assert.equal(await readFile(artifactJoin(root, file), 'utf8'), await readFile(artifactJoin(root, baseline), 'utf8'));
  await same('src/policy.js', '.eval-baseline-policy.js');
  await same('test/policy.test.js', '.eval-baseline-regression.txt');
  await same('make-it-work/DEMO-PROGRESS/DEMO-PROGRESS-spec.md', '.eval-baseline-spec.md');
  await assert.rejects(readFile(artifactJoin(root, 'make-it-work/DEMO-PROGRESS/DEMO-PROGRESS-state.md')), /ENOENT/);
  await writeFile(artifactJoin(root, 'test/admin.test.js'), `const test = require('node:test');
const assert = require('node:assert/strict');
const { canProceed } = require('../src/policy');
test('administrator is allowed', () => assert.equal(canProceed('admin'), true));
`);
  const red = spawnSync('node', ['--test', '--test-reporter=tap', 'test/admin.test.js'], { cwd: root, env, encoding: 'utf8' });
  assert.equal(red.status, 1);
  assert.match(red.stdout, /ERR_ASSERTION/);
  assert.match(red.stdout, /false !== true/);
  assert.equal(spawnSync('node', ['--test', 'test/policy.test.js'], { cwd: root, env }).status, 0);
  await same('src/policy.js', '.eval-baseline-policy.js');
  assert.equal(execFileSync('git', ['diff', '--name-only', 'HEAD', '--', 'src', 'test/policy.test.js'], { cwd: root, encoding: 'utf8' }), '');
});

test('planning progress graders accept the actual handoff schema and reject an executed state', async () => {
  const graders = await Promise.all((await readdir(artifactJoin(caseDir, 'graders'))).map(async name => parseGrader(await readFile(artifactJoin(caseDir, 'graders', name), 'utf8'), name)));
  const handoff = graders.find(g => g.name === 'handoff.md');
  const handoffPattern = new RegExp(handoff.pattern, handoff.flags);
  assert.ok(handoffPattern.test(JSON.stringify({ version: 1, status: 'done', outcome: 'PLAN_SAVED' })));
  assert.ok(!handoffPattern.test(JSON.stringify({ version: 1, status: 'blocked' })));
  const paused = graders.find(g => g.name === 'paused-plan.md');
  const pattern = new RegExp(paused.pattern, paused.flags);
  const state = 'status: Paused\nphase: plan-approval\nexecution: not-started\ncurrent_activity: none\n';
  assert.ok(pattern.test(state));
  assert.ok(!pattern.test(state.replace('not-started', 'passed')));
  assert.ok(!pattern.test(state.replace('phase: plan-approval', 'phase: execute')));
});
