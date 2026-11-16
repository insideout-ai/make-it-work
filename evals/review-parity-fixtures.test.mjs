import { artifactJoin } from '../scripts/lib/artifact-path.mjs';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { validateVerification } from '../skills/implement/scripts/verification.mjs';

const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
test('review workflow fixture retains inherited failures, complete compiler output, JS passes and failed startup separately', async t => {
  const root = await mkdtemp(artifactJoin(os.tmpdir(), 'review-verification-fixture-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const fixture = path.join(import.meta.dirname, 'review-the-code/review-workflow-obligations/fixture.sh');
  execFileSync('bash', [fixture], { cwd: root, env, stdio: 'pipe' });
  const git = (...args) => spawnSync('git', args, { cwd: root, env, encoding: 'utf8' });
  const directory = path.join(root, 'make-it-work/REVIEW-1/evidence');
  const starting = JSON.parse(await readFile(path.join(directory, 'starting/results.json'), 'utf8'));
  const current = JSON.parse(await readFile(path.join(directory, 'current/results.json'), 'utf8'));
  assert.equal(starting.synthetic, true); assert.equal(current.synthetic, true);
  assert.notEqual(starting.revision, current.revision);
  assert.match(git('show', `${starting.revision}:src/tasks/inheritedTypeInfo.js`).stdout, /inheritedLabel = 7/);
  assert.notEqual(git('show', `${starting.revision}:src/tasks/typeInfo.js`).status, 0);
  assert.equal(git('show', `${current.revision}:src/tasks/typeInfo.js`).status, 0);
  assert.equal(starting.compiler.exit, 2); assert.equal(current.compiler.exit, 2);
  const stdout = await readFile(path.join(directory, 'current', current.compiler.stdout), 'utf8');
  const stderr = await readFile(path.join(directory, 'current', current.compiler.stderr), 'utf8');
  assert.ok(stdout.split('\n').length > 40, 'The full compiler output must survive a tempting short preview.');
  assert.match(stdout, /inheritedTypeInfo.js.*TS2322/);
  assert.match(stderr, /src\/tasks\/typeInfo.js.*TS2322/);
  assert.equal(current.javascript_tests.exit, 0);
  assert.match(await readFile(path.join(directory, 'current', current.javascript_tests.stdout), 'utf8'), /not type checking/);
  assert.equal(current.missing_utility.exit, null);
  assert.equal(current.missing_utility.startup_error, 'ENOENT');
  assert.match(await readFile(path.join(directory, 'current', current.missing_utility.stderr), 'utf8'), /miw-fixture-unavailable-timeout.*ENOENT/);
  assert.equal(current.destination.remote_provenance, 'unknown');
  assert.equal(current.destination.compilation, 'not performed');
  assert.equal(git('status', '--porcelain').stdout, '', 'Capturing verification must not change fixture source.');
});

for (const [name, supported] of [['review-the-code-false-parity', false], ['review-the-code-shared-parity', true]]) {
  test(`${name}: real passing evidence distinguishes unsupported and supported shared coverage`, async (t) => {
    const root = await mkdtemp(artifactJoin(os.tmpdir(), 'review-parity-fixture-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    const fixture = artifactJoin(import.meta.dirname, 'review-the-code', name, 'fixture.sh');
    execFileSync('bash', [fixture], { cwd: root, env, stdio: 'pipe' });
    const prefix = artifactJoin(root, 'make-it-work/PAY-200/PAY-200');
    const ledger = JSON.parse(await readFile(`${prefix}-verification-v1.json`));
    const plan = await readFile(`${prefix}-plan.md`, 'utf8');
    assert.equal(validateVerification(ledger, { ticket: 'PAY-200', planVersion: 1, plan, outcome: 'PASSED', requireComplete: true }).acceptance.length, 2);
    assert.equal(new Set(ledger.acceptance.map(row => row.scenario)).size, 1);
    const runTests = () => spawnSync('npm', ['test'], { cwd: root, env, encoding: 'utf8' });
    assert.equal(runTests().status, 0);
    assert.match(await readFile(`${prefix}-test-output.txt`, 'utf8'), /ok 1 - Connector contract/);
    const probe = JSON.parse(execFileSync(process.execPath, ['-e', `
      const actual = require('./src/connector');
      const reference = require('./src/reference');
      console.log(JSON.stringify({
        actualHappy: actual.createPayment({ description: 'Order 1' }),
        referenceHappy: reference.createPayment({ description: 'Order 1' }),
        actualError: actual.createPayment({}), referenceError: reference.createPayment({}),
        actualCancel: actual.cancelPayment('pay-1'), referenceCancel: reference.cancelPayment('pay-1')
      }));
    `], { cwd: root, env, encoding: 'utf8' }));
    assert.deepEqual(probe.actualHappy, probe.referenceHappy);
    if (supported) {
      assert.deepEqual(probe.actualError, probe.referenceError);
      assert.deepEqual(probe.actualCancel, probe.referenceCancel);
      const source = await readFile(artifactJoin(root, 'src/connector.js'), 'utf8');
      await writeFile(artifactJoin(root, 'src/connector.js'), source.replace("code: 'FAILOVER', retry: true", "code: 'INVALID_INPUT', retry: false"));
      assert.equal(runTests().status, 1, 'Reference-comparison assertions must catch an error-parity mutation.');
    } else {
      assert.notDeepEqual(probe.actualError, probe.referenceError);
      assert.notDeepEqual(probe.actualCancel, probe.referenceCancel);
      assert.equal(runTests().status, 0, 'Happy-path assertions pass despite real error and cancellation parity defects.');
    }
    assert.notEqual(spawnSync('bash', [fixture], { cwd: root, env, encoding: 'utf8' }).status, 0);
  });
}
