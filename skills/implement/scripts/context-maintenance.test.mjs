import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, realpath } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import test from 'node:test';
import { assessContextMaintenance, checkContextMaintenance } from './context-maintenance.mjs';

test('current strategy cannot be waived as advisory; declared affected tests need actual map entries', async (t) => {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'map-maintenance-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, '.claude/skills/test-strategy'), { recursive: true });
  await mkdir(path.join(root, '.claude/testing'), { recursive: true });
  await writeFile(path.join(root, '.claude/skills/test-strategy/SKILL.md'), '# Strategy\n\n## Test Map\n');
  await writeFile(path.join(root, 'maintenance.txt'), 'Assessed only the new feature tests; baseline remains incomplete.');
  const record = { repo: root, status: 'not-applicable', affected_tests: ['test/new.test.js'], reason: 'Advisory finding', evidence: ['maintenance.txt'] };
  await assert.rejects(assessContextMaintenance(root, [root], []), /one assessment/);
  await assert.rejects(assessContextMaintenance(root, [root], [record]), /advisory severity/);
  record.status = 'maintained';
  const map = { schemaVersion: 1, productRepo: 'app', repos: [{ id: 'app', root: '.' }], tokens: [],
    locations: [{ id: 'local', repo: 'app', complete: false, paths: ['test'], config: [], assessedTokens: [] }],
    tests: [], mappings: [], decisions: [], snapshots: {} };
  const file = path.join(root, '.claude/testing/test-map.json');
  await writeFile(file, JSON.stringify(map)); await writeFile(path.join(root, '.claude/testing/TEST-MAP.md'), '# Test map\n');
  await assert.rejects(assessContextMaintenance(root, [root], [record]), /Affected test is absent/);
  map.tests.push({ id: 'new', location: 'local', file: 'test/new.test.js', identity: 'normal and absent cases', placement: 'separate', granularity: 'test', selector: null });
  await writeFile(file, JSON.stringify(map));
  const saved = await assessContextMaintenance(root, [root], [record]);
  const fields = { review_context_version: '2', test_map_maintenance: JSON.stringify(saved) };
  assert.deepEqual(await checkContextMaintenance(root, fields), saved);
  assert.deepEqual(JSON.parse(await readFile(file, 'utf8')).snapshots, {});
  await writeFile(file, JSON.stringify({ ...map, complete: true }));
  await assert.rejects(checkContextMaintenance(root, fields), /evidence changed/);
  record.status = 'blocked'; record.reason = 'Registered external test location is inaccessible; selection remains unresolved';
  const blocked = await assessContextMaintenance(root, [root], [record]);
  assert.equal(blocked[0].status, 'blocked');
  await assert.rejects(assessContextMaintenance(root, [root], [{ ...record, evidence: [] }]), /retained evidence/);
});
