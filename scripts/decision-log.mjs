#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { chmod, lstat, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILLS = new Set([
  'close-the-gaps', 'define-test-strategy', 'execute', 'find-the-repos',
  'go-deep', 'implement', 'plan-the-work', 'review-the-pr', 'run-regression',
  'shape-the-epic', 'slice-the-epic',
]);
const KINDS = new Set(['askUserQuestion', 'checkpoint', 'open_text']);
const CORE = ['phase', 'site', 'kind', 'chosen', 'rationale'];
const OPTIONAL = ['question', 'options', 'multiSelect', 'repo'];
const MAX_INPUT_BYTES = 256 * 1024;

function fail(message) { throw new Error(message); }
function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function nonempty(value) { return typeof value === 'string' && value.trim().length > 0; }

export function normalizeEntry(value, skill) {
  if (!SKILLS.has(skill)) fail(`Unknown skill: ${skill}`);
  if (!object(value)) fail('Decision entry must be a JSON object.');
  const unknown = Object.keys(value).filter((key) => !CORE.includes(key) && !OPTIONAL.includes(key));
  if (unknown.length) fail(`Unknown decision field(s): ${unknown.join(', ')}`);
  for (const key of ['phase', 'site', 'rationale']) {
    if (!nonempty(value[key])) fail(`${key} must be a nonempty string.`);
  }
  if (!/^[a-z][a-z0-9-]*$/.test(value.site)) fail('site must be a lowercase slug.');
  if (!KINDS.has(value.kind)) fail('kind must be askUserQuestion, checkpoint, or open_text.');
  if (!Object.hasOwn(value, 'chosen')) fail('chosen is required (use null for a stopped site).');
  if (value.repo !== undefined && (!nonempty(value.repo) || skill !== 'define-test-strategy')) {
    fail('repo is allowed only for define-test-strategy and must be nonempty.');
  }

  if (value.kind === 'askUserQuestion') {
    if (!nonempty(value.question)) fail('askUserQuestion requires a nonempty question.');
    if (!Array.isArray(value.options) || value.options.length === 0) {
      fail('askUserQuestion requires a nonempty options array.');
    }
    for (const option of value.options) {
      if (typeof option === 'string') {
        if (!nonempty(option)) fail('Option labels must be nonempty.');
      } else if (!object(option) || !nonempty(option.label) ||
                 (option.description !== undefined && typeof option.description !== 'string')) {
        fail('Each option must be a label string or an object with label and optional description.');
      }
    }
    if (value.multiSelect !== undefined && typeof value.multiSelect !== 'boolean') {
      fail('multiSelect must be a boolean when supplied.');
    }
    if (Array.isArray(value.chosen)) {
      if (value.multiSelect !== true || value.chosen.some((item) => !nonempty(item))) {
        fail('An array chosen value requires multiSelect: true and nonempty labels.');
      }
    } else if (value.chosen !== null && !nonempty(value.chosen)) {
      fail('chosen must be a label, label array, or null.');
    }
  } else {
    if (['question', 'options', 'multiSelect'].some((key) => Object.hasOwn(value, key))) {
      fail(`${value.kind} cannot include question, options, or multiSelect.`);
    }
    if (value.chosen !== null && !nonempty(value.chosen)) {
      fail('chosen must be a nonempty string or null for this kind.');
    }
  }

  // Stable field order keeps traces and diffs easy to inspect while retaining
  // the exact question/options payload supplied by the skill.
  return Object.fromEntries([...CORE, ...OPTIONAL]
    .filter((key) => Object.hasOwn(value, key)).map((key) => [key, value[key]]));
}

export function normalizeEntries(input, skill, command) {
  if (command === 'append' && Array.isArray(input)) fail('append accepts exactly one decision object.');
  const entries = Array.isArray(input) ? input : [input];
  return entries.map((entry) => normalizeEntry(entry, skill));
}

export function serializeEntries(entries) {
  return entries.map((entry) => JSON.stringify(entry)).join('\n') + (entries.length ? '\n' : '');
}

function parseExisting(contents, skill) {
  if (!contents) return [];
  if (!contents.endsWith('\n')) fail('Existing log is not newline-terminated.');
  return contents.slice(0, -1).split('\n').map((line, index) => {
    try { return normalizeEntry(JSON.parse(line), skill); }
    catch (error) { fail(`Existing log line ${index + 1}: ${error.message}`); }
  });
}

async function checkedPath(root, skill, { createDirectory = true } = {}) {
  if (!SKILLS.has(skill)) fail(`Unknown skill: ${skill}`);
  const directory = path.resolve(root, '.claude');
  let stat;
  try { stat = await lstat(directory); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    if (!createDirectory) fail('Log does not exist; initialize this run first.');
    await mkdir(directory, { mode: 0o700 });
    stat = await lstat(directory);
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail('.claude must be a real directory, not a symlink.');
  const target = path.join(directory, `${skill}-autopilot-log.jsonl`);
  let targetStat;
  try { targetStat = await lstat(target); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (targetStat && (!targetStat.isFile() || targetStat.isSymbolicLink())) {
    fail('Decision log target must be a regular file, not a symlink.');
  }
  return { directory, target, targetStat };
}

async function atomicWrite(directory, target, content, mode) {
  const temporary = path.join(directory, `.decision-log-${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, content, { flag: 'wx', mode });
    await chmod(temporary, mode);
    await rename(temporary, target);
  } finally {
    try { await unlink(temporary); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}

export async function updateLog({ root = process.cwd(), skill, command, input }) {
  if (!['init', 'append', 'write'].includes(command)) fail(`Unknown command: ${command}`);
  const incoming = command === 'init' ? [] : normalizeEntries(input, skill, command);
  const { directory, target, targetStat } = await checkedPath(root, skill,
    { createDirectory: command !== 'append' });
  const mode = targetStat ? targetStat.mode & 0o777 : 0o600;
  if (command === 'init') {
    await atomicWrite(directory, target, '', mode);
    return target;
  }
  if (command === 'append' && !targetStat) fail('Log does not exist; initialize this run first.');
  const existing = command === 'append' ? parseExisting(await readFile(target, 'utf8'), skill) : [];
  await atomicWrite(directory, target, serializeEntries([...existing, ...incoming]), mode);
  return target;
}

async function readStdin() {
  let text = '';
  for await (const chunk of process.stdin) {
    text += chunk;
    if (Buffer.byteLength(text) > MAX_INPUT_BYTES) fail('Decision input exceeds 256 KiB.');
  }
  if (!text.trim()) fail('Expected a JSON decision object or array on stdin.');
  try { return JSON.parse(text); }
  catch (error) { fail(`Invalid decision JSON: ${error.message}`); }
}

async function main(args) {
  const [command, skill, ...rest] = args;
  if (!command || !skill || (rest.length && (rest.length !== 2 || rest[0] !== '--root'))) {
    fail('Usage: decision-log.mjs <init|append|write> <skill> [--root <repo-root>] (append/write read JSON from stdin).');
  }
  const root = rest.length ? rest[1] : process.cwd();
  const input = command === 'init' ? undefined : await readStdin();
  await updateLog({ root, skill, command, input });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`decision-log: ${error.message}\n`);
    process.exitCode = 1;
  });
}
