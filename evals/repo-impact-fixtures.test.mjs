import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { parseState } from '../skills/implement/scripts/render-status.mjs';

for (const variant of ['scope', 'missing']) test(`repo impact ${variant} fixture has real contracts, approved scope and immutable inputs`, async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'impact-eval-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  execFileSync('bash', [path.resolve(`evals/implement/repo-impact-${variant}/fixture.sh`)], { cwd: root, stdio: 'pipe' });
  const dir = path.join(root, 'make-it-work/IMPACT-1');
  const state = parseState(await readFile(path.join(dir, 'miw-IMPACT-1-state.md'), 'utf8'));
  assert.equal(state.fields.repo_impact_version, '1');
  assert.equal(state.fields.repo_impact, 'none');
  assert.equal(state.fields.phase, 'plan');
  assert.equal(JSON.parse(state.fields.workspace_contract).repos.length, 4);
  assert.equal(await readFile(path.join(dir, 'miw-IMPACT-1-spec.md'), 'utf8'), await readFile(path.join(root, '.eval-spec.md'), 'utf8'));
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  for (const repo of ['api', 'web', 'context', 'qa']) {
    const cwd = path.join(root, repo);
    assert.equal(await readFile(path.join(cwd, 'app.cjs'), 'utf8'), await readFile(path.join(root, `.eval-${repo}.cjs`), 'utf8'));
    if (repo === 'context' || variant === 'missing' && repo === 'web') await assert.rejects(readFile(path.join(cwd, 'package.json')), /ENOENT/);
    else {
      const output = execFileSync(process.execPath, ['--test', 'test/contract.test.cjs'], { cwd, env, encoding: 'utf8' });
      assert.match(output, /pass 1/);
    }
    assert.equal(execFileSync('git', ['status', '--porcelain'], { cwd, encoding: 'utf8' }), '');
  }
});

test('readiness receipt graders reject the original soft-ready failure and require actual completion', async () => {
  const { parseGrader } = await import('./grade-headless.mjs');
  for (const variant of ['scope', 'missing']) {
    const grader = parseGrader(await readFile(`evals/implement/repo-impact-${variant}/graders/readiness-status.md`, 'utf8'), 'readiness-status.md');
    const pattern = new RegExp(grader.pattern);
    assert.equal(pattern.test(JSON.stringify({ status: 'complete' }, null, 2)), variant === 'scope');
    assert.equal(pattern.test(JSON.stringify({ status: 'pending' }, null, 2)), variant === 'missing');
  }
});
