import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { resolveWorkspace } from './workspace.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'workspace-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const name of ['api', 'web']) {
    await mkdir(path.join(root, name, 'src'), { recursive: true });
    execFileSync('git', ['-C', path.join(root, name), 'init', '-b', 'main'], { stdio: 'pipe' });
  }
  return realpath(root);
}
test('workspace root needs neither CLAUDE.md nor its own Git repository', async (t) => {
  const root = await fixture(t), result = await resolveWorkspace(root);
  assert.equal(result.layout, 'workspace'); assert.equal(result.artifact_root, root);
  assert.deepEqual(result.repositories.map((repo) => repo.id), ['api', 'web']);
});
test('single repository and nested invocation retain their root despite sibling clones', async (t) => {
  const root = await fixture(t);
  for (const cwd of [path.join(root, 'api'), path.join(root, 'api/src')]) {
    const result = await resolveWorkspace(cwd);
    assert.equal(result.layout, 'single-repo'); assert.equal(result.artifact_root, path.join(root, 'api'));
    assert.deepEqual(result.repositories.map((repo) => repo.id), ['api']);
  }
});
test('explicit and saved boundaries support service invocation and reject conflicting roots', async (t) => {
  const root = await fixture(t), cwd = path.join(root, 'api/src');
  assert.equal((await resolveWorkspace(cwd, { workspaceRoot: root })).layout, 'workspace');
  assert.equal((await resolveWorkspace(cwd, { savedRoot: root })).artifact_root, root);
  await assert.rejects(resolveWorkspace(cwd, { workspaceRoot: root, savedRoot: path.join(root, 'api') }), /differs/);
  await assert.rejects(resolveWorkspace(os.tmpdir(), { workspaceRoot: root }), /outside/);
});
test('an empty folder fails with an actionable discovery error', async (t) => {
  const root = await fixture(t); await mkdir(path.join(root, 'empty'));
  await assert.rejects(resolveWorkspace(path.join(root, 'empty')), /No usable Git/);
});
