import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { atomicWrite } from '../../../scripts/lib/artifacts.mjs';
import { artifactJoin } from '../../../scripts/lib/artifact-path.mjs';
import { summarizeIntervals, timingText, validateCategory } from '../../../scripts/lib/activity-timing.mjs';
import { appendAuditCell, noteCell } from './audit-notes.mjs';
const journalPath = statePath => artifactJoin(path.dirname(statePath), 'activity-timing.json');
export async function recordActivityTiming(statePath, state, category, at = new Date().toISOString()) {
  if (state.fields.activity_timing_version !== '1' || !['execute', 'lightweight'].includes(state.fields.phase)) return;
  validateCategory(category);
  const entry = [...state.audit].reverse().find(row => row.to === state.fields.phase && row.from !== row.to);
  if (!entry) return;
  let journal; try { journal = JSON.parse(await readFile(journalPath(statePath), 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const pass = `${state.fields.phase}:${entry.number}`;
  if (journal?.pass !== pass) journal = { version: 1, pass, phase: state.fields.phase, events: [{ at: entry.time, category: 'unclassified', reference: `audit:${entry.number}` }] };
  const last = journal.events.at(-1);
  if (last.category === category) { await atomicWrite(journalPath(statePath), JSON.stringify(journal)); return; }
  journal.events.push({ at, category, reference: `activity:${at}` });
  await atomicWrite(journalPath(statePath), JSON.stringify(journal));
}
export async function closeActivityTiming(statePath, state, markdown, nextPhase, nextStatus, at, { resumed = false } = {}) {
  if (state.fields.activity_timing_version !== '1' || !['execute', 'lightweight'].includes(state.fields.phase)) return markdown;
  let journal; try { journal = JSON.parse(await readFile(journalPath(statePath), 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!journal) {
    await recordActivityTiming(statePath, state, 'unclassified', at);
    try { journal = JSON.parse(await readFile(journalPath(statePath), 'utf8')); } catch { return markdown; }
  }
  if (nextPhase === state.fields.phase) {
    if (resumed && state.fields.status !== 'Paused') {
      journal.events.at(-1).category = 'unclassified';
      journal.events.at(-1).reference = 'Unsupported interval before resume';
      await atomicWrite(journalPath(statePath), JSON.stringify(journal));
      await recordActivityTiming(statePath, state, 'unclassified', at);
    } else if (nextStatus === 'Stopped') await recordActivityTiming(statePath, state, 'unclassified', at);
    else if (nextStatus === 'Paused') await recordActivityTiming(statePath, state, 'waiting for input', at);
    else if (state.fields.status !== 'In Progress') await recordActivityTiming(statePath, state, 'unclassified', at);
    return markdown;
  }
  // Only successful post-coding handoffs get summaries; stopped/replanned work is not called complete.
  if (nextPhase !== 'review') return markdown;
  const entry = [...state.audit].reverse().find(row => row.to === state.fields.phase && row.from !== row.to);
  if (journal.pass !== `${state.fields.phase}:${entry?.number}`) return markdown;
  const summary = { version: 1, pass: journal.pass, phase: state.fields.phase, ...summarizeIntervals(journal.events, at) };
  const filename = artifactJoin(path.dirname(statePath), `time-breakdown-${state.fields.phase}-${entry.number}.json`);
  await atomicWrite(filename, JSON.stringify(summary, null, 2));
  return appendAuditCell(markdown, state, noteCell({ kind: 'result', id: `time-breakdown:${state.fields.phase}:${entry.number}`, text: timingText(state.fields.phase, summary), reference: path.basename(filename) }), at);
}
