import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { validateVerification } from '../skills/implement/scripts/verification.mjs';

const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
for (const [name, supported] of [['review-the-code-false-parity', false], ['review-the-code-shared-parity', true]]) {
  test(`${name}: real passing evidence distinguishes unsupported and supported shared coverage`, async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'review-parity-fixture-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    const fixture = path.join(import.meta.dirname, 'review-the-code', name, 'fixture.sh');
    execFileSync('bash', [fixture], { cwd: root, env, stdio: 'pipe' });
    const prefix = path.join(root, 'make-it-work/PAY-200/PAY-200');
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
      const source = await readFile(path.join(root, 'src/connector.js'), 'utf8');
      await writeFile(path.join(root, 'src/connector.js'), source.replace("code: 'FAILOVER', retry: true", "code: 'INVALID_INPUT', retry: false"));
      assert.equal(runTests().status, 1, 'Reference-comparison assertions must catch an error-parity mutation.');
    } else {
      assert.notDeepEqual(probe.actualError, probe.referenceError);
      assert.notDeepEqual(probe.actualCancel, probe.referenceCancel);
      assert.equal(runTests().status, 0, 'Happy-path assertions pass despite real error and cancellation parity defects.');
    }
    assert.notEqual(spawnSync('bash', [fixture], { cwd: root, env, encoding: 'utf8' }).status, 0);
  });
}
