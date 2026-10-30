#!/usr/bin/env node
// Portable report generator. It never discovers tests, classifies layers or edits JSON.
import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAP_PATH, REPORT_PATH, serializeMap, validateMap } from './test-map.mjs';
export { REPORT_PATH } from './test-map.mjs';

const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replace(/[\\`*_[\]{}|]/g, '\\$&').replace(/\r?\n/g, ' ');
const code = (value) => `<code>${String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('|', '&#124;').replace(/\r?\n/g, ' ')}</code>`;
const layerOf = (test) => !test.layer || test.layer.toLowerCase() === 'unknown' ? 'Unknown' : test.layer;
const short = (token) => token.slice(token.indexOf(':') + 1);
const unique = (items) => [...new Set(items)];
const sorted = (items) => [...items].sort((a, b) => a.localeCompare(b, 'en'));
const link = (label, file) => `[${escape(label)}](<${file.split(path.sep).join('/').split('/').map(encodeURIComponent).join('/')}>)`;

export function renderTestMap(map, { labels = {}, root = '.', reportPath = REPORT_PATH, sourcePath = MAP_PATH, refreshCommand } = {}) {
  validateMap(map);
  const reportDirectory = path.dirname(path.resolve(root, reportPath));
  const repoRoots = new Map(map.repos.map((repo) => [repo.id, path.resolve(root, repo.root)]));
  const fileLink = (repo, file, label = file) => link(label, path.relative(reportDirectory, path.resolve(repoRoots.get(repo), file)));
  const sourceLink = link(sourcePath, path.relative(reportDirectory, path.resolve(root, sourcePath)));
  const feature = (token) => {
    const key = short(token), label = labels[token];
    const name = label?.title ?? key;
    return label?.file ? fileLink(map.productRepo, label.file, name) : escape(name);
  };
  const testRepo = (test) => map.locations.find((location) => location.id === test.location).repo;
  const testLink = (test) => fileLink(testRepo(test), test.file);
  const refs = new Map(map.tests.map((test, index) => [test.id, `T${String(index + 1).padStart(2, '0')}`]));
  const tests = new Map(map.tests.map((test) => [test.id, test]));
  const decisions = new Map(map.decisions.map((decision) => [JSON.stringify([decision.test, decision.token]), decision]));
  const rejected = (mapping) => decisions.get(JSON.stringify([mapping.test, mapping.token]))?.choice === 'reject';
  const relationships = map.mappings.filter((mapping) => !rejected(mapping));
  const mapped = relationships.filter((mapping) => mapping.status === 'mapped');
  const unresolved = relationships.filter((mapping) => mapping.status === 'unresolved');
  const assessed = map.tokens.filter((token) => map.locations.every((location) => location.assessedTokens.includes(token)));
  const counts = new Map();
  for (const test of map.tests) counts.set(layerOf(test), (counts.get(layerOf(test)) ?? 0) + 1);
  const lines = [], add = (...items) => lines.push(...items);
  add(`# Test Map — ${escape(map.productRepo)}`, '',
    `Generated from ${sourceLink}. Edit the JSON and regenerate this file; do not edit this report by hand.`, '',
    refreshCommand ? `Refresh: ${code(refreshCommand)}.` : 'Refresh with the report generator used by the test-map maintenance workflow.', '',
    '**Saved-map snapshot.** Generating this report does not discover tests, check mapping freshness, or run tests. Mapped relationships indicate relevance, not sufficient coverage or passing results.', '',
    '## Overview', '',
    '| Indexed tests / suites / files | Mapped relationships | Unresolved relationships | Features with assessment recorded in every location |',
    '| ---: | ---: | ---: | ---: |',
    `| ${map.tests.length} | ${mapped.length} | ${unresolved.length} | ${assessed.length} of ${map.tokens.length} |`, '');
  if (map.locations.some((location) => !location.complete)) add('**Discovery is incomplete.** Counts cover the saved inventory only. “Not assessed” does not mean tests are missing.', '');
  if (!map.tokens.length) add('**Product mapping pending:** no UC/domain vocabulary has been registered.', '');
  add('## Tests by layer', '',
    'Layer labels come from the JSON and describe the exercised boundary, independently of the runner. Missing classifications appear as Unknown. Counts include unmapped entries and count each indexed identity once; suites/files may contain multiple tests.', '',
    '| Layer | Indexed entries |', '| --- | ---: |');
  for (const layer of sorted(counts.keys())) add(`| ${escape(layer)} | ${counts.get(layer)} |`);
  if (!counts.size) add('| No indexed entries | 0 |');
  add('', '## Feature overview', '',
    'Counts are distinct indexed entries per feature. A test may belong to several features. “Assessment recorded” describes the saved scope; discovery and freshness may still be incomplete.', '',
    '| Feature | Assessment | Layers of mapped tests | Mapped tests | Needs review |', '| --- | --- | --- | ---: | ---: |');
  for (const token of map.tokens) {
    const matches = mapped.filter((mapping) => mapping.token === token);
    const pending = unresolved.filter((mapping) => mapping.token === token);
    const locations = map.locations.filter((location) => location.assessedTokens.includes(token));
    const status = locations.length === map.locations.length ? 'Assessment recorded' : locations.length ? 'Partially assessed' : 'Not assessed';
    add(`| ${feature(token)} | ${status} | ${sorted(unique(matches.map((mapping) => layerOf(tests.get(mapping.test))))).map(escape).join(', ') || '—'} | ${matches.length || (locations.length ? '0 recorded' : '—')} | ${pending.length || '—'} |`);
  }
  if (!map.tokens.length) add('| No registered vocabulary | Pending | — | — | — |');
  add('', '### Mapped behaviors by feature', '', 'Expand a feature to find the relevant behaviors, layers and test files.', '');
  for (const token of map.tokens) {
    const matches = mapped.filter((mapping) => mapping.token === token);
    if (!matches.length) continue;
    add('<details>', `<summary>${escape(labels[token]?.title ?? short(token))} — ${matches.length} mapped ${matches.length === 1 ? 'entry' : 'entries'}</summary>`, '',
      '| Tested behavior | Layer | Test file | Catalog reference |', '| --- | --- | --- | --- |');
    for (const mapping of matches) {
      const test = tests.get(mapping.test);
      add(`| ${escape(test.identity)} | ${escape(layerOf(test))} | ${testLink(test)} | ${refs.get(test.id)} |`);
    }
    add('', '</details>', '');
  }
  add('## Needs review', '');
  if (!unresolved.length) add('No unresolved candidate relationships are recorded. Incomplete discovery and unassessed features may still require assessment.', '');
  for (const mapping of unresolved) {
    const test = tests.get(mapping.test);
    add(`### ${refs.get(test.id)} · ${feature(mapping.token)}`, '',
      `**Test:** ${escape(test.identity)} · **Layer:** ${escape(layerOf(test))}`, '',
      `**File:** ${testLink(test)}`, '', escape(mapping.reason), '');
  }
  const unknown = map.tests.filter((test) => layerOf(test) === 'Unknown');
  if (unknown.length) add(`**Layer classification needed:** ${unknown.map((test) => `${refs.get(test.id)} (${testLink(test)})`).join(', ')}. Classify from the strategy and actual assertions; do not guess from the runner alone.`, '');
  add('## Test catalog and evidence', '', '<details>', `<summary>Open catalog (${map.tests.length} indexed entries)</summary>`, '',
    'Selectors are runner arguments copied from the JSON, not standalone commands. Use the test strategy for invocations and prerequisites.', '');
  for (const test of map.tests) {
    const mappings = map.mappings.filter((mapping) => mapping.test === test.id);
    const accepted = mappings.filter((mapping) => mapping.status === 'mapped' && !rejected(mapping));
    add(`### ${refs.get(test.id)} · ${escape(test.identity)}`, '',
      `**Layer:** ${escape(layerOf(test))} · **Placement:** ${escape(test.placement)} · **Granularity:** ${escape(test.granularity)}`, '',
      `**File:** ${testLink(test)} · **Repo:** ${escape(testRepo(test))}`, '',
      `**Mapped to:** ${accepted.map((mapping) => feature(mapping.token)).join('; ') || 'No mapped relationships recorded.'}`, '',
      '<details>', '<summary>Selector and mapping evidence</summary>', '',
      `**Recorded selector:** ${test.selector === null ? 'None recorded.' : code(test.selector)}`, '');
    for (const mapping of mappings) {
      const decision = decisions.get(JSON.stringify([test.id, mapping.token]));
      add(`**${feature(mapping.token)}** — ${rejected(mapping) ? 'rejected by user (excluded)' : mapping.status}; source: ${escape(mapping.source)}.`, '');
      if (decision) add(`**User decision:** ${escape(decision.choice)} — ${escape(decision.reason)}`, '');
      if (mapping.reason) add(escape(mapping.reason), '');
      if (!mapping.evidence.length) add('No supporting evidence recorded.', '');
      else {
        add('| Evidence file | Symbol / contract | Rationale |', '| --- | --- | --- |');
        for (const evidence of mapping.evidence) add(`| ${fileLink(evidence.repo, evidence.file)} | ${escape(evidence.symbol)} | ${escape(evidence.reason)} |`);
        add('');
      }
    }
    add('</details>', '');
  }
  add('</details>', '', '## Discovery scope', '', '| Location | Repository | Discovery complete | Assessment recorded |', '| --- | --- | --- | ---: |');
  for (const location of map.locations) add(`| ${escape(location.id)} | ${escape(location.repo)} | ${location.complete ? 'Yes' : 'No'} | ${location.assessedTokens.length} of ${map.tokens.length} features |`);
  add('', `**Source fingerprint (canonical JSON SHA-256):** ${code(createHash('sha256').update(serializeMap(map)).digest('hex'))}`, '',
    'This fingerprint detects report drift from saved metadata. It does not establish that the saved map reflects current source code.', '');
  return lines.join('\n');
}

