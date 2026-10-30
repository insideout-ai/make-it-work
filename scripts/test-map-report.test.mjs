import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, stat, rm, rename, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { REPORT_PATH, renderTestMap, reportMain } from './test-map-report.mjs';
import { serializeMap, validateMap } from './test-map.mjs';

function example() {
  return {
    schemaVersion: 1, productRepo: 'api', tokens: ['api:UC-01', 'api:UC-02', 'api:UC-03'],
    repos: [{ id: 'api', root: '.' }, { id: 'qa', root: '../qa' }],
    locations: [
      { id: 'local', repo: 'api', paths: ['src'], config: [], complete: false, assessedTokens: ['api:UC-01', 'api:UC-02'] },
      { id: 'qa', repo: 'qa', paths: ['tests'], config: [], complete: true, assessedTokens: ['api:UC-01'] },
    ],
    tests: [
      { id: 'a', location: 'local', file: 'src/pay.component.test.js', identity: 'pays | safely', placement: 'separate', granularity: 'test', selector: '-t "pays"', layer: 'Component' },
      { id: 'b', location: 'qa', file: 'tests/pay test.js', identity: 'pays externally', placement: 'separate', granularity: 'suite', selector: null, layer: 'E2E' },
      { id: 'c', location: 'local', file: 'src/math.js', identity: 'embedded calculation', placement: 'embedded', granularity: 'test', selector: null },
    ],
    mappings: [
      { test: 'a', token: 'api:UC-01', status: 'mapped', source: 'inferred', evidence: [{ repo: 'api', file: 'src/pay.js', symbol: 'pay', reason: 'Asserts payment completion.' }] },
      { test: 'b', token: 'api:UC-01', status: 'unresolved', source: 'inferred', reason: 'Payment backend is mocked.', evidence: [] },
    ],
    decisions: [], snapshots: {}, discovery: {},
  };
}

test('layers are explicit and old maps display Unknown without guessing from filenames', () => {
  const map = example(), before = serializeMap(map);
  delete map.tests[0].layer;
  const report = renderTestMap(map);
  assert.match(report, /\| Unknown \| 2 \|/);
  assert.doesNotMatch(report, /\| Component \|/);
  assert.match(report, /Layer classification needed/);
  assert.equal(map.tests[0].layer, undefined);
  map.tests[0].layer = 'Component';
  assert.equal(serializeMap(map), before);
  for (const layer of ['', ' Unit', 'Unit\nE2E', 123, null]) {
    map.tests[0].layer = layer;
    assert.throws(() => validateMap(map), /Invalid test layer/);
  }
});

test('reports preserve incomplete assessment, exact evidence, separate layers and relative cross-repo links', () => {
  const map = example();
  const report = renderTestMap(map, { labels: { 'api:UC-01': { title: 'UC-01: Pay', file: '.claude/skills/uc-01-pay/SKILL.md' } } });
  assert.match(report, /\| 3 \| 1 \| 1 \| 1 of 3 \|/);
  assert.match(report, /\| Component \| 1 \|/);
  assert.match(report, /\| E2E \| 1 \|/);
  assert.match(report, /Discovery is incomplete/);
  assert.match(report, /Partially assessed/);
  assert.match(report, /Not assessed/);
  assert.match(report, /not sufficient coverage or passing results/);
  assert.match(report, /Payment backend is mocked/);
  assert.match(report, /Asserts payment completion/);
  assert.ok(report.includes('[.claude/testing/test-map.json](<test-map.json>)'));
  assert.ok(report.includes('[src/pay.component.test.js](<../../src/pay.component.test.js>)'));
  assert.ok(report.includes('[UC-01: Pay](<../skills/uc-01-pay/SKILL.md>)'));
  assert.match(report, /\.\.\/\.\.\/\.\.\/qa\/tests\/pay%20test\.js/);
  assert.match(report, /pays \\\| safely/);
  assert.match(report, /<details>\n<summary>Open catalog/);
  assert.equal((report.match(/<details>/g) ?? []).length, (report.match(/<\/details>/g) ?? []).length);
  assert.equal(renderTestMap(map), renderTestMap(JSON.parse(serializeMap(map))));
});

test('user rejections suppress relationships while preserving their explanation in the appendix', () => {
  const map = example();
  map.decisions.push({ test: 'a', token: 'api:UC-01', choice: 'reject', reason: 'Only checks a label.' });
  const report = renderTestMap(map);
  assert.match(report, /\| 3 \| 0 \| 1 \| 1 of 3 \|/);
  assert.match(report, /rejected by user \(excluded\)/);
  assert.match(report, /Only checks a label/);
  assert.doesNotMatch(report, /— 1 mapped entry/);
});

