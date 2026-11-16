#!/usr/bin/env node
import { recordActivityTiming } from './activity-timing.mjs';
import { validateCategory } from '../../../scripts/lib/activity-timing.mjs';
import { artifactJoin, artifactResolve } from '../../../scripts/lib/artifact-path.mjs';

import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from '../../../scripts/lib/artifact-io.mjs';
import { lstat, readdir, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateDashboard, parseState } from './render-status.mjs';
import { decisionCell, decisionText, lastWorkRow, validateDecision } from './workflow-decisions.mjs';
import { appendAuditCell, noteCell, parseNoteCell } from './audit-notes.mjs';

function fail(message) { throw new Error(message); }

async function replaceAtomically(target, contents) {
  const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, contents, { encoding: 'utf8', flag: 'wx' });
    await rename(temporary, target);
  } catch (error) {
    await unlink(temporary).catch(() => {});
    throw error;
  }
}

function replaceActivity(markdown, activity, time) {
  if (typeof activity !== 'string' || !activity.trim() || /[\r\n]/.test(activity)) {
    fail('Activity must be one non-empty line.');
  }
  let replacements = 0;
  const next = markdown.replace(/^(current_activity:)\s*.*$/m, (_match, prefix) => {
    replacements += 1;
    return `${prefix} ${activity.trim()}`;
  });
  if (replacements !== 1) fail('State file must contain exactly one current_activity field.');
  const timestamp = activity.trim() === 'none' ? 'none' : time;
  if (/^current_activity_updated_at:/m.test(next)) {
    return next.replace(/^current_activity_updated_at:[^\r\n]*/m, `current_activity_updated_at: ${timestamp}`);
  }
  return next.replace(/^(current_activity:[^\r\n]*)/m, `$1\ncurrent_activity_updated_at: ${timestamp}`);
}

/** Persist activity history before rendering; a retry repairs the snapshot. */
export async function checkpointDashboard(statePath, { activity, category = 'unclassified' } = {}) {
  const absoluteStatePath = artifactResolve(statePath);
  const info = await lstat(absoluteStatePath);
  if (!info.isFile() || info.isSymbolicLink()) fail('Workflow state must be a regular file.');
  const original = await readFile(absoluteStatePath, 'utf8');
  const state = parseState(original, absoluteStatePath);
  if (activity === undefined) return generateDashboard(absoluteStatePath);

  validateCategory(category);
  const time = new Date().toISOString();
  let updated = replaceActivity(original, activity, time);
  await recordActivityTiming(absoluteStatePath, state, category, time);
  if (activity.trim() !== 'none') {
    const last = state.audit.findLast((row) => row.note?.kind === 'activity');
    if (state.fields.current_activity === activity.trim() && last?.to === state.fields.phase &&
        last.time === state.fields.current_activity_updated_at && last.outcome === `Activity: ${activity.trim()}`) {
      return generateDashboard(absoluteStatePath);
    }
    updated = appendAuditCell(updated, state, noteCell({ kind: 'activity', id: randomUUID(), text: activity.trim() }), time);
  }
  parseState(updated, absoluteStatePath);
  await replaceAtomically(absoluteStatePath, updated);
  return generateDashboard(absoluteStatePath);
}

