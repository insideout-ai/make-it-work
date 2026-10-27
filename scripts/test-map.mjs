#!/usr/bin/env node
// Mechanical index operations only: semantic relationships are supplied by skills.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstat, readFile, readlink, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAP_PATH = '.claude/testing/test-map.json';
const fail = (message) => { throw new Error(message); };
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value) => typeof value === 'string' && value.trim().length > 0;
const relative = (value) => text(value) && !path.posix.isAbsolute(value) && !value.includes('\\') &&
  !/^[A-Za-z]:/.test(value) && !value.split('/').some((part) => part === '..' || part === '');
const within = (file, directory) => directory === '.' || file === directory || file.startsWith(`${directory}/`);
const metadata = (file) => file === MAP_PATH || file === 'TEST-MAP.md' || within(file, 'make-it-work') || within(file, '.git');
const unique = (values) => [...new Set(values)].sort();
const key = (test, token) => JSON.stringify([test, token]);

function strings(values, label) {
  if (!Array.isArray(values) || values.some((value) => !text(value)) || new Set(values).size !== values.length) fail(`Invalid ${label}.`);
}

export function validateMap(map) {
  if (!object(map) || map.schemaVersion !== 1 || !text(map.productRepo)) fail('Unsupported or invalid test-map schema.');
  for (const name of ['repos', 'locations', 'tests', 'mappings', 'decisions']) if (!Array.isArray(map[name])) fail(`Missing ${name} array.`);
  if (!map.locations.length) fail('At least one discovery location is required, including for an empty suite.');
  strings(map.tokens, 'tokens');
  if (map.tokens.some((token) => !token.startsWith(`${map.productRepo}:`) || !/:(UC-[\w-]+|domain-[\w-]+)$/.test(token))) fail('Tokens must belong to the product repo.');
  const repos = new Set();
  for (const repo of map.repos) {
    if (!object(repo) || !text(repo.id) || repos.has(repo.id) || !text(repo.root) || path.posix.isAbsolute(repo.root) || repo.root.includes('\\') || /^[A-Za-z]:/.test(repo.root)) fail('Invalid or duplicate repo.');
    repos.add(repo.id);
  }
  if (!map.repos.some((repo) => repo.id === map.productRepo && repo.root === '.')) fail('Product repo root must be .');
  const locations = new Map();
  for (const location of map.locations) {
    if (!object(location) || !text(location.id) || locations.has(location.id) || !repos.has(location.repo) || typeof location.complete !== 'boolean') fail('Invalid or duplicate location.');
    strings(location.paths, 'location paths');
    strings(location.config, 'location config');
    strings(location.assessedTokens, 'assessed tokens');
    if (!location.paths.length || [...location.paths, ...location.config].some((file) => !relative(file)) || location.assessedTokens.some((token) => !map.tokens.includes(token))) fail('Invalid location paths or scope.');
    locations.set(location.id, location);
  }
  if (!map.locations.some((location) => location.repo === map.productRepo)) fail('Include the product repo discovery location, even when it has no tests.');
  const tests = new Map();
  const identities = new Set();
  for (const test of map.tests) {
    const location = locations.get(test?.location);
    if (!object(test) || !text(test.id) || tests.has(test.id) || !location || !relative(test.file) || !location.paths.some((directory) => within(test.file, directory)) || !text(test.identity) ||
        !['separate', 'embedded', 'documentation'].includes(test.placement) || !['test', 'suite', 'file'].includes(test.granularity) ||
        (test.selector !== null && !text(test.selector))) fail('Invalid or duplicate test.');
    // Schema-v1 maps remain readable; newly assessed entries record a strategy layer.
    if (test.layer !== undefined && (!text(test.layer) || test.layer !== test.layer.trim() || /[\r\n]/.test(test.layer))) fail('Invalid test layer.');
    const identity = JSON.stringify([location.repo, test.file, test.placement, test.identity]);
    if (identities.has(identity)) fail('Duplicate runner test identity.');
    identities.add(identity);
    tests.set(test.id, test);
  }
  const relationships = new Set();
  for (const mapping of map.mappings) {
    if (!object(mapping) || !tests.has(mapping.test) || !map.tokens.includes(mapping.token) || relationships.has(key(mapping.test, mapping.token)) ||
        !['mapped', 'unresolved'].includes(mapping.status) || !['inferred', 'user'].includes(mapping.source) || !Array.isArray(mapping.evidence)) fail('Invalid or duplicate mapping.');
    if (mapping.status === 'mapped' && !mapping.evidence.length) fail('Mapped relationships require evidence.');
    if (mapping.status === 'unresolved' && !text(mapping.reason)) fail('Unresolved relationships require a reason.');
    for (const evidence of mapping.evidence) {
      if (!object(evidence) || !repos.has(evidence.repo) || !relative(evidence.file) || !text(evidence.reason) || !text(evidence.symbol)) fail('Invalid mapping evidence.');
    }
    relationships.add(key(mapping.test, mapping.token));
  }
  const decisions = new Set();
  for (const decision of map.decisions) {
    // Retain decisions for deleted/renamed tests so discovery cannot silently undo them.
    if (!object(decision) || !text(decision.test) || !text(decision.token) || !decision.token.startsWith(`${map.productRepo}:`) || !['confirm', 'reject'].includes(decision.choice) || !text(decision.reason) || decisions.has(key(decision.test, decision.token))) fail('Invalid or duplicate user decision.');
    decisions.add(key(decision.test, decision.token));
  }
  if (!object(map.snapshots)) fail('Missing snapshots object.');
  if (map.discovery !== undefined && (!object(map.discovery) || Object.entries(map.discovery).some(([id, hash]) => !locations.has(id) || !/^[a-f0-9]{64}$/.test(hash)))) fail('Invalid discovery baseline.');
  for (const [repo, snapshot] of Object.entries(map.snapshots)) {
    if (!repos.has(repo) || !object(snapshot) || !text(snapshot.head) || !object(snapshot.files) || Object.entries(snapshot.files).some(([file, hash]) => !relative(file) || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(hash))) fail('Invalid repo snapshot.');
  }
  return map;
}

