// New full-delivery plans reconstruct the saved result before choosing commit paths.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const fail = message => { throw new Error(message); };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const objectId = value => typeof value === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value);
const paths = bytes => bytes.toString('utf8').split('\0').filter(Boolean).sort();
const deliveryPaths = ['--', '.', ':(exclude)make-it-work'];
function git(repo, args, options = {}) {
  const { allowFailure = false, ...spawnOptions } = options;
  const result = spawnSync('git', ['-C', repo, ...args], { maxBuffer: 100 * 1024 * 1024, ...spawnOptions });
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFailure) fail(`Cannot construct full delivery: ${result.stderr.toString('utf8').trim()}`);
  return result;
}
const output = (repo, args, options) => git(repo, args, options).stdout;
const changedPaths = (repo, before, after) => paths(output(repo, ['diff', '--no-ext-diff', '--no-textconv', '--name-only', '--no-renames', '-z', before, after, ...deliveryPaths]));

export async function fullDeliveryScope(repo, reviewedDiff) {
  if (!objectId(repo.head) || !objectId(repo.merge_base)) fail('Full delivery requires pinned source commits.');
  if (hash(reviewedDiff) !== repo.diff_sha256) fail(`Saved package diff changed in ${repo.name}.`);
  const directory = await mkdtemp(path.join(os.tmpdir(), 'miw-full-delivery-'));
  let tree, detail;
  try {
    const env = { ...process.env, GIT_INDEX_FILE: path.join(directory, 'index') };
    // Standard Git prefixes and diff.noprefix both occur in saved package diffs.
    // Each attempt is confined to this disposable index; no refs or files move.
    for (const strip of [1, 0]) {
      git(repo.path, ['read-tree', repo.merge_base], { env });
      if (reviewedDiff.length) {
        // A tracked deletion followed by an untracked restoration can appear
        // twice in the packet and cancel out in its resulting tree. Bind the
        // interpreted packet paths, rather than assuming each survives as a diff.
        const stats = git(repo.path, ['apply', '--numstat', '-z', `-p${strip}`, '-'], { input: reviewedDiff, allowFailure: true });
        const packetPaths = stats.stdout.toString('utf8').split('\0').filter(Boolean).map(row => row.slice(row.indexOf('\t', row.indexOf('\t') + 1) + 1));
        if (stats.status !== 0 || JSON.stringify([...new Set(packetPaths)].sort()) !== JSON.stringify([...repo.paths].sort())) {
          detail = 'Patch paths do not match the saved package with this prefix convention.';
          continue;
        }
        const applied = git(repo.path, ['apply', '--cached', '--binary', '--whitespace=nowarn', `-p${strip}`, '-'], { env, input: reviewedDiff, allowFailure: true });
        if (applied.status !== 0) { detail = applied.stderr.toString('utf8').trim(); continue; }
      }
      const candidate = output(repo.path, ['write-tree'], { env }).toString('utf8').trim();
      const actual = changedPaths(repo.path, repo.merge_base, candidate);
      if (actual.every(file => repo.paths.includes(file))) { tree = candidate; break; }
      detail = 'Reconstructed paths differ from the saved package.';
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
  if (!tree) fail(`Cannot reconstruct the saved package result in ${repo.name}; no source files were staged. ${detail ?? ''}`);
  const commitPaths = changedPaths(repo.path, repo.head, tree);
  return {
    paths: [...new Set([...repo.paths, ...commitPaths])].sort(),
    scope: {
      reviewed_tree: tree, source_paths: repo.paths, commit_paths: commitPaths,
      reversal_paths: commitPaths.filter(file => !repo.paths.includes(file)),
    },
  };
}

export function assertFullDeliveryTree(repo, scope, tree) {
  if (!objectId(tree) || !objectId(scope.reviewed_tree)) fail('Full delivery requires pinned tree objects.');
  const matches = git(repo.path, ['diff', '--no-ext-diff', '--no-textconv', '--quiet', scope.reviewed_tree, tree, ...deliveryPaths], { allowFailure: true });
  const artifacts = git(repo.path, ['diff', '--no-ext-diff', '--no-textconv', '--quiet', repo.head, tree, '--', ':(literal)make-it-work'], { allowFailure: true });
  if (matches.status !== 0 || artifacts.status !== 0) fail(`Full delivery tree differs from the saved package result in ${repo.name}.`);
}
