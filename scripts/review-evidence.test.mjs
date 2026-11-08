import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { captureReviewEvidence, compareReviewScope, uiVerification } from './lib/review-evidence.mjs';

test('scope evidence covers selected repos and binary, deleted and untracked diffs; later edits remain uncovered', async (t) => {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'review-evidence-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const roots = {}, snapshots = [];
  for (const name of ['app', 'service']) {
    const repo = path.join(root, name);
    await mkdir(repo);
    const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim();
    git('init', '-q', '-b', 'main');
    await writeFile(path.join(repo, 'removed.txt'), 'remove me\n');
    git('add', '.');
    git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'Baseline');
    const base = git('rev-parse', 'HEAD');
    await rm(path.join(repo, 'removed.txt'));
    await writeFile(path.join(repo, 'new.bin'), Buffer.from([0, 1, 255, 0]));
    roots[name] = repo;
    snapshots.push({ name, path: repo, merge_base: base, paths: ['removed.txt', 'new.bin'] });
  }
  const evidence = await captureReviewEvidence({ ticket: 'DEMO', working_tree: true, repo_roots: roots,
    review_scope: Object.keys(roots).map((repo) => ({ repo, base: 'main', scope: 'branch', paths: ['removed.txt', 'new.bin'] })),
    ui_verification: { status: 'not-applicable', note: 'Only backend changes.' } }, '# Reviewed\n');
  assert.deepEqual(compareReviewScope(evidence, snapshots).map((repo) => repo.status), ['covered', 'covered']);
  await writeFile(path.join(roots.app, 'new.bin'), Buffer.from([0, 2, 255, 0]));
  await writeFile(path.join(roots.app, 'post-review.md'), '# Final context sync\n');
  snapshots[0].paths.push('post-review.md');
  const compared = compareReviewScope(evidence, snapshots);
  assert.deepEqual(compared[0].uncovered_paths, ['new.bin', 'post-review.md']);
  assert.equal(compared[1].status, 'covered');
  assert.equal(compareReviewScope(null, snapshots)[0].status, 'unknown');
  await assert.rejects(captureReviewEvidence({ working_tree: false, review_scope: [{}] }, ''), /working_tree/);
  await assert.rejects(captureReviewEvidence({ working_tree: true, repo_roots: roots,
    review_scope: [{ repo: 'app', base: 'main', scope: 'branch', paths: ['../escape'] }] }, ''), /Invalid reviewed path/);
});

test('missing browser evidence stays pending and every recorded disposition requires a reason', () => {
  assert.equal(uiVerification().status, 'pending');
  for (const status of ['passed', 'pending', 'not-applicable']) {
    assert.throws(() => uiVerification({ status }), /observation or reason/);
  }
  assert.throws(() => uiVerification({ status: 'failed', note: 'Layout broken' }), /Invalid UI/);
});
