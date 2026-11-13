// Selection is deterministic; passing a subset never certifies its parent tier.
export function selectSuite({ cases, suites, tier, requestedCases = [], skills = [], shard }) {
  if (!['smoke', 'critical', 'extended', 'full'].includes(tier)) throw new Error('Unknown suite tier');
  const byName = new Map(cases.map(item => [item.name, item]));
  const critical = new Set(suites.critical ?? []);
  const smoke = new Set(suites.smoke);
  let selected = tier === 'smoke' ? suites.smoke.map(name => byName.get(name)) :
    tier === 'critical' ? [...critical].map(name => byName.get(name)) :
    tier === 'extended' ? cases.filter(item => !smoke.has(item.name) && !critical.has(item.name)) : [...cases];
  if (!selected.length || selected.some(item => !item)) throw new Error('Suite is empty or contains unknown cases');
  for (const name of requestedCases) if (!selected.some(item => item.name === name)) throw new Error(`Case ${name} not in ${tier} tier`);
  for (const skill of skills) if (!cases.some(item => item.skill === skill)) throw new Error(`Unknown skill: ${skill}`);
  if (requestedCases.length) selected = selected.filter(item => requestedCases.includes(item.name));
  if (skills.length) selected = selected.filter(item => skills.includes(item.skill));
  if (shard !== undefined) {
    const match = /^(\d+)\/(\d+)$/.exec(shard);
    const index = Number(match?.[1]), total = Number(match?.[2]);
    if (!match || !Number.isSafeInteger(total) || total < 1 || index < 1 || index > total) throw new Error('Shard must be I/N with 1 <= I <= N');
    selected = selected.filter((item, position) => position % total === index - 1);
  }
  if (!selected.length) throw new Error('Selection is empty');
  return selected;
}

// A failed assertion is not proof that the skill failed: a human must inspect
// fixture/rubric/evidence before assigning behavior or grader ownership.
export function failureCategory({ status, subtype = '', detail = '', runtimeError = false, graderError = false }) {
  if (status === 'passed') return null;
  const reason = `${subtype} ${detail}`;
  if (/max_budget|budget.exhaust|no budget left|cost limit|insufficient.*budget/i.test(reason)) return 'budget';
  if (graderError || /Grader error:|invalid.*judge|judge.*invalid/i.test(reason)) return 'grader';
  if (runtimeError || /auth_failed|authentication failed|not logged in|fixture setup failed|timeout|timed out|error_max_turns|No final result/i.test(reason)) return 'infrastructure';
  return 'unclassified';
}
