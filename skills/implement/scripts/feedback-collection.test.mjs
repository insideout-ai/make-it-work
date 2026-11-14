import assert from 'node:assert/strict';
import test from 'node:test';
import { collectFeedbackAttempts, renderCollectionNotes } from './feedback-collection.mjs';

const statePath = '/fixture/product/make-it-work/DEMO/DEMO-state.md';
const binding = { statePath, runId: '2026-01-01T10:00:00Z', stateHash: 'a'.repeat(64), terminalTime: Date.parse('2026-01-01T10:06:00Z') };
const writer = '/plugin/skills/implement/scripts/write-feedback.mjs';
function pair(id, op, result, { error = false, command = `node '${writer}' ${op} --state '${statePath}'`, at = '2026-01-01T10:08:00Z', ...flags } = {}) {
  return [
    { type: 'assistant', timestamp: at, ...flags, message: { content: [{ type: 'tool_use', id, name: 'Bash', input: { command } }] } },
    { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, is_error: error, content: typeof result === 'string' ? result : JSON.stringify(result) }] } },
  ];
}
const ack = extra => ({ runId: binding.runId, stateHash: binding.stateHash, ...extra });

test('pairs failed attempts with later operation successes, including a literal cd prefix and wrong helper path', () => {
  const notes = collectFeedbackAttempts([
    ...pair('bad-path', 'inspect', 'private path and error details', { error: true, command: `cd '/fixture/product'; node '/wrong/write-feedback.mjs' inspect --state 'make-it-work/DEMO/DEMO-state.md'` }),
    ...pair('inspect-ok', 'inspect', ack({ analysisRequired: false })),
    ...pair('check-bad', 'check', { valid: false, errors: ['private input'] }),
    ...pair('check-ok', 'check', { valid: true, errors: [] }),
    ...pair('save-bad', 'write', 'private@example.invalid secret-value', { error: true }),
  ], binding);
  assert.deepEqual(notes, { boundary: 'before-current-save', operations: [
    { operation: 'inspect', failedAttempts: 1, laterSuccessObserved: true },
    { operation: 'check', failedAttempts: 1, laterSuccessObserved: true },
    { operation: 'write', failedAttempts: 1, laterSuccessObserved: false },
  ] });
  const report = renderCollectionNotes(notes);
  assert.match(report, /Input check: 1 failed tool attempt observed; a later successful result/);
  assert.match(report, /Save: 1 failed tool attempt observed; no later successful result/);
  assert.match(report, /current save result is not in the snapshot/);
  assert.doesNotMatch(report, /private|secret-value|wrong|fixture|\.mjs|@/);
});

test('ignores replays, quoted evidence, sidechains, old calls, other states, ambiguous commands and unpaired results', () => {
  const relevant = pair('real', 'check', { valid: false });
  const events = [...relevant, ...relevant,
    ...pair('old', 'check', { valid: false }, { at: '2026-01-01T10:05:00Z' }),
    ...pair('synthetic', 'check', { valid: false }, { isSynthetic: true }),
    ...pair('meta', 'check', { valid: false }, { isMeta: true }),
    ...pair('child', 'check', { valid: false }, { parent_tool_use_id: 'delegate' }),
    ...pair('sidechain', 'check', { valid: false }, { isSidechain: true }),
    ...pair('other', 'check', { valid: false }, { command: `node '${writer}' check --state '/other/state.md'` }),
    ...pair('echo', 'check', { valid: false }, { command: `echo node '${writer}' check --state '${statePath}'` }),
    ...pair('pipe', 'check', { valid: false }, { command: `node '${writer}' check --state '${statePath}' | head` }),
    ...pair('compound', 'check', { valid: false }, { command: `node '${writer}' check --state '${statePath}'; false` }),
    ...pair('variable', 'check', { valid: false }, { command: `node "$WRITER" check --state '${statePath}'` }),
    ...pair('duplicate-state', 'check', { valid: false }, { command: `node '${writer}' check --state '${statePath}' --state '${statePath}'` }),
    { type: 'user', message: { content: [{ type: 'text', text: JSON.stringify(relevant) }, { type: 'tool_result', tool_use_id: 'unpaired', is_error: true, content: 'Failure' }] } },
    ...relevant.map(event => ({ ...event, type: 'api-request-blob' })),
  ];
  assert.deepEqual(collectFeedbackAttempts(events, binding).operations, [{ operation: 'check', failedAttempts: 1, laterSuccessObserved: false }]);
});

test('only matching structured acknowledgements establish recovery; a new failure resets recovery', () => {
  const events = [
    ...pair('bad', 'inspect', 'failure', { error: true }),
    ...pair('prose', 'inspect', 'Inspection succeeded'),
    ...pair('wrong-run', 'inspect', { ...ack({ analysisRequired: false }), runId: '2025-01-01T00:00:00Z' }),
    ...pair('good', 'inspect', ack({ analysisRequired: false })),
    ...pair('bad-again', 'inspect', 'failure', { error: true }),
  ];
  assert.deepEqual(collectFeedbackAttempts(events, binding).operations, [{ operation: 'inspect', failedAttempts: 2, laterSuccessObserved: false }]);
});

test('first successful combined save ends collection; later delivery and clarification attempts are excluded', () => {
  const notes = collectFeedbackAttempts([
    ...pair('check-bad', 'check', { valid: false }),
    ...pair('check-ok', 'check', { valid: true }),
    ...pair('save-ok', 'write', ack({ feedbackReport: 'combined' })),
    ...pair('later', 'write', 'failure after completion', { error: true }),
  ], binding);
  assert.deepEqual(notes, { boundary: 'first-saved-report', operations: [{ operation: 'check', failedAttempts: 1, laterSuccessObserved: true }] });
  assert.match(renderCollectionNotes(notes), /later work is excluded/);
});

test('absence of recognized failures is explicitly bounded, not a claim that the session was clean', () => {
  assert.equal(renderCollectionNotes(null), '');
  assert.match(renderCollectionNotes(collectFeedbackAttempts([], binding)), /No failed recognized helper attempts observed in the available runtime transcript/);
});
