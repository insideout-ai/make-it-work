import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { artifactJoin, artifactResolve } from '../../../scripts/lib/artifact-path.mjs';

export const planningActivities = new Set(['discovery', 'drafting', 'validation']);
const helper = fileURLToPath(new URL('./dashboard-checkpoint.mjs', import.meta.url));

function option(command, name) {
  const match = command.match(new RegExp(`--${name}["']?\\s+(?:"((?:\\\\.|[^"\\\\])*)"|'([^']*)'|([^\\s;&|<>]+))`));
  if (!match) return null;
  return match[1] !== undefined ? match[1].replace(/\\(["\\])/g, '$1') : match[2] ?? match[3];
}

function chatContains(events, activity, entered) {
  for (const event of events) {
    if (event.type !== 'assistant' || event.isMeta || event.isSynthetic || event.isSidechain || event.parentToolUseID || event.parent_tool_use_id) continue;
    if (Number.isFinite(entered) && (!Number.isFinite(Date.parse(event.timestamp)) || Date.parse(event.timestamp) < entered)) continue;
    if ((event.message?.role ?? 'assistant') !== 'assistant' || !Array.isArray(event.message?.content)) continue;
    for (const part of event.message.content) {
      if (part.type !== 'text') continue;
      let fenced = false;
      for (const line of (part.text ?? '').split(/\r?\n/)) {
        if (/^\s*(?:```|~~~)/.test(line)) { fenced = !fenced; continue; }
        if (!fenced && line.trim() === activity) return true;
      }
    }
  }
  return false;
}

/** A repairable planning check, scoped to new Implement TDD runs. */
export function planningActivityHold(input, events, state, statePath) {
  const f = state.fields;
  if (input.hook_event_name !== 'PreToolUse' || f.test_writing_version !== '1' || f.mode !== 'tdd' ||
      f.status !== 'In Progress' || !['plan', 'fix-plan'].includes(f.phase)) return null;
  const command = input.tool_name === 'Bash' ? input.tool_input?.command ?? '' : '';
  const activation = state.audit.findLast(row => row.to === f.phase && row.from !== row.to);
  if (/dashboard-checkpoint\.mjs["']?\s+["']?activity\b["']?/.test(command)) {
    const activity = option(command, 'activity');
    if (!activity || !chatContains(events, activity, activation?.epoch)) return 'Planning activity must match actual assistant chat. Send the --activity sentence literally in assistant chat before this call; do not paraphrase it. If it has already streamed, finish that response without tools so its transcript can flush, then continue without asking the user. Tool output and thinking do not count.';
    const index = command.indexOf('dashboard-checkpoint.mjs');
    const invocation = command.slice(index + 'dashboard-checkpoint.mjs'.length).replace(/^["']/, '');
    // Remove quoted values before looking for additional commands/redirection.
    const shell = invocation.replace(/"(?:\\.|[^"\\])*"|'[^']*'/g, '');
    if (/[;|<>\n]|&&/.test(shell) || (command.slice(0, index).match(/\bnode\b/g) ?? []).length > 1) return 'Run the planning activity helper in its own Bash call, without pipes, redirection or other work. Run artifact resolution, code reads and validators afterward.';
    const boundary = option(command, 'planning-activity');
    if (boundary && !planningActivities.has(boundary)) return 'Use --planning-activity discovery, drafting or validation.';
    return null;
  }
  const entered = activation?.number ?? 0;
  const activities = state.audit.filter(row => row.number > entered && row.note?.kind === 'activity' && row.to === f.phase);
  const has = boundary => activities.some(row => row.note.id.startsWith(`planning-${boundary}:`));
  const current = boundary => activities.at(-1)?.note.id.startsWith(`planning-${boundary}:`);
  const root = path.dirname(path.dirname(path.dirname(statePath)));
  const plan = f.plan && f.plan !== 'none' ? artifactResolve(root, f.plan)
    : artifactJoin(path.dirname(statePath), `${f.ticket}-plan${f.plan_version === '1' ? '' : `-v${f.plan_version}`}.md`);
  const file = input.tool_input?.file_path;
  const target = file ? artifactResolve(input.cwd ?? root, file) : null;
  const writing = ['Write', 'Edit'].includes(input.tool_name) && target === plan;
  const validating = /validate-plan\.mjs["']?\s+["']?(?:normalize-risk|check)\b/.test(command);
  const reading = input.tool_name === 'Read' && target && !path.relative(root, target).startsWith('..') &&
    !path.relative(root, target).startsWith(`make-it-work${path.sep}`);
  let needed = null;
  if ((reading || writing) && !has('discovery')) needed = 'discovery';
  else if (writing && !current('drafting')) needed = 'drafting';
  else if (validating && !current('validation')) needed = 'validation';
  return needed ? `Before planning ${needed}, send a concrete activity sentence in assistant chat, then run node "${helper}" activity --state "${statePath}" --activity "<copy that exact sentence>" --planning-activity ${needed} in its own Bash call. Only then retry the work. Keep the workflow In Progress; no user confirmation is needed.` : null;
}
