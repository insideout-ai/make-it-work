import assert from 'node:assert/strict';
import test from 'node:test';
import { selectSuite, failureCategory } from './suite-policy.mjs';
const cases = Array.from({ length: 12 }, (_, i) => ({ name: `case-${i}`, skill: i % 2 ? 'api' : 'web' }));
const suites = { smoke: ['case-0', 'case-1'], critical: ['case-2', 'case-3'] };

test('tiers partition the inventory; full never hides maintenance cases', () => {
  const pick = tier => selectSuite({ cases, suites, tier });
  assert.deepEqual(pick('full'), cases);
  assert.equal(new Set([...pick('smoke'), ...pick('critical'), ...pick('extended')].map(c => c.name)).size, cases.length);
  assert.equal(pick('extended').length, 8);
});
test('skill filters and shards are stable, disjoint, exhaustive and fail closed', () => {
  const select = extra => selectSuite({ cases, suites, tier: 'full', ...extra });
  const all = select({ skills: ['api'] });
  const shards = [1, 2, 3].flatMap(i => select({ skills: ['api'], shard: `${i}/3` }));
  assert.equal(new Set(shards.map(c => c.name)).size, all.length);
  assert.deepEqual(shards.map(c => c.name).sort(), all.map(c => c.name).sort());
  assert.deepEqual(select({ skills: ['api'], shard: '1/3' }), select({ skills: ['api'], shard: '1/3' }));
  for (const shard of ['', '0/3', '4/3', '1/0', '-1/2', '1/2.5', '1/9007199254740992']) assert.throws(() => select({ shard }), /Shard/);
  assert.throws(() => select({ skills: ['missing'] }), /Unknown skill/);
  assert.throws(() => select({ skills: ['web'], requestedCases: ['case-1'] }), /empty/);
  assert.throws(() => selectSuite({ cases, suites, tier: 'smoke', requestedCases: ['case-3'] }), /not in/);
});
test('failure ownership stays unknown until diagnosed; budgets never count as behavior failures', () => {
  assert.equal(failureCategory({ status: 'passed' }), null);
  assert.equal(failureCategory({ status: 'failed', detail: 'LLM grader failed' }), 'unclassified');
  assert.equal(failureCategory({ status: 'failed', subtype: 'error_max_budget_usd', runtimeError: true }), 'budget');
  assert.equal(failureCategory({ status: 'failed', detail: 'No budget left for semantic grader', graderError: true }), 'budget');
  assert.equal(failureCategory({ status: 'failed', graderError: true }), 'grader');
  assert.equal(failureCategory({ status: 'failed', runtimeError: true }), 'infrastructure');
  assert.equal(failureCategory({ status: 'failed', detail: 'authentication failed' }), 'infrastructure');
});
