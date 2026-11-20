/** Presentation derived from a validated ledger; never changes workflow eligibility. */
export function summarizeAcceptance(rows) {
  if (!Array.isArray(rows) || !rows.length) return null;
  const criteria = new Map();
  for (const row of rows) {
    if (typeof row.criterion !== 'string' || !row.criterion.trim() || !['automated', 'manual', 'unverified'].includes(row.status)) throw new Error('Invalid acceptance summary row.');
    if (!criteria.has(row.criterion)) criteria.set(row.criterion, []);
    if (row.status === 'unverified') criteria.get(row.criterion).push({ scenario: row.scenario, note: row.note, ...(row.clause ? { clause: row.clause } : {}) });
  }
  const pendingCriteria = [...criteria].filter(([, scenarios]) => scenarios.length).map(([criterion, scenarios]) => ({ criterion, scenarios }));
  const total = criteria.size, pending = pendingCriteria.length, verified = total - pending;
  const label = pending === 0 ? 'Verified' : verified === 0 ? 'Pending verification' : 'Partially verified';
  const detail = pending ? `${pending} of ${total} acceptance criteria pending` : `${verified} of ${total} acceptance criteria verified`;
  return { label, detail, text: `${label} — ${detail}`, total, verified, pending, pendingRows: pendingCriteria.reduce((count, item) => count + item.scenarios.length, 0), pendingCriteria };
}

/** Readable companion to the saved ledger; never substitutes for its validation. */
export function acceptanceMarkdown(ledger, source) {
  const summary = summarizeAcceptance(ledger.acceptance);
  const cell = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('|', '&#124;').replace(/[\r\n]/g, ' ');
  const lines = [`# Acceptance verification — ${cell(ledger.ticket)}`, '',
    summary ? `**${summary.verified} of ${summary.total} verified${summary.pending ? ` · ${summary.pending} pending` : ''}**` : 'Acceptance checks: Not recorded', '',
    `Plan version: ${ledger.plan_version}`, '',
    `[Open saved verification record](${encodeURIComponent(source)})`, '',
    'This report presents the saved verification record. Pending checks have not been verified.', '',
    '| Criterion | Requirement clause | Scenario | Status | Evidence / reason |',
    '| --- | --- | --- | --- | --- |'];
  for (const row of ledger.acceptance) {
    const status = { automated: 'Verified automatically', manual: 'Verified manually', unverified: 'Pending verification' }[row.status];
    lines.push(`| ${cell(row.criterion)} | ${cell(row.clause)} | ${cell(row.scenario)} | ${status} | ${cell(row.note)} |`);
  }
  return lines.join('\n') + '\n';
}
