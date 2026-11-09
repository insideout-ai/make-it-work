#!/usr/bin/env node
// Skill-scoped hooks: verify assistant chat, never infer it from tool output.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { parseState } from './render-status.mjs';
import { readinessMutationCommand } from './testing-readiness.mjs';
import { prematureImplementation } from './implementation-guard.mjs';
import { recordHookEvent } from './hook-feedback.mjs';
import { readStartupConfirmation, saveStartupConfirmation, isConfirmationBoundary, hasDashboardLink as hasLink } from './startup-confirmation.mjs';

export function startupResult(output) {
  if (typeof output !== 'string') return null;
  for (const line of output.split('\n').reverse()) {
    let value;
    try { value = JSON.parse(line); } catch { continue; }
    if (typeof value?.startup_message === 'string' && typeof value.state === 'string' &&
        typeof value.dashboard === 'string' && value.state.endsWith('-state.md') &&
        value.dashboard.endsWith('-status.html') &&
        value.startup_message.startsWith('[Open implementation dashboard](')) return value;
  }
  return null;
}

export function startupProgress(events) {
  let initialized = null;
  let initializationId = null;
  let announced = false;
  const bashCalls = new Set();
  const agentCalls = new Map();
  const agents = new Map();
  for (const event of events) {
    // Task notifications are runtime events, not diagnostic request replays or
    // agent-authored claims. A queued completion must close the wait immediately.
    const notification = event.type === 'queue-operation' && event.operation === 'enqueue' ? event.content : null;
    if (typeof notification === 'string' && notification.startsWith('<task-notification>')) {
      const id = notification.match(/<task-id>([^<]+)<\/task-id>/)?.[1];
      const status = notification.match(/<status>([^<]+)<\/status>/)?.[1];
      if (['completed', 'failed', 'killed', 'cancelled', 'stopped'].includes(status)) agents.delete(id);
    }
    if (!['assistant', 'user'].includes(event.type)) continue;
    const role = event.message?.role ?? event.type;
    const content = event.message?.content;
    if (role === 'user' && !event.isMeta && !event.isSynthetic && (typeof content === 'string' ||
        Array.isArray(content) && !content.some((part) => part.type === 'tool_result'))) {
      // A new user turn is Resume, not a fresh-run announcement obligation.
      initialized = null;
      initializationId = null;
      announced = false;
      bashCalls.clear();
      agentCalls.clear();
      agents.clear();
    }
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (role === 'assistant' && part.type === 'tool_use' && part.name === 'Bash') bashCalls.add(part.id);
      if (initialized && role === 'assistant' && part.type === 'tool_use' && ['Agent', 'Task', 'ListAgents', 'TaskOutput'].includes(part.name)) {
        agentCalls.set(part.id, part.name);
      }
      if (role === 'user' && part.type === 'tool_result' && !part.is_error && agentCalls.has(part.tool_use_id)) {
        const result = event.toolUseResult;
        if (['Agent', 'Task'].includes(agentCalls.get(part.tool_use_id)) && result?.isAsync === true && result.status === 'async_launched' && typeof result.agentId === 'string') {
          agents.set(result.agentId, { id: result.agentId, launchedAt: Date.parse(event.timestamp) });
        }
        // A runtime inventory can invalidate stale launch evidence. Peers are
        // deliberately excluded: only this session's delegated agents qualify.
        const inventory = agentCalls.get(part.tool_use_id) === 'ListAgents' && Array.isArray(result?.sections)
          ? result.sections.find((section) => section.kind === 'subagents') : null;
        if (inventory && Array.isArray(inventory.rows)) {
          for (const id of agents.keys()) {
            if (!inventory.rows.some((row) => row.id === id && ['running', 'busy'].includes(row.status))) agents.delete(id);
          }
        }
        const task = result?.task;
        if (agentCalls.get(part.tool_use_id) === 'TaskOutput' && task && ['completed', 'failed', 'killed', 'cancelled', 'stopped'].includes(task.status)) agents.delete(task.task_id);
      }
      if (role === 'user' && part.type === 'tool_result' && !part.is_error && bashCalls.has(part.tool_use_id)) {
        const output = typeof part.content === 'string' ? part.content :
          Array.isArray(part.content) ? part.content.filter((item) => item.type === 'text').map((item) => item.text).join('\n') : '';
        const result = startupResult(output);
        if (result) { initialized = result; initializationId = part.tool_use_id; announced = false; agentCalls.clear(); agents.clear(); }
      }
      if (initialized && role === 'assistant' && part.type === 'text' && hasLink(part.text ?? '', initialized.dashboard)) announced = true;
    }
  }
  return { initialized, initializationId, announced, agents: [...agents.values()] };
}

