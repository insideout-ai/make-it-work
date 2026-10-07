import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const sourceRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const run = (cmd, args, cwd, env = process.env) =>
  spawnSync(cmd, args, { cwd, env, encoding: 'utf8' });

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'miw-hook-test-'));
  await mkdir(path.join(root, 'scripts'));
  await mkdir(path.join(root, '.githooks'));
  await copyFile(path.join(sourceRoot, 'scripts/install-pre-push-hook.sh'),
    path.join(root, 'scripts/install-pre-push-hook.sh'));
  await copyFile(path.join(sourceRoot, '.githooks/pre-push'), path.join(root, '.githooks/pre-push'));
  assert.equal(run('git', ['init', '-q'], root).status, 0);
  assert.equal(run('git', ['add', '-A'], root).status, 0);
  const commitEnv = { ...process.env, GIT_AUTHOR_NAME: 'Hook Test',
    GIT_AUTHOR_EMAIL: 'hook@example.invalid', GIT_COMMITTER_NAME: 'Hook Test',
    GIT_COMMITTER_EMAIL: 'hook@example.invalid' };
  assert.equal(run('git', ['-c', 'core.hooksPath=/dev/null', 'commit', '-q', '-m', 'Fixture'], root, commitEnv).status, 0);
  return root;
}

test('installer enables the versioned hook without replacing existing hooks', async () => {
  const root = await fixture();
  try {
    assert.equal(run('bash', ['scripts/install-pre-push-hook.sh'], root).status, 0);
    assert.equal(run('git', ['config', '--local', '--get', 'core.hooksPath'], root).stdout.trim(), '.githooks');
    assert.equal(run('git', ['config', '--local', 'core.hooksPath', 'other-hooks'], root).status, 0);
    const refused = run('bash', ['scripts/install-pre-push-hook.sh'], root);
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /refusing to replace/i);
    assert.equal(run('git', ['config', '--local', '--get', 'core.hooksPath'], root).stdout.trim(), 'other-hooks');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('pre-push runs smoke once and propagates its result', async () => {
  const root = await fixture();
  try {
    const bin = path.join(root, 'bin');
    const log = path.join(root, 'invocations.txt');
    const mock = path.join(bin, 'node');
    await mkdir(bin);
    await writeFile(mock, '#!/bin/sh\ntest ! -e uncommitted-marker || exit 99\nprintf "%s\\n" "$*" >> "$HOOK_TEST_LOG"\nexit "$HOOK_TEST_EXIT"\n');
    await chmod(mock, 0o755);
    await writeFile(path.join(root, 'uncommitted-marker'), 'must not enter snapshot\n');
    const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`,
      HOOK_TEST_LOG: log, HOOK_TEST_EXIT: '0', GIT_DIR: path.join(root, '.git'),
      GIT_WORK_TREE: root, GIT_INDEX_FILE: path.join(root, '.git/index') };
    const passed = run('bash', ['.githooks/pre-push'], root, env);
    assert.equal(passed.status, 0);
    assert.equal((await readFile(log, 'utf8')).trim(), 'evals/run-suite.mjs smoke');
    assert.equal(run('git', ['rev-parse', '--is-bare-repository'], root).stdout.trim(), 'false');
    const failed = run('bash', ['.githooks/pre-push'], root, { ...env, HOOK_TEST_EXIT: '7' });
    assert.equal(failed.status, 0);
    assert.match(failed.stderr, /Push proceeds/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
