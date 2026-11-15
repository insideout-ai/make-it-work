import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveDecision, executionModeDecision } from './autonomy-policy.mjs';
import { normalizeEntry } from './decision-log.mjs';
const input = (extra = {}) => ({ skill: 'execute', site: 'mode-choice', phase: 'Phase 0', mode: 'autopilot', question: 'Which mode?', options: [{ id: 'subagent-driven', label: 'Subagent-Driven (Recommended)' }, { id: 'inline', label: 'Inline' }], ...extra });
test('unattended execution constructs a complete writer-valid question payload, not only its chosen label', () => {
  const result = executionModeDecision();
  assert.equal(result.action, 'chosen');
  assert.equal(result.choice_id, 'subagent-driven');
  assert.equal(result.entry.kind, 'askUserQuestion');
  assert.equal(result.entry.multiSelect, false);
  assert.ok(result.entry.question);
  assert.deepEqual(result.entry.options.map(option => option.label), ['Subagent-Driven (Recommended)', 'Inline Execution']);
  assert.equal(result.entry.chosen, result.entry.options[0].label);
  assert.deepEqual(normalizeEntry(result.entry, 'execute'), result.entry);
  const incomplete = { ...result.entry }; delete incomplete.options;
  assert.throws(() => normalizeEntry(incomplete, 'execute'), /options/);
});
test('stable policy ids choose the documented default regardless of option label recommendation', () => {
  const result = resolveDecision(input({ options: [{ id: 'inline', label: 'Inline (Recommended)' }, { id: 'subagent-driven', label: 'Fresh agent' }] }));
  assert.equal(result.choice_id, 'subagent-driven'); assert.equal(result.entry.chosen, 'Fresh agent');
});
test('DTS preserves the deliberate non-recommended continue-without-go-deep choice', () => {
  assert.equal(resolveDecision(input({ skill: 'define-test-strategy', site: 'go-deep-offer', options: [{ id: 'run-go-deep', label: 'Run go-deep (Recommended)' }, { id: 'continue-without', label: 'Continue without it' }] })).choice_id, 'continue-without');
});
test('hard stops and independent authorization sites cannot become automatic approvals', () => {
  assert.equal(resolveDecision(input({ site: 'no-plan', kind: 'checkpoint' })).action, 'stop');
  for (const site of ['delivery-offer', 'ticket-publication', 'manual-verification']) assert.equal(resolveDecision(input({ skill: 'implement', site })).action, 'ask');
  assert.throws(() => resolveDecision(input({ skill: 'go-deep', site: 'workflow-choice', options: [{ id: 'fresh', label: 'Fresh' }] })), /unavailable/);
});
test('interactive modes ask; narrowly documented Autonomous defaults retain policy provenance without autopilot logs', () => {
  assert.equal(resolveDecision(input({ mode: 'guided' })).action, 'ask');
  assert.equal(resolveDecision(input({ mode: 'autonomous' })).action, 'ask');
  const result = resolveDecision(input({ skill: 'implement', site: 'testing-readiness', mode: 'autonomous', options: [{ id: 'automated', label: 'Set up tests' }] }));
  assert.equal(result.source, 'policy'); assert.equal(result.entry, null);
});
test('recommendation and candidate selection validate dynamic inputs', () => {
  const result = resolveDecision(input({ skill: 'close-the-gaps', site: 'wave-1-q1', options: [{ id: 'a', label: 'A', recommended: true }, { id: 'b', label: 'B' }] }));
  assert.equal(result.choice_id, 'a');
  assert.throws(() => resolveDecision(input({ skill: 'close-the-gaps', site: 'wave-1-q1' })), /Exactly one/);
  assert.deepEqual(resolveDecision(input({ skill: 'go-deep', site: 'repair-actions', multiSelect: true, options: [{ id: 'repair', label: 'Repair', candidate: true }, { id: 'none', label: 'No repairs' }] })).choice_id, ['repair']);
});
test('explicit choices need provenance and logs reject unoffered or duplicated selections', () => {
  assert.throws(() => resolveDecision(input({ user_choice: 'inline' })), /provenance/);
  assert.equal(resolveDecision(input({ user_choice: 'inline', source: 'user', via: 'chat' })).source, 'user');
  const entry = resolveDecision(input()).entry;
  assert.throws(() => normalizeEntry({ ...entry, chosen: 'invented' }, 'execute'), /offered options/);
  assert.throws(() => normalizeEntry({ ...entry, multiSelect: true, chosen: [entry.chosen, entry.chosen] }, 'execute'), /unique labels/);
});
test('single repair choices and large plain-text confirmations retain their actual log shapes', () => {
  const options = [{ id: 'repair', label: 'Repair', candidate: true }, { id: 'none', label: 'No repairs' }];
  assert.equal(resolveDecision(input({ skill: 'go-deep', site: 'repair-actions', options })).chosen, 'Repair');
  const large = resolveDecision(input({ skill: 'define-test-strategy', site: 'location-confirm', kind: 'checkpoint', options: [{ id: 'a', label: 'Location A', candidate: true }, { id: 'b', label: 'Location B', candidate: true }] }));
  assert.equal(large.entry.chosen, 'Location A; Location B'); assert.equal(large.entry.options, undefined);
});

test('missing-strategy/absent-tooling defaults are manual only in unattended modes', () => {
  const choice = { skill: 'implement', site: 'testing-readiness', options: [{ id: 'automated', label: 'Set up automated tests' }, { id: 'manual', label: 'Use manual verification' }] };
  for (const mode of ['autonomous', 'autopilot']) {
    assert.equal(resolveDecision(input({ ...choice, mode, testing_context: { strategy: 'missing', tooling: 'absent' } })).choice_id, 'manual');
    assert.equal(resolveDecision(input({ ...choice, mode, testing_context: { strategy: 'present', tooling: 'absent' } })).choice_id, 'automated');
    assert.equal(resolveDecision(input({ ...choice, mode, testing_context: { strategy: 'missing', tooling: 'unavailable' } })).choice_id, 'automated');
  }
  assert.equal(resolveDecision(input({ ...choice, mode: 'guided', testing_context: { strategy: 'missing', tooling: 'absent' } })).action, 'ask');
});
