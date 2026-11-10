import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { feedbackAction, feedbackEligible, feedbackHold } from './feedback-handoff.mjs';
import { writeFeedback } from './write-feedback.mjs';
import { parseState } from './render-status.mjs';
import { decisionCell } from './workflow-decisions.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'feedback-handoff-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = path.join(root, 'make-it-work/DEMO');
  await mkdir(directory, { recursive: true });
  let markdown = await readFile(new URL('../../../evals/implement/feedback-clean/fixture/fixture-artifacts/DEMO-state.md', import.meta.url), 'utf8');
  markdown = markdown.replace('status: In Progress', 'status: Complete').replace('phase: final-sync', 'phase: complete');
  const count = [...markdown.matchAll(/^\| \d+ \|/gm)].length;
  markdown = markdown.trimEnd() + `\n| ${count + 1} | 2026-01-01T10:06:00Z | final-sync | complete | Final context sync complete |\n`;
  const statePath = path.join(directory, 'DEMO-state.md');
  await writeFile(statePath, markdown);
  const fields = parseState(markdown, statePath).fields;
  const report = path.join(directory, 'workflow-feedback.md');
  return { statePath, fields, report, markdown };
}
const review = { status: 'pending', context: ['Conversation visible turns 1 through 4 reviewed; earlier context unavailable'], findings: [], userInput: [], limitations: ['Client version unknown'] };
const stop = { hook_event_name: 'Stop' };

test('terminal handoff is explicit for completed runs and retry-limit stops only', () => {
  for (const fields of [{ status: 'Complete', phase: 'complete' }, { status: 'Stopped', phase: 'review', pause_reason: 'Review limit reached' }]) {
    assert.equal(feedbackEligible(fields), true);
    assert.equal(feedbackAction('/tmp/state.md', fields).next_action.type, 'feedback');
  }
  for (const fields of [{ status: 'Paused', phase: 'review' }, { status: 'Stopped', phase: 'review', pause_reason: 'User stopped' }, { status: 'Stopped', phase: 'context-check', pause_reason: 'Setup limit' }]) {
    assert.equal(feedbackEligible(fields), false);
    assert.deepEqual(feedbackAction('/tmp/state.md', fields), {});
  }
});

test('missing feedback holds terminal summary and delivery questions while leaving feedback tools available', async (t) => {
  const f = await fixture(t);
  assert.equal((await feedbackHold(stop, f.statePath, f.fields, [])).decision, 'block');
  const question = await feedbackHold({ hook_event_name: 'PreToolUse', tool_name: 'AskUserQuestion' }, f.statePath, f.fields, []);
  assert.equal(question.hookSpecificOutput.permissionDecision, 'deny');
  assert.equal(await feedbackHold({ hook_event_name: 'PreToolUse', tool_name: 'Bash' }, f.statePath, f.fields, []), null);
  await writeFeedback(f.statePath); // Artifact note alone is insufficient.
  assert.equal((await feedbackHold(stop, f.statePath, f.fields, [])).decision, 'block');
  await writeFeedback(f.statePath, { sessionReview: review });
  assert.equal(await feedbackHold(stop, f.statePath, f.fields, []), null);
  assert.equal(await readFile(f.statePath, 'utf8'), f.markdown);
  assert.match(await readFile(f.report, 'utf8'), /Provisional — user input pending/);
});

test('another run or an older state cannot satisfy the feedback check', async (t) => {
  const f = await fixture(t);
  await writeFeedback(f.statePath, { sessionReview: review });
  const original = await readFile(f.report, 'utf8');
  await writeFile(f.report, original.replaceAll(f.fields.start_time, '2020-01-01T00:00:00Z'));
  assert.equal((await feedbackHold(stop, f.statePath, f.fields, [])).decision, 'block');
  await writeFile(f.report, original);
  await writeFile(f.statePath, f.markdown.replace('10:06:00Z', '10:07:00Z'));
  assert.equal((await feedbackHold(stop, f.statePath, f.fields, [])).decision, 'block');
});

test('an explicit unavailable outcome releases the hook without creating reports or changing workflow state', async (t) => {
  const f = await fixture(t);
  const script = new URL('./write-feedback.mjs', import.meta.url).pathname;
  const result = spawnSync(process.execPath, [script, 'unavailable', '--state', f.statePath, '--reason', 'Feedback directory is not writable'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const events = [
    { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'unavailable', name: 'Bash', input: { command: `node ${script} unavailable --state state.md --reason limitation` } }] } },
    { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'unavailable', content: result.stdout }] } },
  ];
  const released = await feedbackHold(stop, f.statePath, f.fields, events);
  assert.equal(released.decision, undefined);
  assert.match(released.systemMessage, /reported unavailable/);
  assert.equal((await feedbackHold(stop, f.statePath, f.fields, events.slice(1))).decision, 'block');
  const replay = [{ ...events[0], type: 'api-request-blob' }];
  assert.equal((await feedbackHold(stop, f.statePath, f.fields, [...replay, events[1]])).decision, 'block');
  await writeFile(f.statePath, f.markdown.replace('10:06:00Z', '10:07:00Z'));
  assert.equal((await feedbackHold(stop, f.statePath, f.fields, events)).decision, 'block');
  await assert.rejects(readFile(f.report), { code: 'ENOENT' });
  const missingReason = spawnSync(process.execPath, [script, 'unavailable', '--state', f.statePath], { encoding: 'utf8' });
  assert.equal(missingReason.status, 1);
  assert.equal(missingReason.stdout, '');
});

test('post-completion delivery decisions do not invalidate feedback or create another retrospective', async (t) => {
  const f = await fixture(t);
  await writeFeedback(f.statePath, { sessionReview: review });
  const number = parseState(f.markdown).audit.length + 1;
  const decision = decisionCell({ id: 'delivery-choice', topic: 'Delivery preparation', source: 'user', via: 'question',
    choice: 'Not now', scope: 'This completed run', resume: 'transparent' });
  await writeFile(f.statePath, f.markdown.trimEnd() + `\n| ${number} | 2026-01-01T10:07:00Z | complete | complete | ${decision} |\n`);
  assert.equal(await feedbackHold(stop, f.statePath, f.fields, []), null);
});
