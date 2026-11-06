#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { realpath } from 'node:fs/promises';
import path from 'node:path';
import { repositoryInventory } from './repo-assessment.mjs';
import { args, cli, fail } from './lib/artifacts.mjs';

export async function gitRoot(directory) {
  try {
    return await realpath(execFileSync('git', ['-C', directory, 'rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim());
  } catch { return null; }
}

// A caller inside a service must supply a known boundary to widen its scope.
// A folder of checkouts is itself a valid explicit invocation boundary.
export async function resolveWorkspace(cwd, { workspaceRoot, savedRoot } = {}) {
  const invocation = await realpath(cwd);
  const explicit = workspaceRoot ?? savedRoot;
  const enclosing = await gitRoot(invocation);
  const root = explicit ? await realpath(explicit) : enclosing ?? invocation;
  if (invocation !== root && !invocation.startsWith(`${root}${path.sep}`)) fail('Invocation is outside the workspace boundary.');
  if (workspaceRoot && savedRoot && await realpath(savedRoot) !== root) fail('Explicit workspace differs from the saved workspace.');
  const inventory = await repositoryInventory(root);
  if (!inventory.some((repo) => !repo.unavailable)) fail('No usable Git repositories in the resolved workspace.');
  const layout = await gitRoot(root) === root ? 'single-repo' : 'workspace';
  return { version: 1, layout, root, artifact_root: root, invocation, boundary_source: explicit ? workspaceRoot ? 'explicit' : 'saved' : enclosing ? 'git-root' : 'invocation', repositories: inventory };
}

cli(import.meta.url, async (argv) => {
  const o = args(argv, ['--cwd', '--workspace', '--saved-root']);
  if (o.command !== 'resolve') fail('Usage: workspace.mjs resolve [--cwd DIR] [--workspace ROOT] [--saved-root ROOT]');
  return resolveWorkspace(o.cwd ?? process.cwd(), { workspaceRoot: o.workspace, savedRoot: o['saved-root'] });
});
