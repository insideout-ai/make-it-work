import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { digest, fail, requireText } from '../../../scripts/lib/artifacts.mjs';

// Bind the parent's minimum context to a review target. Selection and semantic
// assessment remain model work; a hash is not proof that a rule was understood.
export async function reviewRequirements(repoRoots, records, maintenance = []) {
  const roots = await Promise.all(repoRoots.map(root => realpath(root)));
  if (!Array.isArray(records) || records.length !== roots.length) fail('review_requirements must contain one context selection per approved repository.');
  const seen = new Set(), result = [];
  for (const entry of records) {
    const repo = await realpath(entry.repo);
    if (!roots.includes(repo) || seen.has(repo)) fail('Review requirements must use each approved repository exactly once.');
    seen.add(repo); requireText(entry.reason, 'Required review context rationale');
    if (!Array.isArray(entry.skills)) fail('Review requirements need selected skill names and loading methods.');
    const selected = [...entry.skills];
    let strategy = '';
    try { strategy = await readFile(path.join(repo, '.claude/skills/test-strategy/SKILL.md'), 'utf8'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (strategy && !selected.some(s => s.name === 'test-strategy')) selected.push({ name: 'test-strategy', method: 'Read' });
    const skills = [];
    for (const skill of selected) {
      if (!/^[a-z0-9][a-z0-9-]*$/.test(skill.name ?? '') || !['Skill', 'Read'].includes(skill.method) || skills.some(s => s.name === skill.name)) fail('Required skills need unique names and the repository-prescribed Skill or Read method.');
      const relative = `.claude/skills/${skill.name}/SKILL.md`;
      const file = await realpath(path.join(repo, relative));
      if (!file.startsWith(`${repo}${path.sep}`)) fail('Required review skill escapes the approved repository.');
      const bytes = await readFile(file, 'utf8');
      skills.push({ name: skill.name, method: skill.method, path: relative, sha256: digest(bytes), lines: bytes.split(/\r?\n/).length });
    }
    result.push({ repo, reason: entry.reason, skills,
      test_map: { required: /^## Test Map\s*$/m.test(strategy), affected_tests: maintenance.find(m => m.repo === repo)?.affected_tests ?? [] } });
  }
  return result;
}

export function validateReviewChecks(checks, requirements) {
  if (!Array.isArray(checks) || checks.length !== requirements.length) fail('review_checks must assess required skills/rules and mappings for every repository before returning a completed review.');
  const seen = new Set();
  for (const required of requirements) {
    const check = checks.find(c => c.repo === required.repo);
    if (!check || seen.has(check.repo)) fail('Review checks must match the approved required context.');
    seen.add(check.repo);
    if (!Array.isArray(check.skills)) fail('Review checks need skill rule applications, not only loaded names.');
    for (const skill of required.skills) {
      const loaded = check.skills.find(s => s.name === skill.name);
      if (!loaded || loaded.method !== skill.method || loaded.sha256 !== skill.sha256 || !loaded.rules?.length) fail(`Complete ${skill.name} loading and apply its relevant rules before completing this review.`);
      for (const rule of loaded.rules) {
        if (!Number.isSafeInteger(rule.line) || rule.line < 1 || rule.line > skill.lines || !['satisfied', 'finding', 'limitation'].includes(rule.result)) fail('Skill rule assessments need valid source lines and a result.');
        requireText(rule.rule, 'Applied skill rule'); requireText(rule.observation, 'Actual code/test check and result');
      }
    }
    const map = check.test_map;
    if (!map || !(required.test_map.required ? ['assessed'] : ['assessed', 'not-applicable']).includes(map.status)) fail('Assess the affected test mappings or return the documented blocked handoff; a review limitation cannot waive the required assessment.');
    requireText(map.note, 'Mapping assessment evidence or actual non-applicability reason');
    if (!Array.isArray(map.tests)) fail('Mapping assessment needs affected-test observations.');
    for (const file of required.test_map.affected_tests) {
      const test = map.tests.find(t => t.file === file);
      if (!test || !['current', 'stale', 'unresolved', 'unmapped'].includes(test.result)) fail(`Assess the assertions and current mapping evidence for ${file}.`);
      requireText(test.observation, 'Assertion-to-feature mapping observation');
    }
  }
  return checks;
}

export function reviewChecksText(checks) {
  if (!checks?.length) return '';
  if (!Array.isArray(checks)) fail('review_checks must be an array.');
  return checks.flatMap(c => [
    ...(c.skills ?? []).flatMap(s => (s.rules ?? []).map(r => `- ${s.name} (${s.method}, line ${r.line}): ${r.rule} — ${r.observation} [${r.result}]`)),
    `- Test mapping: ${c.test_map?.status ?? 'not-recorded'} — ${c.test_map?.note ?? 'Assessment missing'}`,
    ...(c.test_map?.tests ?? []).map(t => `- ${t.file}: ${t.result} — ${t.observation}`),
  ]).join('\n');
}
