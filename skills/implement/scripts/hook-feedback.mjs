// Local runtime observations. Never copy hook reasons, chat, paths or agent IDs.
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import path from 'node:path';
import { assertRunState } from './artifact-layout.mjs';

const sha = (value) => createHash('sha256').update(value).digest('hex');
const kinds = new Set(['missing-dashboard-link', 'active-stage', 'premature-implementation', 'state-unavailable', 'readiness-pending', 'agent-wait', 'clear']);
const phases = new Set(['context-check', 'close-the-gaps', 'spec-approval', 'plan', 'plan-approval', 'execute', 'lightweight', 'review', 'fix-plan', 'final-sync', 'final-approval', 'complete']);
const hooks = new Set(['PreToolUse', 'Stop']);
const iso = (value) => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(value) && Number.isFinite(Date.parse(value));
const hash = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const journalPath = (statePath) => path.join(path.dirname(statePath), 'hook-events.jsonl');

export function validateHookEvent(event) {
  if (!event || Object.keys(event).sort().join(',') !== 'at,eventId,hook,kind,phase,runId,subject,version' || event.version !== 1 ||
      !iso(event.runId) || !iso(event.at) || !hash(event.eventId) || !hash(event.subject) ||
      !hooks.has(event.hook) || !kinds.has(event.kind) || !phases.has(event.phase)) throw new Error('Invalid workflow hook observation.');
  return event;
}

export async function readHookEvents(statePath) {
  let file;
  try {
    file = await open(journalPath(statePath), constants.O_RDONLY | constants.O_NOFOLLOW);
    if (!(await file.stat()).isFile()) throw new Error('Hook journal must be a regular file.');
    return (await file.readFile('utf8')).split('\n').filter((line) => line.trim()).map((line) => validateHookEvent(JSON.parse(line)));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  } finally { await file?.close(); }
}

export async function recordHookEvent({ statePath, state, input, events, kind, agents = [] }) {
  if (!hooks.has(input.hook_event_name)) return;
  const { ticket, start_time: runId, phase, status } = state.fields;
  if (!iso(runId)) return; // Legacy runs cannot be attributed safely.
  const root = path.dirname(path.dirname(path.dirname(path.resolve(statePath))));
  assertRunState(root, statePath, ticket);
  const history = await readHookEvents(statePath);
  if (status !== 'In Progress') kind = 'clear';
  // Successful tools need an observation only when releasing an earlier hold.
  const previous = history.findLast((event) => event.runId === runId && event.hook === input.hook_event_name);
  if (kind === 'clear' && (!previous || previous.kind === 'clear')) return;
  const tail = events.findLast((event) => event.type === 'assistant' || event.type === 'user');
  const occurrence = input.tool_use_id ?? tail?.uuid ?? sha(JSON.stringify(tail ?? input.last_assistant_message ?? 'unknown'));
  const subject = sha(kind === 'agent-wait' ? agents.map((agent) => agent.id).sort().join('\n') : kind);
  const identity = [runId, input.hook_event_name, phase, kind, subject, occurrence].join('\0');
  const eventId = sha(identity);
  if (history.some((event) => event.eventId === eventId)) return;
  const event = validateHookEvent({ version: 1, runId, at: new Date().toISOString(), eventId, hook: input.hook_event_name, phase, kind, subject });
  const file = await open(journalPath(statePath), constants.O_WRONLY | constants.O_CREAT | constants.O_APPEND | constants.O_NOFOLLOW, 0o600);
  try {
    if (!(await file.stat()).isFile()) throw new Error('Hook journal must be a regular file.');
    await file.writeFile(`${JSON.stringify(event)}\n`);
  } finally { await file.close(); }
}

export function summarizeHookEvents(events, runId, terminalTime) {
  const unique = new Map();
  for (const candidate of events) {
    const event = validateHookEvent(candidate);
    if (!unique.has(event.eventId) && event.runId === runId && Date.parse(event.at) >= Date.parse(runId) && Date.parse(event.at) <= Date.parse(terminalTime)) unique.set(event.eventId, event);
  }
  const active = new Map();
  const episodes = [];
  for (const event of [...unique.values()].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))) {
    const previous = active.get(event.hook);
    if (previous && (event.kind === 'clear' || previous.kind !== event.kind || previous.phase !== event.phase || previous.subject !== event.subject)) {
      previous.resolvedAt = event.at;
      active.delete(event.hook);
    }
    if (event.kind === 'clear') continue;
    const current = active.get(event.hook);
    if (current) { current.occurrences++; current.lastSeen = event.at; }
    else {
      const episode = { id: event.eventId, hook: event.hook, kind: event.kind, phase: event.phase, subject: event.subject,
        occurrences: 1, firstSeen: event.at, lastSeen: event.at, resolvedAt: null };
      episodes.push(episode); active.set(event.hook, episode);
    }
  }
  const interventions = episodes.filter((episode) => episode.kind !== 'agent-wait');
  const waits = episodes.filter((episode) => episode.kind === 'agent-wait');
  return { interventions, waits, analysisRequired: interventions.length > 0 || waits.some((episode) => episode.occurrences > 1) };
}
