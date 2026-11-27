import assert from 'node:assert/strict';
import test from 'node:test';
import { finalScenarioResults, outcomeSentence, recordedWaiting } from './completion-summary.mjs';

test('final scenario counts use latest step evidence, without counting fix rounds or AC rows', () => {
  const coverage = { scenarios: [
    { scenario: 'Save', repo: 'app', purpose: 'Progression' },
    { scenario: 'Save', repo: 'app', purpose: 'Progression' },
    { scenario: 'Observe', repo: 'app', purpose: 'Progression' },
    { scenario: 'Cancel', repo: 'app', purpose: 'Regression' },
    { scenario: 'Pending', repo: 'app', purpose: 'Regression' },
  ] };
  const verification = { steps: [
    { number: 2, checks: [{ subject: 'Save', type: 'automated', result: 'pass' }, { subject: 'Observe', type: 'manual', result: 'pass' }] },
    { number: 1, checks: [{ subject: 'Save', type: 'skipped', result: 'skipped' }, { subject: 'Cancel', type: 'skipped', result: 'skipped' }] },
  ], gate: { result: 'fail' } };
  const before = JSON.stringify(verification);
  assert.deepEqual(finalScenarioResults(coverage, verification), {
    Progression: { passed: 2, failed: 0, skipped: 0, unknown: 0 },
    Regression: { passed: 0, failed: 0, skipped: 1, unknown: 1 },
  });
  assert.equal(JSON.stringify(verification), before);
});

test('missing evidence/classification remains unavailable, and suite success cannot verify a scenario', () => {
  const coverage = { scenarios: [{ scenario: 'Save', purpose: 'Progression' }] };
  assert.equal(finalScenarioResults(coverage, null), null);
  assert.equal(finalScenarioResults({ unavailable: true }, { steps: [] }), null);
  assert.equal(finalScenarioResults({ scenarios: [{ scenario: 'Legacy' }] }, { steps: [] }), null);
  assert.equal(finalScenarioResults({ scenarios: [
    { scenario: 'Save', repo: 'api', purpose: 'Progression' },
    { scenario: 'Save', repo: 'web', purpose: 'Progression' },
  ] }, { steps: [] }), null);
  assert.equal(finalScenarioResults(coverage, { steps: [], gate: { result: 'pass' } }).Progression.unknown, 1);
});

test('waiting counts union of captured intervals clipped to workflow, without implying full coverage', () => {
  const interval = (from, to, category = 'waiting for input') => ({ from: `2026-01-01T10:${from}:00Z`, to: `2026-01-01T10:${to}:00Z`, category });
  const start = Date.parse('2026-01-01T10:00:00Z'), end = start + 10 * 60_000;
  assert.equal(recordedWaiting([interval('01', '04'), interval('02', '05'), interval('08', '12'), interval('05', '08', 'coding')], start, end), 6 * 60_000);
  assert.equal(recordedWaiting([], start, end), null);
  assert.equal(recordedWaiting([interval('01', '04')], NaN, end), null);
  assert.equal(recordedWaiting([interval('01', '04', 'coding')], start, end), 0);
});

test('outcome summary is bounded and uses only the selected report section', () => {
  assert.equal(outcomeSentence('# Plan\n\n## What This Changes\n\n**Save** edits safely.\n\n## Details\nOther content', 'What This Changes'), 'Save edits safely.');
  assert.equal(outcomeSentence('# Empty', 'Summary'), null);
  assert.equal(outcomeSentence('## Summary\n\n' + 'long '.repeat(100), 'Summary').length, 238);
});
