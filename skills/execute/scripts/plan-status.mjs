#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { lstat, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkpointDashboard } from '../../implement/scripts/dashboard-checkpoint.mjs';

const MODE_TEXT = {
  'subagent-driven': '**Mode:** Subagent-Driven — dispatch a fresh subagent per step (via the Agent tool), reviewed between steps.',
  inline: "**Mode:** Inline — execute steps in this session, checkpointed after each step's Verify.",
};
const PAUSE_TEXT = {
  'straight-through': '**Inline pause mode:** Run straight through — no pause between steps for review.',
  'after-each-step': "**Inline pause mode:** Stop after each step — relay each step's outcome and wait before continuing.",
};

function fail(message) { throw new Error(message); }
function integer(value, label, min = 0) {
  if (!/^\d+$/.test(value ?? '') || !Number.isSafeInteger(Number(value)) || Number(value) < min) {
    fail(label + ' must be an integer >= ' + min + '.');
  }
  return Number(value);
}

function findStatus(markdown) {
  const heading = /^## Execution Status[ \t]*\r?$/gm;
  const first = heading.exec(markdown);
  if (!first || heading.exec(markdown)) fail('Plan must contain exactly one ## Execution Status section.');
  const bodyStart = first.index + first[0].length;
  const nextHeading = /^## /gm;
  nextHeading.lastIndex = bodyStart;
  const next = nextHeading.exec(markdown);
  const bodyEnd = next?.index ?? markdown.length;
  return { before: markdown.slice(0, bodyStart), body: markdown.slice(bodyStart, bodyEnd), after: markdown.slice(bodyEnd) };
}

function parseBody(body) {
  const newline = body.includes('\r\n') ? '\r\n' : '\n';
  const lines = body.split(/\r?\n/);
  const modeIndices = lines.flatMap((line, index) => line.startsWith('**Mode:**') ? [index] : []);
  const pauseIndices = lines.flatMap((line, index) => line.startsWith('**Inline pause mode:**') ? [index] : []);
  const progressIndices = lines.flatMap((line, index) => line.startsWith('**Progress:**') ? [index] : []);
  if (modeIndices.length !== 1 || progressIndices.length !== 1 || pauseIndices.length > 1) {
    fail('Execution Status needs one Mode and one Progress line, and at most one Inline pause mode line.');
  }
  const modeIndex = modeIndices[0];
  const pauseIndex = pauseIndices[0];
  const progressIndex = progressIndices[0];
  const modeLine = lines[modeIndex];
  const mode = modeLine.startsWith('**Mode:** Not yet chosen') ? 'pending'
    : modeLine.startsWith('**Mode:** Subagent-Driven') ? 'subagent-driven'
      : modeLine.startsWith('**Mode:** Inline') ? 'inline' : null;
  if (!mode) fail('Unknown execution Mode.');
  let pauseMode = null;
  if (pauseIndex !== undefined) {
    if (mode !== 'inline' || pauseIndex !== modeIndex + 1) fail('Inline pause mode must immediately follow Inline Mode.');
    const pauseLine = lines[pauseIndex];
    pauseMode = pauseLine.startsWith('**Inline pause mode:** Run straight through') ? 'straight-through'
      : pauseLine.startsWith('**Inline pause mode:** Stop after each step') ? 'after-each-step' : null;
    if (!pauseMode) fail('Unknown Inline pause mode.');
  }
  const progress = lines[progressIndex].match(/^\*\*Progress:\*\* Step (\d+) of (\d+|N) complete\b/);
  if (!progress) fail('Progress must read "Step N of M complete".');
  const completed = integer(progress[1], 'Completed step count');
  const total = progress[2] === 'N' ? null : integer(progress[2], 'Total step count', 1);
  if ((total === null && completed !== 0) || (total !== null && completed > total)) {
    fail('Progress is outside its total.');
  }
  return { lines, newline, modeIndex, pauseIndex, progressIndex, mode, pauseMode, completed, total };
}

export function inspectPlan(markdown) {
  const { body } = findStatus(markdown);
  const { mode, pauseMode, completed, total } = parseBody(body);
  return { mode, pauseMode, completed, total };
}

