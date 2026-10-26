function fail(message) { throw new Error(message); }

export function validateDecision(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Decision must be an object.');
  const allowed = ['id', 'topic', 'source', 'via', 'choice', 'scope', 'reference', 'reason', 'resume'];
  for (const key of Object.keys(input)) if (!allowed.includes(key)) fail(`Unknown decision field: ${key}.`);
  for (const key of ['id', 'topic', 'source', 'via', 'choice', 'scope']) {
    if (typeof input[key] !== 'string' || !input[key].trim() || /[\r\n\x00-\x1f]/.test(input[key])) {
      fail(`Decision ${key} must be a nonempty single line.`);
    }
  }
  for (const key of ['reference', 'reason']) {
    if (input[key] !== undefined && (typeof input[key] !== 'string' || !input[key].trim() || /[\r\n\x00-\x1f]/.test(input[key]))) {
      fail(`Decision ${key} must be a nonempty single line when supplied.`);
    }
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(input.id)) fail('Decision id must be a stable identifier.');
  if (!['user', 'autopilot', 'policy'].includes(input.source)) fail('Decision source must be user, autopilot, or policy.');
  if (!['question', 'chat', 'flag', 'policy'].includes(input.via)) fail('Decision via must be question, chat, flag, or policy.');
  if ((input.source === 'user') === (input.via === 'policy')) fail('User decisions require question, chat, or flag; automatic decisions require policy.');
  if (input.resume !== undefined && !['transparent', 'in-phase'].includes(input.resume)) fail('Decision resume must be transparent or in-phase.');
  return { ...input, resume: input.resume ?? 'in-phase' };
}

export function decisionText(input) {
  const d = validateDecision(input);
  return `Decision: ${d.topic} — ${d.choice}; source: ${d.source}; via: ${d.via}; scope: ${d.scope}` +
    (d.reference ? `; reference: ${d.reference}` : '') +
    (d.reason ? `; reason: ${d.reason}` : '');
}

// Encode table delimiters and backslashes without changing the five-column contract.
export function decisionCell(input) {
  const d = validateDecision(input);
  const text = decisionText(d).replaceAll('&', '&amp;').replaceAll('\\', '&#92;').replaceAll('|', '&#124;');
  return `${text} [decision-id: ${d.id}; resume: ${d.resume}]`;
}

export function parseDecisionCell(cell) {
  const match = cell.match(/^(Decision: .*?) \[decision-id: ([A-Za-z0-9][A-Za-z0-9._:-]*); resume: (transparent|in-phase)\]$/);
  if (!match) return null;
  return {
    outcome: match[1].replaceAll('&#124;', '|').replaceAll('&#92;', '\\').replaceAll('&amp;', '&'),
    decision: { id: match[2], resume: match[3] },
  };
}

/** Ignore only explicitly transparent decisions, preserving interruption evidence. */
export function lastWorkRow(audit) {
  return audit.findLast((row) => {
    if (row.from !== row.to) return true;
    if (row.decision) return row.decision.resume !== 'transparent';
    // Compatibility for existing runs, before structured decision checkpoints.
    return !/^Decision: (Autonomy changed |Ticket publication )/.test(row.outcome);
  }) ?? null;
}
