import { lstat, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fail } from './artifacts.mjs';
import { execFileSync } from 'node:child_process';

export const SESSION_MARKER = 'miw-session.json';
export function sessionRepositoryRoot(session, id) {
  return session.version === 2
    ? path.join(session.source_root, '.claude', 'worktrees', path.basename(session.artifact_root))
    : path.join(session.artifact_root, 'repos', id);
}
export async function readSessionWorkspace(root) {
  root = await realpath(root);
  const file = path.join(root, SESSION_MARKER);
  try {
    if (!(await lstat(file)).isFile()) fail('Session marker must be a regular file.');
  } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  const saved = JSON.parse(await readFile(file, 'utf8'));
  if (![1, 2].includes(saved.version) || saved.artifact_root !== root || !path.isAbsolute(saved.source_root ?? '') || saved.source_root === root || saved.source_root.startsWith(root + path.sep) ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(saved.ticket ?? '') || !Array.isArray(saved.repositories) || !saved.repositories.length) fail('Invalid session workspace binding.');
  if (saved.version === 2 && (saved.repositories.length !== 1 ||
      root !== path.join(saved.source_root, '.claude', 'miw-sessions', path.basename(root)) ||
      !path.basename(root).startsWith(saved.ticket + '-') || saved.repositories[0].source_root !== saved.source_root)) fail('Invalid single-repo session binding.');
  const ids = new Set();
  for (const repo of saved.repositories) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(repo.id ?? '') || ids.has(repo.id) ||
        !path.isAbsolute(repo.source_root ?? '') || repo.root !== sessionRepositoryRoot(saved, repo.id)) fail('Invalid session repository binding.');
    ids.add(repo.id);
  }
  return saved;
}

// Look only at known managed layouts, never scan arbitrary ancestors or sessions.
export async function findSessionWorkspace(directory, checkoutRoot) {
  const candidates = new Set([directory]);
  if (checkoutRoot) {
    candidates.add(path.dirname(path.dirname(checkoutRoot))); // Original container layout.
    if (path.basename(path.dirname(checkoutRoot)) === 'worktrees' && path.basename(path.dirname(path.dirname(checkoutRoot))) === '.claude') {
      candidates.add(path.join(path.dirname(path.dirname(checkoutRoot)), 'miw-sessions', path.basename(checkoutRoot)));
    }
    const relative = path.relative(checkoutRoot, directory).split(path.sep);
    if (relative[0] === '.claude' && relative[1] === 'miw-sessions' && relative[2]) {
      candidates.add(path.join(checkoutRoot, ...relative.slice(0, 3)));
    }
  }
  for (const candidate of candidates) {
    let session;
    try { session = await readSessionWorkspace(candidate); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    if (session && (directory === session.artifact_root || directory.startsWith(session.artifact_root + path.sep) ||
        session.repositories.some(repo => repo.root === checkoutRoot))) return session;
  }
  return null;
}

export async function checkSessionRepositories(contract) {
  if (contract?.checkout !== 'worktree') return;
  const session = await readSessionWorkspace(contract.artifact_root);
  for (const repo of contract.repos) {
    const root = await realpath(repo.root);
    const git = args => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    const binding = session?.repositories.find(entry => entry.id === repo.id && entry.source_root === repo.source_root);
    const expected = binding?.root ?? path.join(contract.artifact_root, 'repos', repo.id);
    if (root !== expected || git(['rev-parse', '--show-toplevel']) !== root ||
        await realpath(git(['rev-parse', '--path-format=absolute', '--git-common-dir'])) !== await realpath(repo.git_common_dir)) fail(`Session repository binding changed: ${repo.id}. Use the saved worktree or explicitly revise the scope.`);
  }
}
