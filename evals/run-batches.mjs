// Run independent eval cases in bounded waves. Dividing the remaining budget
// between a wave's cases keeps concurrent Claude processes within the suite cap.
export async function runBatches(items, { concurrency, budget, runCase, onStart, onResult }) {
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error('Invalid concurrency');
  let cost = 0;
  const results = [];
  let stopped;
  for (let offset = 0; offset < items.length; offset += concurrency) {
    if (cost >= budget) {
      stopped = `Cost limit reached before ${items[offset].name}`;
      break;
    }
    const batch = items.slice(offset, offset + concurrency);
    // Round down so per-process cent rounding cannot exceed the suite cap.
    const perCaseBudget = Math.floor(((budget - cost) / batch.length) * 100) / 100;
    if (perCaseBudget < 0.01) {
      stopped = `Insufficient remaining budget before ${items[offset].name}`;
      break;
    }
    for (const item of batch) onStart(item);
    const completed = await Promise.all(batch.map((item) => runCase(item, perCaseBudget)));
    for (const entry of completed) {
      cost += entry.costUsd;
      results.push(entry);
      await onResult(entry, cost);
    }
    if (completed.some((entry) => /not logged in|authentication failed/i.test(entry.detail))) {
      stopped = 'Authentication failed during a case';
      break;
    }
  }
  return { results, cost, stopped };
}
