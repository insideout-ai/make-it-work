#!/usr/bin/env node
// Skill-scoped output validation; never changes project files or permissions.
import { readFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const RECOVERY_MARKER = '[DTS handoff recovery]';
const recoveryReminder = `${RECOVERY_MARKER} After recovery, send one complete self-contained final handoff: both metadata paths (.claude/skills/test-strategy/SKILL.md and .claude/testing/test-map.json), report/resolved refresh command, mapped/uncovered/unresolved use cases and domains, CLAUDE.md pointer outcome, decision-log path and actual write outcome when applicable, tests-run/not-run and commit status. Repeat all required details; do not say the earlier summary stands or refer the user to an earlier message.`;

const unfinished = (text) => /<[a-z][a-z0-9 _-]*>[^`\n]*test-map-report\.mjs/i.test(text);
function resultText(part) {
  return typeof part.content === 'string' ? part.content : Array.isArray(part.content)
    ? part.content.filter((p) => p.type === 'text').map((p) => p.text).join('\n') : '';
}
// This verifies delivery of the full data packet, not semantic mapping quality.
export function evidenceDeliveryHold(events) {
  const bash = new Set();
  const pending = new Map();
  const finalize = new Map();
  let lastEvidenceRoot = null;
  const field = (text, name) => {
    for (const match of text.matchAll(/"(operation|root|reassessment_command)"\s*:\s*("(?:\\.|[^"\\])*")/g)) {
      if (match[1] === name) return JSON.parse(match[2]);
    }
    return null;
  };
  for (const event of events) {
    if (!['assistant', 'user'].includes(event.type)) continue;
    const role = event.message?.role ?? event.type;
    const content = event.message?.content;
    if (role === 'user' && !event.isMeta && !event.isSynthetic && (typeof content === 'string' ||
        Array.isArray(content) && !content.some((part) => part.type === 'tool_result'))) {
      pending.clear(); finalize.clear(); lastEvidenceRoot = null; bash.clear();
    }
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (role === 'assistant' && part.type === 'tool_use' && part.name === 'Bash') bash.add(part.id);
      if (role !== 'user' || part.type !== 'tool_result' || part.is_error || !bash.has(part.tool_use_id)) continue;
      const text = resultText(part);
      if (field(text, 'operation') === 'pointer-update') {
        const root = field(text, 'root');
        if (!pending.has(root)) pending.set(root, { command: field(text, 'reassessment_command'), callId: part.tool_use_id });
      }
      for (const line of text.split('\n')) {
        let value;
        try { value = JSON.parse(line); } catch { continue; }
        if (['pointer-update', 'mapping-evidence'].includes(value?.operation) && typeof value.root === 'string' &&
            Array.isArray(value.reassessment_evidence?.files) && typeof value.reassessment_evidence.complete === 'boolean') {
          const held = pending.get(value.root) ?? pending.get(null);
          if (held && held.callId !== part.tool_use_id) finalize.set(value.root, part.tool_use_id);
          pending.delete(value.root);
          pending.delete(null);
          lastEvidenceRoot = value.root;
        }
      }
      if (lastEvidenceRoot && finalize.get(lastEvidenceRoot) !== part.tool_use_id && /^(?:Generated \.claude\/testing\/TEST-MAP\.md from the saved map\.|\.claude\/testing\/TEST-MAP\.md is already up to date\.)\r?$/m.test(text)) finalize.delete(lastEvidenceRoot);
    }
  }
  if (!pending.size) return finalize.size ? { decision: 'block', reason: 'The full reassessment evidence is now available. Complete semantic reassessment from those assertions and documents, inspect and record the final snapshots/discovery as appropriate, and regenerate TEST-MAP.md in a separate tool call before handing off. A success claim alone does not finish recovery.' } : {};
  const [root, held] = pending.entries().next().value;
  const command = held.command;
  return { decision: 'block', reason: `The post-pointer reassessment evidence was truncated before delivery${root ? ' for ' + root : ''}. Do not claim fresh mappings from hashes or a partial packet. Run the read-only command below in its own tool call WITHOUT cut/head or output truncation, review the actual assertions and mapped documentation, complete any deferred reads, then reassess mappings and record final snapshots/discovery and regenerate TEST-MAP.md before the final handoff. Do not rerun the pointer write merely to fetch evidence. No user approval is required.\n\n${command ?? 'Run scripts/test-strategy.mjs evidence --root <the selected product repo> without truncation.'}` };
}

export function refreshHandoff(events, lastAssistantMessage) {
  const evidenceHold = evidenceDeliveryHold(events);
  if (evidenceHold.decision) return evidenceHold;
  let command = null, lastText = '', generated = false, recovering = false, logAttempted = false;
  const bash = new Set();
  for (const event of events) {
    if (!['assistant', 'user'].includes(event.type)) continue;
    const role = event.message?.role ?? event.type;
    const content = event.message?.content;
    if (role === 'user' && !event.isMeta && !event.isSynthetic && (typeof content === 'string' ||
        Array.isArray(content) && !content.some((part) => part.type === 'tool_result'))) {
      command = null; lastText = ''; generated = false; recovering = false; logAttempted = false; bash.clear();
    }
    if (role === 'user' && (event.isMeta || event.isSynthetic) && JSON.stringify(content).includes(RECOVERY_MARKER)) recovering = true;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (role === 'assistant' && part.type === 'tool_use' && /define-test-strategy/.test(JSON.stringify(part.input)) && /decision-log\.mjs|autopilot-log\.jsonl/.test(JSON.stringify(part.input))) logAttempted = true;
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
  if (generated && recovering) {
    const missing = ['.claude/skills/test-strategy/SKILL.md', '.claude/testing/test-map.json'].filter((file) => !handoff.includes(file));
    if (!/coverage|uncovered|unmapped|untested|UC-/i.test(handoff)) missing.push('coverage and uncovered/unresolved scope');
    if (logAttempted && !handoff.includes('define-test-strategy-autopilot-log.jsonl')) missing.push('decision-log path and outcome');
    if (missing.length) return { decision: 'block', reason: `The corrected handoff is missing ${missing.join(', ')}. ${recoveryReminder}` };
  }
  const badHandoff = handoff.split('\n').some((line) => unfinished(line) && !/\b(?:example only|template only|not runnable|do not run|don't run)\b/i.test(line));
  if (!generated || !badHandoff) return {};
  if (!command) return { decision: 'block', reason: 'The report was generated, but the final handoff contains an unfinished refresh command. Link the generated TEST-MAP.md and direct the user to its Refresh line, or read and copy the actual resolved command. Correct the message in this turn without waiting for user acknowledgment.' };
  return { decision: 'block', reason: unfinished(command)
    ? 'The refresh handoff and generated report contain an unfinished template command. Resolve the generator command and regenerate the report, or report the real blocker; do not present a placeholder as runnable.'
    : `The report was generated, but the final handoff contains an unfinished refresh command. Replace the placeholder with this exact resolved command, or link the report and direct the user to its Refresh line:\n\n${command}\n\nCorrect the assistant message and finish in this turn; no user acknowledgment is required.` };
}
export async function refreshHandoffHook(input) {
  if (input.hook_event_name === 'PostToolUse') {
    if (input.tool_name !== 'Bash' || input.tool_response?.interrupted) return {};
    const result = evidenceDeliveryHold([
      { type: 'assistant', message: { role: 'assistant', content: [{ type: 'tool_use', name: 'Bash', id: 'post' }] } },
      { type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'post', content: input.tool_response?.stdout ?? '' }] } },
    ]);
    return result.decision ? { ...result, reason: result.reason + '\n\n' + recoveryReminder } : result;
  }
  if (input.hook_event_name !== 'Stop' || !input.transcript_path) return {};
  // Let the final assistant chat record reach the transcript before checking it.
  await delay(75);
  const events = (await readFile(input.transcript_path, 'utf8')).split('\n').filter((s) => s.trim()).map(JSON.parse);
  const result = refreshHandoff(events, input.last_assistant_message);
  return result.decision && !result.reason.includes(RECOVERY_MARKER) ? { ...result, reason: result.reason + '\n\n' + recoveryReminder } : result;
}
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    let text = ''; for await (const chunk of process.stdin) text += chunk;
    process.stdout.write(JSON.stringify(await refreshHandoffHook(JSON.parse(text))) + '\n');
  } catch (error) { process.stderr.write(`Refresh handoff check failed: ${error.message}\n`); process.exitCode = 2; }
}
