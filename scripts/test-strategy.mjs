#!/usr/bin/env node
import { readFile, stat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { args, atomicWrite, cli, fail, jsonInput, section, table, within } from './lib/artifacts.mjs';
import { validateMap } from './test-map.mjs';

const plain = (value) => value.replaceAll('`', '').trim();
function rows(markdown, heading) {
  const body = section(markdown, heading);
  if (body === null) fail(`Missing strategy section: ${heading}`);
  if (/^None\b/i.test(body)) return [];
  const header = body.split('\n').find((line) => line.trim().startsWith('|'));
  if (!header) fail(`Missing ${heading} table.`);
  return table(body, header.split('|').slice(1, -1).map((cell) => cell.trim()));
}
export function validateStrategy(markdown, decisions = { selected_layers: [] }) {
  const errors = [];
  try {
    const repo = section(markdown, 'Repo ID')?.match(/`([^`]+)`/)?.[1];
    if (!repo) fail('Strategy has no Repo ID.');
    const layers = rows(markdown, 'Layers'), destinations = rows(markdown, 'Where New Tests Go'), locations = rows(markdown, 'Test Locations');
    if (!locations.length || plain(locations[0].Repo) !== repo || plain(locations[0]['Run from']) !== '.') errors.push('First Test Locations row must be the product repo.');
    const names = layers.map((row) => row.Layer.toLowerCase());
    if (new Set(names).size !== names.length) errors.push('Layer names must be unique.');
    const status = (row) => row.Status ?? 'configured';
    for (const layer of layers) {
      if (!['configured', 'planned', 'deferred'].includes(status(layer))) errors.push(`Invalid status for ${layer.Layer}.`);
      const matching = destinations.filter((row) => row.Layer.toLowerCase() === layer.Layer.toLowerCase());
      if (matching.length !== 1 || status(matching[0]) !== status(layer)) errors.push(`Destination/status mismatch for ${layer.Layer}.`);
      if (status(layer) !== 'configured' && plain(layer['Example command'] ?? '').toLowerCase() !== 'none') errors.push(`Unconfigured layer ${layer.Layer} has a runnable example command.`);
    }
    for (const destination of destinations) if (!names.includes(destination.Layer.toLowerCase())) errors.push(`Destination names unknown layer ${destination.Layer}.`);
    for (const location of locations) for (const name of plain(location.Layers ?? '').split(',').map((s) => s.trim()).filter((s) => s && s.toLowerCase() !== 'none')) {
      const layer = layers.find((row) => row.Layer.toLowerCase() === name.toLowerCase());
      if (!layer || status(layer) !== 'configured') errors.push(`Test Location activates unconfigured layer ${name}.`);
    }
    if (!Array.isArray(decisions.selected_layers)) fail('selected_layers must be an array.');
    for (const selected of decisions.selected_layers) {
      const found = layers.find((row) => row.Layer.toLowerCase() === selected.layer.toLowerCase());
      if (!found || status(found) !== selected.status) errors.push(`Selected layer ${selected.layer} is missing or has the wrong status.`);
    }
    if (section(markdown, 'Test Map') === null) errors.push('Strategy needs the current Test Map contract.');
    const guidance = section(markdown, 'Coverage Decision Guidance') ?? '';
    for (const layer of layers) if (!guidance.toLowerCase().includes(layer.Layer.toLowerCase())) errors.push(`No coverage guidance for ${layer.Layer}.`);
    return { valid: !errors.length, errors, repo, layers: layers.length };
  } catch (error) { return { valid: false, errors: [...errors, error.message] }; }
}
const POINTER = '| /test-strategy | Test locations (incl. other repos), commands, prerequisites, new-test targets, maintained test map | Planning, writing, running, or reviewing tests |';
export function strategyPointer(markdown) {
  const match = /^## Skills Reference\s*$/m.exec(markdown);
  if (!match) return { changed: false, skipped: 'No Skills Reference', markdown };
  const start = match.index + match[0].length;
  const after = markdown.slice(start).search(/^## /m);
  const end = after < 0 ? markdown.length : start + after;
  let body = markdown.slice(start, end);
  body = body.split('\n').filter((line) => !/^\|\s*\/?test-strategy\s*\|/.test(line)).join('\n');
  const other = /^### Other Skills\s*$/m.exec(body);
  if (!other) body = body.trimEnd() + `\n\n### Other Skills\n\n| Skill | Topic | Load when... |\n| --- | --- | --- |\n${POINTER}\n\n`;
  else {
    const offset = other.index + other[0].length;
    const remainder = body.slice(offset);
    const nextHeading = remainder.search(/^### /m);
    const tail = nextHeading < 0 ? remainder : remainder.slice(0, nextHeading);
    const tableHeader = /^\|\s*Skill\s*\|[^\n]*\n\|[^\n]*\n/m.exec(tail);
    if (!tableHeader) fail('Other Skills table is malformed; preserve it for repair.');
    const insert = offset + tableHeader.index + tableHeader[0].length;
    body = body.slice(0, insert) + POINTER + '\n' + body.slice(insert);
  }
  const output = markdown.slice(0, start) + body + markdown.slice(end);
  return { changed: output !== markdown, markdown: output };
}
// Supply the actual post-pointer inputs, not a freshness verdict or automatic baseline update.
export async function reassessmentEvidence(root, map, { maxFiles = 16, maxBytes = 24576 } = {}) {
  const refs = new Map();
  const add = (repo, file, optional = false) => {
    const key = JSON.stringify([repo, file]);
    const previous = refs.get(key);
    refs.set(key, { repo, file, optional: previous ? previous.optional && optional : optional });
  };
  for (const file of ['CLAUDE.md', '.claude/rules/product.md', '.claude/rules/architecture.md']) add(map.productRepo, file, file !== 'CLAUDE.md');
  for (const location of map.locations) for (const file of location.config) add(location.repo, file);
  for (const test of map.tests) add(map.locations.find((location) => location.id === test.location).repo, test.file);
  for (const mapping of map.mappings) for (const evidence of mapping.evidence ?? []) add(evidence.repo, evidence.file);
  const files = [];
  let bytes = 0;
  let deferred = 0;
  const remainingPaths = [];
  for (const ref of refs.values()) {
    if (files.length >= maxFiles) {
      deferred++;
      if (remainingPaths.length < 16) remainingPaths.push({ repo: ref.repo, file: ref.file });
      continue;
    }
    const { optional, ...identity } = ref;
    try {
      const repo = map.repos.find((entry) => entry.id === ref.repo);
      const file = await within(path.resolve(root, repo.root), ref.file);
      if ((await stat(file)).size > maxBytes - bytes) {
        files.push({ ...identity, status: 'deferred', reason: 'Evidence byte limit; read this file separately.' });
        continue;
      }
      const content = await readFile(file, 'utf8');
      if (Buffer.byteLength(content) > maxBytes - bytes) {
        files.push({ ...identity, status: 'deferred', reason: 'File changed during reading; read separately.' });
        continue;
      }
      bytes += Buffer.byteLength(content);
      files.push({ ...identity, status: 'read', content });
    } catch (error) {
      files.push({ ...identity, status: optional && error.code === 'ENOENT' ? 'absent' : 'unavailable', reason: error.message });
    }
  }
  return { files, remaining_files: deferred, remaining_paths: remainingPaths, complete: deferred === 0 && files.every((file) => ['read', 'absent'].includes(file.status)),
    note: 'These are actual file contents read after the pointer edit. Review asserted behavior against documentation; no semantic assessment or baseline update has been performed. Read deferred/unavailable inputs separately before claiming complete reassessment.' };
}

export async function updateStrategyPointer(root) {
  const strategy = await readFile(await within(root, '.claude/skills/test-strategy/SKILL.md'), 'utf8');
  const validation = validateStrategy(strategy);
  if (!validation.valid) fail(validation.errors.join('\n'));
  const map = validateMap(JSON.parse(await readFile(await within(root, '.claude/testing/test-map.json'), 'utf8')));
  if (map.productRepo !== validation.repo) fail('Strategy and map Repo IDs differ.');
  let file;
  try { file = await within(root, 'CLAUDE.md'); }
  catch (error) { if (error.code === 'ENOENT') return { changed: false, skipped: 'No CLAUDE.md' }; throw error; }
  const result = strategyPointer(await readFile(file, 'utf8'));
  if (result.changed) await atomicWrite(file, result.markdown);
  const actualRoot = await realpath(root);
  const quote = (text) => "'" + text.replaceAll("'", "'\\''") + "'";
  return { changed: result.changed, skipped: result.skipped ?? null,
    ...(result.changed ? { operation: 'pointer-update', root: actualRoot,
      reassessment_command: [process.execPath, fileURLToPath(import.meta.url), 'evidence', '--root', actualRoot].map(quote).join(' '),
      next_action: { type: 'reassess-map', instruction: 'Review the complete post-pointer evidence; do not pipe this output through cut/head or otherwise truncate it. If truncated, run reassessment_command without truncation. Reassess asserted behavior against mapped documentation before final snapshots/discovery and regenerate TEST-MAP.md. A hash update or success claim alone is not reassessment.' },
      reassessment_evidence: await reassessmentEvidence(root, map) } : {}) };
}
cli(import.meta.url, async (argv) => {
  const o = args(argv, ['--file', '--root', '--input']);
  if (o.command === 'pointer' && o.root) return updateStrategyPointer(o.root);
  if (o.command === 'evidence' && o.root) {
    const map = validateMap(JSON.parse(await readFile(await within(o.root, '.claude/testing/test-map.json'), 'utf8')));
    return { operation: 'mapping-evidence', root: await realpath(o.root), reassessment_evidence: await reassessmentEvidence(o.root, map) };
  }
  if (o.command !== 'check' || !o.file) fail('Usage: test-strategy.mjs check --file STRATEGY [--input DECISIONS] | pointer|evidence --root ROOT');
  const result = validateStrategy(await readFile(o.file, 'utf8'), o.input ? await jsonInput(o.input) : undefined);
  if (!result.valid) process.exitCode = 1;
  return result;
});