export function discoverySignatures(map) {
  return Object.fromEntries(map.locations.map((location) => [location.id, createHash('sha256').update(JSON.stringify({
    productRepo: map.productRepo, tokens: [...map.tokens].sort(),
    repos: map.repos.map(({ id, root }) => ({ id, root })).sort((a, b) => a.id.localeCompare(b.id)),
    repo: location.repo, paths: [...location.paths].sort(), config: [...location.config].sort(),
  })).digest('hex')]));
}

function git(root, args) {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }).trimEnd();
}

async function checkedFile(root, file, allowDirectoryLink) {
  const target = path.resolve(root, file);
  const resolved = await realpath(target);
  if (!within(resolved, root)) fail(`File escapes registered repo: ${file}`);
  const stat = await lstat(resolved);
  // A directory link is a discovery pointer, not a file to read recursively.
  // Discovered tests/evidence beneath it are included explicitly by inspectMap.
  if (allowDirectoryLink && stat.isDirectory() && (await lstat(target)).isSymbolicLink()) return { target, directoryLink: true, cacheable: false };
  if (!stat.isFile()) fail(`Not a regular repo file: ${file}`);
  // Git stores a symlink's destination string, not the referenced file bytes.
  // Read through safe in-repo links (including parent aliases) on every check.
  return { target: resolved, directoryLink: false, cacheable: resolved === target };
}

