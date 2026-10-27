import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { exactSlackAnswer, parseQuestions, questionWaves, resolveQuestions } from './questions.mjs';
const doc = `# Offline\n\n## Questions\n\n### Q1 — Trigger\n\n**Question:** Enable?\n\n- [x] No (Recommended)\n- [ ] Yes\n\n### Q2 — Detection *(Answer only if Q1 = Yes)*\n\n**Question:** Detect how?\n\n- [x] Automatic\n- [x] Other: conflicting\n\n### Q3 — Retry *(Answer only if Q2 = Automatic)*\n\n**Question:** Retry?\n\n- [x] Yes\n- [ ] No\n\n### Q4 — Context\n\n**Question:** What context?\n\n**Your answer:** Team supplied context\n`;
test('conditional N/A propagates recursively and hidden conflicting answers are not asked or logged', () => {
  const result = resolveQuestions(parseQuestions(doc));
  assert.deepEqual(result.answers.map((q) => q.status), ['answered', 'not-applicable', 'not-applicable', 'answered']);
  assert.deepEqual(result.decision_ids, ['Q1', 'Q4']); assert.equal(result.conflicts.length, 0);
});
test('applicable conflicts are retained and block dependents without guessing', () => {
  const result = resolveQuestions(parseQuestions(doc.replace('[x] No (Recommended)', '[ ] No (Recommended)').replace('[ ] Yes', '[x] Yes')));
  assert.equal(result.conflicts[0].id, 'Q2'); assert.equal(result.answers.find((q) => q.id === 'Q3').status, 'waiting-for-parent');
});
test('question DAG splits independent waves into batches of at most four and rejects invalid graphs', () => {
  const questions = Array.from({ length: 5 }, (_, i) => ({ id: `Q${i + 1}`, depends: [] }));
  questions.push({ id: 'Q6', depends: ['Q1'] });
  assert.deepEqual(questionWaves(questions), [['Q1', 'Q2', 'Q3', 'Q4'], ['Q5'], ['Q6']]);
  assert.throws(() => questionWaves([{ id: 'a', depends: ['b'] }, { id: 'b', depends: ['a'] }]), /cycle/);
  assert.throws(() => questionWaves([{ id: 'a', depends: ['missing'] }]), /Unknown/);
});
test('TBD counts derive from active answers and exact Slack mapping refuses ambiguous natural language', () => {
  const questions = parseQuestions(doc.replace('[x] No (Recommended)', '[x] Skip — decide later (TBD)'));
  assert.equal(resolveQuestions(questions).tbd_items, 1);
  const q = parseQuestions(doc)[0];
  assert.deepEqual(exactSlackAnswer(q, 'Q1: B'), { chosen: 'Yes' });
  assert.equal(exactSlackAnswer(q, 'Probably yes, depending on rollout'), null);
});
test('existing offline-injection fixture can be parsed and resolved', async () => {
  const content = await readFile('evals/close-the-gaps/close-the-gaps-offline-injection/fixture/make-it-work/TASK-50/TASK-50-questions.md', 'utf8');
  const result = resolveQuestions(parseQuestions(content));
  assert.equal(result.conflicts.length, 0); assert.ok(result.decision_ids.length > 0);
});
test('blank open answers do not consume following notes; invalid gating options are rejected', () => {
  const blank = doc.replace('**Your answer:** Team supplied context', '**Your answer:**\n\nNotes (optional):');
  assert.equal(resolveQuestions(parseQuestions(blank)).answers.find((q) => q.id === 'Q4').status, 'blank');
  assert.throws(() => parseQuestions(doc.replace('Q1 = Yes', 'Q1 = Unoffered')), /unavailable parent option/);
});
