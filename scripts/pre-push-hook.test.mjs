import { artifactJoin } from './lib/artifact-path.mjs';
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
  const root = await mkdtemp(artifactJoin(os.tmpdir(), 'miw-hook-test-'));
  await mkdir(artifactJoin(root, 'scripts'));
  await mkdir(artifactJoin(root, '.githooks'));
  await copyFile(artifactJoin(sourceRoot, 'scripts/install-pre-push-hook.sh'),
    artifactJoin(root, 'scripts/install-pre-push-hook.sh'));
  await copyFile(artifactJoin(sourceRoot, '.githooks/pre-push'), artifactJoin(root, '.githooks/pre-push'));
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

test('pushes never launch paid evals, including with the legacy selection variable', async () => {
  const root = await fixture();
  try {
    const bin = artifactJoin(root, 'bin');
    const log = artifactJoin(root, 'invocations.txt');
    await mkdir(bin);
    for (const binary of ['node', 'claude']) {
      const mock = artifactJoin(bin, binary);
      await writeFile(mock, '#!/bin/sh\nprintf "%s\\n" "$*" >> "$HOOK_TEST_LOG"\nexit 99\n');
      await chmod(mock, 0o755);
    }
    const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, HOOK_TEST_LOG: log,
      MIW_SMOKE_CASES: 'drive-the-epic-autopilot' };
    for (let push = 0; push < 2; push++) {
      const result = run('bash', ['.githooks/pre-push'], root, env);
      assert.equal(result.status, 0);
      assert.match(result.stderr, /no paid evals/);
    }
    await assert.rejects(readFile(log), { code: 'ENOENT' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
