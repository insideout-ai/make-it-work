#!/usr/bin/env node
// Skill-scoped hooks: verify assistant chat, never infer it from tool output.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { parseState } from './render-status.mjs';
import { prematureImplementation } from './implementation-guard.mjs';

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

function hasLink(text, dashboard) {
  // Code samples are not a clickable chat announcement.
  const prose = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
  return [...prose.matchAll(/\[Open implementation dashboard\]\(<?([^>\n]*?)>?\)/g)].some((match) => {
    try { return decodeURIComponent(match[1]) === dashboard; } catch { return false; }
  });
}

export function startupProgress(events) {
  let initialized = null;
  let announced = false;
  const bashCalls = new Set();
  for (const event of events) {
    if (!['assistant', 'user'].includes(event.type)) continue;
    const role = event.message?.role ?? event.type;
    const content = event.message?.content;
    if (role === 'user' && !event.isMeta && (typeof content === 'string' ||
        Array.isArray(content) && !content.some((part) => part.type === 'tool_result'))) {
      // A new user turn is Resume, not a fresh-run announcement obligation.
      initialized = null;
      announced = false;
      bashCalls.clear();
    }
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (role === 'assistant' && part.type === 'tool_use' && part.name === 'Bash') bashCalls.add(part.id);
      if (role === 'user' && part.type === 'tool_result' && !part.is_error && bashCalls.has(part.tool_use_id)) {
        const output = typeof part.content === 'string' ? part.content :
          Array.isArray(part.content) ? part.content.filter((item) => item.type === 'text').map((item) => item.text).join('\n') : '';
        const result = startupResult(output);
        if (result) { initialized = result; announced = false; }
      }
      if (initialized && role === 'assistant' && part.type === 'text' && hasLink(part.text ?? '', initialized.dashboard)) announced = true;
    }
  }
  return { initialized, announced };
}

export function pendingStartup(events) {
  const { initialized, announced } = startupProgress(events);
  return announced ? null : initialized;
}

async function continuationHold(initialized, toolCheck = false) {
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
  if (fields.phase !== 'context-check') return { decision: 'block', reason: `The workflow is still In Progress at ${fields.phase}. Continue its documented stage through independent review and the final package. If a genuine question or external blocker prevents continuation, save the documented pause or stop. Do not end an active run as completed or stop merely because its stages were skipped.` };
  return { decision: 'block', reason: 'The dashboard link has been shared, but this fresh run is still in Context check with status In Progress. Continue Context check now in this same turn; do not repeat the link or ask the user to send another message. If a genuine question or blocker prevents continuation, save the documented pause or stop before reporting it.' };
}

function reminder(initialized) {
  return `The implementation dashboard has been created, but its link still needs an ASSISTANT CHAT MESSAGE. Tool output does not send it. Before any further tool call, emit this exact clickable link in ordinary assistant text:\n\n${initialized.startup_message}\n\nThen continue Context check in this turn without waiting for user acknowledgment. For a pending offline refinement, keep its documented answer wait instead. Do not claim the link was already shared unless it appears in assistant chat.`;
}

function advisory(event, reason) {
  return { hookSpecificOutput: { hookEventName: event, additionalContext: reason } };
}

export async function startupHook(input) {
  if (input.hook_event_name === 'PostToolUse' && input.tool_name === 'Bash' && !input.tool_response?.interrupted) {
    const initialized = startupResult(input.tool_response?.stdout);
    if (initialized) return advisory('PostToolUse', reminder(initialized));
  }
  if (!['PreToolUse', 'PostToolUse', 'Stop'].includes(input.hook_event_name) || !input.transcript_path) return {};
  let progress;
  // Tool-time checks are advisory: chat may precede its buffered JSONL record.
  // Stop enforces delivery and continuation after allowing the transcript to flush.
  const attempts = input.hook_event_name === 'Stop' ? 40 : 0;
  for (let attempt = 0; attempt <= attempts; attempt += 1) {
    if (attempt) await delay(100);
    const lines = (await readFile(input.transcript_path, 'utf8')).split('\n');
    const events = [];
    for (let index = 0; index < lines.length; index += 1) {
      if (!lines[index].trim()) continue;
      try { events.push(JSON.parse(lines[index])); }
      catch (error) { if (index !== lines.length - 1) throw error; } // partial append
    }
    progress = startupProgress(events);
    if (!progress.initialized || progress.announced) break;
  }
  if (!progress.initialized) return {};
  if (!progress.announced) return input.hook_event_name === 'Stop'
    ? { decision: 'block', reason: reminder(progress.initialized) }
    : advisory(input.hook_event_name, reminder(progress.initialized));
  const hold = await continuationHold(progress.initialized, input.hook_event_name !== 'Stop');
  if (input.hook_event_name === 'Stop') return hold;
  // Keep recovery tools available; mutation is detected after execution, not rolled back.
  return hold.reason ? advisory(input.hook_event_name, hold.reason) : {};
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