async function readLabels(root, map) {
  const directory = path.join(root, '.claude/skills');
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return {}; throw error; }
  const labels = {};
  for (const entry of entries) {
    if (!entry.isDirectory() || !/^(uc-|domain-)/.test(entry.name)) continue;
    const key = /^uc-(\d+)-/.exec(entry.name);
    const token = `${map.productRepo}:${key ? `UC-${key[1]}` : entry.name}`;
    if (!map.tokens.includes(token)) continue;
    const file = `.claude/skills/${entry.name}/SKILL.md`;
    let markdown;
    try { markdown = await readFile(path.join(root, file), 'utf8'); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    const title = /^# (.+)$/m.exec(markdown)?.[1];
    if (title) labels[token] = { title, file };
  }
  return labels;
}

export async function reportMain(argv) {
  let root = process.cwd(), mode = 'print', refreshCommand;
  const seen = new Set();
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (seen.has(arg)) throw new Error(`Duplicate argument: ${arg}`);
    seen.add(arg);
    if (['--root', '--refresh-command'].includes(arg) && argv[index + 1] && !argv[index + 1].startsWith('--')) {
      if (arg === '--root') root = path.resolve(argv[++index]);
      else refreshCommand = argv[++index];
    } else if (['--write', '--check'].includes(arg) && mode === 'print') mode = arg.slice(2);
    else throw new Error('Usage: test-map-report.mjs [--root ROOT] [--write|--check] [--refresh-command COMMAND]');
  }
  const map = validateMap(JSON.parse(await readFile(path.join(root, MAP_PATH), 'utf8')));
  if (!refreshCommand) {
    let manifest;
    try { manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    refreshCommand = manifest?.scripts?.['test:map'] ? 'npm run test:map' : 'node scripts/test-map-report.mjs --write';
  }
  const markdown = renderTestMap(map, { root, labels: await readLabels(root, map), refreshCommand });
  if (mode === 'print') return markdown;
  root = await realpath(root);
  const output = path.join(root, REPORT_PATH);
  if (await realpath(path.dirname(output)) !== path.dirname(output)) throw new Error(`${REPORT_PATH} must be in a real directory under the product repo.`);
  try { if (!(await lstat(output)).isFile()) throw new Error(`${REPORT_PATH} must be a regular file.`); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  let existing;
  try { existing = await readFile(output, 'utf8'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (mode === 'check') {
    if (existing !== markdown) throw new Error(`${REPORT_PATH} is missing or stale. Refresh with ${refreshCommand}.`);
    return `${REPORT_PATH} is up to date with the saved map.`;
  }
  if (existing === markdown) return `${REPORT_PATH} is already up to date.`;
  await writeFile(output, markdown);
  return `Generated ${REPORT_PATH} from the saved map.`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  reportMain(process.argv.slice(2)).then((result) => process.stdout.write(`${result}${result.endsWith('\n') ? '' : '\n'}`))
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}
