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

const decision = (reason = null, pendingChat = false) => ({ reason, pendingChat });
export const isPlanningActivityCall = input => input.tool_name === 'Bash' &&
  /dashboard-checkpoint\.mjs["']?\s+["']?activity\b["']?/.test(input.tool_input?.command ?? '');

/** Pure policy check; only pendingChat qualifies for a bounded transcript reread. */
export function planningActivityCheck(input, events, state, statePath) {
  const f = state.fields;
  if (input.hook_event_name !== 'PreToolUse' || f.test_writing_version !== '1' || f.mode !== 'tdd' ||
      f.status !== 'In Progress' || !['plan', 'fix-plan'].includes(f.phase)) return decision();
  const command = input.tool_name === 'Bash' ? input.tool_input?.command ?? '' : '';
  const activation = state.audit.findLast(row => row.to === f.phase && row.from !== row.to);
  if (isPlanningActivityCall(input)) {
    const activity = option(command, 'activity');
    if (!activity?.trim() || /[\x00-\x1f]/.test(activity)) return decision('Use a nonempty single-line --activity sentence.');
    const index = command.indexOf('dashboard-checkpoint.mjs');
    const invocation = command.slice(index + 'dashboard-checkpoint.mjs'.length).replace(/^["']/, '');
    // Remove quoted values before looking for additional commands/redirection.
    const shell = invocation.replace(/"(?:\\.|[^"\\])*"|'[^']*'/g, '');
    if (/[;|<>\n]|&&/.test(shell) || (command.slice(0, index).match(/\bnode\b/g) ?? []).length > 1) return decision('Run the planning activity helper in its own Bash call, without pipes, redirection or other work. Run artifact resolution, code reads and validators afterward.');
    const boundary = option(command, 'planning-activity');
    if (boundary !== null && !planningActivities.has(boundary)) return decision('Use --planning-activity discovery, drafting or validation.');
    if (!chatContains(events, activity, activation?.epoch)) return decision('Planning activity must match actual assistant chat. If you already sent the exact --activity sentence in assistant chat during this planning cycle, do not repeat it: finish the response without tools so its transcript can flush, then retry the unchanged activity checkpoint on automatic continuation without asking the user. If the sentence is missing or different, send the --activity sentence literally in assistant chat before retrying; do not paraphrase it. The checkpoint must succeed before dependent work continues. Tool output and thinking do not count.', true);
    return decision();
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
  return decision(needed ? `Before planning ${needed}, send a concrete activity sentence in assistant chat, then run node "${helper}" activity --state "${statePath}" --activity "<copy that exact sentence>" --planning-activity ${needed} in its own Bash call. Only then retry the work. Keep the workflow In Progress; no user confirmation is needed.` : null);
}

/** Preserve the existing reason-only policy interface. */
export function planningActivityHold(...args) { return planningActivityCheck(...args).reason; }
