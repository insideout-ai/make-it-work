#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { lstat, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateDashboard, parseState } from './render-status.mjs';
import { decisionCell, decisionText, lastWorkRow, validateDecision } from './workflow-decisions.mjs';

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

function replaceActivity(markdown, activity) {
  if (typeof activity !== 'string' || !activity.trim() || /[\r\n]/.test(activity)) {
    fail('Activity must be one non-empty line.');
  }
  let replacements = 0;
  const next = markdown.replace(/^(current_activity:)\s*.*$/m, (_match, prefix) => {
    replacements += 1;
    return `${prefix} ${activity.trim()}`;
  });
  if (replacements !== 1) fail('State file must contain exactly one current_activity field.');
  const timestamp = activity.trim() === 'none' ? 'none' : new Date().toISOString();
  if (/^current_activity_updated_at:/m.test(next)) {
    return next.replace(/^current_activity_updated_at:[^\r\n]*/m, `current_activity_updated_at: ${timestamp}`);
  }
  return next.replace(/^(current_activity:[^\r\n]*)/m, `$1\ncurrent_activity_updated_at: ${timestamp}`);
}

/** Updates activity and the derived dashboard as one recoverable checkpoint. */
export async function checkpointDashboard(statePath, { activity } = {}) {
  const absoluteStatePath = path.resolve(statePath);
  const original = await readFile(absoluteStatePath, 'utf8');
  parseState(original, absoluteStatePath);
  if (activity === undefined) return generateDashboard(absoluteStatePath);

  const updated = replaceActivity(original, activity);
  parseState(updated, absoluteStatePath);
  await replaceAtomically(absoluteStatePath, updated);
  try {
    return await generateDashboard(absoluteStatePath);
  } catch (error) {
    await replaceAtomically(absoluteStatePath, original);
    throw error;
  }
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

/** Save a decision once; rendering failure must not erase its audit evidence. */
export async function checkpointDecision(statePath, input) {
  const d = validateDecision(input);
  const absoluteStatePath = path.resolve(statePath);
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

const USAGE = 'Usage: dashboard-checkpoint.mjs render|resume --state <state.md> | activity --state <state.md> --activity <one line> | decision --state <state.md> --input <decision.json>';

function parseArgs(argv) {
  if (argv.length === 1 && argv[0] === '--help') return { help: true };
  if (argv[0] === 'render' && argv.length === 3 && argv[1] === '--state' && argv[2]) return { statePath: argv[2] };
  if (argv[0] === 'activity' && argv.length === 5 && argv[1] === '--state' && argv[2] && argv[3] === '--activity' && argv[4]) {
    return { statePath: argv[2], activity: argv[4] };
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
    process.stdout.write(`${JSON.stringify({ last_work_row: lastWorkRow(state.audit) })}\n`);
    return;
  }
  if (args.input) {
    const result = await checkpointDecision(args.statePath, JSON.parse(await readFile(args.input, 'utf8')));
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }
  const output = await checkpointDashboard(args.statePath, args.activity === undefined ? {} : { activity: args.activity });
  process.stdout.write(`${output}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`dashboard-checkpoint: ${error.message}\n`);
    process.exitCode = 1;
  });
}
