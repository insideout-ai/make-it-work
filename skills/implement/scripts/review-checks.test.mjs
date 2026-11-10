import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { reviewRequirements, validateReviewChecks } from './review-checks.mjs';

test('completed reviews require applied skill rules and bounded mapping assessment; stale mappings remain qualified', async t => {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'review-checks-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [name, text] of [['domain-sessions', '# Sessions\nKeep session details when calendar lookup fails.\n'], ['test-strategy', '# Strategy\n## Test Map\nAssess actual assertions and retain unknown freshness.\n']]) {
    await mkdir(path.join(root, '.claude/skills', name), { recursive: true });
    await writeFile(path.join(root, '.claude/skills', name, 'SKILL.md'), text);
  }
  const req = await reviewRequirements([root], [{ repo: root, reason: 'Session detail changes', skills: [{ name: 'domain-sessions', method: 'Skill' }] }], [{ repo: root, affected_tests: ['src/session.test.js'] }]);
  assert.deepEqual(req[0].skills.map(s => s.name), ['domain-sessions', 'test-strategy']);
  const checks = [{ repo: root, skills: req[0].skills.map(s => ({ name: s.name, method: s.method, sha256: s.sha256,
    rules: [{ line: 2, rule: 'Keep documented session and testing behavior', observation: 'Inspected the fallback assertion and its session relationship', result: 'satisfied' }] })),
    test_map: { status: 'assessed', note: 'Affected assertions map to the session flow; persistent freshness is uncertain.', tests: [{ file: 'src/session.test.js', result: 'stale', observation: 'Assertion verifies session-only fallback; retained baseline is stale' }] } }];
  assert.deepEqual(validateReviewChecks(checks, req), checks);
  for (const change of [c => c[0].skills.pop(), c => c[0].skills[0].rules = [], c => c[0].skills[0].method = 'Read', c => c[0].test_map.status = 'blocked', c => c[0].test_map.tests = []]) {
    const invalid = structuredClone(checks); change(invalid); assert.throws(() => validateReviewChecks(invalid, req));
  }
  assert.throws(() => validateReviewChecks([], req), /every repository/);
  assert.equal(await readFile(path.join(root, '.claude/skills/domain-sessions/SKILL.md'), 'utf8'), '# Sessions\nKeep session details when calendar lookup fails.\n');
});
