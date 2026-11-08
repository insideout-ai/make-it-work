import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, stat, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { normalizeEntry, updateLog } from './decision-log.mjs';
import { renderEpic } from './epic.mjs';

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

test('ticket-scoped logs stay in the ticket directory', async (t) => {
  const { root } = await workspace(t);
  const nested = path.join(root, 'make-it-work', 'DEMO-1', 'execute-autopilot-log.jsonl');
  await updateLog({ root, skill: 'execute', command: 'init', ticket: 'DEMO-1' });
  await updateLog({ root, skill: 'execute', command: 'append', ticket: 'DEMO-1', input: checkpoint });
  assert.deepEqual(JSON.parse((await readFile(nested, 'utf8')).trim()), normalizeEntry(checkpoint, 'execute'));
  assert.deepEqual(await readdir(path.join(root, 'make-it-work')), ['DEMO-1']);
  await assert.rejects(updateLog({ root, skill: 'execute', command: 'init', ticket: '../other' }), /Unsafe ticket/);
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

test('CLI reads JSON from an --input file and removes it after use', async (t) => {
  const { root, log } = await workspace(t);
  let result = spawnSync(process.execPath, [SCRIPT, 'init', 'execute', '--root', root], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, `Decision log saved to ${log}\n`);
  const payload = path.join(root, 'make-it-work', '.decision-log-input.json');
  await writeFile(payload, JSON.stringify(question));
  result = spawnSync(process.execPath, [SCRIPT, 'append', 'execute', '--root', root, '--input', payload],
    { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, `Decision log saved to ${log}\n`);
  assert.equal((await readFile(log, 'utf8')).trim().split('\n').length, 1);
  await assert.rejects(stat(payload));
  await writeFile(payload, '{bad json');
  result = spawnSync(process.execPath, [SCRIPT, 'append', 'execute', '--root', root, '--input', payload],
    { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /Invalid decision JSON/);
});

test('CLI write confirms the persisted path and never claims success for a failed write', async (t) => {
  const { root, log } = await workspace(t);
  const run = () => spawnSync(process.execPath, [SCRIPT, 'write', 'execute', '--root', root],
    { input: JSON.stringify([checkpoint]), encoding: 'utf8' });
  let result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, `Decision log saved to ${log}\n`);
  assert.deepEqual(JSON.parse((await readFile(log, 'utf8')).trim()), checkpoint);
  await rm(log);
  await mkdir(log);
  result = run();
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /regular file/);
});

test('decision-log CLI executes through a symlink and reports the saved file', async (t) => {
  const { root, log } = await workspace(t);
  const alias = path.join(root, 'decision-log-link.mjs');
  await symlink(SCRIPT, alias);
  const result = spawnSync(process.execPath, [alias, 'init', 'execute', '--root', root], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, `Decision log saved to ${log}\n`);
  assert.equal(await readFile(log, 'utf8'), '');
});

test('shaping renders its epic and writes every automatic resolution from the same input file', async (t) => {
  const { root } = await workspace(t);
  const choices = [question, { phase: 'Phase 2B', site: 'gap-check-editing', kind: 'open_text',
    chosen: '[autopilot best-guess] Edits affect future digests.', rationale: 'Proposed for review.' }];
  const epic = { version: 1, mode: 'product', title: 'Alerts', categories: [
    { id: 3, assessed: true, ready: true, content: 'Save searches.' }],
    decisions: [{ topic: 'Goal', decision: 'Save searches.', status: 'Confirmed', source: 'user', reference: 'Brief' },
      ...choices.map((auto_resolution) => ({ topic: auto_resolution.site, auto_resolution }))] };
  const markdown = renderEpic(epic);
  for (const choice of choices) assert.ok(markdown.includes(choice.chosen));
  const payload = path.join(root, 'epic-input.json');
  await writeFile(payload, JSON.stringify(epic));
  const result = spawnSync(process.execPath, [SCRIPT, 'write', 'shape-the-epic', '--root', root, '--input', payload], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const log = path.join(root, 'make-it-work', 'shape-the-epic-autopilot-log.jsonl');
  assert.equal(result.stdout, `Decision log saved to ${log}\n`);
  assert.deepEqual((await readFile(log, 'utf8')).trim().split('\n').map(JSON.parse), choices.map((entry) => normalizeEntry(entry, 'shape-the-epic')));
  await assert.rejects(stat(payload));
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

test('shaping log rejects an unlogged best guess before overwriting a prior audit', async (t) => {
  const { root } = await workspace(t);
  const log = path.join(root, 'make-it-work/shape-the-epic-autopilot-log.jsonl');
  const resolution = { phase: 'Phase 2B', site: 'dependency', kind: 'open_text', chosen: '[autopilot best-guess] Reuse email.', rationale: 'Proposed, unverified dependency.' };
  const valid = { version: 1, categories: [], decisions: [{ topic: 'Email', auto_resolution: resolution }] };
  await updateLog({ root, skill: 'shape-the-epic', command: 'write', input: valid });
  const before = await readFile(log, 'utf8');
  const invalid = structuredClone(valid);
  invalid.decisions.push({ topic: 'Logged-out handling', decision: '[autopilot best-guess] Ask the visitor to log in.', status: 'Proposed' });
  await assert.rejects(updateLog({ root, skill: 'shape-the-epic', command: 'write', input: invalid }), /Logged-out handling.*requires auto_resolution/);
  assert.equal(await readFile(log, 'utf8'), before);
  invalid.decisions[1] = { topic: 'Logged-out handling', auto_resolution: { ...resolution, site: 'logged-out', chosen: '[autopilot best-guess] Ask the visitor to log in.' } };
  await updateLog({ root, skill: 'shape-the-epic', command: 'write', input: invalid });
  assert.equal((await readFile(log, 'utf8')).trim().split('\n').length, 2);
});
