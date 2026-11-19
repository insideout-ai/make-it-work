import assert from 'node:assert/strict';
import test from 'node:test';
import { planningActivityCheck, planningActivityHold } from './planning-activity.mjs';

const statePath = '/tmp/planning-activity-fixture/make-it-work/DEMO/DEMO-state.md';
const root = '/tmp/planning-activity-fixture';
const chat = text => ({ type: 'assistant', timestamp: '2026-11-17T10:00:01Z', message: { role: 'assistant', content: [{ type: 'text', text }] } });
const state = (activities = []) => ({ fields: { ticket: 'DEMO', plan: 'none', plan_version: '1', test_writing_version: '1', mode: 'tdd', phase: 'plan', status: 'In Progress' }, audit: [
  { number: 1, from: 'spec-approval', to: 'plan', epoch: Date.parse('2026-11-17T10:00:00Z') },
  ...activities.map((boundary, i) => ({ number: i + 2, from: 'plan', to: 'plan', note: { kind: 'activity', id: `planning-${boundary}:receipt` } })),
] });
const hold = (tool_name, tool_input, saved = state(), events = []) => planningActivityHold({ hook_event_name: 'PreToolUse', cwd: root, tool_name, tool_input }, events, saved, statePath);
const checkpoint = activity => `node "/plugin/dashboard-checkpoint.mjs" activity --state "${statePath}" --activity "${activity}" --planning-activity discovery`;

test('accepts the actual chat sentence and rejects paraphrases, thinking, tools, code and child streams', () => {
  const sentence = 'I am inspecting the existing policy tests.';
  assert.equal(hold('Bash', { command: checkpoint(sentence) }, state(), [chat(sentence)]), null);
  assert.match(hold('Bash', { command: checkpoint(sentence) }, state(), [chat('Inspecting the policy tests.')]), /match actual assistant chat/);
  const falseEvidence = [
    { type: 'user', message: { content: [{ type: 'tool_result', content: sentence }] } },
    { type: 'assistant', message: { content: [{ type: 'thinking', thinking: sentence }] } },
    chat('```\n' + sentence + '\n```'), chat('```\n' + sentence),
    { ...chat(sentence), isSidechain: true }, { ...chat(sentence), parent_tool_use_id: 'child' },
    { ...chat(sentence), timestamp: '2026-11-17T09:59:59Z' },
  ];
  for (const evidence of falseEvidence) assert.match(hold('Bash', { command: checkpoint(sentence) }, state(), [evidence]), /match actual assistant chat/);
});

test('requires a standalone checkpoint while allowing shell assignments and punctuation in the sentence', () => {
  const sentence = 'I am checking tests; implementation stays unchanged.';
  const command = checkpoint(sentence);
  assert.equal(hold('Bash', { command: 'P=/plugin; ' + command }, state(), [chat(sentence)]), null);
  for (const suffix of [' | head -c 600', ' >/dev/null', '; node /plugin/validate-plan.mjs check', '\ncat src/policy.js']) {
    assert.match(hold('Bash', { command: command + suffix }, state(), [chat(sentence)]), /own Bash call/);
  }
  assert.match(hold('Bash', { command: 'node /plugin/artifact-output.mjs resolve; ' + command }, state(), [chat(sentence)]), /own Bash call/);
});

test('invalid activity requests are rejected for their actual defect even before chat persists', () => {
  const command = checkpoint('I am checking the existing tests.');
  assert.match(hold('Bash', { command: command + ' | head -c 500' }), /own Bash call/);
  assert.match(hold('Bash', { command: command.replace('discovery', 'unknown') }), /discovery, drafting or validation/);
  assert.match(hold('Bash', { command: 'node /plugin/dashboard-checkpoint.mjs activity --planning-activity discovery' }), /nonempty single-line --activity/);
  for (const invalid of [command + ' | head', command.replace('discovery', 'unknown'), command.replace('discovery', '""'), command.replace('I am checking the existing tests.', '')]) {
    assert.equal(planningActivityCheck({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: invalid } }, [], state(), statePath).pendingChat, false);
  }
});

test('protects investigation, drafting and validation at their actual work boundaries', () => {
  assert.match(hold('Read', { file_path: root + '/src/policy.js' }), /--planning-activity discovery/);
  assert.equal(hold('Read', { file_path: root + '/src/policy.js' }, state(['discovery'])), null);
  assert.equal(hold('Read', { file_path: '/plugin/skills/plan-the-work/SKILL.md' }), null);
  const input = { file_path: root + '/make-it-work/DEMO/DEMO-plan.md' };
  assert.match(hold('Write', input, state(['discovery'])), /--planning-activity drafting/);
  assert.equal(hold('Write', input, state(['discovery', 'drafting'])), null);
  assert.match(hold('Edit', input, state(['discovery', 'drafting', 'validation'])), /--planning-activity drafting/);
  const validation = { command: 'node /plugin/validate-plan.mjs normalize-risk --plan plan.md' };
  assert.match(hold('Bash', validation, state(['discovery', 'drafting'])), /--planning-activity validation/);
  assert.equal(hold('Bash', validation, state(['discovery', 'drafting', 'validation'])), null);
});

test('retains legacy and other-stage behavior and does not reuse a prior planning cycle', () => {
  for (const fields of [{ test_writing_version: undefined }, { mode: 'lightweight' }, { phase: 'write-tests' }, { phase: 'execute' }, { status: 'Paused' }]) {
    const saved = state(); Object.assign(saved.fields, fields);
    assert.equal(hold('Write', { file_path: root + '/make-it-work/DEMO/DEMO-plan.md' }, saved), null);
    assert.equal(planningActivityCheck({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: checkpoint('I am checking tests.') } }, [], saved, statePath).pendingChat, false);
  }
  const saved = state(['discovery', 'drafting']);
  saved.audit.push({ number: 4, from: 'plan-approval', to: 'plan' });
  assert.match(hold('Write', { file_path: root + '/make-it-work/DEMO/DEMO-plan.md' }, saved), /--planning-activity discovery/);
});
