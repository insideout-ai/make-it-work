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
  return { label, detail, text: `${label} — ${detail}`, total, verified, pending, pendingCriteria };
}
