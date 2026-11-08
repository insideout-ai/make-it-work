#!/usr/bin/env node
// Skill-scoped hooks: verify assistant chat, never infer it from tool output.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { parseState } from './render-status.mjs';

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

async function continuationHold(initialized) {
  if (initialized?.continuation !== 'continue_context_check_without_user_reply') return {};
  let fields;
  try {
    ({ fields } = parseState(await readFile(initialized.state, 'utf8'), initialized.state));
  } catch (error) {
    return { decision: 'block', reason: `Startup continuation could not verify the saved workflow state: ${error.message}. Inspect and repair the state or checkpoint a genuine blocker before ending the turn. Do not ask the user for a message merely to continue startup.` };
  }
  if (fields.phase !== 'context-check' || fields.status !== 'In Progress') return {};
  return { decision: 'block', reason: 'The dashboard link has been shared, but this fresh run is still in Context check with status In Progress. Continue Context check now in this same turn; do not repeat the link or ask the user to send another message. If a genuine question or blocker prevents continuation, save the documented pause or stop before reporting it.' };
}

function reminder(initialized) {
  return `The implementation dashboard has been created, but its link still needs an ASSISTANT CHAT MESSAGE. Tool output does not send it. Before any further tool call, emit this exact clickable link in ordinary assistant text:\n\n${initialized.startup_message}\n\nThen continue Context check in this turn without waiting for user acknowledgment. For a pending offline refinement, keep its documented answer wait instead. Do not claim the link was already shared unless it appears in assistant chat.`;
}

export async function startupHook(input) {
  if (input.hook_event_name === 'PostToolUse') {
    if (input.tool_name !== 'Bash' || input.tool_response?.interrupted) return {};
    const initialized = startupResult(input.tool_response?.stdout);
    return initialized ? { decision: 'block', reason: reminder(initialized) } : {};
  }
  if (!['PreToolUse', 'Stop'].includes(input.hook_event_name) || !input.transcript_path) return {};
  let pending;
  // Claude Code buffers transcript writes. The chat block immediately before
  // this tool can be visible before its JSONL record reaches the hook.
  for (let attempt = 0; attempt <= 15; attempt += 1) {
    if (attempt) await delay(100);
    const transcript = await readFile(input.transcript_path, 'utf8');
    const events = transcript.split('\n').filter((line) => line.trim()).map((line) => JSON.parse(line));
    const progress = startupProgress(events);
    pending = progress.announced ? null : progress.initialized;
    if (!pending) return input.hook_event_name === 'Stop' ? continuationHold(progress.initialized) : {};
  }
  if (input.hook_event_name === 'Stop') return { decision: 'block', reason: reminder(pending) };
  return { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reminder(pending) } };
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
