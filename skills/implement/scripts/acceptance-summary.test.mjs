import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeAcceptance } from './acceptance-summary.mjs';

test('a criterion is verified only when all its scenarios are verified; manual evidence counts', () => {
  const rows = [
    { criterion: 'AC1 parity', scenario: 'Happy path', status: 'automated', note: 'Passed' },
    { criterion: 'AC1 parity', scenario: 'Provider failure', status: 'unverified', note: 'Reference unavailable' },
    { criterion: 'AC2 display', scenario: 'Observe display', status: 'manual', note: 'Observed' },
  ];
  const summary = summarizeAcceptance(rows);
  assert.equal(summary.text, 'Partially verified — 1 of 2 acceptance criteria pending');
  assert.equal(summary.verified, 1);
  assert.deepEqual(summary.pendingCriteria, [{ criterion: 'AC1 parity', scenarios: [{ scenario: 'Provider failure', note: 'Reference unavailable' }] }]);
  assert.equal(rows[1].status, 'unverified');
});

test('all verified, none verified and absent evidence remain distinguishable', () => {
  assert.equal(summarizeAcceptance([{ criterion: 'AC1', status: 'manual' }]).label, 'Verified');
  assert.equal(summarizeAcceptance([{ criterion: 'AC1', scenario: 'Check', status: 'unverified', note: 'Not performed' }]).label, 'Pending verification');
  assert.equal(summarizeAcceptance([]), null);
  assert.equal(summarizeAcceptance(undefined), null);
  assert.throws(() => summarizeAcceptance([{ criterion: 'AC1', status: 'pass' }]), /Invalid acceptance/);
});
