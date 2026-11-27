/** Scenario metadata is presentation/validation only; never runner input. */
import { section, table, cell } from './artifacts.mjs';
export const coverageContract = plan => /^\*\*Test coverage contract:\*\* 1\s*$/m.test(plan);
export function scenarios(plan) {
  const body = (section(plan, 'Test Plan') ?? '').split('**AC traceability:**')[0];
  const header = body.split('\n').find(line => line.trim().startsWith('|'));
  if (!header) throw new Error('Missing Test Plan scenarios.');
  const headers = header.trim().split('|').slice(1, -1).map(s => s.trim());
  const expected = ['Scenario', ...(headers.includes('Repo') ? ['Repo'] : []), ...(headers.includes('Purpose') ? ['Purpose'] : []), 'Type', 'File / command'];
  if (headers.join('|') !== expected.join('|')) throw new Error('Invalid Test Plan columns.');
  return table(body, expected);
}
export function validateCoverage(plan, { required = false } = {}) {
  if (!coverageContract(plan)) {
    if (required) throw new Error('Coverage metadata needs repair in planning: missing Test coverage contract: 1.');
    return;
  }
  const rows = scenarios(plan), names = new Set(rows.map(r => r.Scenario));
  if (!rows.length || names.size !== rows.length || rows.some(r => !r.Scenario.trim() || !['Progression', 'Regression'].includes(r.Purpose))) throw new Error('Coverage metadata needs unique scenarios with Progression or Regression purpose.');
  const impact = table(section(plan, 'Regression Impact') ?? '', ['Changed code', 'Domain', 'UC / behavior', 'Decision', 'Reason / evidence', 'Test scenarios']);
  if (!impact.length) throw new Error('Regression Impact needs a reasoned assessment, including when none is required.');
  for (const row of impact) {
    if (Object.values(row).some(v => !v.trim()) || !['Required', 'Excluded', 'Unresolved'].includes(row.Decision)) throw new Error('Incomplete regression impact assessment.');
    if (row['Test scenarios'] !== 'None') for (const name of row['Test scenarios'].split(';').map(s => s.trim())) {
      if (!rows.some(r => r.Scenario === name && r.Purpose === 'Regression')) throw new Error('Regression impact references an unknown regression scenario: ' + name);
    }
    if (row.Decision === 'Required' && row['Test scenarios'] === 'None') throw new Error('Required regression impact needs a regression scenario.');
  }
  for (const row of rows.filter(r => r.Purpose === 'Regression')) if (!impact.some(i => i.Decision === 'Required' && i['Test scenarios'].split(';').map(s => s.trim()).includes(row.Scenario))) throw new Error('Regression scenario has no required impact link: ' + row.Scenario);
}
export function coverageSummary(plan, preparation = null) {
  try {
    const rows = scenarios(plan);
    if (!rows.some(r => r.Purpose)) return null;
    const impactBody = section(plan, 'Regression Impact');
    const impacts = impactBody ? table(impactBody, ['Changed code', 'Domain', 'UC / behavior', 'Decision', 'Reason / evidence', 'Test scenarios']) : [];
    return { progression: rows.filter(r => r.Purpose === 'Progression').length, regression: rows.filter(r => r.Purpose === 'Regression').length,
      scenarios: rows.map(row => {
        const entry = preparation?.entries?.find(e => e.scenario === row.Scenario && (!row.Repo || row.Repo === e.repo));
        return { scenario: row.Scenario, purpose: row.Purpose, repo: row.Repo ?? '', type: row.Type,
          protected: impacts.filter(i => i.Decision === 'Required' && i['Test scenarios'].split(';').map(s => s.trim()).includes(row.Scenario)).map(i => i['UC / behavior']).join('; '),
          command: row['File / command'], evidence: entry?.evidence ?? '',
          baseline: !entry ? 'Pending — no matching pre-change baseline recorded' : entry.kind === 'manual' ? 'Manual preparation exempt; not verified' : row.Purpose === 'Progression' ? 'Not applicable — progression preparation: ' + entry.result : entry.result + ' — ' + entry.reason };
      }) };
  } catch { return { unavailable: true }; }
}
export function coverageMarkdown(summary) {
  if (!summary) return '';
  if (summary.unavailable) return 'Test coverage metadata unavailable.\n';
  return `Progression: ${summary.progression} scenarios; Regression: ${summary.regression} scenarios.\n\n| Scenario | Purpose | Protected UC / behavior | Pre-change baseline / preparation |\n| --- | --- | --- | --- |\n` + summary.scenarios.map(r => `| ${cell(r.scenario)} | ${cell(r.purpose)} | ${cell(r.protected)} | ${cell(r.baseline)} |`).join('\n') + '\n\nAdditional gate coverage: no matching pre-change baseline recorded at scenario granularity unless explicitly linked in retained evidence. Counts describe planned scenarios, not executed tests.\n';
}
