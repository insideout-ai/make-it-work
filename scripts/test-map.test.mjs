import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rename, rm, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverySignatures, inspectMap, queryMap, serializeMap, snapshotRepo, validateMap } from './test-map.mjs';

const git = (root, ...args) => execFileSync('git', ['-C', root, ...args], { stdio: 'pipe' });
const token = 'api:UC-01';
const other = 'api:UC-02';

async function fixture(t) {
  const workspace = await mkdtemp(path.join(os.tmpdir(), 'test-map-'));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  for (const name of ['api', 'qa']) {
    const root = path.join(workspace, name);
    await mkdir(path.join(root, 'src'), { recursive: true });
    await mkdir(path.join(root, 'test'), { recursive: true });
    await writeFile(path.join(root, 'src/pay.js'), 'export const pay = () => 1;\n');
    await writeFile(path.join(root, 'test/pay.test.js'), 'assert.equal(pay(), 1);\n');
    await writeFile(path.join(root, 'package.json'), '{"scripts":{"test":"node --test"}}\n');
    await writeFile(path.join(root, '.gitignore'), 'node_modules/\nmake-it-work/\n');
    git(root, 'init', '-q');
    git(root, '-c', 'user.name=fixture', '-c', 'user.email=fixture@example.test', 'add', '-A');
    git(root, '-c', 'user.name=fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'fixture');
  }
  const root = path.join(workspace, 'api');
  const map = {
    schemaVersion: 1, productRepo: 'api', tokens: [token, other],
    repos: [{ id: 'api', root: '.' }, { id: 'qa', root: '../qa' }],
    locations: [
      { id: 'local', repo: 'api', paths: ['test', 'src'], config: ['package.json'], complete: true, assessedTokens: [token, other] },
      { id: 'external', repo: 'qa', paths: ['test'], config: ['package.json'], complete: true, assessedTokens: [token, other] },
    ],
    tests: [
      { id: 'local-pay', location: 'local', file: 'test/pay.test.js', identity: 'pays', placement: 'separate', granularity: 'test', selector: null },
      { id: 'qa-pay', location: 'external', file: 'test/pay.test.js', identity: 'pays', placement: 'separate', granularity: 'test', selector: null },
    ],
    mappings: ['local-pay', 'qa-pay'].map((test) => ({ test, token, status: 'mapped', source: 'inferred', evidence: [{ repo: 'api', file: 'src/pay.js', symbol: 'pay', reason: 'Asserts the UC-01 payment amount.' }] })),
    decisions: [], snapshots: {},
  };
  map.discovery = discoverySignatures(map);
  for (const repo of map.repos) map.snapshots[repo.id] = await snapshotRepo(path.resolve(root, repo.root));
  return { root, workspace, map };
}

test('unchanged inventory reuses both repos and queries the same relationships in both directions', async (t) => {
  const { root, map } = await fixture(t);
  const before = serializeMap(map), source = await readFile(path.join(root, 'test/pay.test.js'));
  const status = await inspectMap(map, root);
  assert.deepEqual(status.refresh, []);
  assert.equal(queryMap(map, status, { token }).matches.length, 2);
  assert.equal(queryMap(map, status, { test: 'qa-pay' }).matches[0].token, token);
  assert.equal(queryMap(map, status, { token: other }).unmapped, true);
  assert.equal(serializeMap(map), before);
  assert.deepEqual(await readFile(path.join(root, 'test/pay.test.js')), source);
});

test('source evidence changes invalidate local and external tests without semantic rediscovery of unrelated tests', async (t) => {
  const { root, map } = await fixture(t);
  await writeFile(path.join(root, 'src/pay.js'), 'export const pay = () => 2;\n');
  const status = await inspectMap(map, root);
  assert.deepEqual(status.staleTests, ['local-pay', 'qa-pay']);
  assert.ok(status.refresh.every((entry) => entry.mode === 'targeted'));
  assert.equal(queryMap(map, status, { token }).matches.length, 0);
  assert.equal(queryMap(map, status, { token }).unmapped, false);
});

test('a changed QA test is targeted; local mappings remain selectable while scope uncertainty stays visible', async (t) => {
  const { root, workspace, map } = await fixture(t);
  await writeFile(path.join(workspace, 'qa/test/pay.test.js'), 'assert.equal(pay(), 2);\n');
  const status = await inspectMap(map, root);
  assert.deepEqual(status.staleTests, ['qa-pay']);
  assert.equal(status.refresh[0].mode, 'targeted');
  const result = queryMap(map, status, { token });
  assert.equal(result.matches.length, 1);
  assert.ok(result.unresolved.length > 0);
});

test('new, deleted and renamed tests invalidate discovery; unknown changes conservatively rebuild', async (t) => {
  const { root, map } = await fixture(t);
  await writeFile(path.join(root, 'test/new.test.js'), 'assert.ok(true);\n');
  assert.ok((await inspectMap(map, root)).refresh.some((entry) => entry.mode === 'rebuild'));
  await rm(path.join(root, 'test/new.test.js'));
  await rename(path.join(root, 'test/pay.test.js'), path.join(root, 'test/renamed.test.js'));
  const status = await inspectMap(map, root);
  assert.ok(status.changes.some((entry) => entry.file === 'test/pay.test.js'));
  assert.ok(status.changes.some((entry) => entry.file === 'test/renamed.test.js'));
  assert.equal(queryMap(map, status, { token }).unmapped, false);
});

test('configuration and UC documentation changes trigger conservative refresh', async (t) => {
  const { root, map } = await fixture(t);
  await writeFile(path.join(root, 'package.json'), '{"scripts":{"test":"custom-runner"}}');
  assert.equal((await inspectMap(map, root)).refresh.find((entry) => entry.location === 'local').reason, 'discovery configuration changed');
  await mkdir(path.join(root, '.claude/skills/uc-01-pay'), { recursive: true });
  await writeFile(path.join(root, '.claude/skills/uc-01-pay/SKILL.md'), 'Changed payment behavior');
  assert.ok((await inspectMap(map, root)).refresh.every((entry) => entry.mode === 'rebuild'));
});

test('registration changes cannot reuse a baseline even when the source trees are unchanged', async (t) => {
  const { root, map } = await fixture(t);
  map.locations[0].paths.push('more-tests');
  const status = await inspectMap(map, root);
  assert.deepEqual(status.changes, []);
  assert.equal(status.refresh.find((entry) => entry.location === 'local').reason, 'discovery configuration changed');
  assert.equal(queryMap(map, status, { token: other }).unmapped, false);
});

test('staged, unstaged and untracked changes are included, including across branches', async (t) => {
  const { root, map } = await fixture(t);
  await writeFile(path.join(root, 'src/pay.js'), 'staged\n');
  git(root, 'add', 'src/pay.js');
  assert.ok((await inspectMap(map, root)).changes.some((entry) => entry.file === 'src/pay.js'));
  await writeFile(path.join(root, 'src/pay.js'), 'unstaged after staged\n');
  const dirty = await snapshotRepo(root);
  git(root, 'add', 'src/pay.js');
  git(root, '-c', 'user.name=fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'changed');
  assert.deepEqual((await snapshotRepo(root)).files, dirty.files);
  git(root, 'switch', '-qc', 'alternate');
  await writeFile(path.join(root, 'test/branch.test.js'), 'branch\n');
  assert.ok((await inspectMap(map, root)).changes.some((entry) => entry.file === 'test/branch.test.js'));
});

test('map-only commits and ignored artifacts cause no refresh or serialized churn', async (t) => {
  const { root, map } = await fixture(t);
  await mkdir(path.join(root, '.claude/testing'), { recursive: true });
  await writeFile(path.join(root, '.claude/testing/test-map.json'), serializeMap(map));
  await writeFile(path.join(root, 'TEST-MAP.md'), '# Legacy generated report\n');
  await writeFile(path.join(root, '.claude/testing/TEST-MAP.md'), '# Generated report\n');
  await mkdir(path.join(root, 'make-it-work'), { recursive: true });
  await writeFile(path.join(root, 'make-it-work/scratch'), 'ignored');
  git(root, 'add', '.claude/testing/test-map.json', '.claude/testing/TEST-MAP.md', 'TEST-MAP.md');
  git(root, '-c', 'user.name=fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'map only');
  const status = await inspectMap(map, root);
  assert.deepEqual(status.refresh, []);
  assert.deepEqual({ ...status.snapshots }, map.snapshots);
  await writeFile(path.join(root, '.claude/testing/TEST-MAP.md'), '# Regenerated report\n');
  assert.deepEqual((await inspectMap(map, root)).refresh, []);
});

test('missing external repo preserves baseline and never reports confirmed absence', async (t) => {
  const { root, workspace, map } = await fixture(t);
  await rename(path.join(workspace, 'qa'), path.join(workspace, 'qa-unavailable'));
  const status = await inspectMap(map, root);
  assert.equal(status.unavailable[0].repo, 'qa');
  assert.equal(status.snapshots.qa, undefined);
  assert.ok(map.snapshots.qa);
  assert.equal(queryMap(map, status, { token: other }).unmapped, false);
});

test('decisions survive freshness checks; rejection suppresses and confirmation cannot bless stale evidence', async (t) => {
  const { root, map } = await fixture(t);
  map.decisions = [{ test: 'local-pay', token, choice: 'reject', reason: 'Different behavior' }, { test: 'qa-pay', token, choice: 'confirm', reason: 'Reviewed assertions' }];
  const decisions = structuredClone(map.decisions);
  const confirmed = queryMap(map, await inspectMap(map, root), { token });
  assert.equal(confirmed.matches.length, 1);
  assert.equal(confirmed.matches[0].decision.choice, 'confirm');
  await writeFile(path.join(root, 'src/pay.js'), 'changed\n');
  assert.equal(queryMap(map, await inspectMap(map, root), { token }).matches.length, 0);
  assert.deepEqual(map.decisions, decisions);
});

test('partial discovery and unassessed tokens prevent false uncovered reports', async (t) => {
  const { root, map } = await fixture(t);
  map.locations[0].assessedTokens = [token];
  assert.equal(queryMap(map, await inspectMap(map, root), { token: other }).unmapped, false);
  map.locations[0].complete = false;
  assert.equal((await inspectMap(map, root)).refresh[0].reason, 'discovery incomplete');
  map.tokens = []; map.mappings = []; map.locations.forEach((location) => { location.assessedTokens = []; });
  assert.equal(validateMap(map), map);
});

test('ambiguous mappings stay unresolved; embedded and documentation identities remain distinct', async (t) => {
  const { root, map } = await fixture(t);
  map.tests[0].placement = 'embedded'; map.tests[0].selector = 'AccountTest.test_pay';
  map.tests.push({ ...map.tests[0], id: 'doctest', identity: 'pay doctest', placement: 'documentation', selector: 'src.pay' });
  map.mappings.push({ test: 'doctest', token: other, status: 'unresolved', source: 'inferred', evidence: [], reason: 'UC relationship uncertain' });
  const result = queryMap(map, await inspectMap(map, root), { token: other });
  assert.equal(result.unmapped, false); assert.equal(result.unresolved[0].reason, 'UC relationship uncertain');
});

test('schema rejects malformed, duplicate, escaping and unsupported relationships', async (t) => {
  const { map } = await fixture(t);
  for (const mutate of [
    (value) => { value.schemaVersion = 9; },
    (value) => { value.tests[0].file = '../escape'; },
    (value) => { value.repos[1].root = '/absolute'; },
    (value) => { value.mappings[0].evidence = []; },
    (value) => { value.mappings.push(value.mappings[0]); },
    (value) => { value.tests.push({ ...value.tests[0], id: 'duplicate-identity' }); },
    (value) => { value.locations = []; },
    (value) => { value.tokens.push('other:UC-01'); },
  ]) { const invalid = structuredClone(map); mutate(invalid); assert.throws(() => validateMap(invalid)); }
});

test('a fabricated current baseline cannot make missing tests or evidence selectable', async (t) => {
  const { root, map } = await fixture(t);
  map.tests[0].file = 'test/nonexistent.test.js';
  const status = await inspectMap(map, root);
  assert.equal(status.refresh.find((entry) => entry.location === 'local').reason, 'test or evidence file missing');
  assert.ok(!queryMap(map, status, { token }).matches.some((entry) => entry.test.id === 'local-pay'));
});

test('escaping symlinks are unavailable, not silently indexed', async (t) => {
  const { root, workspace, map } = await fixture(t);
  await symlink(path.join(workspace, 'qa/src/pay.js'), path.join(root, 'src/escape.js'));
  assert.equal((await inspectMap(map, root)).unavailable[0].repo, 'api');
});

test('internal file symlinks stay usable and track target content even when the link is clean', async (t) => {
  const { root, map } = await fixture(t);
  await mkdir(path.join(root, 'docs'));
  await symlink('../src/pay.js', path.join(root, 'docs/pay-link.js'));
  for (const mapping of map.mappings) mapping.evidence[0].file = 'docs/pay-link.js';
  git(root, 'add', 'docs/pay-link.js');
  let status = await inspectMap(map, root);
  assert.deepEqual(status.unavailable, []);
  assert.ok(status.snapshots.api.files['docs/pay-link.js']);
  map.snapshots = status.snapshots;
  assert.deepEqual((await inspectMap(map, root)).refresh, []);
  await writeFile(path.join(root, 'src/pay.js'), 'export const pay = () => 2;\n');
  status = await inspectMap(map, root);
  assert.ok(status.changes.some((entry) => entry.file === 'docs/pay-link.js'));
  assert.equal(queryMap(map, status, { token }).matches.length, 0);
});

test('internal directory symlinks do not disable a repo and explicit alias paths track their targets', async (t) => {
  const { root, map } = await fixture(t);
  await symlink('test', path.join(root, 'test-alias'));
  map.locations[0].paths.push('test-alias');
  map.tests[0].file = 'test-alias/pay.test.js';
  git(root, 'add', 'test-alias');
  const baseline = await inspectMap(map, root);
  assert.deepEqual(baseline.unavailable, []);
  assert.ok(baseline.snapshots.api.files['test-alias']);
  assert.ok(baseline.snapshots.api.files['test-alias/pay.test.js']);
  map.snapshots = baseline.snapshots;
  map.discovery = baseline.discovery;
  assert.deepEqual((await inspectMap(map, root)).refresh, []);
  await writeFile(path.join(root, 'test/pay.test.js'), 'assert.equal(pay(), 2);\n');
  const status = await inspectMap(map, root);
  assert.ok(status.staleTests.includes('local-pay'));
  assert.ok(status.changes.some((entry) => entry.file === 'test-alias/pay.test.js'));
});

test('explicit ignored evidence is reusable and its changes invalidate mappings without indexing unrelated ignored files', async (t) => {
  const { root, workspace, map } = await fixture(t);
  const doc = '.claude/skills/uc-01-pay/SKILL.md';
  await writeFile(path.join(root, '.gitignore'), '.claude/\nprivate/\n');
  await mkdir(path.join(root, '.claude/skills/uc-01-pay'), { recursive: true });
  await writeFile(path.join(root, doc), 'Pay returns one.\n');
  await mkdir(path.join(root, 'private'));
  await symlink(path.join(workspace, 'qa/src/pay.js'), path.join(root, 'private/unrelated-secret'));
  for (const mapping of map.mappings) mapping.evidence.push({ repo: 'api', file: doc, symbol: 'Pay', reason: 'Documents the asserted result.' });
  const baseline = await inspectMap(map, root);
  assert.deepEqual(baseline.unavailable, []);
  assert.ok(baseline.snapshots.api.files[doc]);
  assert.equal(baseline.snapshots.api.files['private/unrelated-secret'], undefined);
  map.snapshots = baseline.snapshots;
  assert.deepEqual((await inspectMap(map, root)).refresh, []);
  assert.equal(queryMap(map, await inspectMap(map, root), { token }).matches.length, 2);
  await writeFile(path.join(root, doc), 'Pay returns two.\n');
  const status = await inspectMap(map, root);
  assert.deepEqual(status.staleTests, ['local-pay', 'qa-pay']);
  assert.ok(status.refresh.every((entry) => entry.mode === 'targeted'));
  assert.equal(queryMap(map, status, { token }).matches.length, 0);
});

test('a directory symlink cannot masquerade as an explicitly cataloged test file', async (t) => {
  const { root, map } = await fixture(t);
  await symlink('test', path.join(root, 'test-alias'));
  map.locations[0].paths.push('test-alias');
  map.tests[0].file = 'test-alias';
  const status = await inspectMap(map, root);
  assert.ok(status.unavailable.some((entry) => /Not a regular repo file/.test(entry.reason)));
  assert.equal(queryMap(map, status, { token }).matches.length, 0);
});

test('explicit ignored tests and runner config are inventoried, with missing inputs remaining unresolved', async (t) => {
  const { root, map } = await fixture(t);
  await writeFile(path.join(root, '.gitignore'), 'test/private/\nprivate/\n');
  await mkdir(path.join(root, 'test/private'), { recursive: true });
  await mkdir(path.join(root, 'private'));
  await writeFile(path.join(root, 'test/private/pay.test.js'), 'assert.equal(pay(), 1);\n');
  await writeFile(path.join(root, 'private/runner.json'), '{}\n');
  map.tests[0].file = 'test/private/pay.test.js';
  map.locations[0].config.push('private/runner.json');
  const baseline = await inspectMap(map, root);
  assert.ok(baseline.snapshots.api.files['test/private/pay.test.js']);
  assert.ok(baseline.snapshots.api.files['private/runner.json']);
  map.snapshots = baseline.snapshots;
  map.discovery = baseline.discovery;
  assert.deepEqual((await inspectMap(map, root)).refresh, []);
  await writeFile(path.join(root, 'private/runner.json'), '{"changed":true}\n');
  assert.equal((await inspectMap(map, root)).refresh.find((entry) => entry.location === 'local').reason, 'discovery configuration changed');
  await rm(path.join(root, 'test/private/pay.test.js'));
  assert.ok((await inspectMap(map, root)).staleTests.includes('local-pay'));
});

test('explicit ignored evidence cannot escape the registered repo through a symlink', async (t) => {
  const { root, workspace, map } = await fixture(t);
  await writeFile(path.join(root, '.gitignore'), 'private/\n');
  await mkdir(path.join(root, 'private'));
  await symlink(path.join(workspace, 'qa/src/pay.js'), path.join(root, 'private/evidence.js'));
  map.mappings[0].evidence[0].file = 'private/evidence.js';
  const status = await inspectMap(map, root);
  assert.ok(status.unavailable.some((entry) => entry.repo === 'api' && /escapes/.test(entry.reason)));
  assert.equal(queryMap(map, status, { token }).matches.length, 0);
});

test('final documentation reconciliation clears staleness only after reassessment and leaves source/tests intact', async (t) => {
  const { root, map } = await fixture(t);
  const doc = '.claude/skills/uc-01-pay/SKILL.md';
  await mkdir(path.join(root, '.claude/skills/uc-01-pay'), { recursive: true });
  await writeFile(path.join(root, doc), 'Pay returns one.\n');
  for (const mapping of map.mappings) mapping.evidence.push({ repo: 'api', file: doc, symbol: 'Pay', reason: 'Describes the asserted payment result.' });
  map.decisions.push({ test: 'qa-pay', token, choice: 'confirm', reason: 'Reviewed payment behavior.' });
  map.snapshots = (await inspectMap(map, root)).snapshots;
  const source = await readFile(path.join(root, 'src/pay.js'));
  const tests = await readFile(path.join(root, 'test/pay.test.js'));
  const before = serializeMap(map);
  await writeFile(path.join(root, doc), 'Clarification: pay returns one for UC-01, not UC-02.\n');
  const status = await inspectMap(map, root);
  assert.deepEqual(status.staleTests, ['local-pay', 'qa-pay']);
  assert.equal(serializeMap(map), before); // inspection never blesses changed docs
  assert.equal(queryMap(map, status, { token }).matches.length, 0);
  // Fixture assertions and code still return one; only their explanation changed.
  for (const mapping of map.mappings) mapping.evidence.at(-1).reason = 'The clarified UC-01 text still describes the asserted return value of one.';
  map.snapshots = status.snapshots;
  map.discovery = status.discovery;
  await mkdir(path.join(root, '.claude/testing'), { recursive: true });
  await writeFile(path.join(root, '.claude/testing/test-map.json'), serializeMap(map));
  const current = await inspectMap(map, root);
  assert.deepEqual(current.refresh, []);
  assert.equal(queryMap(map, current, { token }).matches.length, 2);
  assert.equal(map.decisions[0].choice, 'confirm');
  assert.deepEqual(await readFile(path.join(root, 'src/pay.js')), source);
  assert.deepEqual(await readFile(path.join(root, 'test/pay.test.js')), tests);
});

test('a repo without commits can establish a nonempty working-file inventory', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'test-map-unborn-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  git(root, 'init', '-q');
  await writeFile(path.join(root, 'test.js'), 'assert.ok(true);\n');
  const snapshot = await snapshotRepo(root);
  assert.equal(snapshot.head, 'unborn');
  assert.ok(snapshot.files['test.js']);
});

test('CLI validates/query snapshots without writes and reports missing/malformed maps actionably', async (t) => {
  const { root, map } = await fixture(t);
  const helper = fileURLToPath(new URL('./test-map.mjs', import.meta.url));
  const result = JSON.parse(execFileSync(process.execPath, [helper, 'query', '--root', root, '--map', '-', '--token', token], { input: serializeMap(map), encoding: 'utf8' }));
  assert.equal(result.matches.length, 2);
  assert.throws(() => execFileSync(process.execPath, [helper, 'inspect', '--root', root], { stdio: 'pipe' }), /Command failed/);
  assert.equal((await inspectMap(map, root)).refresh.length, 0);
});
