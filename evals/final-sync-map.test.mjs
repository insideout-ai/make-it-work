import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { inspectMap, queryMap, serializeMap, validateMap } from '../scripts/test-map.mjs';
import { gradeHeadlessLocal, parseGrader, transcriptContext } from './grade-headless.mjs';

const base = path.dirname(fileURLToPath(import.meta.url));
async function fixture(t, name) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'final-sync-map-eval-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const dir = path.join(base, 'implement', name);
  execFileSync('bash', [path.join(dir, 'fixture.sh')], { cwd: root });
  const mapPath = path.join(root, '.claude/testing/test-map.json');
  const map = validateMap(JSON.parse(await readFile(mapPath, 'utf8')));
  return { root, dir, mapPath, map };
}

test('current final-sync fixture has a reusable baseline and only changed doc evidence becomes targeted', async (t) => {
  const { root, map } = await fixture(t, 'final-sync-map');
  assert.deepEqual((await inspectMap(map, root)).refresh, []);
  const doc = path.join(root, '.claude/skills/domain-demo/SKILL.md');
  await writeFile(doc, await readFile(doc, 'utf8') + '\nOnly members are allowed; other roles are denied.\n');
  const after = await inspectMap(map, root);
  assert.equal(after.refresh[0].mode, 'targeted');
  assert.deepEqual(after.staleTests, ['policy-members']);
});

test('partial final-sync fixture permits bounded additions while queries retain baseline uncertainty', async (t) => {
  const { root, dir, mapPath, map } = await fixture(t, 'final-sync-partial-map');
  const before = structuredClone(map);
  const inspection = await inspectMap(map, root);
  assert.equal(inspection.refresh[0].reason, 'baseline missing');
  assert.deepEqual(inspection.staleTests, ['policy-members', 'privacy-hidden']);
  const context = transcriptContext(JSON.stringify({ type: 'result', result: 'Local fixture/grader verification; no model was run.' }), root);
  const grade = async (name) => gradeHeadlessLocal(parseGrader(
    await readFile(path.join(dir, 'graders', name), 'utf8'), name), context);
  assert.equal((await grade('partial-map.md')).passed, false);
  const files = ['src/policy.js', 'src/privacy.js', 'test/policy.test.js', 'test/privacy.test.js', 'test/policy-boundary.test.js'];
  const original = await Promise.all(files.map((file) => readFile(path.join(root, file), 'utf8')));

  const id = 'policy-boundary';
  map.tests.push({ ...map.tests[0], id, file: 'test/policy-boundary.test.js', identity: 'unknown roles cannot proceed', selector: 'test/policy-boundary.test.js', layer: 'Unit' });
  map.mappings.push({ ...map.mappings[0], test: id, evidence: map.mappings[0].evidence.map((entry) => ({ ...entry,
    reason: entry.file === 'src/policy.js' ? 'The assertion checks that an unknown role is denied by the member-only policy.' : entry.reason })) });
  await writeFile(mapPath, serializeMap(validateMap(map)));
  execFileSync(process.execPath, [path.join(base, '../scripts/test-map-report.mjs'), '--root', root, '--write']);
  assert.equal((await grade('partial-map.md')).passed, true);
  assert.equal((await grade('report.md')).passed, true);
  const after = await inspectMap(map, root);
  const query = queryMap(map, after, { token: map.tokens[0] });
  assert.equal(query.matches.length, 0);
  assert.ok(query.unresolved.length > 0);
  assert.deepEqual(map.snapshots, {});
  assert.deepEqual(map.discovery, before.discovery);
  assert.deepEqual(map.locations, before.locations);
  assert.deepEqual(map.decisions, before.decisions);
  assert.deepEqual(map.tests.find((entry) => entry.id === 'privacy-hidden'), before.tests[1]);
  assert.deepEqual(map.mappings.find((entry) => entry.test === 'privacy-hidden'), before.mappings[1]);
  assert.deepEqual(await Promise.all(files.map((file) => readFile(path.join(root, file), 'utf8'))), original);
  map.locations[0].complete = true;
  await writeFile(mapPath, serializeMap(map));
  assert.equal((await grade('partial-map.md')).passed, false);
});
