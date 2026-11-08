#!/usr/bin/env node
// Skill-scoped output validation; never changes project files or permissions.
import { readFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const unfinished = (text) => /<[a-z][a-z0-9 _-]*>[^`\n]*test-map-report\.mjs/i.test(text);
function resultText(part) {
  return typeof part.content === 'string' ? part.content : Array.isArray(part.content)
    ? part.content.filter((p) => p.type === 'text').map((p) => p.text).join('\n') : '';
}
export function refreshHandoff(events, lastAssistantMessage) {
  let command = null, lastText = '', generated = false;
  const bash = new Set();
  for (const event of events) {
    const role = event.message?.role ?? event.type;
    const content = event.message?.content;
    if (role === 'user' && !event.isMeta && (typeof content === 'string' ||
        Array.isArray(content) && !content.some((part) => part.type === 'tool_result'))) {
      command = null; lastText = ''; generated = false; bash.clear();
    }
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (role === 'assistant' && part.type === 'tool_use' && part.name === 'Bash') bash.add(part.id);
      if (role === 'user' && part.type === 'tool_result' && !part.is_error && bash.has(part.tool_use_id)) {
        const text = resultText(part);
        if (/^(?:Generated \.claude\/testing\/TEST-MAP\.md from the saved map\.|\.claude\/testing\/TEST-MAP\.md is already up to date\.)\r?$/m.test(text)) {
          generated = true;
          command = text.match(/^Refresh from the product repo root: (.+)$/m)?.[1]?.trim() ?? null;
        }
      }
      if (role === 'assistant' && part.type === 'text') lastText = part.text ?? '';
    }
  }
  // Stop provides the actual final text even before its transcript record flushes.
  // https://code.claude.com/docs/en/hooks#stop-input
  const handoff = typeof lastAssistantMessage === 'string' ? lastAssistantMessage : lastText;
  const badHandoff = handoff.split('\n').some((line) => unfinished(line) && !/\b(?:example only|template only|not runnable|do not run|don't run)\b/i.test(line));
  if (!generated || !badHandoff) return {};
  if (!command) return { decision: 'block', reason: 'The report was generated, but the final handoff contains an unfinished refresh command. Link the generated TEST-MAP.md and direct the user to its Refresh line, or read and copy the actual resolved command. Correct the message in this turn without waiting for user acknowledgment.' };
  return { decision: 'block', reason: unfinished(command)
    ? 'The refresh handoff and generated report contain an unfinished template command. Resolve the generator command and regenerate the report, or report the real blocker; do not present a placeholder as runnable.'
    : `The report was generated, but the final handoff contains an unfinished refresh command. Replace the placeholder with this exact resolved command, or link the report and direct the user to its Refresh line:\n\n${command}\n\nCorrect the assistant message and finish in this turn; no user acknowledgment is required.` };
}
export async function refreshHandoffHook(input) {
  if (input.hook_event_name !== 'Stop' || !input.transcript_path) return {};
  // Let the final assistant chat record reach the transcript before checking it.
  await delay(75);
  const events = (await readFile(input.transcript_path, 'utf8')).split('\n').filter((s) => s.trim()).map(JSON.parse);
  return refreshHandoff(events, input.last_assistant_message);
}
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    let text = ''; for await (const chunk of process.stdin) text += chunk;
    process.stdout.write(JSON.stringify(await refreshHandoffHook(JSON.parse(text))) + '\n');
  } catch (error) { process.stderr.write(`Refresh handoff check failed: ${error.message}\n`); process.exitCode = 2; }
}
