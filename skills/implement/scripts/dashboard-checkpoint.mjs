#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateDashboard, parseState } from './render-status.mjs';

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
  return next;
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

function parseArgs(argv) {
  if (argv.length === 1 && argv[0] === '--help') return { help: true };
  if (argv[0] === 'render' && argv.length === 3 && argv[1] === '--state' && argv[2]) return { statePath: argv[2] };
  if (argv[0] === 'activity' && argv.length === 5 && argv[1] === '--state' && argv[2] && argv[3] === '--activity' && argv[4]) {
    return { statePath: argv[2], activity: argv[4] };
  }
  fail('Usage: dashboard-checkpoint.mjs render --state <state.md> | activity --state <state.md> --activity <one line>');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write('Usage: dashboard-checkpoint.mjs render --state <state.md> | activity --state <state.md> --activity <one line>\n');
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
