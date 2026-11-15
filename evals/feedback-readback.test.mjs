import assert from 'node:assert/strict';
import test from 'node:test';
import { feedbackReadback } from './feedback-readback.mjs';

const cwd = '/fixture', file = '/fixture/make-it-work/DEMO/workflow-feedback.md';
const report = '# Feedback\n\n## Findings\nA material observation.\n\n## Limits\nNot browser checked.\n';
const pair = (id, name, input, content, is_error = false) => [
  { type: 'assistant', message: { content: [{ type: 'tool_use', id, name, input }] } },
  { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content, is_error }] } },
];
const save = () => pair('save', 'Bash', { command: "node '/plugin/write-feedback.mjs' write --state '/fixture/state.md'" }, JSON.stringify({ feedbackReport: 'combined', sessionOutputPath: file }));
const final = { type: 'assistant', message: { content: [{ type: 'text', text: 'Feedback saved.' }] } };
const grade = events => feedbackReadback(events, cwd, file, report);
const numbered = (start, end) => report.trimEnd().split('\n').slice(start - 1, end).map((s, i) => `${start + i}\t${s}`).join('\n');

test('requires actual successful full readback after save and before final presentation', () => {
  assert.equal(grade([...save(), ...pair('read', 'Read', { file_path: file }, numbered(1, 7)), final]).passed, true);
  assert.equal(grade([...save(), ...pair('cat', 'Bash', { command: `cat '${file}'` }, report), final]).passed, true);
  for (const events of [
    [...save(), final],
    [...pair('early', 'Read', { file_path: file }, report), ...save(), final],
    [...save(), final, ...pair('late', 'Read', { file_path: file }, report)],
    [...save(), ...pair('failed', 'Read', { file_path: file }, report, true), final],
    [...save(), ...pair('head', 'Read', { file_path: file, limit: 3 }, numbered(1, 3)), final],
    [...save(), ...pair('count', 'Bash', { command: `grep -c '^#' '${file}'` }, '3'), final],
    [...save(), ...pair('echo', 'Bash', { command: `echo '${report}'` }, report), final],
    [...save(), ...pair('other', 'Read', { file_path: '/other/report.md' }, report), final],
  ]) assert.equal(grade(events).passed, false);
});

test('accepts cumulative exact SDK lines but rejects missing or truncated body text', () => {
  assert.equal(grade([...save(), ...pair('a', 'Read', { file_path: file, limit: 3 }, numbered(1, 3)), ...pair('b', 'Read', { file_path: file, offset: 4 }, numbered(4, 7)), final]).passed, true);
  assert.equal(grade([...save(), ...pair('a', 'Read', { file_path: file }, numbered(1, 7).replace('A material observation.', 'A material...')), final]).passed, false);
});

test('ignores user claims, diagnostic replays and readback of an earlier saved revision', () => {
  const read = pair('read', 'Read', { file_path: file }, report);
  assert.equal(grade([...save(), ...read.map(event => ({ ...event, type: 'api-request-blob' })), final]).passed, false);
  assert.equal(grade([...save(), ...read.map(event => ({ ...event, parentToolUseId: 'child' })), final]).passed, false);
  assert.equal(grade([...save(), { type: 'user', message: { content: [{ type: 'text', text: JSON.stringify(read) }] } }, final]).passed, false);
  const laterSave = save().map(event => JSON.parse(JSON.stringify(event).replaceAll('"save"', '"save-again"')));
  assert.equal(grade([...save(), ...read, ...laterSave, final]).passed, false);
});

test('distinguishes an absent read from an unsupported save boundary', () => {
  assert.equal(grade([...pair('other', 'Skill', { skill: 'implement' }, 'Loaded.'), ...save(), final]).passed, false);
  const truncatedSave = pair('save', 'Bash', { command: 'node /plugin/write-feedback.mjs write --state "$PWD/state.md" | head -c 1200' }, '{"runId":"run"');
  assert.match(grade([...truncatedSave, final]).detail, /^No successful Read/);
  assert.match(grade([...truncatedSave, ...pair('read', 'Read', { file_path: file }, report), final]).detail, /^Grader error:/);
  const read = pair('read', 'Read', { file_path: file }, report).map(event => ({ ...event, timestamp: new Date(3000).toISOString() }));
  assert.equal(feedbackReadback([...truncatedSave, ...read, final], cwd, file, report, { modifiedAt: 2000 }).passed, true);
  assert.equal(feedbackReadback([...truncatedSave, ...read, final], cwd, file, report, { modifiedAt: 4000 }).passed, false);
});
