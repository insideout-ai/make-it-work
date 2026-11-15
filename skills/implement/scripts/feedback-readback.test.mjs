import assert from 'node:assert/strict';
import test from 'node:test';
import { currentReadback, feedbackReadback } from './feedback-readback.mjs';

const report = '# Feedback\n\nA material finding.\n\nBrowser check pending.\n';
const options = { reportPath: '/fixture/run/workflow-feedback.md', report, modifiedAt: 2000.25, terminalTime: 1000, root: '/fixture' };
const pair = (id, name = 'Read', input = { file_path: options.reportPath }, content = report, time = 3000, is_error = false) => [
  { type: 'assistant', timestamp: new Date(time).toISOString(), message: { content: [{ type: 'tool_use', id, name, input }] } },
  { type: 'user', timestamp: new Date(time + 1).toISOString(), message: { content: [{ type: 'tool_result', tool_use_id: id, content, is_error }] } },
];
const grade = events => feedbackReadback(events, options);
const numbered = (from, to) => report.trimEnd().split('\n').slice(from - 1, to).map((line, i) => `${from + i}\t${line}`).join('\n');

test('full successful parent reads cover the current body, including bounded SDK ranges', () => {
  assert.ok(grade(pair('read')));
  assert.ok(grade(pair('cat', 'Bash', { command: `cat '${options.reportPath}'` })));
  const ranged = grade([...pair('a', 'Read', undefined, numbered(1, 2)), ...pair('b', 'Read', undefined, numbered(3, 5))]);
  assert.deepEqual(ranged.toolIds, ['a', 'b']);
  for (const content of [numbered(1, 2), numbered(1, 5).replace('A material finding.', 'A material...'), '5 lines']) {
    assert.equal(grade(pair('partial', 'Read', undefined, content)), null);
  }
});

test('failed, early, delegated, replayed, claimed and projected reads cannot release finalization', () => {
  const read = pair('read');
  for (const events of [[], pair('failed', 'Read', undefined, report, 3000, true), pair('early', 'Read', undefined, report, 1500),
    read.map(e => ({ ...e, type: 'api-request-blob' })), read.map(e => ({ ...e, isSynthetic: true })),
    read.map(e => ({ ...e, parentToolUseId: 'delegate' })), read.map(e => ({ ...e, parent_tool_use_id: 'delegate' })),
    [{ type: 'user', message: { content: [{ type: 'text', text: JSON.stringify(read) }] } }],
    pair('count', 'Bash', { command: `wc -l '${options.reportPath}'` }, report),
    pair('pipe', 'Bash', { command: `cat '${options.reportPath}' | head` }, report),
    pair('other', 'Read', { file_path: '/fixture/other.md' }),
    pair('echo', 'Bash', { command: `echo '${report}'` }),
  ]) assert.equal(grade(events), null);
});

test('proof binds report content and the latest save; resume can reuse only the same revision', () => {
  const events = pair('read'), readback = grade(events), receipt = { readback };
  assert.equal(currentReadback(receipt, report, options.modifiedAt), true);
  assert.deepEqual(grade(events), readback);
  assert.equal(currentReadback(receipt, report + 'New finding.\n', options.modifiedAt), false);
  assert.equal(currentReadback(receipt, report, 4000), false);
  assert.equal(feedbackReadback(events, { ...options, modifiedAt: 4000 }), null);
  assert.equal(currentReadback({ status: 'saved' }, report, options.modifiedAt), false);
  assert.equal(grade([...events.slice(0, 1), { ...events[1], timestamp: undefined }]), null);
});
