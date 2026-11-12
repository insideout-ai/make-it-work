// One binary-safe branch-to-base change set for review and delivery.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { realpath } from 'node:fs/promises';
import path from 'node:path';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const fail = (message) => { throw new Error(message); };
function git(repo, args, { acceptDiff = false } = {}) {
  const result = spawnSync('git', ['-C', repo, ...args], { encoding: null, maxBuffer: 100 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0 && !(acceptDiff && result.status === 1)) {
    fail(`git ${args[0]} failed in ${repo}: ${result.stderr.toString('utf8').trim()}`);
  }
  return result.stdout;
}

function uniquePaths(changed, untracked) { return [...new Set([...changed, ...untracked])].sort(); }

export async function snapshotDeliveryRepo(repoPath, base) {
  const repo = await realpath(repoPath);
  if (!base) fail('A base branch is required.');
  const name = path.basename(repo);
  const top = git(repo, ['rev-parse', '--show-toplevel']).toString('utf8').trim();
  if (await realpath(top) !== repo) fail(`Not a repository root: ${repoPath}`);
  const branch = git(repo, ['symbolic-ref', '--quiet', '--short', 'HEAD']).toString('utf8').trim();
  const head = git(repo, ['rev-parse', 'HEAD']).toString('utf8').trim();
  const baseSha = git(repo, ['rev-parse', '--verify', `${base}^{commit}`]).toString('utf8').trim();
  const mergeBase = git(repo, ['merge-base', baseSha, head]).toString('utf8').trim();
  const excludes = ['--', '.', ':(exclude)make-it-work'];
  const trackedDiff = git(repo, ['diff', '--binary', '--no-ext-diff', '--no-renames', mergeBase, ...excludes]);
  const changed = git(repo, ['diff', '--name-only', '--no-renames', '-z', mergeBase, ...excludes]).toString('utf8').split('\0').filter(Boolean);
  const untracked = git(repo, ['ls-files', '--others', '--exclude-standard', '-z', ...excludes]).toString('utf8').split('\0').filter(Boolean).sort();
  const pieces = [trackedDiff];
  for (const relative of untracked) {
    const absolute = path.resolve(repo, relative);
    if (!absolute.startsWith(`${repo}${path.sep}`)) fail(`Untracked path escapes repo: ${relative}`);
    pieces.push(git(repo, ['diff', '--no-index', '--binary', '--no-ext-diff', '--', '/dev/null', relative], { acceptDiff: true }));
  }
  const diff = Buffer.concat(pieces);
  return {
    name, path: repo, base, base_sha: baseSha, merge_base: mergeBase, branch, head,
    paths: uniquePaths(changed, untracked), diff_sha256: sha(diff), diff,
  };
}

