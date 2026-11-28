// Presentation only: final scenario evidence is independent of suite/gate results.
export function finalScenarioResults(coverage, verification) {
  if (!coverage || coverage.unavailable || !coverage.scenarios?.length || !verification) return null;
  const latest = new Map();
  for (const step of [...verification.steps].sort((a, b) => a.number - b.number)) {
    for (const check of step.checks) latest.set(check.subject, check);
  }
  const groups = Object.fromEntries(['Progression', 'Regression'].map(purpose => [purpose, { passed: 0, failed: 0, skipped: 0, unknown: 0 }]));
  const seen = new Set();
  const owners = new Map();
  for (const scenario of coverage.scenarios) {
    if (!groups[scenario.purpose]) return null;
    // Scenario names are unique in the accepted coverage contract.
    // Legacy ambiguous names cannot be attributed to a repository from subject alone.
    const owner = scenario.repo ?? '';
    if (owners.has(scenario.scenario) && owners.get(scenario.scenario) !== owner) return null;
    owners.set(scenario.scenario, owner);
    const key = JSON.stringify([scenario.repo ?? '', scenario.scenario]);
    if (seen.has(key)) continue;
    seen.add(key);
    const check = latest.get(scenario.scenario);
    const result = check?.result === 'pass' && ['automated', 'manual'].includes(check.type) ? 'passed'
      : check?.result === 'fail' ? 'failed' : check?.type === 'skipped' ? 'skipped' : 'unknown';
    groups[scenario.purpose][result]++;
  }
  return groups;
}

export function outcomeSentence(markdown, heading) {
  const lines = markdown.split('\n');
  const start = lines.findIndex(line => line.trim() === `## ${heading}`);
  if (start < 0) return null;
  const body = lines.slice(start + 1).join('\n').split(/^## /m)[0].trim();
  const paragraph = body.split(/\n\s*\n/)[0].replace(/[*`#]/g, '').replace(/\s+/g, ' ').trim();
  if (!paragraph) return null;
  return paragraph.length <= 240 ? paragraph : `${paragraph.slice(0, 237).trimEnd()}…`;
}

// The existing activity records cover coding phases only; never call this total waiting.
export function recordedWaiting(intervals, start, end) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  const waits = intervals.filter(item => item.category === 'waiting for input')
    .map(item => [Math.max(start, Date.parse(item.from)), Math.min(end, Date.parse(item.to))])
    .filter(([from, to]) => Number.isFinite(from) && Number.isFinite(to) && to >= from)
    .sort((a, b) => a[0] - b[0]);
  if (!intervals.length) return null;
  let total = 0, until = start;
  for (const [from, to] of waits) { total += Math.max(0, to - Math.max(until, from)); until = Math.max(until, to); }
  return total;
}