export async function snapshotRepo(root, { includeFiles = [] } = {}) {
  strings(includeFiles, 'explicit snapshot files');
  if (includeFiles.some((file) => !relative(file))) fail('Invalid explicit snapshot path.');
  const requiredFiles = new Set(includeFiles);
  root = await realpath(root);
  if (await realpath(git(root, ['rev-parse', '--show-toplevel'])) !== root) fail('Registered root is not a repo toplevel.');
  let head;
  try { head = git(root, ['rev-parse', '--verify', 'HEAD']); }
  catch { head = 'unborn'; }
  const algorithm = git(root, ['rev-parse', '--show-object-format']);
  const staged = git(root, ['ls-files', '--stage', '-z']).split('\0').filter(Boolean);
  const dirty = new Set(git(root, ['diff-files', '--name-only', '-z']).split('\0').filter(Boolean));
  const entries = new Map();
  for (const entry of staged) {
    const match = /^(\d+) ([a-f0-9]+) (\d)\t([\s\S]+)$/.exec(entry);
    if (!match || match[3] !== '0') fail('Unmerged index; cannot establish test-map freshness.');
    if (match[1] === '160000') fail('Submodule requires its own registered test repo.');
    entries.set(match[4], match[2]);
  }
  for (const file of git(root, ['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean)) entries.set(file, null);
  // Git ignores do not make an explicitly referenced test/config/evidence absent.
  // Do not traverse other ignored files, which may contain unrelated secrets.
  for (const file of includeFiles) if (!entries.has(file)) entries.set(file, null);
  const files = Object.create(null);
  for (const [file, blob] of [...entries].sort(([a], [b]) => a.localeCompare(b))) {
    if (metadata(file)) continue;
    try {
      const checked = await checkedFile(root, file, !requiredFiles.has(file));
      if (blob && !dirty.has(file) && checked.cacheable) { files[file] = blob; continue; }
      const bytes = checked.directoryLink ? Buffer.from(await readlink(checked.target)) : await readFile(checked.target);
      files[file] = createHash(algorithm).update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return { head, files };
}

export async function inspectMap(map, root) {
  validateMap(map);
  const snapshots = Object.create(null), unavailable = [], changes = [];
  const discovery = discoverySignatures(map);
  for (const repo of map.repos) {
    try {
      const includeFiles = unique([
        ...map.tests.filter((test) => map.locations.some((location) => location.id === test.location && location.repo === repo.id)).map((test) => test.file),
        ...map.locations.filter((location) => location.repo === repo.id).flatMap((location) => location.config),
        ...map.mappings.flatMap((mapping) => mapping.evidence).filter((entry) => entry.repo === repo.id).map((entry) => entry.file),
      ]);
      snapshots[repo.id] = await snapshotRepo(path.resolve(root, repo.root), { includeFiles });
      const previous = map.snapshots[repo.id];
      const start = changes.length;
      for (const file of unique([...Object.keys(previous?.files ?? {}), ...Object.keys(snapshots[repo.id].files)])) {
        if (previous?.files[file] !== snapshots[repo.id].files[file]) changes.push({ repo: repo.id, file });
      }
      if (previous && changes.length === start) snapshots[repo.id] = previous;
    } catch (error) { unavailable.push({ repo: repo.id, reason: error.message }); }
  }
  const refresh = [], staleTests = new Set();
  for (const location of map.locations) {
    const tests = map.tests.filter((test) => test.location === location.id);
    const related = map.mappings.filter((mapping) => tests.some((test) => test.id === mapping.test));
    const evidence = related.flatMap((mapping) => mapping.evidence);
    const missingFiles = tests.some((test) => !snapshots[location.repo]?.files[test.file]) || location.config.some((file) => !snapshots[location.repo]?.files[file]) || evidence.some((entry) => !snapshots[entry.repo]?.files[entry.file]);
    // Product changes may affect external tests even if dependencies are not yet known.
    const relevant = changes.filter((change) => change.repo === location.repo || change.repo === map.productRepo || evidence.some((item) => item.repo === change.repo));
    const unavailableEvidence = unavailable.some((item) => item.repo === location.repo || item.repo === map.productRepo || evidence.some((entry) => entry.repo === item.repo));
    const missingBaseline = !map.snapshots[location.repo] || !map.snapshots[map.productRepo];
    const configChanged = map.discovery?.[location.id] !== discovery[location.id] || relevant.some((change) => change.repo === location.repo && location.config.includes(change.file));
    const unknown = relevant.some((change) => !tests.some((test) => change.repo === location.repo && test.file === change.file) && !evidence.some((entry) => entry.repo === change.repo && entry.file === change.file));
    const rebuild = missingBaseline || missingFiles || !location.complete || configChanged || unknown;
    if (unavailableEvidence || rebuild) for (const test of tests) staleTests.add(test.id);
    else for (const test of tests) {
      if (relevant.some((change) => (change.repo === location.repo && test.file === change.file) || related.some((mapping) => mapping.test === test.id && mapping.evidence.some((entry) => entry.repo === change.repo && entry.file === change.file)))) staleTests.add(test.id);
    }
    if (unavailableEvidence || rebuild || relevant.length) refresh.push({
      location: location.id, mode: unavailableEvidence ? 'unavailable' : rebuild ? 'rebuild' : 'targeted',
      files: relevant, tests: tests.filter((test) => staleTests.has(test.id)).map((test) => test.id),
      reason: unavailableEvidence ? 'repo unavailable' : missingBaseline ? 'baseline missing' : missingFiles ? 'test or evidence file missing' : !location.complete ? 'discovery incomplete' : configChanged ? 'discovery configuration changed' : unknown ? 'change impact not established' : 'test or evidence changed',
    });
  }
  return { snapshots, discovery, changes, unavailable, refresh, staleTests: [...staleTests].sort() };
}

export function queryMap(map, inspection, { token, test } = {}) {
  validateMap(map);
  if ((token === undefined) === (test === undefined)) fail('Query requires exactly one token or test.');
  if (token !== undefined && !map.tokens.includes(token)) fail('Unrecognized token.');
  if (test !== undefined && !map.tests.some((entry) => entry.id === test)) fail('Unrecognized test.');
  const matches = [], unresolved = [];
  for (const mapping of map.mappings.filter((entry) => token !== undefined ? entry.token === token : entry.test === test)) {
    const decision = map.decisions.find((entry) => entry.test === mapping.test && entry.token === mapping.token);
    if (decision?.choice === 'reject') continue;
    const entry = { ...mapping, decision: decision ?? null, test: map.tests.find((item) => item.id === mapping.test) };
    if (inspection.staleTests.includes(mapping.test)) unresolved.push({ ...entry, reason: 'mapping stale or repo unavailable' });
    else if (mapping.status === 'unresolved') unresolved.push(entry);
    else matches.push(entry);
  }
  const locations = token !== undefined ? map.locations : map.locations.filter((location) => map.tests.some((entry) => entry.id === test && entry.location === location.id));
  for (const location of locations) {
    const pending = inspection.refresh.find((entry) => entry.location === location.id);
    if (pending || !location.complete || (token !== undefined && !location.assessedTokens.includes(token))) unresolved.push({ location: location.id, reason: pending?.reason ?? 'scope not assessed' });
  }
  return { matches, unresolved, unmapped: matches.length === 0 && unresolved.length === 0 };
}

export function serializeMap(map) {
  validateMap(map);
  // Canonical object ordering and no timestamps make no-op refreshes byte stable.
  const canonical = (value) => Array.isArray(value) ? value.map(canonical) : object(value) ? Object.fromEntries(Object.keys(value).sort().map((name) => [name, canonical(value[name])])) : value;
  return `${JSON.stringify(canonical(map), null, 2)}\n`;
}

export async function main(args) {
  const command = args.shift(), options = {};
  while (args.length) {
    const name = args.shift();
    if (!['--root', '--map', '--token', '--test'].includes(name) || !args.length || options[name] !== undefined) fail('Invalid test-map arguments.');
    options[name] = args.shift();
  }
  if (!['validate', 'inspect', 'query'].includes(command) || !options['--root']) fail('Usage: test-map.mjs validate|inspect|query --root PRODUCT_ROOT [--map FILE|-] [--token TOKEN|--test ID]');
  const root = path.resolve(options['--root']);
  const input = options['--map'] ?? path.join(root, MAP_PATH);
  let map;
  try {
    let contents;
    if (input === '-') {
      const chunks = [];
      for await (const chunk of process.stdin) chunks.push(chunk);
      contents = Buffer.concat(chunks).toString('utf8');
    } else contents = await readFile(input, 'utf8');
    map = validateMap(JSON.parse(contents));
  }
  catch (error) { fail(`Test map unavailable: ${error.message}. Rediscover in memory or refresh define-test-strategy; do not infer no coverage.`); }
  if (command === 'validate') return { valid: true };
  const inspection = await inspectMap(map, root);
  return command === 'inspect' ? inspection : queryMap(map, inspection, { token: options['--token'], test: options['--test'] });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
