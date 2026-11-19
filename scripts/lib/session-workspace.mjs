import { appendFile, lstat, mkdir, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fail } from './artifacts.mjs';
import { execFileSync } from 'node:child_process';

export const SESSION_MARKER = 'miw-session.json';
export function sessionRepositoryRoot(session, id) {
  if (session.version === 3) {
    const repo = session.repositories.find(entry => entry.id === id);
    if (!repo) fail('Unknown session repository.');
    return path.join(repo.source_root, '.claude', 'worktrees', path.basename(session.artifact_root));
  }
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
  if (![1, 2, 3].includes(saved.version) || saved.artifact_root !== root || !path.isAbsolute(saved.source_root ?? '') || saved.source_root === root || saved.source_root.startsWith(root + path.sep) ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(saved.ticket ?? '') || !Array.isArray(saved.repositories) || !saved.repositories.length) fail('Invalid session workspace binding.');
  if (saved.version === 2 && (saved.repositories.length !== 1 ||
      root !== path.join(saved.source_root, '.claude', 'miw-sessions', path.basename(root)) ||
      !path.basename(root).startsWith(saved.ticket + '-') || saved.repositories[0].source_root !== saved.source_root)) fail('Invalid single-repo session binding.');
  if (saved.version === 3 && (root !== path.join(saved.source_root, '.claude', 'miw-sessions', path.basename(root)) ||
      !path.basename(root).startsWith(saved.ticket + '-'))) fail('Invalid multi-repo session binding.');
  const ids = new Set();
  for (const repo of saved.repositories) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(repo.id ?? '') || ids.has(repo.id) ||
        !path.isAbsolute(repo.source_root ?? '') || repo.root !== sessionRepositoryRoot(saved, repo.id)) fail('Invalid session repository binding.');
    if (saved.version === 3 && repo.source_root !== path.join(saved.source_root, repo.id)) fail('Invalid multi-repo source binding.');
    ids.add(repo.id);
  }
  return saved;
}

// Look only at known managed layouts, never scan arbitrary ancestors or sessions.
export async function findSessionWorkspace(directory, checkoutRoot) {
  const candidates = new Set([directory]);
  const matches = new Map();
  if (checkoutRoot) {
    candidates.add(path.dirname(path.dirname(checkoutRoot))); // Original container layout.
    if (path.basename(path.dirname(checkoutRoot)) === 'worktrees' && path.basename(path.dirname(path.dirname(checkoutRoot))) === '.claude') {
      candidates.add(path.join(path.dirname(path.dirname(checkoutRoot)), 'miw-sessions', path.basename(checkoutRoot)));
      // Version 3 sources are immediate children of their explicitly saved workspace.
      const workspace = path.dirname(path.dirname(path.dirname(path.dirname(checkoutRoot))));
      candidates.add(path.join(workspace, '.claude', 'miw-sessions', path.basename(checkoutRoot)));
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
    if (candidate === directory && session) return session; // Explicit private root wins.
    if (session && (directory === session.artifact_root || directory.startsWith(session.artifact_root + path.sep) ||
        session.repositories.some(repo => repo.root === checkoutRoot))) matches.set(session.artifact_root, session);
  }
  if (matches.size > 1) fail('Ambiguous managed session binding; resume with the explicit saved root.');
  return matches.values().next().value ?? null;
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

export async function localDirectory(root, directory) {
  let current = root;
  for (const part of path.relative(root, directory).split(path.sep)) {
    current = path.join(current, part);
    try { await mkdir(current); } catch (error) { if (error.code !== 'EEXIST') throw error; }
    const info = await lstat(current);
    if (!info.isDirectory() || info.isSymbolicLink()) fail('Managed session parents must be real directories, not symlinks.');
  }
}
export async function ignorePrivateSession(source, directories) {
  const git = argv => execFileSync('git', ['-C', source, ...argv], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  try {
    for (const directory of directories) git(['check-ignore', '--no-index', '-q', '--', path.join(directory, 'miw-ignore-probe')]);
    return;
  } catch { /* Ensure local exclusions without changing tracked ignore files. */ }
  const exclude = git(['rev-parse', '--path-format=absolute', '--git-path', 'info/exclude']);
  const parent = path.dirname(exclude);
  if (await realpath(parent) !== parent) fail('Git exclude directory must not be redirected.');
  try { const info = await lstat(exclude); if (!info.isFile() || info.isSymbolicLink()) fail('Git exclude file must be a regular file.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const rules = directories.map(directory => '/' + path.relative(source, directory).split(path.sep).join('/').replace(/[\\*?\[\]#! ]/g, '\\$&') + '/');
  // One append preserves concurrent sessions' distinct rules and the user's .gitignore.
  await appendFile(exclude, '\n# Make It Work private session\n' + rules.join('\n') + '\n');
  for (const directory of directories) {
    try { git(['check-ignore', '--no-index', '-q', '--', path.join(directory, 'miw-ignore-probe')]); }
    catch { fail('Existing ignore rules expose the private session. Resolve them or choose a custom sessions directory outside Git; the current checkout remains available.'); }
  }
}

export async function prepareSessionRepository(session, repo) {
  if (session.version !== 3) return;
  try { await lstat(repo.root); fail('Worktree destination is occupied; preserve it and revise the selection.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  await localDirectory(repo.source_root, path.dirname(repo.root));
  await ignorePrivateSession(repo.source_root, [repo.root]);
}
