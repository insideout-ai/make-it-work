import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runBatches } from './run-batches.mjs';

test('runs four cases at a time, preserving order and limiting each wave budget', async () => {
  const items = Array.from({ length: 9 }, (_, i) => ({ name: `case-${i}` }));
  const started = [];
  const budgets = [];
  let active = 0;
  let peak = 0;
  const run = await runBatches(items, {
    concurrency: 4, budget: 2,
    onStart: (item) => started.push(item.name),
    onResult: async () => {},
    runCase: async (item, allowance) => {
      budgets.push(allowance);
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, (9 - Number(item.name.slice(5))) * 2));
      active--;
      return { name: item.name, costUsd: 0.1, detail: '', status: 'passed' };
    },
  });
  assert.equal(peak, 4);
  assert.deepEqual(started, items.map((item) => item.name));
  assert.deepEqual(run.results.map((item) => item.name), started);
  assert.deepEqual(budgets, [0.5, 0.5, 0.5, 0.5, 0.4, 0.4, 0.4, 0.4, 1.2]);
  assert.ok(Math.abs(run.cost - 0.9) < 0.000001);
  assert.equal(run.stopped, undefined);
});

test('stops before a wave that cannot fit its reserved cost limit', async () => {
  const items = Array.from({ length: 6 }, (_, i) => ({ name: `case-${i}` }));
  let calls = 0;
  const run = await runBatches(items, {
    concurrency: 4, budget: 1,
    onStart: () => {}, onResult: async () => {},
    runCase: async (item, allowance) => {
      calls++;
      assert.equal(allowance, 0.25);
      return { name: item.name, costUsd: 0.25, detail: '' };
    },
  });
  assert.equal(calls, 4);
  assert.equal(run.cost, 1);
  assert.match(run.stopped, /Cost limit reached before case-4/);
});
