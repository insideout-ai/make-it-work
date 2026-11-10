import { lstat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parseState } from './render-status.mjs';
import { lastWorkRow } from './workflow-decisions.mjs';
import { fileURLToPath } from 'node:url';

const writerPath = fileURLToPath(new URL('./write-feedback.mjs', import.meta.url));
const feedbackReference = fileURLToPath(new URL('../references/feedback.md', import.meta.url));
export const feedbackFailureCodes = new Set(['EACCES', 'EPERM', 'EROFS', 'ENOSPC', 'EIO', 'EMFILE', 'ENFILE', 'EBUSY', 'FEEDBACK_EVIDENCE', 'FEEDBACK_OUTPUT']);

const outputText = part => typeof part.content === 'string' ? part.content :
  Array.isArray(part.content) ? part.content.filter(item => item.type === 'text').map(item => item.text).join('\n') : '';
function jsonLines(text) {
  return text.split('\n').flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
}
function writerOperation(call, statePath) {
  const command = call?.input?.command;
  // Failure evidence must come from a direct invocation, not echo, a pipeline
  // hiding its exit status, or a command assembled in an unrelated shell.
  if (call?.name !== 'Bash' || typeof command !== 'string' || /[;|&<>`$\r\n]/.test(command)) return null;
  const words = command.match(/"[^"\n]*"|'[^'\n]*'|[^\s]+/g)?.map(word => word.replace(/^(["'])(.*)\1$/, '$2')) ?? [];
  if (path.basename(words[0] ?? '') !== 'node' || words[1] !== writerPath) return null;
  const index = words.indexOf('--state');
  const root = call.cwd ?? path.dirname(path.dirname(path.dirname(statePath)));
  if (index < 0 || !words[index + 1] || path.resolve(root, words[index + 1]) !== path.resolve(statePath)) return null;
  return words[2];
}

// Only actual tool calls/results after this terminal checkpoint count. A reason
// supplied by the model, diagnostic replay or an agent's prose is not a failure.
export function feedbackRuntimeEvidence(events, statePath, fields, audit, failureId) {
  const stateHash = feedbackStateHash(fields, audit);
  const terminalTime = Date.parse(feedbackTerminalRow(fields, audit)?.time);
  const calls = new Map();
  let analysisRequired = false;
  let failure = null;
  let retrospectiveDispatched = false;
  for (const event of events) {
    if (!['assistant', 'user'].includes(event.type) || event.isSynthetic || event.isMeta) continue;
    const role = event.message?.role ?? event.type;
    if (!Array.isArray(event.message?.content)) continue;
    for (const part of event.message.content) {
      if (role === 'assistant' && part.type === 'tool_use' && Date.parse(event.timestamp) >= terminalTime) {
        calls.set(part.id, { ...part, cwd: event.cwd, analysisRequired });
      }
      if (role !== 'user' || part.type !== 'tool_result') continue;
      const call = calls.get(part.tool_use_id);
      if (!call) continue;
      const operation = writerOperation(call, statePath);
      const values = jsonLines(outputText(part));
      if (!part.is_error && operation === 'inspect' && values.some(value => value.runId === fields.start_time && value.stateHash === stateHash && value.analysisRequired === true)) analysisRequired = true;
      const retrospective = ['Agent', 'Task'].includes(call.name) && call.analysisRequired && typeof call.input?.prompt === 'string' && call.input.prompt.includes(feedbackReference);
      if (retrospective && !part.is_error) retrospectiveDispatched = true;
      if (part.tool_use_id !== failureId || !part.is_error) continue;
      if (['inspect', 'write'].includes(operation)) {
        const technical = values.find(value => value.feedbackFailure === 'technical' && value.runId === fields.start_time && value.stateHash === stateHash && value.operation === operation && feedbackFailureCodes.has(value.code));
        if (technical) failure = { failureId, kind: 'writer', code: technical.code };
      }
      const toolError = outputText(part);
      const invalidDispatch = /validation|invalid (?:input|argument|parameter|subagent)|missing (?:required|parameter)|unknown (?:agent|subagent).*type/i.test(toolError);
      const unavailableDispatch = /unavailable|not available|rate.?limit|overloaded|capacity|timed? out|timeout|connection|network|ECONN|EACCES|EPERM|failed to start|could not start|not permitted|denied|internal (?:server )?error/i.test(toolError);
      if (retrospective && !invalidDispatch && unavailableDispatch) failure = { failureId, kind: 'retrospective-dispatch', code: 'TOOL_FAILED' };
    }
  }
  return { failure, retrospectiveDispatched };
}
export const findFeedbackFailure = (...args) => feedbackRuntimeEvidence(...args).failure;

export function feedbackTerminalRow(fields, rows) {
  return fields.status === 'Complete'
    ? rows.findLast(row => row.to === 'complete' && row.from !== 'complete') ?? lastWorkRow(rows)
    : lastWorkRow(rows);
}

export function feedbackStateHash(fields, rows) {
  const row = feedbackTerminalRow(fields, rows);
  return createHash('sha256').update(JSON.stringify({ runId: fields.start_time, pluginVersion: fields.plugin_version ?? null,
    status: fields.status, phase: fields.phase,
    terminal: row ? { number: row.number, time: row.time, from: row.from, to: row.to, outcome: row.outcome } : null,
  })).digest('hex');
}

export function feedbackEligible(fields) {
  return fields.status === 'Complete' && fields.phase === 'complete' ||
    fields.status === 'Stopped' && ['execute', 'review', 'fix-plan', 'lightweight'].includes(fields.phase) &&
    /\b(?:fix|review|replan)\b.*\b(?:limit|cap|exhausted)\b/i.test(fields.pause_reason ?? '');
}

export function feedbackAction(statePath, fields) {
  if (!feedbackEligible(fields)) return {};
  return { next_action: { type: 'feedback', state: path.resolve(statePath), runId: fields.start_time,
    instruction: 'Read implement/references/feedback.md and feedback-on-session/SKILL.md now. Inspect this terminal run, dispatch the required retrospective when analysisRequired is true, review the available conversation even with zero retries, and save both feedback files through write-feedback.mjs with --session-review before the terminal summary or delivery question. Preserve terminal state and captured plugin version. No friction or not performed is not unavailability. Only an evidenced technical failure permits the reference\'s unavailable procedure. Do not ask permission to run this already-required step.' } };
}

function unavailableAttempt(events, statePath, fields, audit) {
  const stateHash = feedbackStateHash(fields, audit);
  const calls = new Set();
  for (const event of events) {
    if (!['assistant', 'user'].includes(event.type)) continue;
    const role = event.message?.role ?? event.type;
    const content = event.message?.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (role === 'assistant' && part.type === 'tool_use' && part.name === 'Bash' &&
          writerOperation(part, statePath) === 'unavailable') calls.add(part.id);
      if (role !== 'user' || part.type !== 'tool_result' || part.is_error || !calls.has(part.tool_use_id)) continue;
      const text = outputText(part);
      for (const line of text.split('\n')) {
        try {
          const value = JSON.parse(line);
          if (value.feedbackAttempt === 'unavailable' && value.runId === fields.start_time && value.stateHash === stateHash && value.reportSaved === false && typeof value.reason === 'string' && value.reason.trim() && findFeedbackFailure(events.slice(0, events.indexOf(event)), statePath, fields, audit, value.failureId)) return value;
        } catch { /* Other tool output is not a feedback acknowledgement. */ }
      }
    }
  }
  return null;
}

// Verify terminal work without reopening the workflow or waiting for user input.
export async function feedbackHold(input, statePath, fields, events) {
  if (!feedbackEligible(fields)) return null;
  const saved = parseState(await readFile(statePath, 'utf8'), statePath);
  const stateHash = feedbackStateHash(saved.fields, saved.audit);
  const reportPath = path.join(path.dirname(statePath), 'workflow-feedback.md');
  try {
    if ((await lstat(reportPath)).isFile()) {
      const report = await readFile(reportPath, 'utf8');
      const start = report.indexOf(`<!-- run:${fields.start_time} -->`);
      const end = report.indexOf(`<!-- /run:${fields.start_time} -->`);
      const block = report.slice(start, end);
      if (start >= 0 && end > start && block.includes('\n### Session review\n') &&
          block.includes(`<!-- feedback-state:${stateHash} -->`)) {
        const { inspectFeedback } = await import('./write-feedback.mjs');
        const summary = await inspectFeedback(statePath, { limitStop: fields.status === 'Stopped' });
        if (!summary.analysisRequired || feedbackRuntimeEvidence(events, statePath, saved.fields, saved.audit).retrospectiveDispatched) return null;
      }
    }
  } catch { /* Missing or unreadable feedback still needs a reported outcome. */ }
  const unavailable = unavailableAttempt(events, statePath, saved.fields, saved.audit);
  if (unavailable) return {
    systemMessage: `Session feedback is unavailable: ${unavailable.reason}. ${unavailable.reportStatus === 'unverified' ? 'An existing report remains unverified; the required retrospective was not completed.' : 'No combined feedback report was saved for this run.'} ${unavailable.receiptSaved === true ? `Only a failure receipt was saved at ${unavailable.receiptPath}.` : 'The failure receipt could not be saved either; disclose that limitation.'} State this accurately in the terminal summary; keep the workflow terminal.` };
  const reason = `${fields.status === 'Complete' ? 'Implementation is Complete' : 'The run is stopped at its retry limit'}, but the required feedback-on-session report has not been saved for this run. Read implement/references/feedback.md and feedback-on-session/SKILL.md; inspect the run, dispatch the retrospective when analysisRequired is true, and save through write-feedback.mjs with --session-review before the terminal summary or delivery question. An unperformed retrospective or a claim of no friction does not qualify as unavailable. Only after a technical tool failure, use the reference's unavailable procedure with --transcript ${JSON.stringify(input.transcript_path)} --failure-id <failed tool call ID> and a specific reason. Keep phase and status unchanged; do not ask permission or wait for optional user feedback.`;
  if (input.hook_event_name === 'Stop') return { decision: 'block', reason };
  if (input.hook_event_name === 'PreToolUse' && input.tool_name === 'AskUserQuestion') return {
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } };
  return null;
}
