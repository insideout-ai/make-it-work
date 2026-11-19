#!/usr/bin/env node
// Allocate only private preflight storage. Worktrees use the existing scope approval.
import { lstat, mkdir, mkdtemp, readdir, realpath, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { args, cli, fail } from './lib/artifacts.mjs';
import { readSessionWorkspace, SESSION_MARKER } from './lib/session-workspace.mjs';
import { gitRoot, resolveWorkspace } from './workspace.mjs';

const sessionsDirectory = directory => path.resolve(directory ?? path.join(os.homedir(), '.make-it-work', 'sessions'));
export async function allocateSession(cwd, { ticket, directory, checkout = 'worktree', workspaceRoot } = {}) {
  if (!['worktree', 'current'].includes(checkout)) fail('Choose worktree or current checkout.');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(ticket ?? '')) fail('Session needs a safe ticket.');
  let source = await resolveWorkspace(cwd, { workspaceRoot });
  if (checkout === 'current') return { checkout, artifact_root: source.artifact_root, repositories: source.repositories };
  const existing = await readSessionWorkspace(source.root);
  if (existing) source = await resolveWorkspace(existing.source_root);
  const parent = sessionsDirectory(directory);
  await mkdir(parent, { recursive: true });
  if (await gitRoot(parent)) fail('Choose a sessions directory outside Git working trees; the current checkout remains available.');
  const root = await realpath(await mkdtemp(path.join(parent, `${ticket}-`)));
  await mkdir(path.join(root, 'repos'));
  const repositories = source.repositories.filter(repo => !repo.unavailable).map(repo => ({ id: repo.id, source_root: repo.root, root: path.join(root, 'repos', repo.id) }));
  const marker = { version: 1, ticket, artifact_root: root, source_root: source.root, repositories };
  await writeFile(path.join(root, SESSION_MARKER), JSON.stringify(marker, null, 2) + '\n', { flag: 'wx' });
  return { checkout, ...marker, instruction: 'Assess the source repositories read-only, save preflight artifacts here, then prepare/approve/run workspace-scope in this private root. No worktree or branch has been created.' };
}

export async function listSessions(cwd, { ticket, directory, workspaceRoot } = {}) {
  const source = await resolveWorkspace(cwd, { workspaceRoot });
  let names;
  try { names = await readdir(sessionsDirectory(directory), { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  const found = [];
  for (const entry of names.filter(entry => entry.isDirectory())) {
    if (ticket && !entry.name.startsWith(`${ticket}-`)) continue;
    const root = path.join(sessionsDirectory(directory), entry.name);
    let session;
    try { session = await readSessionWorkspace(root); }
    catch (error) { found.push({ artifact_root: root, unavailable: `Session discovery warning: ${error.message}` }); continue; }
    if (!session || session.source_root !== source.root || ticket && session.ticket !== ticket) continue;
    const state = path.join(root, 'make-it-work', session.ticket, `miw-${session.ticket}-state.md`);
    let initialized = false;
    try { initialized = (await lstat(state)).isFile(); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    found.push({ artifact_root: root, ticket: session.ticket, state: initialized ? state : null, repositories: session.repositories });
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
