import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { resolveRepoIdentity, resolveRepository } from './repo-identity.mjs';
import { runRegression } from './regression.mjs';
import { validateMap } from './test-map.mjs';

const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: 'pipe' }).trim();
const script = path.resolve('scripts/repo-identity.mjs');
const regression = path.resolve('scripts/regression.mjs');
async function fixture(t, name = 'payments-service') {
  const directory = await realpath(await mkdtemp(path.join(os.tmpdir(), 'repo-identity-')));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const root = path.join(directory, name), worktree = path.join(directory, 'agent-checkout-17');
  await mkdir(path.join(root, 'test'), { recursive: true });
  await writeFile(path.join(root, 'test/location.test.cjs'), "const test = require('node:test'); const assert = require('node:assert/strict'); test('uses the selected checkout', () => assert.equal(process.cwd(), process.env.EXPECTED_ROOT));\n");
  git(root, 'init', '-q', '-b', 'main'); git(root, 'add', '-A');
  git(root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'Initial');
  return { directory, root, worktree };
}
const mapFor = (id) => ({ schemaVersion: 1, productRepo: id, tokens: [`${id}:UC-01`], repos: [{ id, root: '.' }], locations: [{ id: 'local', repo: id, paths: ['test'], config: [], complete: true, assessedTokens: [`${id}:UC-01`] }], tests: [], mappings: [], decisions: [], snapshots: {} });
async function record(root, id, mapId = id) {
  await mkdir(path.join(root, '.claude/skills/test-strategy'), { recursive: true });
  await mkdir(path.join(root, '.claude/testing'), { recursive: true });
  await writeFile(path.join(root, '.claude/skills/test-strategy/SKILL.md'), `# Strategy\n\n## Repo ID\n\n\`${id}\` — recorded identity.\n\n## Test Map\n\nSaved map.\n`);
  await writeFile(path.join(root, '.claude/testing/test-map.json'), JSON.stringify(mapFor(mapId)));
}

test('fresh worktree onboarding and later main-checkout lookup use one ID while regression runs in the selected tree', async (t) => {
  const { root, worktree } = await fixture(t);
  git(root, 'worktree', 'add', '-qb', 'feature', worktree);
  const fresh = await resolveRepoIdentity(worktree);
  assert.equal(fresh.repoId, 'payments-service'); assert.equal(fresh.root, worktree);
  assert.equal(fresh.source, 'main-worktree'); assert.equal(fresh.linkedWorktree, true);
  assert.equal((await resolveRepoIdentity(root)).gitCommonDir, fresh.gitCommonDir);
  await record(worktree, fresh.repoId);
  const map = validateMap(JSON.parse(await readFile(path.join(worktree, '.claude/testing/test-map.json'))));
  assert.deepEqual(map.tokens, ['payments-service:UC-01']);
  git(worktree, 'add', '.claude');
  git(worktree, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'Onboard test identity in worktree');
  git(root, 'merge', '--ff-only', 'feature');
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  for (const selected of [worktree, root]) {
    const identity = await resolveRepository({ root: selected, repo: 'payments-service' });
    assert.equal(identity.root, selected);
    const result = await runRegression({ version: 1, mode: 'tokens', runs: [{ repo: identity.repoId, cwd: identity.root, scope: 'scoped', command: { bin: process.execPath, args: ['--test'] }, adapter: 'node', selectors: ['test/location.test.cjs'] }] }, { env: { ...env, EXPECTED_ROOT: selected } });
    assert.equal(result.overall, 'pass'); assert.equal(result.runs[0].cwd, selected);
    assert.equal(git(selected, 'status', '--porcelain'), '');
  }
});

test('recorded IDs survive renamed checkouts, subdirectory invocation and directory aliases without rewriting files', async (t) => {
  const { root } = await fixture(t, 'different-clone-name');
  await record(root, 'canonical-service');
  const before = git(root, 'status', '--porcelain');
  assert.equal((await resolveRepoIdentity(root)).repoId, 'canonical-service');
  assert.equal((await resolveRepository({ root: path.join(root, 'test'), repo: 'canonical-service' })).root, root);
  assert.equal((await resolveRepository({ root, repo: 'different-clone-name' })).repoId, 'canonical-service');
  assert.equal(git(root, 'status', '--porcelain'), before);
  assert.match(await readFile(path.join(root, '.claude/testing/test-map.json'), 'utf8'), /canonical-service:UC-01/);
});

