export const ACTIVITY_CATEGORIES = ['coding', 'tests/verification', 'investigation/setup', 'waiting for input', 'unclassified'];
export function validateCategory(category) {
  if (!ACTIVITY_CATEGORIES.includes(category)) throw new Error(`Unsupported activity category: ${category}`);
  return category;
}
// Pure wall-clock accounting: every interval belongs to one parent activity, never a sum of agents.
export function summarizeIntervals(events, end) {
  const finish = Date.parse(end), totals = Object.fromEntries(ACTIVITY_CATEGORIES.map(key => [key, 0]));
  if (!Number.isFinite(finish)) throw new Error('Invalid timing endpoint.');
  const intervals = [];
  let previous = -Infinity;
  for (let i = 0; i < events.length; i++) {
    const event = events[i], from = Date.parse(event.at), to = i + 1 < events.length ? Date.parse(events[i + 1].at) : finish;
    if (!Number.isFinite(from) || !Number.isFinite(to) || from < previous || to < from || to > finish) throw new Error('Invalid or out-of-order activity interval.');
    previous = from;
    const category = validateCategory(event.category ?? 'unclassified');
    totals[category] += to - from;
    intervals.push({ from: event.at, to: new Date(to).toISOString(), category, reference: event.reference ?? null });
  }
  return { totals, total_ms: Object.values(totals).reduce((a, b) => a + b, 0), intervals };
}
const duration = ms => { const seconds = Math.floor(ms / 1000); return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`; };
export function timingText(phase, summary) {
  const entries = Object.entries(summary.totals).filter(([, ms]) => ms > 0).map(([name, ms]) => `${name} ${duration(ms)}`);
  return `${phase === 'execute' ? 'Execute' : 'Lightweight'} time breakdown (elapsed estimate): ${duration(summary.total_ms)} total${entries.length ? ' — ' + entries.join('; ') : ''}`;
}
