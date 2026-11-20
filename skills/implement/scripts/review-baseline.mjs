// Review provenance is independent of the application-edit enforcement baseline.
import { execFileSync } from 'node:child_process';
import { lstat, readFile, readlink, realpath } from 'node:fs/promises';
import path from 'node:path';
import { digest, fail } from '../../../scripts/lib/artifacts.mjs';

const git = (root, args) => execFileSync('git', ['-C', root, ...args], { maxBuffer: 100 * 1024 * 1024 });
const paths = ['--', '.', ':(exclude)make-it-work'];
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

export function readReviewBaseline(fields) {
  if (fields.review_baseline_version === undefined && fields.review_baseline === undefined) return null;
  let saved;
  try { saved = JSON.parse(fields.review_baseline); } catch { fail('Review baseline is unreadable; preserve the starting evidence.'); }
  if (fields.review_baseline_version !== '1' || saved?.version !== 1 || saved.ticket !== fields.ticket || saved.runId !== fields.start_time || !Array.isArray(saved.repos) || !saved.repos.length) fail('Invalid review baseline run binding.');
  const roots = new Set();
  for (const repo of saved.repos) {
    if (!repo || typeof repo.root !== 'string' || !path.isAbsolute(repo.root) || roots.has(repo.root) ||
        typeof repo.captured_at !== 'string' || !Number.isFinite(Date.parse(repo.captured_at)) || typeof repo.branch !== 'string' || !/^[a-f0-9]{40,64}$/.test(repo.head) || !Array.isArray(repo.changes)) fail('Invalid review baseline repository.');
    roots.add(repo.root);
    const files = new Set();
    for (const entry of repo.changes) {
      if (!entry || typeof entry.file !== 'string' || !entry.file || entry.file.includes('\0') || path.isAbsolute(entry.file) ||
          entry.file.split('/').includes('..') || files.has(entry.file) || typeof entry.tracked !== 'boolean' ||
          (entry.image !== null && (!entry.image || !['file', 'symlink'].includes(entry.image.type) || !Number.isInteger(entry.image.mode) || entry.image.mode < 0 || (entry.image.mode & ~0o111) !== 0 || !hash(entry.image.sha256)))) fail('Invalid review baseline file evidence.');
      files.add(entry.file);
    }
  }
  return saved;
}

// Missing or corrupt advisory evidence must never become a workflow-wide gate.
// Keep the strict reader for validation; callers must not invent replacement history.
export function reviewBaselineEvidence(fields) {
  try {
    const baseline = readReviewBaseline(fields);
    if (!baseline && fields.review_reconciliation_version !== undefined) throw new Error('Original review baseline is unavailable.');
    return { baseline };
  } catch (error) { return { baseline: null, warning: `Review provenance unavailable: ${error.message}` }; }
}

export async function captureReviewRepos(roots, capturedAt = new Date().toISOString()) {
  const repos = [];
  for (const input of roots) {
    const root = await realpath(input);
    if (repos.some(repo => repo.root === root)) fail('Duplicate review baseline repository.');
    const list = args => git(root, args).toString('utf8').split('\0').filter(Boolean);
    const untracked = new Set(list(['ls-files', '--others', '--exclude-standard', '-z', ...paths]));
    const changed = new Set([
      ...list(['diff', '--name-only', '--no-renames', '-z', 'HEAD', ...paths]),
      ...list(['diff', '--cached', '--name-only', '--no-renames', '-z', 'HEAD', ...paths]),
    ]);
    const changes = [];
    for (const file of [...new Set([...changed, ...untracked])].sort()) {
      let image = null;
      try {
        const absolute = path.join(root, file), info = await lstat(absolute);
        if (info.isFile() || info.isSymbolicLink()) image = { type: info.isSymbolicLink() ? 'symlink' : 'file', mode: info.mode & 0o111, sha256: digest(info.isSymbolicLink() ? await readlink(absolute) : await readFile(absolute)) };
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
      // A staged removal can also appear as an untracked on-disk file. Keep it
      // classified with tracked changes so ignoring it cannot hide mixed work.
      changes.push({ file, tracked: changed.has(file), image });
    }
    repos.push({ root, captured_at: capturedAt, branch: git(root, ['symbolic-ref', '--short', 'HEAD']).toString().trim(), head: git(root, ['rev-parse', 'HEAD']).toString().trim(), changes });
  }
  return repos.sort((a, b) => a.root.localeCompare(b.root));
}
