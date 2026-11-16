import { artifactJoin } from '../scripts/lib/artifact-path.mjs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { gradeHeadlessLocal, parseGrader, transcriptContext } from './grade-headless.mjs';

const evalRoot = path.dirname(fileURLToPath(import.meta.url));
const cli = artifactJoin(evalRoot, '../skills/implement/scripts/deliver.mjs');

for (const scenario of ['prepare', 'decline', 'stale']) {
  test(`delivery ${scenario} fixture and artifact graders preserve completion and perform no publication`, async (t) => {
    const root = await mkdtemp(artifactJoin(os.tmpdir(), 'delivery-handoff-eval-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    const caseDir = artifactJoin(evalRoot, 'implement', `delivery-${scenario}`);
    execFileSync('bash', [artifactJoin(caseDir, 'fixture.sh')], { cwd: root });
    const artifacts = artifactJoin(root, 'make-it-work/DEMO');
    const state = artifactJoin(artifacts, 'DEMO-state.md');
    const originalState = await readFile(state, 'utf8');
    const originalPackage = await readFile(artifactJoin(artifacts, 'DEMO-final-package.json'), 'utf8');
    const originalSource = await readFile(artifactJoin(root, 'src/policy.js'), 'utf8');
    const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
    const head = JSON.parse(await readFile(artifactJoin(artifacts, 'fixture-baseline.json'), 'utf8')).head;
    const context = transcriptContext(JSON.stringify({ type: 'result', result: 'Local fixture verification; no model was run.' }), root);
    const grade = async (name) => gradeHeadlessLocal(parseGrader(
      await readFile(artifactJoin(caseDir, 'graders', name), 'utf8'), name), context);
    const run = (action) => execFileSync(process.execPath, [cli, action, '--root', root, '--state', state],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

    if (scenario === 'stale') {
      assert.throws(() => run('prepare'), /stale/i);
      assert.equal((await grade('no-plan.md')).passed, true);
    } else {
      assert.equal((await grade('delivery-state.md')).passed, false);
      if (scenario === 'prepare') {
        assert.equal((await grade('plan-created.md')).passed, false);
        const result = JSON.parse(run('prepare'));
        assert.match(result.sha256, /^[a-f0-9]{64}$/);
        assert.equal((await grade('plan-created.md')).passed, true);
      } else {
        run('decline');
        assert.equal((await grade('no-plan.md')).passed, true);
      }
    }
    assert.equal((await grade('delivery-state.md')).passed, true);
    assert.equal((await grade('implementation-complete.md')).passed, true);
    assert.equal(await readFile(state, 'utf8'), originalState);
    assert.equal(await readFile(artifactJoin(artifacts, 'DEMO-final-package.json'), 'utf8'), originalPackage);
    assert.equal(await readFile(artifactJoin(root, 'src/policy.js'), 'utf8'), originalSource);
    assert.equal(git('rev-parse', 'HEAD'), head);
    assert.equal(git('diff', '--cached', '--name-only'), '');
    assert.equal(git('--git-dir', artifactJoin(root, '.git/fixture-origin.git'), 'for-each-ref'), '');
    assert.deepEqual(JSON.parse(await readFile(artifactJoin(artifacts, 'DEMO-delivery-progress.json'), 'utf8')).repos, {});
  });
}
