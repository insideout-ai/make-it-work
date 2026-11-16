import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runtimeObjects } from './runtime-output.mjs';
import { startupProgress } from './startup-presentation.mjs';

test('complete JSON and JSONL envelopes are supported; incomplete JSON is not evidence', () => {
  const value = { feedbackContext: { state: '/fixture/DEMO-state.md', runId: '2026-01-01T10:00:00Z' } };
  assert.deepEqual(runtimeObjects(JSON.stringify(value, null, 2)), [value]);
  assert.deepEqual(runtimeObjects(`output\n${JSON.stringify(value)}\n{}`), [value, {}]);
  assert.deepEqual(runtimeObjects(JSON.stringify(value).slice(0, -1)), []);
  assert.deepEqual(runtimeObjects('null'), []);
});

test('historical projected/truncated handoff is not discovered; complete compact output restores it', async () => {
  const events = (await readFile(new URL('./fixtures/session-completion.jsonl', import.meta.url), 'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(startupProgress(events).feedbackRun, null);
  const context = { state: '/fixture/make-it-work/DEMO/DEMO-state.md', runId: '2026-01-01T10:00:00Z' };
  for (const spacing of [undefined, 2]) {
    const repaired = structuredClone(events);
    repaired.at(-1).message.content[0].content = JSON.stringify({ feedbackContext: context }, null, spacing);
    assert.deepEqual(startupProgress(repaired).feedbackRun, context);
  }
});
