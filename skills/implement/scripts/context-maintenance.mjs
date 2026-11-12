import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { digest, fail, requireText } from '../../../scripts/lib/artifacts.mjs';
import { validateMap, MAP_PATH, REPORT_PATH } from '../../../scripts/test-map.mjs';

// Mechanical proof of the declared scope, not proof of semantic completeness.
export async function assessContextMaintenance(root, repoRoots, records) {
  const roots = await Promise.all(repoRoots.map(value => realpath(value)));
  if (!Array.isArray(records) || records.length !== roots.length) fail('test_map_maintenance must contain one assessment per approved repository.');
  const seen = new Set(), result = [];
  for (const record of records) {
    const repo = await realpath(record.repo);
    if (!roots.includes(repo) || seen.has(repo)) fail('Maintenance assessment must use each approved repository exactly once.');
    seen.add(repo);
    if (!['maintained', 'blocked', 'not-applicable'].includes(record.status)) fail('Invalid test-map maintenance status.');
    requireText(record.reason, 'Maintenance result or concrete blocker');
    if (!Array.isArray(record.affected_tests) || record.affected_tests.some(file => typeof file !== 'string' || !file || path.isAbsolute(file) || file.split('/').includes('..'))) fail('affected_tests must be repository-relative test paths.');
    let strategy = '';
    try { strategy = await readFile(path.join(repo, '.claude/skills/test-strategy/SKILL.md'), 'utf8'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const applicable = /^## Test Map\s*$/m.test(strategy);
    if (record.status === 'not-applicable' && applicable) fail('A current test strategy requires maintained mappings or an evidenced blocker; advisory severity does not waive maintenance.');
    const evidence = [];
    if (record.status !== 'not-applicable') {
      if (!Array.isArray(record.evidence) || !record.evidence.length) fail('Maintenance requires retained evidence paths.');
      for (const relative of record.evidence) {
        if (typeof relative !== 'string' || path.isAbsolute(relative)) fail('Maintenance evidence paths must be relative to the artifact root.');
        const file = await realpath(path.resolve(root, relative));
        if (![root, ...roots].some(base => file.startsWith(`${base}${path.sep}`))) fail('Maintenance evidence escapes approved roots.');
        evidence.push({ path: relative, sha256: digest(await readFile(file)) });
      }
    }
    if (record.status === 'maintained') {
      const bytes = await readFile(path.join(repo, MAP_PATH));
      const map = JSON.parse(bytes); validateMap(map);
      for (const file of record.affected_tests) {
        if (!map.tests.some(test => test.file === file && map.locations.some(location => location.id === test.location && location.repo === map.productRepo))) fail(`Affected test is absent from the maintained map: ${file}`);
      }
      evidence.push({ path: path.relative(root, path.join(repo, MAP_PATH)), sha256: digest(bytes) });
      evidence.push({ path: path.relative(root, path.join(repo, REPORT_PATH)), sha256: digest(await readFile(path.join(repo, REPORT_PATH))) });
    }
    result.push({ repo, status: record.status, reason: record.reason, affected_tests: [...new Set(record.affected_tests)], evidence, strategy_sha256: strategy ? digest(strategy) : null });
  }
  return result;
}

export async function checkContextMaintenance(root, fields) {
  if (fields.review_context_version !== '2') return [];
  const records = JSON.parse(fields.test_map_maintenance ?? '[]');
  if (!records.length) fail('Test-map maintenance assessment is missing.');
  for (const record of records) {
    let strategy = '';
    try { strategy = await readFile(path.join(record.repo, '.claude/skills/test-strategy/SKILL.md'), 'utf8'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if ((strategy ? digest(strategy) : null) !== record.strategy_sha256) fail('Test-strategy registration changed; reassess test-map maintenance.');
    for (const item of record.evidence) {
      if (digest(await readFile(path.resolve(root, item.path))) !== item.sha256) fail('Test-map maintenance evidence changed; reassess context before review or final sync.');
    }
  }
  return records;
}
