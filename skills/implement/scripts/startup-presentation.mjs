#!/usr/bin/env node
// Skill-scoped hooks: verify assistant chat, never infer it from tool output.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

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

export function pendingStartup(events) {
  let pending = null;
  const bashCalls = new Set();
  for (const event of events) {
    const role = event.message?.role ?? event.type;
    const content = event.message?.content;
    if (role === 'user' && !event.isMeta && (typeof content === 'string' ||
        Array.isArray(content) && !content.some((part) => part.type === 'tool_result'))) {
      // A new user turn is Resume, not a fresh-run announcement obligation.
      pending = null;
      bashCalls.clear();
    }
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (role === 'assistant' && part.type === 'tool_use' && part.name === 'Bash') bashCalls.add(part.id);
      if (role === 'user' && part.type === 'tool_result' && !part.is_error && bashCalls.has(part.tool_use_id)) {
        const output = typeof part.content === 'string' ? part.content :
          Array.isArray(part.content) ? part.content.filter((item) => item.type === 'text').map((item) => item.text).join('\n') : '';
        const initialized = startupResult(output);
        if (initialized) pending = initialized;
      }
      if (pending && role === 'assistant' && part.type === 'text' && hasLink(part.text ?? '', pending.dashboard)) pending = null;
    }
  }
  return pending;
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
    pending = pendingStartup(events);
    if (!pending) return {};
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
