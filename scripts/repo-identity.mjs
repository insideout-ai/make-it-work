#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { args, cli, fail, section } from './lib/artifacts.mjs';

const validId = (value) => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value);
function git(root, ...argv) {
  return execFileSync('git', ['-C', root, ...argv], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
async function optionalText(file) {
  try { return await readFile(file, 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

/** Resolve identity from the selected checkout; Git metadata never changes the source root. */
export async function resolveRepoIdentity(directory) {
  const selected = await realpath(directory);
  let root;
  try { root = await realpath(git(selected, 'rev-parse', '--show-toplevel')); }
  catch { fail(`Not a Git working tree: ${selected}`); }
  const strategy = await optionalText(path.join(root, '.claude/skills/test-strategy/SKILL.md'));
  const idSection = strategy === null ? null : section(strategy, 'Repo ID');
  const line = idSection?.split(/\r?\n/).find((value) => value.trim())?.trim();
  const strategyId = line === undefined ? null : line.match(/^(?:`([^`]+)`|([^\s]+))(?:\s+[—–-].*)?$/)?.slice(1).find(Boolean);
  if (idSection !== null && !validId(strategyId)) fail('Test strategy has an invalid Repo ID; resolve it explicitly before continuing.');
  const mapText = await optionalText(path.join(root, '.claude/testing/test-map.json'));
  let mapId = null;
  const warnings = [];
  if (mapText !== null) {
    let map;
    try { map = JSON.parse(mapText); }
    catch { if (!strategyId) fail('Cannot read the recorded test-map repository ID: invalid JSON. Repair the map before continuing.'); }
    if (!validId(map?.productRepo)) {
      if (!strategyId) fail('Test map has an invalid productRepo; resolve its recorded ID explicitly.');
      warnings.push('Test-map ID unavailable; using the recorded strategy ID. Handle the malformed map through normal refresh/discovery rules.');
    } else mapId = map.productRepo;
  }
  if (strategyId && mapId && strategyId !== mapId) fail(`Conflicting recorded repository IDs: strategy=${strategyId}, test map=${mapId}. Resolve the conflict explicitly; no tokens were changed.`);
  const commonDir = await realpath(git(root, 'rev-parse', '--path-format=absolute', '--git-common-dir'));
  const gitDir = await realpath(git(root, 'rev-parse', '--absolute-git-dir'));
  const linkedWorktree = gitDir !== commonDir;
  const primary = git(root, 'worktree', 'list', '--porcelain', '-z').split('\0\0')[0].split('\0');
  const registeredMain = primary.find((field) => field.startsWith('worktree '))?.slice('worktree '.length);
  // Separate Git directories can list the metadata directory as the owner;
  // never turn that storage name into a fresh linked-worktree identity.
  const mainWorktree = !linkedWorktree ? root : primary.includes('bare') || registeredMain === commonDir ? null : registeredMain;
  const repoId = strategyId || mapId || (mainWorktree ? path.basename(mainWorktree) : null);
  if (!validId(repoId)) fail('Cannot derive a stable repository ID from the main working tree. Record an explicit token-safe Repo ID before continuing.');
  return { root, repoId, source: strategyId ? 'strategy' : mapId ? 'test-map' : 'main-worktree',
    gitCommonDir: commonDir, mainWorktree: mainWorktree ?? null, linkedWorktree, warnings };
}

/** Prefer the current checkout; workspace lookup is bounded to explicitly supplied roots. */
export async function resolveRepository({ root, repo, workspaceRoot } = {}) {
  if (!validId(repo)) fail('Requested repository ID is invalid.');
  const invocation = await realpath(root);
  let current = null;
  try { current = git(invocation, 'rev-parse', '--show-toplevel'); } catch { /* workspace root */ }
  if (current) {
    const identity = await resolveRepoIdentity(current);
    if (identity.repoId === repo || path.basename(identity.root) === repo) return { ...identity, requestedRepo: repo };
  }
  const candidates = new Set();
  for (const boundary of new Set([invocation, ...(workspaceRoot ? [await realpath(workspaceRoot)] : [])])) {
    for (const entry of await readdir(boundary, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const candidate = path.join(boundary, entry.name);
      let top;
      try { top = await realpath(git(candidate, 'rev-parse', '--show-toplevel')); } catch { continue; }
      if (top === await realpath(candidate)) candidates.add(top);
    }
  }
  const matches = [];
  for (const candidate of candidates) {
    const identity = await resolveRepoIdentity(candidate);
    if (identity.repoId === repo || path.basename(identity.root) === repo) matches.push(identity);
  }
  if (!matches.length) fail(`Repository not found in the selected checkout or supplied workspace: ${repo}`);
  if (matches.length > 1) fail(`Ambiguous repository ID ${repo}; select the intended checkout explicitly.`);
  return { ...matches[0], requestedRepo: repo };
}

cli(import.meta.url, async (argv) => {
  const o = args(argv, argv[0] === 'identity' ? ['--root'] : ['--root', '--repo', '--workspace-root']);
  if (!o.root || !['identity', 'resolve'].includes(o.command) || o.command === 'resolve' && !o.repo) fail('Usage: repo-identity.mjs identity --root ROOT | resolve --root ROOT --repo ID [--workspace-root ROOT]');
  return o.command === 'identity' ? resolveRepoIdentity(o.root) : resolveRepository({ root: o.root, repo: o.repo, workspaceRoot: o['workspace-root'] });
});
