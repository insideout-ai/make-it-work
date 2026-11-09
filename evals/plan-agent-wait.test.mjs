import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('Plan wait fixture starts fresh with an accepted spec and a passing unchanged baseline', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'plan-wait-fixture-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  const baseline = execFileSync('bash', [path.resolve('evals/implement/plan-agent-wait/fixture.sh')], { cwd: root, env, encoding: 'utf8' });
  assert.match(baseline, /tests 3/);
  assert.match(await readFile(path.join(root, 'make-it-work/DEMO-WAIT/DEMO-WAIT-spec.md'), 'utf8'), /Pause in Plan/);
  await assert.rejects(readFile(path.join(root, 'make-it-work/DEMO-WAIT/DEMO-WAIT-state.md')), /ENOENT/);
  assert.equal(execFileSync('git', ['diff', '--name-only', 'HEAD', '--', 'src', 'test'], { cwd: root, encoding: 'utf8' }), '');
});

test('Readiness ordering fixture starts with the accepted diagnostic spec and a clean passing baseline', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'readiness-fixture-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  const baseline = execFileSync('bash', [path.resolve('evals/implement/readiness-order/fixture.sh')], { cwd: root, env, encoding: 'utf8' });
  assert.match(baseline, /tests 3/);
  assert.match(await readFile(path.join(root, 'make-it-work/DEMO-READY/DEMO-READY-spec.md'), 'utf8'), /pause in Plan/);
  await assert.rejects(readFile(path.join(root, 'make-it-work/DEMO-WAIT/DEMO-WAIT-spec.md')), /ENOENT/);
  await assert.rejects(readFile(path.join(root, 'make-it-work/DEMO-READY/DEMO-READY-state.md')), /ENOENT/);
  assert.equal(execFileSync('git', ['diff', '--name-only', 'HEAD', '--', 'src', 'test'], { cwd: root, encoding: 'utf8' }), '');
});
