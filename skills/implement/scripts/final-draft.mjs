// Prose is read as data, never interpolated into shell or executable code.
import path from 'node:path';
import { readFile, realpath } from 'node:fs/promises';
import { atomicWrite } from '../../../scripts/lib/artifacts.mjs';
import { resolveArtifactOutput } from '../../../scripts/artifact-output.mjs';
import { parseState } from './render-status.mjs';
import { assertRunState } from './artifact-layout.mjs';

export function formatCommitMessage(message, width) {
  if (width === undefined) return message;
  if (!Number.isSafeInteger(width) || width < 20 || width > 1000) throw new Error('Body width must be an integer from 20 to 1000.');
  const lines = message.split(/\r?\n/);
  let fence = null;
  // Git trailers and their continuation lines are opaque data.
  let trailerStart = lines.length;
  let end = lines.length - 1;
  while (end > 0 && !lines[end].trim()) end--;
  let start = end;
  while (start > 0 && lines[start - 1].trim()) start--;
  if (start > 0 && /^[A-Za-z0-9-]+:\s/.test(lines[start]) && lines.slice(start, end + 1).every(line => /^[A-Za-z0-9-]+:\s|^\s+/.test(line))) trailerStart = start;
  return lines.flatMap((line, index) => {
    if (index === 0 || index >= trailerStart) return [line];
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null;
      return [line];
    }
    if (fence || /^(?: {4}|\t)/.test(line) || line.length <= width) return [line];
    const prefix = line.match(/^(\s*(?:[-*+] |\d+[.)] ))/)?.[1] ?? line.match(/^\s*/)[0];
    const continuation = ' '.repeat(prefix.length);
    const words = line.slice(prefix.length).split(/\s+/);
    const result = [];
    let current = prefix;
    for (const word of words) {
      const separator = current.length > prefix.length ? ' ' : '';
      if (current.length > prefix.length && current.length + 1 + word.length > width) {
        result.push(current); current = continuation + word;
      } else current += separator + word;
    }
    result.push(current);
    return result;
  }).join('\n');
}

export async function prepareFinalDraft(root, statePath, inputs, width) {
  root = await realpath(root);
  statePath = await realpath(statePath);
  const state = parseState(await readFile(statePath, 'utf8'), statePath);
  const f = state.fields;
  const directory = assertRunState(root, statePath, f.ticket);
  if (f.final_package_version !== '1' || f.phase !== 'final-approval' || f.status !== 'In Progress') throw new Error('Draft preparation requires an active final-approval package run.');
  const draft = {};
  const inputPaths = [];
  for (const [key, file] of Object.entries(inputs)) {
    if (!['commit_message', 'pr_title', 'pr_description'].includes(key) || typeof file !== 'string') throw new Error('Invalid draft input.');
    const actual = await realpath(file);
    if (!actual.startsWith(directory + path.sep)) throw new Error('Draft inputs must be files inside this run directory.');
    draft[key] = await readFile(actual, 'utf8');
    inputPaths.push(actual);
    if (!draft[key].trim() || draft[key].includes('\0')) throw new Error(`${key} must contain nonempty text without NUL.`);
  }
  if (Object.keys(draft).length !== 3 || /[\r\n]/.test(draft.pr_title.trim())) throw new Error('Supply all three prose files and a single-line PR title.');
  draft.pr_title = draft.pr_title.trim();
  draft.commit_message = formatCommitMessage(draft.commit_message, width);
  const output = await resolveArtifactOutput({ root, directory: path.relative(root, directory), name: `${f.ticket}-final-draft.json` });
  if (inputPaths.includes(output.file)) throw new Error('Draft output cannot replace an input.');
  await atomicWrite(output.file, JSON.stringify(draft, null, 2) + '\n');
  return { ...output, body_width: width ?? null, overlong_commit_lines: width === undefined ? [] : draft.commit_message.split(/\r?\n/).flatMap((line, index) => line.length > width ? [index + 1] : []), draft };
}
