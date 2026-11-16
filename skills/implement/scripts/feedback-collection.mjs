import { artifactResolve } from '../../../scripts/lib/artifact-path.mjs';
// Observations only: never use this parser to authorize unavailability, release a
// hook, or establish that source inspection or a retrospective occurred.
import path from 'node:path';

const LABELS = { inspect: 'Inspection', evidence: 'Evidence retrieval', check: 'Input check', write: 'Save', unavailable: 'Unavailability receipt' };

function words(command) {
  // Recognize literal argv and an optional literal cd prefix. Do not interpret
  // substitutions, pipelines, redirections, escapes or arbitrary shell programs.
  if (typeof command !== 'string' || /[$`|<>\\\r\n]/.test(command)) return null;
  const pattern = /\s*(?:"([^"]*)"|'([^']*)'|(&&|;)|([^\s;&'"()]+))/y;
  const result = [];
  let offset = 0;
  while (offset < command.length) {
    if (!command.slice(offset).trim()) break;
    pattern.lastIndex = offset;
    const match = pattern.exec(command);
    if (!match) return null;
    result.push({ value: match[1] ?? match[2] ?? match[3] ?? match[4], separator: Boolean(match[3]) });
    offset = pattern.lastIndex;
  }
  return result;
}

function operation(call, statePath) {
  if (call.name !== 'Bash') return null;
  let args = words(call.input?.command);
  if (!args) return null;
  let cwd = call.cwd ?? path.dirname(path.dirname(path.dirname(statePath)));
  if (args[0]?.value === 'cd' && !args[1]?.separator && args[2]?.separator) {
    cwd = artifactResolve(cwd, args[1].value);
    args = args.slice(3);
  }
  if (args.at(-1)?.separator && args.at(-1).value === ';') args = args.slice(0, -1);
  if (args.some(arg => arg.separator)) return null;
  args = args.map(arg => arg.value);
  // A wrong helper directory is still an observed invocation attempt. Unlike
  // feedback-handoff's strict parser, this grants no execution/failure authority.
  if (path.basename(args[0] ?? '') !== 'node' || path.basename(args[1] ?? '') !== 'write-feedback.mjs' || !Object.hasOwn(LABELS, args[2])) return null;
  if (args.filter(arg => arg === '--state').length !== 1) return null;
  const state = args[args.indexOf('--state') + 1];
  return state && artifactResolve(cwd, state) === artifactResolve(statePath) ? args[2] : null;
}

function values(part) {
  const text = typeof part.content === 'string' ? part.content : Array.isArray(part.content)
    ? part.content.filter(item => item.type === 'text').map(item => item.text).join('\n') : '';
  return text.split('\n').flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
}

export function collectFeedbackAttempts(events, { statePath, runId, stateHash, terminalTime }) {
  const calls = new Map(), seen = new Set(), observations = new Map();
  const bound = value => value?.runId === runId && value.stateHash === stateHash;
  for (const event of events) {
    if (!['assistant', 'user'].includes(event.type) || event.isSynthetic || event.isMeta || event.isSidechain || event.parent_tool_use_id || event.parentToolUseId) continue;
    const content = event.message?.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (event.type === 'assistant' && part.type === 'tool_use' && typeof part.id === 'string' && Date.parse(event.timestamp) >= terminalTime && !calls.has(part.id)) {
        calls.set(part.id, { ...part, cwd: event.cwd });
      }
      if (event.type !== 'user' || part.type !== 'tool_result' || seen.has(part.tool_use_id)) continue;
      const call = calls.get(part.tool_use_id);
      if (!call) continue;
      seen.add(part.tool_use_id);
      const op = operation(call, statePath);
      if (!op) continue;
      const output = values(part);
      const failed = part.is_error === true || op === 'check' && output.some(value => value?.valid === false);
      const succeeded = !failed && output.some(value => op === 'check' ? value?.valid === true : bound(value) && (
        op === 'inspect' && typeof value.analysisRequired === 'boolean' ||
        op === 'evidence' && value.feedbackEvidence === 'source-packet' ||
        op === 'write' && value.feedbackReport === 'combined' ||
        op === 'unavailable' && value.feedbackAttempt === 'unavailable' && value.receiptSaved === true));
      if (failed) {
        const record = observations.get(op) ?? { operation: op, failedAttempts: 0, laterSuccessObserved: false };
        record.failedAttempts++;
        record.laterSuccessObserved = false;
        observations.set(op, record);
      } else if (succeeded && observations.has(op)) observations.get(op).laterSuccessObserved = true;
      // Later delivery and clarification work do not reopen the original collection.
      if (op === 'write' && succeeded) return { operations: [...observations.values()], boundary: 'first-saved-report' };
    }
  }
  return { operations: [...observations.values()], boundary: 'before-current-save' };
}

export function renderCollectionNotes(notes) {
  if (!notes) return '';
  return '\n\n#### Collection notes\n\n' +
    'Derived from paired runtime tool calls and results after the terminal checkpoint. Only recognized helper invocations for this state are counted; ambiguous shell commands and unpaired results are not assessed. These are observations, not workflow findings or application Fix/Replan events.\n\n' +
    (notes.operations.length ? notes.operations.map(item =>
      `- ${LABELS[item.operation]}: ${item.failedAttempts} failed tool attempt${item.failedAttempts === 1 ? '' : 's'} observed; ${item.laterSuccessObserved ? 'a later successful result for this operation was observed' : 'no later successful result for this operation was observed in this snapshot'}.`).join('\n') :
      '- No failed recognized helper attempts observed in the available runtime transcript.') +
    '\n\n' + (notes.boundary === 'first-saved-report' ? 'Scope ends at the first observed successful combined save; later work is excluded.' :
      'Scope ends before this save; the current save result is not in the snapshot. A successful save does not trigger another report rewrite.');
}