test('an empty or vocabulary-free map does not claim complete coverage', () => {
  const map = example();
  map.tests = []; map.mappings = []; map.tokens = [];
  map.locations.forEach((location) => { location.assessedTokens = []; });
  const report = renderTestMap(map);
  assert.match(report, /Product mapping pending/);
  assert.match(report, /No indexed entries/);
  assert.match(report, /Incomplete discovery and unassessed features may still require assessment/);
});

test('markup in test identities, reasons and selectors cannot break report tables or inject HTML', () => {
  const map = example();
  map.tests[0].identity = '<details> | [unexpected](https://example.test)';
  map.tests[0].selector = '-t "</code><script>bad()</script>"';
  map.mappings[1].reason = '```\n<script>bad()</script> | reason';
  const report = renderTestMap(map);
  assert.doesNotMatch(report, /<script>|\[unexpected\]\(https/);
  assert.match(report, /&lt;script&gt;/);
  assert.match(report, /\\\| reason/);
});

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'map-report-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, '.claude/testing'), { recursive: true });
  const map = example();
  await writeFile(path.join(root, '.claude/testing/test-map.json'), serializeMap(map));
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ scripts: { 'test:map': 'node scripts/test-map-report.mjs --write' } }));
  return root;
}

test('CLI writes only on --write, checks drift, updates layer counts and leaves JSON untouched', async (t) => {
  const root = await fixture(t), args = ['--root', root];
  const source = path.join(root, '.claude/testing/test-map.json');
  const original = await readFile(source, 'utf8');
  const printed = await reportMain(args);
  assert.match(printed, /npm run test:map/);
  await assert.rejects(stat(path.join(root, REPORT_PATH)), { code: 'ENOENT' });
  await assert.rejects(reportMain([...args, '--check']), /missing or stale/);
  assert.match(await reportMain([...args, '--write']), /Generated/);
  await assert.rejects(stat(path.join(root, 'TEST-MAP.md')), { code: 'ENOENT' });
  assert.equal(path.dirname(path.join(root, REPORT_PATH)), path.dirname(source));
  const before = await stat(path.join(root, REPORT_PATH));
  assert.equal(await readFile(path.join(root, REPORT_PATH), 'utf8'), printed);
  assert.match(await reportMain([...args, '--write']), /already up to date/);
  assert.equal((await stat(path.join(root, REPORT_PATH))).mtimeMs, before.mtimeMs);
  assert.match(await reportMain([...args, '--check']), /up to date/);
  assert.equal(await readFile(source, 'utf8'), original);
  const changed = JSON.parse(original); changed.tests[0].layer = 'Integration';
  await writeFile(source, serializeMap(changed));
  await assert.rejects(reportMain([...args, '--check']), /missing or stale/);
  await reportMain([...args, '--write']);
  assert.match(await readFile(path.join(root, REPORT_PATH), 'utf8'), /\| Integration \| 1 \|/);
  await assert.rejects(reportMain([...args, '--write', '--check']), /Usage/);
});

test('report output cannot overwrite a symlink target', async (t) => {
  const root = await fixture(t);
  const target = path.join(root, 'source.md');
  const original = await reportMain(['--root', root]);
  await writeFile(target, original);
  await symlink(target, path.join(root, REPORT_PATH));
  await assert.rejects(reportMain(['--root', root, '--write']), /regular file/);
  await assert.rejects(reportMain(['--root', root, '--check']), /regular file/);
  assert.equal(await readFile(target, 'utf8'), original);
});

test('a legacy root report neither satisfies the canonical check nor gets overwritten during generation', async (t) => {
  const root = await fixture(t);
  const map = JSON.parse(await readFile(path.join(root, '.claude/testing/test-map.json'), 'utf8'));
  const legacy = renderTestMap(map, { root, reportPath: 'TEST-MAP.md' });
  await writeFile(path.join(root, 'TEST-MAP.md'), legacy);
  await assert.rejects(reportMain(['--root', root, '--check']), /\.claude\/testing\/TEST-MAP.md is missing or stale/);
  await reportMain(['--root', root, '--write']);
  assert.equal(await readFile(path.join(root, 'TEST-MAP.md'), 'utf8'), legacy);
  assert.ok((await readFile(path.join(root, REPORT_PATH), 'utf8')).includes('](<test-map.json>)'));
});

test('nested output refuses a symlinked metadata directory without writing outside the product repo', async (t) => {
  const root = await fixture(t);
  const outside = await mkdtemp(path.join(os.tmpdir(), 'map-report-outside-'));
  t.after(() => rm(outside, { recursive: true, force: true }));
  const moved = path.join(outside, 'testing');
  await rename(path.join(root, '.claude/testing'), moved);
  await symlink(moved, path.join(root, '.claude/testing'), 'dir');
  await assert.rejects(reportMain(['--root', root, '--write']), /real directory under the product repo/);
  await assert.rejects(stat(path.join(moved, 'TEST-MAP.md')), { code: 'ENOENT' });
});
