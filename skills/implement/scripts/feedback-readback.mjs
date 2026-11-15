import path from 'node:path';
import { realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';

const canonical = (file, cwd) => {
  const resolved = path.resolve(cwd, file);
  try { return realpathSync(resolved); } catch { return resolved; }
};
const output = part => typeof part.content === 'string' ? part.content :
  Array.isArray(part.content) ? part.content.filter(item => item.type === 'text').map(item => item.text).join('\n') : '';
export const reportDigest = report => createHash('sha256').update(report).digest('hex');

function readsFile(call, file, root) {
  const cwd = call.cwd ?? root;
  if (call.name === 'Read') return typeof call.input?.file_path === 'string' && canonical(call.input.file_path, cwd) === file;
  // Read is always supported. Only literal full-file cat is an alternative;
  // projections, shell variables and command substitutions cannot prove a read.
  if (call.name !== 'Bash' || typeof call.input?.command !== 'string') return false;
  const match = call.input.command.match(/^\s*cat\s+(?:"([^"$`\\\n]+)"|'([^'\n]+)'|([^\s'"$`\\;|&<>]+))\s*$/);
  return Boolean(match && canonical(match[1] ?? match[2] ?? match[3], cwd) === file);
}

// Proof comes from paired parent runtime results, never from the writer itself,
// model-authored receipts, a report's existence, or a delegate's summary.
export function feedbackReadback(events, { reportPath, report, modifiedAt, terminalTime, root }) {
  const target = canonical(reportPath, root), calls = new Map(), paired = new Set();
  const lines = report.replace(/\r\n/g, '\n').trimEnd().split('\n'), seen = new Set(), toolIds = [];
  const boundary = Math.max(Math.floor(modifiedAt), terminalTime);
  for (const event of events) {
    if (!['assistant', 'user'].includes(event.type) || event.isMeta || event.isSynthetic || event.isSidechain || event.parent_tool_use_id || event.parentToolUseId) continue;
    const content = event.message?.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (event.type === 'assistant' && part.type === 'tool_use' && typeof part.id === 'string' &&
          !calls.has(part.id) && Date.parse(event.timestamp) >= boundary) calls.set(part.id, { ...part, cwd: event.cwd });
      if (event.type !== 'user' || part.type !== 'tool_result' || paired.has(part.tool_use_id)) continue;
      const call = calls.get(part.tool_use_id);
      if (!call) continue;
      paired.add(part.tool_use_id);
      if (part.is_error || !(Date.parse(event.timestamp) >= boundary) || !readsFile(call, target, root)) continue;
      const text = output(part).replace(/\r\n/g, '\n');
      let contributed = false;
      if (text.trimEnd() === lines.join('\n')) {
        lines.forEach((_, index) => seen.add(index + 1)); contributed = true;
      } else for (const line of text.split('\n')) {
        const match = line.match(/^\s*(\d+)(?:\t|→)(.*)$/u), number = Number(match?.[1]);
        if (match && lines[number - 1] === match[2]) { seen.add(number); contributed = true; }
      }
      if (contributed) toolIds.push(part.tool_use_id);
      if (seen.size === lines.length) return { reportSha256: reportDigest(report), modifiedAt, toolIds };
    }
  }
  return null;
}

export function currentReadback(receipt, report, modifiedAt) {
  const proof = receipt?.readback;
  return Boolean(proof && proof.reportSha256 === reportDigest(report) && proof.modifiedAt === modifiedAt &&
    Array.isArray(proof.toolIds) && proof.toolIds.length);
}
