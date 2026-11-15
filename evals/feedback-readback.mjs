// Evaluation proof only. A saved artifact or a model's claim is not a readback.
import path from 'node:path';
import { realpathSync } from 'node:fs';

const text = part => typeof part.content === 'string' ? part.content :
  Array.isArray(part.content) ? part.content.filter(p => p.type === 'text').map(p => p.text).join('\n') : '';
const canonical = (file, cwd) => {
  const resolved = path.resolve(cwd, file);
  try { return realpathSync(resolved); } catch { return resolved; }
};

function literalCommand(command, cwd) {
  if (typeof command !== 'string' || /[$`|<>\\\r\n]/.test(command)) return null;
  const words = command.match(/"[^"\n]*"|'[^'\n]*'|&&|;|[^\s;&]+/g)?.map(s => s.replace(/^(["'])(.*)\1$/, '$2')) ?? [];
  if (words[0] === 'cd' && words[1] && [';', '&&'].includes(words[2])) {
    cwd = path.resolve(cwd, words[1]); words.splice(0, 3);
  }
  if (words.some(s => [';', '&&', '&'].includes(s))) return null;
  return { words, cwd };
}

export function feedbackReadback(events, fixtureDir, reportPath, report, { modifiedAt } = {}) {
  const target = canonical(reportPath, fixtureDir), calls = new Map(), paired = new Set(), results = [];
  let presentation = events.length;
  for (let index = 0; index < events.length; index++) {
    const event = events[index];
    if (!['assistant', 'user'].includes(event.type) || event.isSynthetic || event.isMeta || event.isSidechain || event.parent_tool_use_id || event.parentToolUseId) continue;
    const content = event.message?.content;
    if (!Array.isArray(content)) continue;
    if (event.type === 'assistant' && content.some(p => p.type === 'text') && !content.some(p => p.type === 'tool_use')) presentation = index;
    for (const part of content) {
      if (event.type === 'assistant' && part.type === 'tool_use' && !calls.has(part.id)) calls.set(part.id, { ...part, cwd: event.cwd ?? fixtureDir, at: Date.parse(event.timestamp) });
      if (event.type !== 'user' || part.type !== 'tool_result' || paired.has(part.tool_use_id)) continue;
      const call = calls.get(part.tool_use_id);
      if (!call) continue;
      paired.add(part.tool_use_id);
      if (!part.is_error) results.push({ call, output: text(part), index, at: Date.parse(event.timestamp) });
    }
  }
  const readsReport = result => {
    if (result.call.name === 'Read' && typeof result.call.input?.file_path === 'string') return canonical(result.call.input.file_path, result.call.cwd) === target;
    const command = result.call.name === 'Bash' ? literalCommand(result.call.input?.command, result.call.cwd) : null;
    return command?.words.length === 2 && command.words[0] === 'cat' && canonical(command.words[1], command.cwd) === target;
  };
  const reads = results.filter(readsReport);
  if (!reads.length) return { passed: false, detail: 'No successful Read or supported full-file cat of the saved report occurred.' };
  let savedAt = -1;
  for (const result of results) {
    const command = result.call.name === 'Bash' && literalCommand(result.call.input?.command, result.call.cwd);
    if (!command || path.basename(command.words[0] ?? '') !== 'node' || path.basename(command.words[1] ?? '') !== 'write-feedback.mjs' || command.words[2] !== 'write') continue;
    for (const line of result.output.split('\n')) {
      try {
        const ack = JSON.parse(line);
        if (ack.feedbackReport === 'combined' && typeof ack.sessionOutputPath === 'string' && canonical(ack.sessionOutputPath, command.cwd) === target) savedAt = result.index;
      } catch { /* Not a writer acknowledgement. */ }
    }
  }
  if (savedAt < 0 && !Number.isFinite(modifiedAt)) return { passed: false, detail: 'Grader error: a read exists, but neither a successful combined-save acknowledgement nor report modification time establishes its ordering. Inspect the trace; do not infer a workflow defect from unsupported shell syntax.' };
  const normalize = value => value.replace(/\r\n/g, '\n').trimEnd();
  const expected = normalize(report).split('\n'), seen = new Set();
  for (const result of reads) {
    if (result.index <= savedAt || result.index >= presentation) continue;
    // The actual file revision also establishes ordering when an otherwise
    // successful save used a pipeline that truncated its JSON acknowledgement.
    if (Number.isFinite(modifiedAt) && !(result.call.at >= Math.floor(modifiedAt) && result.at >= Math.floor(modifiedAt))) continue;
    if (normalize(result.output) === normalize(report)) return { passed: true, detail: 'Complete saved report returned by a successful read after save and before presentation.' };
    // SDK Read returns numbered lines; multiple bounded reads can cover a file.
    for (const line of result.output.split('\n')) {
      const match = line.match(/^\s*(\d+)(?:\t|→)(.*)$/u);
      if (match && expected[Number(match[1]) - 1] === match[2]) seen.add(Number(match[1]));
    }
  }
  return { passed: seen.size === expected.length,
    detail: `${seen.size}/${expected.length} saved-report lines established by successful reads after the last save and before presentation. Counts, headings, claims and partial output cannot substitute for the body.` };
}
