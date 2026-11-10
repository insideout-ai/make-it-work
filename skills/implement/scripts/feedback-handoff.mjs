import { lstat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parseState } from './render-status.mjs';
import { lastWorkRow } from './workflow-decisions.mjs';

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
    instruction: 'Run feedback-on-session inline now with implement/references/feedback.md: inspect the saved run, review the available conversation even with zero retries, and save both feedback files through write-feedback.mjs with --session-review. Do this before the terminal summary or delivery question. Preserve the terminal workflow state and captured plugin version. If feedback cannot be completed, use write-feedback.mjs unavailable --state <this state> --reason <specific limitation>, then disclose that limitation. Do not ask permission to run this already-required step.' } };
}

function unavailableAttempt(events, runId, stateHash) {
  const calls = new Set();
  for (const event of events) {
    if (!['assistant', 'user'].includes(event.type)) continue;
    const role = event.message?.role ?? event.type;
    const content = event.message?.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (role === 'assistant' && part.type === 'tool_use' && part.name === 'Bash' &&
          /write-feedback\.mjs["']?\s+unavailable\b/.test(part.input?.command ?? '')) calls.add(part.id);
      if (role !== 'user' || part.type !== 'tool_result' || part.is_error || !calls.has(part.tool_use_id)) continue;
      const text = typeof part.content === 'string' ? part.content : '';
      for (const line of text.split('\n')) {
        try {
          const value = JSON.parse(line);
          if (value.feedbackAttempt === 'unavailable' && value.runId === runId && value.stateHash === stateHash && typeof value.reason === 'string' && value.reason.trim()) return true;
        } catch { /* Other tool output is not a feedback acknowledgement. */ }
      }
    }
  }
  return false;
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
          block.includes(`<!-- feedback-state:${stateHash} -->`)) return null;
    }
  } catch { /* Missing or unreadable feedback still needs a reported outcome. */ }
  if (unavailableAttempt(events, fields.start_time, stateHash)) return {
    systemMessage: 'Session feedback was reported unavailable. Include the specific limitation in the terminal summary; keep the workflow terminal and do not claim feedback was saved.' };
  const reason = `${fields.status === 'Complete' ? 'Implementation is Complete' : 'The run is stopped at its retry limit'}, but the required feedback-on-session report has not been saved for this run. Run the feedback step now before the terminal summary or delivery question. Follow implement/references/feedback.md and save through write-feedback.mjs with --session-review. If analysis or saving is unavailable, record the specific limitation with write-feedback.mjs unavailable --state ${JSON.stringify(statePath)} --reason <specific limitation>, then report it. Keep phase and status unchanged; do not ask permission or wait for optional user feedback.`;
  if (input.hook_event_name === 'Stop') return { decision: 'block', reason };
  if (input.hook_event_name === 'PreToolUse' && input.tool_name === 'AskUserQuestion') return {
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } };
  return null;
}