export function changePlan(markdown, command, options = {}) {
  const { before, body, after } = findStatus(markdown);
  const status = parseBody(body);
  const { lines, newline, modeIndex, progressIndex, mode, pauseMode, completed, total } = status;
  if (command === 'set-mode') {
    const chosen = options.mode;
    if (!Object.hasOwn(MODE_TEXT, chosen)) fail('Mode must be subagent-driven or inline.');
    if (mode !== 'pending' && mode !== chosen) fail('Execution Mode is already chosen; refusing to change it.');
    if (mode === 'pending') {
      if (!lines[modeIndex + 1]?.startsWith('- **Subagent-Driven**') ||
          !lines[modeIndex + 2]?.startsWith('- **Inline**')) {
        fail('Pending Mode options do not match the plan template.');
      }
      lines.splice(modeIndex, 3, MODE_TEXT[chosen]);
    }
  } else if (command === 'set-pause') {
    const chosen = options.pause;
    if (!Object.hasOwn(PAUSE_TEXT, chosen)) fail('Pause mode must be straight-through or after-each-step.');
    if (mode !== 'inline') fail('Inline pause mode can only be set for Inline execution.');
    if (pauseMode && pauseMode !== chosen) fail('Inline pause mode is already chosen; refusing to change it.');
    if (!pauseMode) lines.splice(modeIndex + 1, 0, PAUSE_TEXT[chosen]);
  } else if (command === 'set-total') {
    const chosen = integer(options.total, 'Total step count', 1);
    if (total !== null && chosen < total) fail('Step total cannot decrease.');
    if (chosen < completed) fail('Step total cannot be less than completed steps.');
    lines[progressIndex] = '**Progress:** Step ' + completed + ' of ' + chosen + ' complete.';
  } else if (command === 'complete-step') {
    const step = integer(options.step, 'Step number', 1);
    if (total === null) fail('Set a numeric step total before execution.');
    if (step !== completed + 1 || step > total) fail('Only the next step (' + (completed + 1) + ') can be completed.');
    lines[progressIndex] = '**Progress:** Step ' + step + ' of ' + total + ' complete.';
  } else if (command === 'complete-batch') {
    const through = integer(options.through, 'Batch end step', 1);
    if (total === null) fail('Set a numeric step total before execution.');
    if (through <= completed + 1 || through > total) fail('Batch end must advance by at least two steps without exceeding total.');
    lines[progressIndex] = '**Progress:** Step ' + through + ' of ' + total + ' complete.';
  } else if (command === 'correct-progress') {
    const target = integer(options.completed, 'Corrected completed count');
    if (total === null || target >= completed) fail('Correction must lower the current numeric Progress value.');
    lines[progressIndex] = '**Progress:** Step ' + target + ' of ' + total + ' complete.';
  } else {
    fail('Unknown command: ' + command);
  }
  return before + lines.join(newline) + after;
}

export async function updatePlan(planPath, command, options = {}) {
  const info = await lstat(planPath);
  if (!info.isFile()) fail('Plan path must be a regular file, not a symlink or directory.');
  const original = await readFile(planPath, 'utf8');
  if (command === 'inspect') return inspectPlan(original);
  const updated = changePlan(original, command, options);
  if (updated === original) return inspectPlan(original);
  const temporary = path.join(path.dirname(planPath), '.plan-status.' + randomUUID() + '.tmp');
  try {
    await writeFile(temporary, updated, { flag: 'wx', mode: info.mode & 0o777 });
    await rename(temporary, planPath);
  } finally {
    await unlink(temporary).catch((error) => { if (error.code !== 'ENOENT') throw error; });
  }
  if (options.dashboardState && ['complete-step', 'complete-batch'].includes(command)) {
    await checkpointDashboard(options.dashboardState);
  }
  return inspectPlan(updated);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const commands = new Set(['inspect', 'set-mode', 'set-pause', 'set-total', 'complete-step', 'complete-batch', 'correct-progress']);
  if (!commands.has(command)) fail('Usage: plan-status.mjs <inspect|set-mode|set-pause|set-total|complete-step|complete-batch|correct-progress> --plan <path> [command options]');
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const name = args[index];
    if (!['--plan', '--mode', '--pause', '--total', '--step', '--through', '--completed', '--dashboard-state'].includes(name)) fail('Unknown argument: ' + name);
    if (options[name.slice(2)] !== undefined) fail('Duplicate argument: ' + name);
    options[name.slice(2)] = args[++index];
  }
  if (!options.plan) fail('--plan is required.');
  const result = await updatePlan(options.plan, command, options);
  process.stdout.write(JSON.stringify(result) + '\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { process.stderr.write('Plan status: ' + error.message + '\n'); process.exitCode = 1; });
}
