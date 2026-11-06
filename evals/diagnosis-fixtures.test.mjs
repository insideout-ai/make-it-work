import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseState } from '../skills/implement/scripts/render-status.mjs';

const childEnv = { ...process.env };
delete childEnv.NODE_TEST_CONTEXT;
const base = path.dirname(fileURLToPath(import.meta.url));
for (const [folder, variant] of [['execute/diagnosis-first', 'first'], ['execute/diagnosis-repeat', 'repeat'], ['execute/diagnosis-unknown', 'unknown'], ['implement/diagnosis-lightweight', 'lightweight']]) {
  test(`${variant} diagnosis fixture has real failures, recoverable state, and a meaningful correction`, async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'diagnosis-fixture-test-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    const fixture = path.join(base, folder, 'fixture.sh');
    execFileSync('bash', [fixture], { cwd: root, stdio: 'pipe', env: childEnv });
    const tests = () => spawnSync(process.execPath, ['--test', 'test/selection.test.js'], { cwd: root, encoding: 'utf8', env: childEnv });
    assert.equal(tests().status, 1);
    const prefix = path.join(root, 'make-it-work/DIAG-1/DIAG-1');
    assert.match(await readFile(`${prefix}-initial-failure.txt`, 'utf8'), /not ok/);
    const state = parseState(await readFile(`${prefix}-state.md`, 'utf8'));
    assert.equal(state.fields.phase, variant === 'lightweight' ? 'lightweight' : 'execute');
    assert.equal(state.fields.autonomy, 'autopilot');
    if (variant !== 'lightweight') {
      const journal = JSON.parse(await readFile(`${prefix}-plan.md.execution.json`));
      assert.deepEqual(journal.active_steps, [1]);
      assert.equal(journal.attempts[1] ?? 0, variant === 'repeat' ? 1 : 0);
      if (variant === 'repeat') {
        assert.equal(journal.attempt_events['previous-null-guard'], 1);
        assert.match(await readFile(`${prefix}-previous-fix-failure.txt`, 'utf8'), /not ok/);
      }
    } else {
      assert.equal(state.fields.mode, 'lightweight');
      assert.equal(state.fields.fix_cycle, '1');
      assert.equal(state.fields.plan, 'none');
      assert.equal(JSON.parse(await readFile(`${prefix}-handoffs/review-1.json`)).outcome, 'FIX_REQUIRED');
    }
    // A real implementation correction must make all original assertions pass.
    await writeFile(path.join(root, variant === 'unknown' ? 'src/collector.js' : 'src/selection.js'), variant === 'unknown'
      ? 'function collect(selected, fallback) { return selected.length ? [...selected] : [fallback]; }\nmodule.exports = { collect };\n'
      : 'function choose(selected, fallback) { return selected.length ? [...selected] : [fallback]; }\nmodule.exports = { choose };\n');
    assert.equal(tests().status, 0);
    const secondSeed = spawnSync('bash', [fixture], { cwd: root, encoding: 'utf8', env: childEnv });
    assert.notEqual(secondSeed.status, 0);
    assert.match(secondSeed.stderr, /existing repository/);
    assert.equal(tests().status, 0, 'Refusing a second seed must preserve existing work.');
  });
}
