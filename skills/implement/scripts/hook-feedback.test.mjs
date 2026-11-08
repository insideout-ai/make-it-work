import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { readHookEvents, recordHookEvent, summarizeHookEvents } from './hook-feedback.mjs';

const sha = (text) => createHash('sha256').update(text).digest('hex');
const runId = '2026-01-01T10:00:00.000Z';
const terminalTime = '2026-01-01T11:00:00.000Z';
const observation = (id, kind = 'active-stage', extra = {}) => ({ version: 1, eventId: sha(id), runId,
  at: '2026-01-01T10:05:00.000Z', hook: 'Stop', phase: 'execute', kind, subject: sha(kind), ...extra });

test('duplicate invocations are counted once; distinct rejections and their release remain visible', () => {
  const first = observation('one');
  const events = [first, first, observation('two', 'active-stage', { at: '2026-01-01T10:06:00.000Z' }),
    observation('clear', 'clear', { at: '2026-01-01T10:07:00.000Z' })];
  const result = summarizeHookEvents(events, runId, terminalTime);
  assert.equal(result.interventions.length, 1);
  assert.equal(result.interventions[0].occurrences, 2);
  assert.equal(result.interventions[0].resolvedAt, events[3].at);
  assert.equal(result.analysisRequired, true);
});

test('ordinary waits stay separate; only repeated waits for the same agents require analysis', () => {
  const first = observation('first', 'agent-wait');
  const one = summarizeHookEvents([first], runId, terminalTime);
  assert.equal(one.analysisRequired, false); assert.deepEqual(one.interventions, []);
  const repeated = summarizeHookEvents([first, observation('again', 'agent-wait')], runId, terminalTime);
  assert.equal(repeated.waits[0].occurrences, 2); assert.equal(repeated.analysisRequired, true);
  const different = summarizeHookEvents([first, observation('other-worker', 'agent-wait', { subject: sha('other') })], runId, terminalTime);
  assert.equal(different.waits.length, 2); assert.equal(different.analysisRequired, false);
});

test('phase progress closes old episodes; unrelated hooks do not resolve a Stop hold', () => {
  const result = summarizeHookEvents([observation('held'), observation('tool', 'clear', { hook: 'PreToolUse' }),
    observation('review', 'active-stage', { phase: 'review' })], runId, terminalTime);
  assert.equal(result.interventions.length, 2);
  assert.ok(result.interventions[0].resolvedAt);
  assert.equal(result.interventions[1].resolvedAt, null);
  assert.equal(summarizeHookEvents([observation('held'), observation('tool', 'clear', { hook: 'PreToolUse' })], runId, terminalTime).interventions[0].resolvedAt, null);
});

test('other runs, pre-run events and post-terminal observations cannot create retrospective incidents', () => {
  const events = [observation('other', 'active-stage', { runId: '2025-01-01T10:00:00.000Z' }),
    observation('early', 'active-stage', { at: '2026-01-01T09:59:00.000Z' }),
    observation('late', 'active-stage', { at: '2026-01-01T11:01:00.000Z' })];
  assert.deepEqual(summarizeHookEvents(events, runId, terminalTime), { interventions: [], waits: [], analysisRequired: false });
});

async function workspace(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'hook-feedback-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = path.join(root, 'make-it-work/DEMO');
  await mkdir(directory, { recursive: true });
  const statePath = path.join(directory, 'DEMO-state.md');
  await writeFile(statePath, 'untouched state');
  return { root, directory, statePath, state: { fields: { ticket: 'DEMO', start_time: new Date(Date.now() - 1000).toISOString(), phase: 'execute', status: 'In Progress' } } };
}

test('recorder deduplicates retried hook calls, records release, and never saves private input text', async (t) => {
  const w = await workspace(t);
  const input = { hook_event_name: 'Stop', last_assistant_message: '/private/customer/source SECRET', session_id: 'private-session' };
  const args = { ...w, input, events: [{ type: 'assistant', uuid: 'one', message: { content: input.last_assistant_message } }], kind: 'active-stage' };
  await recordHookEvent(args); await recordHookEvent(args);
  assert.equal((await readHookEvents(w.statePath)).length, 1);
  await recordHookEvent({ ...args, kind: 'clear' });
  await recordHookEvent({ ...args, events: [{ type: 'assistant', uuid: 'two' }], kind: 'clear' });
  const events = await readHookEvents(w.statePath);
  assert.equal(events.length, 2);
  assert.ok(summarizeHookEvents(events, w.state.fields.start_time, new Date().toISOString()).interventions[0].resolvedAt);
  assert.doesNotMatch(await readFile(path.join(w.directory, 'hook-events.jsonl'), 'utf8'), /SECRET|customer|private-session|source/);
  assert.equal(await readFile(w.statePath, 'utf8'), 'untouched state');
});

test('journal absence is compatible; malformed records and symlinks fail without altering targets', async (t) => {
  const w = await workspace(t);
  assert.deepEqual(await readHookEvents(w.statePath), []);
  const journal = path.join(w.directory, 'hook-events.jsonl');
  await writeFile(journal, JSON.stringify({ ...observation('raw'), reason: 'private text' }) + '\n');
  await assert.rejects(readHookEvents(w.statePath), /Invalid workflow hook observation/);
  await rm(journal);
  const target = path.join(w.root, 'target'); await writeFile(target, 'keep'); await symlink(target, journal);
  await assert.rejects(readHookEvents(w.statePath));
  await assert.rejects(recordHookEvent({ ...w, input: { hook_event_name: 'Stop' }, events: [], kind: 'active-stage' }));
  assert.equal(await readFile(target, 'utf8'), 'keep');
});
