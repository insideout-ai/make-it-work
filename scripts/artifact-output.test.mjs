import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, symlink, realpath, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { allocateArtifactOutput, resolveArtifactInputs } from './artifact-output.mjs';

async function fixture(t) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'artifact-inputs-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test('parallel workers receive exclusively reserved files with marked and legacy naming', async t => {
  const root = await fixture(t);
  for (const marked of [false, true]) {
    const directory = `make-it-work/${marked ? 'NEW' : 'OLD'}`;
    await mkdir(path.join(root, directory), { recursive: true });
    await writeFile(path.join(root, directory, marked ? 'miw-run.json' : 'OLD-state.md'), marked ? '{"artifact_naming_version":1}' : 'legacy');
    const outputs = await Promise.all(Array.from({ length: 12 }, () => allocateArtifactOutput({ root, directory, name: 'worker-evidence.json' })));
    assert.equal(new Set(outputs.map(item => item.file)).size, 12);
    for (const [index, item] of outputs.entries()) {
      assert.equal(item.reserved, true);
      assert.equal(item.name.startsWith('miw-'), marked);
      assert.equal(await readFile(item.file, 'utf8'), '');
      await writeFile(item.file, String(index));
    }
    for (const [index, item] of outputs.entries()) assert.equal(await readFile(item.file, 'utf8'), String(index));
  }
});

test('allocation rejects traversal and symlink output directories', async t => {
  const root = await fixture(t);
  await assert.rejects(allocateArtifactOutput({ root, name: '../evidence.json' }), /plain filename/);
  await assert.rejects(allocateArtifactOutput({ root, directory: '../elsewhere', name: 'evidence.json' }), /under make-it-work/);
  await mkdir(path.join(root, 'make-it-work'));
  await mkdir(path.join(root, 'source'));
  await symlink(path.join(root, 'source'), path.join(root, 'make-it-work', 'linked'));
  await assert.rejects(allocateArtifactOutput({ root, directory: 'make-it-work/linked', name: 'evidence.json' }), /symlink/);
});

test('separate artifact and source roots yield absolute inputs independent of cwd', async t => {
  const root = await fixture(t), source = await fixture(t);
  await mkdir(path.join(root, 'make-it-work', 'NEW'), { recursive: true });
  await writeFile(path.join(root, 'make-it-work', 'NEW', 'miw-run.json'), '{"artifact_naming_version":1}');
  const plan = path.join(root, 'make-it-work', 'NEW', 'miw-NEW-plan.md');
  await writeFile(plan, '# Plan');
  const context = path.join(source, 'CLAUDE.md');
  await writeFile(context, 'Source context');
  const result = await resolveArtifactInputs({ root, plan: 'make-it-work/NEW/NEW-plan.md', 'source-root': source, context: 'CLAUDE.md' });
  assert.equal(result.plan, plan);
  assert.deepEqual(result.context_updated, [context]);
  const cli = path.resolve('scripts/artifact-output.mjs');
  const fromSource = JSON.parse(execFileSync(process.execPath, [cli, 'inputs', '--root', root, '--plan', 'make-it-work/NEW/NEW-plan.md', '--source-root', source, '--context', 'CLAUDE.md'], { cwd: source, encoding: 'utf8' }));
  assert.deepEqual(fromSource, result);
  const reserved = JSON.parse(execFileSync(process.execPath, [cli, 'allocate', '--root', root, '--directory', 'make-it-work/NEW', '--name', 'evidence.json'], { cwd: source, encoding: 'utf8' }));
  assert.equal(await readFile(reserved.file, 'utf8'), '');
  assert.equal(reserved.reserved, true);
  assert.equal(await readFile(context, 'utf8'), 'Source context');
  assert.deepEqual(await resolveArtifactInputs({ root, plan }), { artifact_root: root, plan });
  await assert.rejects(resolveArtifactInputs({ root, plan: context }), /escapes root/);
  await assert.rejects(resolveArtifactInputs({ root, context: 'CLAUDE.md' }), /together/);
  await writeFile(path.join(root, 'outside-plan.md'), 'Not an artifact');
  await assert.rejects(resolveArtifactInputs({ root, plan: 'outside-plan.md' }), /under make-it-work/);
  await symlink(plan, path.join(source, 'linked.md'));
  await assert.rejects(resolveArtifactInputs({ root, 'source-root': source, context: 'linked.md' }), /escapes root/);
});