test('workspace ambiguity requires an explicit checkout; current-checkout identity takes precedence', async (t) => {
  const { directory, root, worktree } = await fixture(t);
  git(root, 'worktree', 'add', '-qb', 'feature', worktree);
  await assert.rejects(resolveRepository({ root: directory, repo: 'payments-service' }), /Ambiguous/);
  assert.equal((await resolveRepository({ root: worktree, repo: 'payments-service', workspaceRoot: directory })).root, worktree);
  await assert.rejects(resolveRepository({ root: worktree, repo: 'missing' }), /not found/);
});

test('conflicting or malformed recorded IDs fail without rewriting tokens', async (t) => {
  const { root } = await fixture(t);
  await record(root, 'canonical-service', 'old-temp-id');
  const file = path.join(root, '.claude/testing/test-map.json'), before = await readFile(file, 'utf8');
  await assert.rejects(resolveRepoIdentity(root), /Conflicting recorded/);
  await assert.rejects(resolveRepository({ root, repo: 'canonical-service' }), /Conflicting recorded/);
  assert.equal(await readFile(file, 'utf8'), before);
  await writeFile(file, '{broken');
  const retained = await resolveRepoIdentity(root);
  assert.equal(retained.repoId, 'canonical-service');
  assert.equal(retained.warnings.length, 1);
  await rm(path.join(root, '.claude/skills/test-strategy/SKILL.md'));
  await assert.rejects(resolveRepoIdentity(root), /invalid JSON/);
  await record(root, 'unsafe id');
  await assert.rejects(resolveRepoIdentity(root), /invalid Repo ID/);
});

test('map-only IDs and separate Git directories are respected', async (t) => {
  const { directory, root } = await fixture(t);
  await mkdir(path.join(root, '.claude/testing'), { recursive: true });
  await writeFile(path.join(root, '.claude/testing/test-map.json'), JSON.stringify(mapFor('saved-id')));
  assert.equal((await resolveRepoIdentity(root)).source, 'test-map');
  const separate = path.join(directory, 'separate-checkout');
  await mkdir(separate);
  git(separate, 'init', '-q', '--separate-git-dir', path.join(directory, 'metadata.git'));
  assert.equal((await resolveRepoIdentity(separate)).repoId, 'separate-checkout');
});

test('bare-owned worktrees require a recorded ID rather than guessing a temporary name', async (t) => {
  const { directory, root, worktree } = await fixture(t);
  const bare = path.join(directory, 'storage.git');
  git(directory, 'clone', '--bare', root, bare);
  git(bare, 'worktree', 'add', '-qb', 'feature', worktree);
  await assert.rejects(resolveRepoIdentity(worktree), /Record an explicit/);
  await record(worktree, 'canonical-service');
  assert.equal((await resolveRepoIdentity(worktree)).repoId, 'canonical-service');
});

test('identity and regression resolve CLIs return the selected working root and canonical namespace', async (t) => {
  const { root, worktree } = await fixture(t);
  git(root, 'worktree', 'add', '-qb', 'feature', worktree);
  const identity = JSON.parse(execFileSync(process.execPath, [script, 'identity', '--root', worktree], { encoding: 'utf8' }));
  const lookup = JSON.parse(execFileSync(process.execPath, [regression, 'resolve', '--root', worktree, '--repo', identity.repoId], { encoding: 'utf8' }));
  assert.equal(identity.repoId, 'payments-service'); assert.equal(lookup.root, worktree);
  assert.equal(git(root, 'status', '--porcelain'), ''); assert.equal(git(worktree, 'status', '--porcelain'), '');
});

test('detached worktrees resolve only within an explicitly supplied workspace boundary', async (t) => {
  const { directory, root } = await fixture(t);
  const workspace = path.join(directory, 'selected-worktrees'), invocation = path.join(directory, 'unrelated-invocation');
  await mkdir(workspace); await mkdir(invocation);
  const detached = path.join(workspace, 'temporary-detached');
  git(root, 'worktree', 'add', '--detach', detached, 'HEAD');
  assert.equal((await resolveRepoIdentity(detached)).repoId, 'payments-service');
  await assert.rejects(resolveRepository({ root: invocation, repo: 'payments-service' }), /not found/);
  const selected = await resolveRepository({ root: invocation, repo: 'payments-service', workspaceRoot: workspace });
  assert.equal(selected.root, detached);
  assert.equal(git(detached, 'rev-parse', '--abbrev-ref', 'HEAD'), 'HEAD');
  assert.equal(git(root, 'status', '--porcelain'), '');
  assert.equal(git(detached, 'status', '--porcelain'), '');
});
