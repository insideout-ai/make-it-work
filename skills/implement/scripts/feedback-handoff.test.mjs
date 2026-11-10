import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { feedbackAction, feedbackEligible, feedbackHold, feedbackStateHash } from './feedback-handoff.mjs';
import { writeFeedback } from './write-feedback.mjs';
import { generateDashboard } from './render-status.mjs';
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

test('controller and inspection supply runnable parent commands and separate JSON input paths', async t => {
  const f = await fixture(t);
  const initial = feedbackAction(f.statePath, f.fields).next_action.commands;
  const inspected = spawnSync(initial.inspect, { shell: true, encoding: 'utf8' });
  assert.equal(inspected.status, 0, inspected.stderr);
  const summary = JSON.parse(inspected.stdout), commands = summary.commands;
  await writeFile(commands.input_paths.sessionReview, JSON.stringify({ version: 2, status: 'pending', context: ['Available conversation reviewed'], findings: [], userInput: [], limitations: ['Browser behavior unverified'] }));
  for (const command of [commands.check, commands.write]) {
    const result = spawnSync(command, { shell: true, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
  assert.match(await readFile(f.report, 'utf8'), /### Session review/);
  assert.equal(await readFile(f.statePath, 'utf8'), f.markdown);
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

const script = new URL('./write-feedback.mjs', import.meta.url).pathname;
function toolEvents(id, command, result, isError = false) {
  return [
    { type: 'assistant', timestamp: '2026-01-01T10:08:00Z', message: { content: [{ type: 'tool_use', id, name: 'Bash', input: { command } }] } },
    { type: 'user', timestamp: '2026-01-01T10:08:01Z', message: { content: [{ type: 'tool_result', tool_use_id: id, is_error: isError, content: result }] } },
  ];
}

test('a reason alone cannot skip feedback, even when a fabricated acknowledgement claims unavailable', async (t) => {
  const f = await fixture(t);
  const result = spawnSync(process.execPath, [script, 'unavailable', '--state', f.statePath, '--reason', 'No friction requiring a retrospective; no conversation review was written'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  const events = toolEvents('unavailable', `node "${script}" unavailable --state "${f.statePath}"`, JSON.stringify({ feedbackAttempt: 'unavailable', runId: f.fields.start_time,
    stateHash: feedbackStateHash(f.fields, parseState(f.markdown).audit), failureId: 'invented', reason: 'Not performed', reportSaved: false }));
  assert.equal((await feedbackHold(stop, f.statePath, f.fields, events)).decision, 'block');
  assert.equal((await feedbackHold({ hook_event_name: 'PreToolUse', tool_name: 'AskUserQuestion' }, f.statePath, f.fields, events)).hookSpecificOutput.permissionDecision, 'deny');
  assert.equal(await readFile(f.statePath, 'utf8'), f.markdown);
  await assert.rejects(readFile(f.report), { code: 'ENOENT' });
});

test('an evidenced technical failure saves only a receipt and releases the terminal gate accurately', async (t) => {
  const f = await fixture(t);
  const dashboard = await generateDashboard(f.statePath);
  assert.match(await readFile(dashboard, 'utf8'), /data-workflow-feedback-status="collecting"/);
  await writeFile(path.join(path.dirname(f.statePath), 'hook-events.jsonl'), 'corrupt evidence\n');
  const failed = spawnSync(process.execPath, [script, 'inspect', '--state', f.statePath], { encoding: 'utf8' });
  assert.equal(failed.status, 1);
  assert.equal(JSON.parse(failed.stdout).code, 'FEEDBACK_EVIDENCE');
  const events = toolEvents('failed-inspect', `node "${script}" inspect --state "${f.statePath}"`, failed.stdout, true);
  const transcript = path.join(path.dirname(f.statePath), 'transcript.jsonl');
  await writeFile(transcript, events.map(JSON.stringify).join('\n') + '\n');
  const args = ['unavailable', '--state', f.statePath, '--reason', 'Runtime feedback evidence could not be parsed', '--transcript', transcript, '--failure-id', 'failed-inspect'];
  const result = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const acknowledgement = JSON.parse(result.stdout);
  assert.equal(acknowledgement.reportSaved, false);
  assert.equal(acknowledgement.receiptSaved, true);
  assert.equal(acknowledgement.dashboardUpdated, true);
  assert.match(await readFile(dashboard, 'utf8'), /data-workflow-feedback-status="unavailable"/);
  assert.equal(JSON.parse(await readFile(acknowledgement.receiptPath, 'utf8')).failureId, 'failed-inspect');
  const outcomeEvents = toolEvents('unavailable', `node "${script}" unavailable --state "${f.statePath}"`, result.stdout);
  events.push(...outcomeEvents);
  const released = await feedbackHold(stop, f.statePath, f.fields, events);
  assert.equal(released.decision, undefined);
  assert.match(released.systemMessage, /No combined feedback report was saved/);
  assert.match(released.systemMessage, /Only a failure receipt was saved/);
  assert.equal((await feedbackHold(stop, f.statePath, f.fields, outcomeEvents)).decision, 'block');
  for (const type of ['api-request-blob', 'attachment']) {
    const replay = [{ ...events[0], type }, events[1], ...outcomeEvents];
    assert.equal((await feedbackHold(stop, f.statePath, f.fields, replay)).decision, 'block');
  }
  const hiddenExit = [{ ...events[0], message: { content: [{ ...events[0].message.content[0], input: { command: `node "${script}" inspect --state "${f.statePath}" | head` } }] } }, ...events.slice(1)];
  assert.equal((await feedbackHold(stop, f.statePath, f.fields, hiddenExit)).decision, 'block');
  const old = events.map(event => ({ ...event, timestamp: '2026-01-01T10:00:00Z' }));
  assert.equal((await feedbackHold(stop, f.statePath, f.fields, old)).decision, 'block');
  assert.equal(await readFile(f.statePath, 'utf8'), f.markdown);
  await writeFile(f.statePath, f.markdown.replace('10:06:00Z', '10:07:00Z'));
  assert.equal((await feedbackHold(stop, f.statePath, f.fields, events)).decision, 'block');
  await assert.rejects(readFile(f.report), { code: 'ENOENT' });
});

test('schema/input mistakes are repairable work, not technical failures permitting a bypass', async (t) => {
  const f = await fixture(t);
  const invalid = path.join(path.dirname(f.statePath), 'invalid.json');
  await writeFile(invalid, '{}');
  const failed = spawnSync(process.execPath, [script, 'write', '--state', f.statePath, '--session-review', invalid], { encoding: 'utf8' });
  assert.equal(failed.status, 1);
  assert.equal(failed.stdout, '');
  const events = toolEvents('bad-input', `node "${script}" write --state "${f.statePath}" --session-review "${invalid}"`, failed.stderr, true);
  const transcript = path.join(path.dirname(f.statePath), 'transcript.jsonl');
  await writeFile(transcript, events.map(JSON.stringify).join('\n') + '\n');
  const result = spawnSync(process.execPath, [script, 'unavailable', '--state', f.statePath, '--reason', 'Input was rejected', '--transcript', transcript, '--failure-id', 'bad-input'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /No qualifying technical failure/);
  assert.equal((await feedbackHold(stop, f.statePath, f.fields, events)).decision, 'block');
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
