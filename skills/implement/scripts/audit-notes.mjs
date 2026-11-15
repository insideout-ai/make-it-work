// Informational audit entries never supply workflow or approval evidence.
const fail = (message) => { throw new Error(message); };
const encode = (text) => text.replaceAll('&', '&amp;').replaceAll('\\', '&#92;').replaceAll('|', '&#124;');
// An interruption records delegated work that was lost before it returned.
const PREFIX = { activity: 'Activity', result: 'Result', interruption: 'Interrupted' };
const decode = (text) => text.replaceAll('&#124;', '|').replaceAll('&#92;', '\\').replaceAll('&amp;', '&');

export function noteCell({ kind, id, text, reference }) {
  if (!Object.hasOwn(PREFIX, kind) || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(id ?? '')) fail('Invalid audit note kind or id.');
  for (const value of [text, ...(reference === undefined ? [] : [reference])]) {
    if (typeof value !== 'string' || !value.trim() || /[\x00-\x1f\x7f]/.test(value)) fail('Audit notes must be nonempty single lines.');
  }
  if (kind === 'result' && !reference) fail('Result notes require an evidence reference.');
  return `${PREFIX[kind]}: ${encode(text)}${reference ? `; evidence: ${encode(reference)}` : ''} [audit-note: ${kind}; id: ${id}]`;
}

export function parseNoteCell(cell) {
  const match = cell.match(/^((?:Activity|Result|Interrupted): .*) \[audit-note: (activity|result|interruption); id: ([A-Za-z0-9][A-Za-z0-9._:-]*)\]$/);
  if (!match || !match[1].startsWith(`${PREFIX[match[2]]}: `)) return null;
  return { outcome: decode(match[1]), note: { kind: match[2], id: match[3] } };
}

export function appendAuditCell(markdown, state, cell, time) {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => line.trim() === '## Audit log');
  let end = lines.findIndex((line, index) => index > start && line.startsWith('## '));
  if (end === -1) end = lines.length;
  while (end > start && !lines[end - 1].trim()) end -= 1;
  lines.splice(end, 0, `| ${state.audit.length + 1} | ${time} | ${state.fields.phase} | ${state.fields.phase} | ${cell} |`);
  return lines.join('\n');
}
