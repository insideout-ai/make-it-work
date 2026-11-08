import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { validateEvalTree } from './validate.mjs';

test('runner-owned working directories validate without adding native prompt fields', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'eval-config-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const evalRoot = path.join(root, 'evals');
  const caseDir = path.join(evalRoot, 'example', 'example-case');
  await mkdir(path.join(root, 'skills', 'example'), { recursive: true });
  await mkdir(path.join(caseDir, 'graders'), { recursive: true });
  await writeFile(path.join(caseDir, 'case.yaml'), 'name: example-case\n');
  await writeFile(path.join(caseDir, 'graders', 'check.md'), '---\ntype: llm\n---\nCheck behavior.\n');
  const suites = { schemaVersion: 1, smoke: ['example-case'], headless: ['example-case'] };
  async function check(config, prompt = '---\nmax_turns: 5\n---\nRun case.\n') {
    await writeFile(path.join(evalRoot, 'suites.json'), JSON.stringify(config));
    await writeFile(path.join(caseDir, 'prompt.md'), prompt);
    return (await validateEvalTree(evalRoot)).errors;
  }
  assert.deepEqual(await check(suites), []);
  assert.deepEqual(await check({ ...suites, workingDirectories: { 'example-case': 'connector-app' } }), []);
  assert.match((await check({ ...suites, workingDirectories: { missing: 'connector-app' } })).join('\n'), /unknown workingDirectories case/);
  assert.match((await check({ ...suites, headless: [], workingDirectories: { 'example-case': 'connector-app' } })).join('\n'), /requires a headless case/);
  for (const invalid of [null, [], 'connector-app']) {
    assert.match((await check({ ...suites, workingDirectories: invalid })).join('\n'), /must be an object/);
  }
  for (const invalid of ['', '/tmp', '../outside', 'connector-app/../../outside', 'connector-app\\outside', 'bad\0path', null, 1]) {
    assert.match((await check({ ...suites, workingDirectories: { 'example-case': invalid } })).join('\n'), /relative directory inside the fixture/);
  }
  const evidence = { 'example-case': { 'check.md': ['report.md'] } };
  assert.deepEqual(await check({ ...suites, graderEvidenceFiles: evidence }), []);
  assert.match((await check({ ...suites, headless: [], graderEvidenceFiles: evidence })).join('\n'), /requires a headless case/);
  assert.match((await check({ ...suites, graderEvidenceFiles: { missing: {} } })).join('\n'), /unknown graderEvidenceFiles case/);
  for (const invalid of [null, [], 'file.md']) {
    assert.match((await check({ ...suites, graderEvidenceFiles: invalid })).join('\n'), /must be an object/);
    assert.match((await check({ ...suites, graderEvidenceFiles: { 'example-case': invalid } })).join('\n'), /must map grader filenames/);
  }
  for (const grader of ['missing.md', '../check.md']) {
    assert.match((await check({ ...suites, graderEvidenceFiles: { 'example-case': { [grader]: ['report.md'] } } })).join('\n'), /unknown graderEvidenceFiles grader/);
  }
  for (const files of [[], ['report.md', 'report.md'], ['../outside.md'], ['/tmp/private.md'], ['*.md'], ['bad\\path'], ['bad\0path'], [1], 'report.md']) {
    assert.match((await check({ ...suites, graderEvidenceFiles: { 'example-case': { 'check.md': files } } })).join('\n'), /unique literal relative paths/);
  }
  for (const headless of [[], ['example-case']]) {
    assert.match((await check({ ...suites, headless }, '---\nworking_directory: connector-app\n---\nRun case.\n')).join('\n'), /not supported by the native CLI/);
  }
});
