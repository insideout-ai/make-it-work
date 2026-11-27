import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { digest } from './lib/artifacts.mjs';
import { collectCommandFacts, requireCommandFacts } from './lib/command-facts.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'command-facts-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = path.join(root, 'make-it-work', 'DEMO'); await mkdir(directory, { recursive: true });
  const fields = { ticket: 'DEMO', start_time: '2026-01-01T10:00:00Z', plan_version: '2' };
  const record = async (exit, extra = {}) => {
    const streams = {};
    for (const stream of ['stdout', 'stderr']) {
      const relative = `make-it-work/DEMO/command-${stream}-${randomUUID()}.txt`;
      const bytes = 'private output'; await writeFile(path.join(root, relative), bytes);
      streams[stream] = { path: relative, bytes: Buffer.byteLength(bytes), sha256: digest(bytes), complete: true };
    }
    const file = path.join(directory, `command-capture-${randomUUID()}.json`);
    const value = { version: 1, status: 'finished', run_id: fields.start_time, ticket: 'DEMO', plan_version: 1,
      command: { bin: '/private/tool', args: ['secret-argument'] }, before: { head: 'a'.repeat(40), fingerprint: 'b'.repeat(64) },
      process: { exit_code: exit, result: exit === 0 ? 'pass' : 'fail', signal: null, error: null, timed_out: false },
      streams, capture_complete: true, ...extra };
    await writeFile(file, JSON.stringify(value)); return { file, value };
  };
  return { root, directory, fields, record };
}

test('synthetic historical failure and later pass both survive without argv/output disclosure or baseline inference', async t => {
  const f = await fixture(t);
  await f.record(1, { baseline: 'claimed pre-existing', source_unchanged: false });
  await f.record(0, { plan_version: 2, source_unchanged: true });
  await f.record(9, { run_id: '2025-01-01T10:00:00Z' });
  const facts = await collectCommandFacts(f.root, f.fields);
  assert.equal(facts.records.length, 2); assert.equal(facts.files.length, 6);
  assert.match(facts.notes.join('\n'), /process exited 1/); assert.match(facts.notes.join('\n'), /process exited 0/);
  assert.match(facts.notes.join('\n'), /recorded boundary snapshots differ/);
  assert.match(facts.notes.join('\n'), /recorded boundary snapshots matched/);
  assert.doesNotMatch(facts.notes.join('\n'), /secret-argument|private output|private\/tool|claimed pre-existing/);
  assert.ok(facts.notes.every(note => note.includes('does not certify the current tree') && note.includes('baseline/destination')));
  requireCommandFacts(facts, facts, facts.notes);
  assert.throws(() => requireCommandFacts(facts, facts, []), /Captured validation facts/);
});

test('incomplete, contradictory and interrupted captures cannot become passing evidence', async t => {
  const f = await fixture(t), record = await f.record(0);
  await rm(path.join(f.root, record.value.streams.stdout.path));
  await f.record(0, { process: { exit_code: 1, result: 'pass', signal: null, error: null, timed_out: false } });
  await writeFile(path.join(f.directory, `command-capture-${randomUUID()}.json`), '');
  const facts = await collectCommandFacts(f.root, f.fields);
  assert.equal(facts.records.length, 3);
  assert.ok(facts.notes.some(note => note.includes('incomplete or unverified')));
  assert.equal(facts.notes.filter(note => note.includes('process outcome is unknown')).length, 2);
  assert.ok(facts.files.some(file => file.sha256 === null));
  await writeFile(path.join(f.root, record.value.streams.stderr.path), 'changed output');
  const changed = await collectCommandFacts(f.root, f.fields);
  assert.throws(() => requireCommandFacts(changed, facts, facts.notes), /Captured validation facts/);
});

test('capture references cannot read outside the run or follow symlinked logs', async t => {
  const f = await fixture(t), record = await f.record(1);
  const outside = path.join(f.root, 'outside.txt'); await writeFile(outside, 'outside');
  const stream = path.join(f.root, record.value.streams.stdout.path);
  await rm(stream); await symlink(outside, stream);
  await assert.rejects(collectCommandFacts(f.root, f.fields), /regular file|escapes/);
  record.value.streams.stdout.path = '../outside.txt'; await writeFile(record.file, JSON.stringify(record.value));
  await assert.rejects(collectCommandFacts(f.root, f.fields), /local run output/);
  assert.equal(await readFile(outside, 'utf8'), 'outside');
});
