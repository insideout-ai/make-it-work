import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { parseGrader } from './grade-headless.mjs';

const caseDir = path.resolve('evals/implement/planning-progress');

test('planning progress fixture has a passing protected baseline and a real missing behavior', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'planning-progress-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  const output = execFileSync('bash', [path.join(caseDir, 'fixture.sh')], { cwd: root, env, encoding: 'utf8' });
  assert.match(output, /pass 2/);
  const same = async (file, baseline) => assert.equal(await readFile(path.join(root, file), 'utf8'), await readFile(path.join(root, baseline), 'utf8'));
  await same('src/policy.js', '.eval-baseline-policy.js');
  await same('test/policy.test.js', '.eval-baseline-regression.txt');
  await same('make-it-work/DEMO-PROGRESS/DEMO-PROGRESS-spec.md', '.eval-baseline-spec.md');
  await assert.rejects(readFile(path.join(root, 'make-it-work/DEMO-PROGRESS/DEMO-PROGRESS-state.md')), /ENOENT/);
  await writeFile(path.join(root, 'test/admin.test.js'), `const test = require('node:test');
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
  const graders = await Promise.all((await readdir(path.join(caseDir, 'graders'))).map(async name => parseGrader(await readFile(path.join(caseDir, 'graders', name), 'utf8'), name)));
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