async function refreshExistingDashboard(statePath) {
  const output = statePath.replace(/-state\.md$/, '-status.html');
  try {
    const info = await lstat(output);
    if (!info.isFile() || info.isSymbolicLink()) fail('Existing dashboard must be a regular file.');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
  return generateDashboard(statePath);
}

/** Called by evidence-producing scripts after their operation succeeds. */
export async function checkpointResult(statePath, note) {
  return checkpointAuditNote(statePath, { ...note, kind: 'result' });
}

/** Stable informational notes, including post-completion feedback lifecycle events. */
export async function checkpointAuditNote(statePath, { kind, id, text, reference }, { refresh = true } = {}) {
  const cell = noteCell({ kind, id, text, reference });
  const absoluteStatePath = artifactResolve(statePath);
  const info = await lstat(absoluteStatePath);
  if (!info.isFile() || info.isSymbolicLink()) fail('Workflow state must be a regular file.');
  const original = await readFile(absoluteStatePath, 'utf8');
  const state = parseState(original, absoluteStatePath);
  const existing = state.audit.find((row) => row.note?.kind === kind && row.note.id === id);
  if (existing) {
    if (existing.outcome !== parseNoteCell(cell).outcome) fail(`Audit note ${kind} id ${id} already records a different result.`);
    return { row: existing.number, dashboard: refresh ? await refreshExistingDashboard(absoluteStatePath) : null };
  }
  const updated = appendAuditCell(original, state, cell, new Date().toISOString());
  parseState(updated, absoluteStatePath);
  await replaceAtomically(absoluteStatePath, updated);
  return { row: state.audit.length + 1, dashboard: refresh ? await refreshExistingDashboard(absoluteStatePath) : null };
}

/** Save a decision once; rendering failure must not erase its audit evidence. */
export async function checkpointDecision(statePath, input) {
  const d = validateDecision(input);
  const absoluteStatePath = artifactResolve(statePath);
  const info = await lstat(absoluteStatePath);
  if (!info.isFile() || info.isSymbolicLink()) fail('Workflow state must be a regular file.');
  const original = await readFile(absoluteStatePath, 'utf8');
  const state = parseState(original, absoluteStatePath);
  const existing = state.audit.find((row) => row.decision?.id === d.id);
  if (existing) {
    if (existing.outcome !== decisionText(d) || existing.decision.resume !== d.resume) {
      fail(`Decision id ${d.id} already records a different decision.`);
    }
    return { row: existing.number, dashboard: await refreshExistingDashboard(absoluteStatePath) };
  }
  const lines = original.split('\n');
  const start = lines.findIndex((line) => line.trim() === '## Audit log');
  let end = lines.findIndex((line, index) => index > start && line.startsWith('## '));
  if (end === -1) end = lines.length;
  while (end > start && !lines[end - 1].trim()) end -= 1;
  const number = state.audit.length + 1;
  const phase = state.fields.phase;
  const cell = decisionCell(d);
  const time = new Date().toISOString();
  lines.splice(end, 0, `| ${number} | ${time} | ${phase} | ${phase} | ${cell} |`);
  const updated = lines.join('\n');
  parseState(updated, absoluteStatePath);
  await replaceAtomically(absoluteStatePath, updated);
  return { row: number, dashboard: await refreshExistingDashboard(absoluteStatePath) };
}

/**
 * On resume, find a review that was dispatched (its frozen target exists for the
 * current cycle) but never handed back. That agent is gone: a new session cannot
 * receive its completion. Returns null when nothing was lost.
 */
export async function lostReview(statePath, state) {
  const f = state.fields;
  if (f.phase !== 'review' || f.status !== 'In Progress' || f.review_scope_version !== '1') return null;
  const dir = path.dirname(artifactResolve(statePath));
  const target = `${f.ticket}-review-target-${f.review_cycle}.json`;
  let dispatchedAt;
  try { dispatchedAt = (await lstat(artifactJoin(dir, target))).mtime.toISOString(); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  let names = [];
  try { names = (await readdir(artifactJoin(dir, `${f.ticket}-handoffs`))).filter((name) => /^(?:miw-)?review-[1-9]\d*\.json$/.test(name)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  for (const name of names) {
    const handoff = JSON.parse(await readFile(artifactJoin(dir, `${f.ticket}-handoffs`, name), 'utf8'));
    if (String(handoff.review_cycle) === f.review_cycle && String(handoff.plan_version) === f.plan_version) return null;
  }
  return { stage: 'review', cycle: Number(f.review_cycle), plan_version: Number(f.plan_version), target, dispatched_at: dispatchedAt };
}

/** Record a lost review once, so the audit log and dashboard stop implying it is still running. */
export async function recordLostReview(statePath, lost) {
  return checkpointAuditNote(statePath, {
    kind: 'interruption', id: `lost-review:v${lost.plan_version}:c${lost.cycle}:${lost.dispatched_at.replace(/[^0-9]/g, '')}`,
    text: `The review agent for cycle ${lost.cycle}, dispatched ${lost.dispatched_at}, ended without a report or handoff; review must run again`,
    reference: lost.target,
  });
}

const USAGE = 'Usage: dashboard-checkpoint.mjs render|resume --state <state.md> | activity --state <state.md> --activity <one line> [--category <category>] | decision --state <state.md> --input <decision.json>';

function parseArgs(argv) {
  if (argv.length === 1 && argv[0] === '--help') return { help: true };
  if (argv[0] === 'render' && argv.length === 3 && argv[1] === '--state' && argv[2]) return { statePath: argv[2] };
  if (argv[0] === 'activity' && [5, 7].includes(argv.length) && argv[1] === '--state' && argv[2] && argv[3] === '--activity' && argv[4]) {
    if (argv.length === 7 && argv[5] !== '--category') fail(USAGE);
    return { statePath: argv[2], activity: argv[4], category: argv[6] };
  }
  if (argv[0] === 'decision' && argv.length === 5 && argv[1] === '--state' && argv[2] && argv[3] === '--input' && argv[4]) {
    return { statePath: argv[2], input: argv[4] };
  }
  if (argv[0] === 'resume' && argv.length === 3 && argv[1] === '--state' && argv[2]) return { statePath: argv[2], resume: true };
  fail(USAGE);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(`${USAGE}\n`);
    return;
  }
  if (args.resume) {
    const state = parseState(await readFile(args.statePath, 'utf8'), args.statePath);
    const lost = await lostReview(args.statePath, state);
    if (lost) await recordLostReview(args.statePath, lost);
    process.stdout.write(`${JSON.stringify({ last_work_row: lastWorkRow(state.audit), ...(lost ? { lost_delegate: lost } : {}) })}\n`);
    return;
  }
  if (args.input) {
    const result = await checkpointDecision(args.statePath, JSON.parse(await readFile(args.input, 'utf8')));
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }
  const output = await checkpointDashboard(args.statePath, args.activity === undefined ? {} : { activity: args.activity, category: args.category });
  process.stdout.write(`${output}\n`);
}

if (process.argv[1] && artifactResolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`dashboard-checkpoint: ${error.message}\n`);
    process.exitCode = 1;
  });
}