export function pendingStartup(events) {
  const { initialized, announced } = startupProgress(events);
  return announced ? null : initialized;
}

async function continuationHold(initialized, toolCheck = false, agents = []) {
  if (initialized?.continuation !== 'continue_context_check_without_user_reply') return {};
  let state;
  try {
    state = parseState(await readFile(initialized.state, 'utf8'), initialized.state);
  } catch (error) {
    return { decision: 'block', reason: `Startup continuation could not verify the saved workflow state: ${error.message}. Inspect and repair the state or checkpoint a genuine blocker before ending the turn. Do not ask the user for a message merely to continue startup.` };
  }
  const violation = await prematureImplementation(initialized, state);
  if (violation) return { decision: 'block', reason: violation };
  if (toolCheck) return {};
  const { fields } = state;
  if (fields.status !== 'In Progress') return {};
  const enteredPhase = state.audit.findLast((row) => row.to === fields.phase && row.from !== row.to)?.epoch;
  // Yielding to a live child is not workflow completion. Preserve In Progress
  // and all completion gates; a child from an earlier phase cannot release Stop.
  if (['plan', 'execute', 'lightweight', 'review', 'fix-plan'].includes(fields.phase) &&
      agents.some((agent) => Number.isFinite(agent.launchedAt) && agent.launchedAt >= enteredPhase)) return {};
  if (fields.phase !== 'context-check') return { decision: 'block', reason: `The workflow is still In Progress at ${fields.phase}. Continue its documented stage through independent review and the final package. If a genuine question or external blocker prevents continuation, save the documented pause or stop. Do not end an active run as completed or stop merely because its stages were skipped.` };
  return { decision: 'block', reason: 'The dashboard link has been shared, but this fresh run is still in Context check with status In Progress. Continue Context check now in this same turn; do not repeat the link or ask the user to send another message. If a genuine question or blocker prevents continuation, save the documented pause or stop before reporting it.' };
}

function reminder(initialized) {
  return `The implementation dashboard has been created, but its link still needs an ASSISTANT CHAT MESSAGE. Tool output does not send it. Before any further tool call, emit this exact clickable link in ordinary assistant text:\n\n${initialized.startup_message}\n\nSend it as a standalone assistant response with no tool calls. For a normal run the Stop hook will confirm the runtime assistant text and continue the workflow automatically; no user reply is needed. If the link has already streamed, finish the response without more tools instead of repeating it.\n\nThen continue Context check in this turn without waiting for user acknowledgment. For a pending offline refinement, keep its documented answer wait instead. Do not claim the link was already shared unless it appears in assistant chat.`;
}

function advisory(event, reason) {
  return { hookSpecificOutput: { hookEventName: event, additionalContext: reason } };
}

async function observeHook(input, progress, events, output, kind = 'clear') {
  if (!progress.initialized?.continuation) return output;
  try {
    const state = parseState(await readFile(progress.initialized.state, 'utf8'), progress.initialized.state);
    if (input.hook_event_name === 'Stop' && kind === 'clear' && state.fields.status === 'In Progress' && progress.agents.length) kind = 'agent-wait';
    await recordHookEvent({ statePath: progress.initialized.state, state, input, events, kind, agents: progress.agents });
    return output;
  } catch {
    // Observability must not change the hook's enforcement or workflow status.
    return { ...output, systemMessage: 'Workflow hook feedback could not be recorded; retrospective evidence may be incomplete.' };
  }
}

