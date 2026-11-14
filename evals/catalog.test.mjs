import assert from 'node:assert/strict';
import test from 'node:test';
import { catalog } from './catalog.mjs';
import { discoverCases } from './validate.mjs';

test('catalog includes every retained case and actual checks without claiming certification', async () => {
  const entries = await catalog();
  const cases = await discoverCases();
  assert.deepEqual(entries.map(item => item.name), cases.map(item => item.name));
  assert.ok(entries.every(item => item.graders.length && item.graders.every(grader => grader.type)));
  assert.ok(entries.filter(item => item.disposition === 'retain').every(item => /does not certify/.test(item.basis)));
  const blocked = entries.find(item => item.name === 'execute-stop-at-gate');
  assert.equal(blocked.tier, 'critical'); assert.equal(blocked.blocking, true);
  assert.equal(blocked.disposition, 'investigate');
});
