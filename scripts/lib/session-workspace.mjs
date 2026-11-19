import { lstat, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fail } from './artifacts.mjs';
import { execFileSync } from 'node:child_process';

export const SESSION_MARKER = 'miw-session.json';
export async function readSessionWorkspace(root) {
  root = await realpath(root);
  const file = path.join(root, SESSION_MARKER);
  try {
    if (!(await lstat(file)).isFile()) fail('Session marker must be a regular file.');
  } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  const saved = JSON.parse(await readFile(file, 'utf8'));
  if (saved.version !== 1 || saved.artifact_root !== root || !path.isAbsolute(saved.source_root ?? '') || saved.source_root === root || saved.source_root.startsWith(root + path.sep) ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(saved.ticket ?? '') || !Array.isArray(saved.repositories) || !saved.repositories.length) fail('Invalid session workspace binding.');
  const ids = new Set();
  for (const repo of saved.repositories) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(repo.id ?? '') || ids.has(repo.id) ||
        !path.isAbsolute(repo.source_root ?? '') || repo.root !== path.join(root, 'repos', repo.id)) fail('Invalid session repository binding.');
    ids.add(repo.id);
  }
  return saved;
}

export async function checkSessionRepositories(contract) {
  if (contract?.checkout !== 'worktree') return;
  for (const repo of contract.repos) {
    const root = await realpath(repo.root);
    const git = args => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    if (root !== path.join(contract.artifact_root, 'repos', repo.id) || git(['rev-parse', '--show-toplevel']) !== root ||
        await realpath(git(['rev-parse', '--path-format=absolute', '--git-common-dir'])) !== await realpath(repo.git_common_dir)) fail(`Session repository binding changed: ${repo.id}. Use the saved worktree or explicitly revise the scope.`);
  }
}
