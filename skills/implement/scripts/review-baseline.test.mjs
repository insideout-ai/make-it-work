import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { captureReviewRepos, readReviewBaseline, reviewBaselineEvidence } from './review-baseline.mjs';
import { digest } from '../../../scripts/lib/artifacts.mjs';

const git = (root, ...args) => execFileSync('git', ['-C', root, ...args], { stdio: 'pipe' });
async function fixture(t) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'review-provenance-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  git(root, 'init', '-qb', 'feature'); git(root, 'config', 'user.name', 'Test'); git(root, 'config', 'user.email', 'test@example.invalid');
  await writeFile(path.join(root, 'source.txt'), 'before');
  await writeFile(path.join(root, '.gitignore'), 'ignored.txt\nmake-it-work/\n');
  git(root, 'add', '.'); git(root, 'commit', '-qm', 'Baseline');
  return root;
}
const runId = '2026-11-19T10:00:00Z';
const fields = repos => ({ ticket: 'DEMO', start_time: runId, review_baseline_version: '1', review_baseline: JSON.stringify({ version: 1, ticket: 'DEMO', runId, repos }) });

test('review inventory captures notes, skills, docs and tracked edits without contents or ignored artifacts', async t => {
  const root = await fixture(t);
  for (const dir of ['.claude/skills/local', 'docs', 'make-it-work/DEMO']) await mkdir(path.join(root, dir), { recursive: true });
  for (const file of ['.claude/skills/local/SKILL.md', 'docs/local.md', 'notes [x]* café.md', 'ignored.txt', 'make-it-work/DEMO/local.md']) await writeFile(path.join(root, file), 'private-content-not-to-save');
  await writeFile(path.join(root, 'source.txt'), 'staged change'); git(root, 'add', 'source.txt');
  await writeFile(path.join(root, 'source.txt'), 'unstaged change');
  await chmod(path.join(root, 'docs/local.md'), 0o740);
  const status = git(root, 'status', '--porcelain=v1', '-z');
  const repos = await captureReviewRepos([root], runId), saved = readReviewBaseline(fields(repos));
  assert.deepEqual(saved.repos[0].changes.map(entry => entry.file), ['.claude/skills/local/SKILL.md', 'docs/local.md', 'notes [x]* café.md', 'source.txt']);
  assert.equal(saved.repos[0].changes.find(entry => entry.file === 'source.txt').tracked, true);
  assert.equal(saved.repos[0].changes.find(entry => entry.file === 'docs/local.md').image.mode, 0o100);
  assert.equal(saved.repos[0].changes.find(entry => entry.file === 'source.txt').image.sha256, digest('unstaged change'));
  assert.ok(!JSON.stringify(saved).includes('private-content-not-to-save'));
  assert.deepEqual(git(root, 'status', '--porcelain=v1', '-z'), status);
});

test('symlink evidence hashes the link text without following its target', async t => {
  const root = await fixture(t);
  await symlink('/outside/not-present', path.join(root, 'local-link'));
  const [repo] = await captureReviewRepos([root], runId);
  assert.equal(repo.changes[0].image.sha256, digest('/outside/not-present'));
  assert.equal(repo.changes[0].tracked, false);
});

test('a staged removal with a remaining local file is never an untracked exclusion candidate', async t => {
  const root = await fixture(t);
  git(root, 'rm', '--cached', 'source.txt');
  const [repo] = await captureReviewRepos([root], runId);
  assert.equal(repo.changes.find(entry => entry.file === 'source.txt').tracked, true);
});

test('tracked inventory retains an index-only change even when worktree bytes match HEAD', async t => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'source.txt'), 'staged edit'); git(root, 'add', 'source.txt');
  await writeFile(path.join(root, 'source.txt'), 'before');
  const [repo] = await captureReviewRepos([root], runId);
  assert.equal(repo.changes.find(entry => entry.file === 'source.txt').tracked, true);
  assert.equal(repo.changes.find(entry => entry.file === 'source.txt').image.sha256, digest('before'));
  assert.notEqual(git(root, 'diff', '--cached', '--name-only').toString().trim(), '');
});

test('legacy absence is supported; malformed and cross-run review baselines never downgrade', async t => {
  const root = await fixture(t), original = fields(await captureReviewRepos([root], runId));
  assert.equal(readReviewBaseline({}), null);
  assert.throws(() => readReviewBaseline({ ...original, review_baseline: 'bad json' }), /unreadable/);
  for (const change of [{ review_baseline_version: undefined }, { review_baseline_version: '2' }, { ticket: 'OTHER' }, { start_time: '2026-11-20T10:00:00Z' }]) {
    assert.throws(() => readReviewBaseline({ ...original, ...change }), /run binding/);
  }
  for (const entry of [{ file: '../outside', tracked: false, image: null }, { file: 'local', tracked: false, image: { mode: 0, sha256: 'not-a-hash' } }]) {
    const saved = JSON.parse(original.review_baseline); saved.repos[0].changes.push(entry);
    assert.throws(() => readReviewBaseline({ ...original, review_baseline: JSON.stringify(saved) }), /file evidence/);
  }
});


test('advisory consumers report unknown provenance without downgrading to legacy evidence', async t => {
  const root = await fixture(t), original = fields(await captureReviewRepos([root], runId));
  assert.ok(reviewBaselineEvidence(original).baseline);
  assert.deepEqual(reviewBaselineEvidence({}), { baseline: null });
  for (const change of [{ review_baseline: '{bad' }, { review_baseline: undefined }, { ticket: 'OTHER' }]) {
    const report = reviewBaselineEvidence({ ...original, ...change, implementation_baseline: original.review_baseline });
    assert.equal(report.baseline, null); assert.match(report.warning, /provenance unavailable/);
  }
});
