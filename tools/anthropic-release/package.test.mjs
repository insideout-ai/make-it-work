import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm, chmod } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildPackage, verifyPackage, git, summarize } from './package.mjs';
import { publishPackage } from './publish.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'miw-dist-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const repo = path.join(root, 'source'); await mkdir(repo);
  git(repo, 'init', '-q', '-b', 'main'); git(repo, 'config', 'user.name', 'Test'); git(repo, 'config', 'user.email', 'test@example.invalid');
  const put = async (file, text) => { await mkdir(path.dirname(path.join(repo, file)), { recursive: true }); await writeFile(path.join(repo, file), text); };
  await put('.claude-plugin/plugin.json', JSON.stringify({ name: 'make-it-work', version: '1.0.0' }));
  await put('README.md', '# Plugin\n\n[Tests](evals/README.md)\n'); await put('LICENSE', 'License text'); await put('evals/README.md', 'Development only');
  await put('skills/demo/SKILL.md', '---\nname: demo\ndescription: Demo\nhooks:\n  Stop: []\n---\n\n[Helper](../../scripts/demo.mjs)\n');
  await put('scripts/demo.mjs', "#!/usr/bin/env node\nimport { value } from './lib/value.mjs'; console.log(value);\n");
  await chmod(path.join(repo, 'scripts/demo.mjs'), 0o755); await put('scripts/lib/value.mjs', 'export const value = 42;\n');
  await put('scripts/demo.test.mjs', "throw new Error('not runtime');\n");
  const commit = () => { git(repo, 'add', '-A'); git(repo, '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'Fixture'); return git(repo, 'rev-parse', 'HEAD').toString().trim(); };
  commit();
  const build = (name) => buildPackage({ repo, output: path.join(root, name), report: path.join(root, name + '.json') });
  return { root, repo, put, commit, build };
}

test('exports only committed runtime, preserves hooks and modes, and installs independently of the source', async (t) => {
  const f = await fixture(t); const sha = git(f.repo, 'rev-parse', 'HEAD').toString().trim();
  await f.put('scripts/demo.mjs', 'broken uncommitted code'); await f.put('scripts/untracked.mjs', 'not committed');
  const a = await f.build('a'), b = await f.build('b');
  assert.deepEqual(a, b); assert.equal(a.sourceSha, sha);
  assert.equal(a.files.find((e) => e.path === 'scripts/demo.mjs').mode, '100755');
  assert(!a.files.some((e) => /evals|test\.mjs|untracked/.test(e.path)));
  assert.match(await readFile(path.join(f.root, 'a/README.md'), 'utf8'), new RegExp(`/blob/${sha}/evals/README.md`));
  assert.match(await readFile(path.join(f.root, 'a/skills/demo/SKILL.md'), 'utf8'), /hooks:/);
  assert.equal(execFileSync(process.execPath, [path.join(f.root, 'a/scripts/demo.mjs')]).toString().trim(), '42');
  await verifyPackage(path.join(f.root, 'a'), a);
  await writeFile(path.join(f.root, 'a/scripts/demo.mjs'), 'tampered');
  await assert.rejects(verifyPackage(path.join(f.root, 'a'), a), /differ/);
});

test('rejects missing imports, excluded runtime references and new file types', async (t) => {
  const f = await fixture(t);
  await f.put('scripts/demo.mjs', "import './missing.mjs';"); f.commit(); await assert.rejects(f.build('missing'), /Missing packaged dependency/);
  await f.put('scripts/demo.mjs', ''); await f.put('skills/demo/SKILL.md', '[Must read](../../evals/README.md)'); f.commit(); await assert.rejects(f.build('reference'), /excluded file/);
  await f.put('skills/demo/SKILL.md', 'Demo'); await f.put('skills/demo/program.wasm', 'unexpected'); f.commit(); await assert.rejects(f.build('new-type'), /New file type/);
  await rm(path.join(f.repo, 'skills/demo/program.wasm')); await f.put('scripts/new-helper.sh', '#!/bin/sh\necho new\n'); f.commit(); await assert.rejects(f.build('new-script-type'), /New file type/);
});

test('rejects missing assets and nonempty outputs; limits count folders as well as files', async (t) => {
  const f = await fixture(t);
  await f.put('scripts/demo.mjs', "const file = path.resolve(SCRIPT_DIR, '../assets/missing.html');"); f.commit(); await assert.rejects(f.build('asset'), /Missing packaged dependency/);
  await mkdir(path.join(f.root, 'occupied')); await writeFile(path.join(f.root, 'occupied/keep'), 'keep');
  await assert.rejects(f.build('occupied'), /empty directory/);
  await assert.rejects(buildPackage({ repo: f.repo, output: path.join(f.repo, 'out'), report: path.join(f.root, 'report.json') }), /outside the source checkout/);
  assert.throws(() => summarize(Array.from({ length: 1000 }, (_, i) => ({ path: `d${i}/file.md`, size: 1 }))), /limits/);
});

test('a rejected push leaves main and the existing release unchanged', async (t) => {
  const f = await fixture(t); const remote = path.join(f.root, 'rejected.git');
  execFileSync('git', ['init', '--bare', '-q', remote]); git(f.repo, 'remote', 'add', 'origin', remote); git(f.repo, 'push', '-q', 'origin', 'main');
  const report = await f.build('pkg');
  await writeFile(path.join(remote, 'hooks/update'), '#!/bin/sh\n[ "$1" != refs/heads/anthropic-release ]\n');
  await chmod(path.join(remote, 'hooks/update'), 0o755);
  await assert.rejects(publishPackage({ repo: f.repo, output: path.join(f.root, 'pkg'), report }));
  assert.equal(git(remote, 'rev-parse', 'main').toString().trim(), report.sourceSha);
  assert.equal(git(f.repo, 'ls-remote', 'origin', 'refs/heads/anthropic-release').toString(), '');
});

test('publishes only current main, retains independent history, skips identical trees and refuses manual edits', async (t) => {
  const f = await fixture(t); const remote = path.join(f.root, 'remote.git');
  execFileSync('git', ['init', '--bare', '-q', remote]); git(f.repo, 'remote', 'add', 'origin', remote); git(f.repo, 'push', '-q', 'origin', 'main');
  const report = await f.build('pkg');
  const publish = () => publishPackage({ repo: f.repo, output: path.join(f.root, 'pkg'), report });
  const result = await publish(); assert.equal(result.status, 'published');
  assert.equal(git(remote, 'rev-list', '--count', 'anthropic-release').toString().trim(), '1');
  assert.equal((await publish()).status, 'unchanged');
  await f.put('evals/another.md', 'new main'); f.commit(); git(f.repo, 'push', '-q', 'origin', 'main');
  assert.equal((await publish()).status, 'superseded');
  await f.put('scripts/lib/value.mjs', 'export const value = 43;\n'); f.commit(); git(f.repo, 'push', '-q', 'origin', 'main');
  const next = await f.build('next');
  const advanced = await publishPackage({ repo: f.repo, output: path.join(f.root, 'next'), report: next });
  assert.equal(advanced.status, 'published'); assert.match(advanced.warnings[0], /without a version bump/);
  assert.equal(git(remote, 'rev-list', '--count', 'anthropic-release').toString().trim(), '2');
  git(f.repo, 'fetch', 'origin', 'anthropic-release');
  const changed = git(f.repo, 'commit-tree', result.tree, '-p', git(remote, 'rev-parse', 'anthropic-release').toString().trim(), '-m', 'Unexpected edit').toString().trim();
  git(f.repo, 'push', 'origin', `${changed}:refs/heads/anthropic-release`);
  await assert.rejects(publishPackage({ repo: f.repo, output: path.join(f.root, 'next'), report: next }), /unexpected changes/);
});
