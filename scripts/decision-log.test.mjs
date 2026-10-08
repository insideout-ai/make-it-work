import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, stat, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { normalizeEntry, updateLog } from './decision-log.mjs';

const SCRIPT = path.join(import.meta.dirname, 'decision-log.mjs');
const checkpoint = {
  phase: 'Phase 2', site: 'review-pause', kind: 'checkpoint',
  chosen: 'Continue', rationale: 'The step passed its verification.',
};
const question = {
  phase: 'Phase 0', site: 'mode-choice', kind: 'askUserQuestion',
  question: 'Which mode?',
  options: [
    { label: 'Subagent-Driven (Recommended)', description: 'Dispatch each step.' },
    { label: 'Inline', description: 'Stay in this session.' },
  ],
  multiSelect: false, chosen: 'Subagent-Driven (Recommended)',
  rationale: 'Autopilot chooses the recommended option.',
};

async function workspace(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'decision-log-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return { root, log: path.join(root, 'make-it-work', 'execute-autopilot-log.jsonl') };
}

test('init creates a fresh empty log and append records ordered decisions', async (t) => {
  const { root, log } = await workspace(t);
  await updateLog({ root, skill: 'execute', command: 'init' });
  assert.equal(await readFile(log, 'utf8'), '');
  await updateLog({ root, skill: 'execute', command: 'append', input: question });
  await updateLog({ root, skill: 'execute', command: 'append', input: checkpoint });
  assert.deepEqual((await readFile(log, 'utf8')).trimEnd().split('\n').map(JSON.parse),
    [normalizeEntry(question, 'execute'), normalizeEntry(checkpoint, 'execute')]);
  assert.equal((await stat(log)).mode & 0o777, 0o600);
});

test('write flushes a late batch and replaces a prior run atomically', async (t) => {
  const { root, log } = await workspace(t);
  await updateLog({ root, skill: 'execute', command: 'write', input: [checkpoint, question] });
  await updateLog({ root, skill: 'execute', command: 'write', input: [question] });
  assert.deepEqual((await readFile(log, 'utf8')).trimEnd().split('\n').map(JSON.parse),
    [normalizeEntry(question, 'execute')]);
  await updateLog({ root, skill: 'execute', command: 'write', input: [] });
  assert.equal(await readFile(log, 'utf8'), '');
  assert.deepEqual(await readdir(path.join(root, 'make-it-work')), ['execute-autopilot-log.jsonl']);
});

test('append requires init and rejects malformed existing JSONL without clobbering it', async (t) => {
  const { root, log } = await workspace(t);
  await assert.rejects(updateLog({ root, skill: 'execute', command: 'append', input: checkpoint }),
    /initialize this run first/);
  await mkdir(path.join(root, 'make-it-work'));
  await writeFile(log, 'not json\n');
  await assert.rejects(updateLog({ root, skill: 'execute', command: 'append', input: checkpoint }),
    /Existing log line 1/);
  assert.equal(await readFile(log, 'utf8'), 'not json\n');
});

test('validates shared schema and skill-specific repo field', () => {
  assert.deepEqual(normalizeEntry({ ...checkpoint, chosen: null }, 'execute').chosen, null);
  assert.equal(normalizeEntry(checkpoint, 'implement').site, 'review-pause');
  assert.equal(normalizeEntry({ ...checkpoint, repo: 'service-a' }, 'define-test-strategy').repo, 'service-a');
  assert.throws(() => normalizeEntry({ ...checkpoint, repo: 'service-a' }, 'execute'), /repo is allowed only/);
  assert.throws(() => normalizeEntry({ ...checkpoint, site: 'Review Pause' }, 'execute'), /lowercase slug/);
  assert.throws(() => normalizeEntry({ ...checkpoint, options: ['A'] }, 'execute'), /cannot include/);
  assert.throws(() => normalizeEntry({ ...question, chosen: ['Inline'] }, 'execute'), /multiSelect: true/);
  assert.deepEqual(normalizeEntry({ ...question, multiSelect: true, chosen: ['Inline'] }, 'execute').chosen, ['Inline']);
  assert.throws(() => normalizeEntry({ ...question, kind: 'open_text' }, 'execute'), /cannot include/);
  assert.throws(() => normalizeEntry({ ...checkpoint, unexpected: true }, 'execute'), /Unknown decision field/);
  assert.throws(() => normalizeEntry(checkpoint, '../execute'), /Unknown skill/);
});

test('rejects symlinked make-it-work directory and log target', async (t) => {
  const { root, log } = await workspace(t);
  const elsewhere = await mkdtemp(path.join(os.tmpdir(), 'decision-log-other-'));
  t.after(() => rm(elsewhere, { recursive: true, force: true }));
  await symlink(elsewhere, path.join(root, 'make-it-work'));
  await assert.rejects(updateLog({ root, skill: 'execute', command: 'init' }), /real directory/);
  await rm(path.join(root, 'make-it-work'));
  await mkdir(path.join(root, 'make-it-work'));
  await symlink(path.join(elsewhere, 'target'), log);
  await assert.rejects(updateLog({ root, skill: 'execute', command: 'write', input: [] }), /regular file/);
});

test('CLI reads JSON from stdin and leaves invalid input untouched', async (t) => {
  const { root, log } = await workspace(t);
  let result = spawnSync(process.execPath, [SCRIPT, 'init', 'execute', '--root', root], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  result = spawnSync(process.execPath, [SCRIPT, 'append', 'execute', '--root', root],
    { input: JSON.stringify(question), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const original = await readFile(log, 'utf8');
  result = spawnSync(process.execPath, [SCRIPT, 'append', 'execute', '--root', root],
    { input: '{bad json', encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Invalid decision JSON/);
  assert.equal(await readFile(log, 'utf8'), original);
});