export async function startupHook(input) {
  if (input.hook_event_name === 'PostToolUse' && input.tool_name === 'Bash' && !input.tool_response?.interrupted) {
    const initialized = startupResult(input.tool_response?.stdout);
    if (initialized) return { decision: 'block', reason: reminder(initialized) };
  }
  if (!['PreToolUse', 'PostToolUse', 'Stop'].includes(input.hook_event_name) || !input.transcript_path) return {};
  let progress;
  let events;
  let confirmation;
  let confirmationError;
  // Chat may precede its buffered JSONL record. Allow a longer bounded flush
  // before enforcing a missing announcement, without accepting tool-only links.
  const attempts = input.hook_event_name === 'PostToolUse' ? 0 : 40;
  for (let attempt = 0; attempt <= attempts; attempt += 1) {
    if (attempt) await delay(100);
    const lines = (await readFile(input.transcript_path, 'utf8')).split('\n');
    events = [];
    for (let index = 0; index < lines.length; index += 1) {
      if (!lines[index].trim()) continue;
      try { events.push(JSON.parse(lines[index])); }
      catch (error) { if (index !== lines.length - 1) throw error; } // partial append
    }
    progress = startupProgress(events);
    if (progress.initialized) {
      confirmation = await readStartupConfirmation(input, progress);
      const runtimeLink = input.hook_event_name === 'Stop' && typeof input.last_assistant_message === 'string' &&
        hasLink(input.last_assistant_message, progress.initialized.dashboard);
      if (runtimeLink && !isConfirmationBoundary(input, confirmation)) {
        try { confirmation = await saveStartupConfirmation(input, progress); }
        catch { confirmationError = 'Startup text was confirmed, but its local receipt could not be saved; later hooks may need the transcript to catch up.'; }
      }
      if (runtimeLink || confirmation) progress.announced = true;
    }
    if (!progress.initialized || progress.announced) break;
  }
  if (!progress.initialized) return {};
  if (!progress.announced) return observeHook(input, progress, events, input.hook_event_name === 'Stop'
    ? { decision: 'block', reason: reminder(progress.initialized) }
    : input.hook_event_name === 'PreToolUse'
      ? { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reminder(progress.initialized) } }
      : advisory(input.hook_event_name, reminder(progress.initialized)), 'missing-dashboard-link');
  if (input.hook_event_name === 'PreToolUse' && readinessMutationCommand(input)) {
    let state;
    try { state = parseState(await readFile(progress.initialized.state, 'utf8'), progress.initialized.state); } catch { /* Existing continuation handling keeps repair tools available. */ }
    const entered = state?.audit.findLast((row) => row.to === state.fields.phase && row.from !== row.to)?.epoch;
    if (state?.fields.testing_readiness_version === '1' && ['plan', 'fix-plan'].includes(state.fields.phase) &&
        progress.agents.some((agent) => Number.isFinite(agent.launchedAt) && agent.launchedAt >= entered)) {
      return observeHook(input, progress, events, { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny',
        permissionDecisionReason: 'Plan delegates are still running. Wait for their actual handback before beginning or completing readiness, reconcile the report, then continue planning. Keep the run In Progress; a verified Plan wait is allowed.' } }, 'readiness-pending');
    }
  }
  const hold = await continuationHold(progress.initialized, input.hook_event_name !== 'Stop', progress.agents);
  if (input.hook_event_name === 'Stop') {
    const expectedBoundary = isConfirmationBoundary(input, confirmation) && hold.reason?.startsWith('The dashboard link has been shared');
    const kind = !hold.reason || expectedBoundary ? 'clear' : hold.reason.startsWith('Application files changed') ? 'premature-implementation'
      : hold.reason.startsWith('Startup continuation could not verify') ? 'state-unavailable' : 'active-stage';
    const output = confirmationError ? { ...hold, systemMessage: confirmationError } : hold;
    return observeHook(input, progress, events, output, kind);
  }
  // Keep recovery tools available; mutation is detected after execution, not rolled back.
  return observeHook(input, progress, events, hold.reason ? advisory(input.hook_event_name, hold.reason) : {});
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    let data = '';
    for await (const chunk of process.stdin) data += chunk;
    process.stdout.write(`${JSON.stringify(await startupHook(JSON.parse(data)))}\n`);
  } catch (error) {
    process.stderr.write(`Startup presentation check failed: ${error.message}\n`);
    process.exitCode = 2;
  }
}
