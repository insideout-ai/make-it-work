#!/usr/bin/env node
// Allocate only private preflight storage. Worktrees use the existing scope approval.
import { lstat, mkdir, mkdtemp, readdir, realpath, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { args, cli, fail } from './lib/artifacts.mjs';
import { readSessionWorkspace, sessionRepositoryRoot, localDirectory, ignorePrivateSession, SESSION_MARKER } from './lib/session-workspace.mjs';
import { gitRoot, resolveWorkspace } from './workspace.mjs';

const legacyDirectory = () => path.join(os.homedir(), '.make-it-work', 'sessions');
const sessionsDirectory = (source, directory) => path.resolve(directory ?? path.join(source.root, '.claude', 'miw-sessions'));
async function sourceWorkspace(cwd, workspaceRoot) {
  let source = await resolveWorkspace(cwd, { workspaceRoot });
  const existing = await readSessionWorkspace(source.root);
  if (existing) source = await resolveWorkspace(existing.source_root, { workspaceRoot: existing.source_root });
  return source;
}
export async function allocateSession(cwd, { ticket, directory, checkout = 'worktree', workspaceRoot } = {}) {
  if (!['worktree', 'current'].includes(checkout)) fail('Choose worktree or current checkout.');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(ticket ?? '')) fail('Session needs a safe ticket.');
  if (checkout === 'current') {
    const selected = await resolveWorkspace(cwd, { workspaceRoot });
    return { checkout, artifact_root: selected.artifact_root, repositories: selected.repositories };
  }
  const source = await sourceWorkspace(cwd, workspaceRoot);
  const parent = sessionsDirectory(source, directory);
  if (directory !== undefined) {
    await mkdir(parent, { recursive: true });
    if (await gitRoot(parent)) fail('Choose a custom sessions directory outside Git working trees; the current checkout remains available.');
  } else await localDirectory(source.root, parent);
  const root = await realpath(await mkdtemp(path.join(parent, `${ticket}-`)));
  const version = directory !== undefined ? 1 : source.layout === 'single-repo' ? 2 : 3;
  const binding = { version, artifact_root: root, source_root: source.root };
  if (version === 1) await mkdir(path.join(root, 'repos'));
  else if (version === 2) await localDirectory(source.root, path.join(source.root, '.claude', 'worktrees'));
  const repositories = source.repositories.filter(repo => !repo.unavailable).map(repo => ({ id: repo.id, source_root: repo.root }));
  binding.repositories = repositories;
  for (const repo of repositories) repo.root = sessionRepositoryRoot(binding, repo.id);
  if (version === 2) {
    try { await lstat(repositories[0].root); fail('Worktree destination already exists; preserve it and select a fresh session.'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    await ignorePrivateSession(source.root, [root, repositories[0].root]);
  } else if (directory === undefined) {
    const enclosing = await gitRoot(source.root);
    if (enclosing) await ignorePrivateSession(enclosing, [root]);
  }
  const marker = { ...binding, ticket, repositories };
  await writeFile(path.join(root, SESSION_MARKER), JSON.stringify(marker, null, 2) + '\n', { flag: 'wx' });
  return { checkout, ...marker, instruction: 'Assess the source repositories read-only, save preflight artifacts here, then prepare/approve/run workspace-scope in this private root. No worktree or branch has been created.' };
}

export async function listSessions(cwd, { ticket, directory, workspaceRoot } = {}) {
  const source = await sourceWorkspace(cwd, workspaceRoot);
  const found = [];
  const parents = new Set([sessionsDirectory(source, directory), ...(directory === undefined ? [...(source.layout === 'workspace' ? [path.join(source.root, '.claude', 'worktrees')] : []), legacyDirectory()] : [])]);
  for (const parent of parents) {
    let names;
    try { names = await readdir(parent, { withFileTypes: true }); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    for (const entry of names.filter(entry => entry.isDirectory())) {
      if (ticket && !entry.name.startsWith(`${ticket}-`)) continue;
      const root = path.join(parent, entry.name);
      let session;
      try { session = await readSessionWorkspace(root); }
      catch (error) { found.push({ artifact_root: root, unavailable: `Session discovery warning: ${error.message}` }); continue; }
      if (!session || session.source_root !== source.root || ticket && session.ticket !== ticket) continue;
      const state = path.join(root, 'make-it-work', session.ticket, `miw-${session.ticket}-state.md`);
      let initialized = false;
      try { initialized = (await lstat(state)).isFile(); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      found.push({ artifact_root: root, ticket: session.ticket, state: initialized ? state : null, repositories: session.repositories });
    }
  }
  return found.sort((a, b) => a.artifact_root.localeCompare(b.artifact_root));
}

cli(import.meta.url, async argv => {
  const o = args(argv, ['--cwd', '--ticket', '--directory', '--checkout', '--workspace']);
  const options = { ticket: o.ticket, directory: o.directory, checkout: o.checkout, workspaceRoot: o.workspace };
  if (o.command === 'allocate') return allocateSession(o.cwd ?? process.cwd(), options);
  if (o.command === 'list') return listSessions(o.cwd ?? process.cwd(), options);
  fail('Usage: session-workspace.mjs allocate|list --cwd SOURCE [--workspace ROOT] [--ticket TICKET] [--directory SESSIONS] [--checkout worktree|current]');
});
