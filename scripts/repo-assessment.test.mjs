import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { boundedSearch, collectAssessments, ownerEvidence, repositoryInventory } from './repo-assessment.mjs';
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'repo-assess-')); t.after(() => rm(root, { recursive: true, force: true }));
  const repo = path.join(root, 'app'); await mkdir(repo);
  const git = (...argv) => execFileSync('git', ['-C', repo, ...argv], { stdio: 'pipe' });
  git('init'); git('config', 'user.email', 'test@example.invalid'); git('config', 'user.name', 'Test');
  await writeFile(path.join(repo, 'source.js'), 'const exactConcept = true;'); git('add', '.'); git('commit', '-m', 'source');
  return { root, repo, git };
}
test('inventory handles git directories and worktree git files without traversing arbitrary ancestors', async (t) => {
  const { root, repo, git } = await fixture(t); git('worktree', 'add', '--detach', path.join(root, 'worktree'));
  const inventory = await repositoryInventory(root); assert.equal(inventory.length, 2); assert.equal(inventory.find((r) => r.id === 'worktree').git_kind, 'file');
  assert.equal((await repositoryInventory(repo)).length, 1);
});
test('owner metadata keeps catalog accountability and both CODEOWNERS sources separate', async (t) => {
  const { repo } = await fixture(t); await mkdir(path.join(repo, '.github'));
  await writeFile(path.join(repo, 'catalog-info.yaml'), 'spec:\n  owner: group:payments\n  system: payroll\n');
  await writeFile(path.join(repo, 'CODEOWNERS'), '* @root-team\n'); await writeFile(path.join(repo, '.github/CODEOWNERS'), '/src/ @reviewers\n');
  const owners = await ownerEvidence(repo); assert.equal(owners.length, 4); assert.equal(owners[0].value, 'group:payments');
  assert.equal(owners.filter((entry) => entry.kind === 'review-rule').length, 2);
});
test('search respects total line budgets, preserves exact patterns as data and reports truncation', async (t) => {
  const { repo } = await fixture(t); await writeFile(path.join(repo, 'many.txt'), Array.from({ length: 80 }, () => 'exactConcept').join('\n'));
  const result = await boundedSearch(repo, ['exactConcept']); assert.equal(result.matches.length, 60); assert.equal(result.complete, false);
  const literal = await boundedSearch(repo, ['$(touch must-not-exist)']); assert.equal(literal.matches.length, 0); assert.equal(literal.complete, true);
});
test('assessment visits each repo once and retains named missing repositories as unavailable', async (t) => {
  const { root } = await fixture(t);
  const result = await collectAssessments(root, { terms: ['exactConcept'], named_repos: ['app', 'missing', 'missing'] });
  assert.equal(result.assessments.length, 2); assert.equal(result.assessments.find((r) => r.id === 'missing').status, 'Not assessed / unavailable');
  assert.equal(result.assessments.find((r) => r.id === 'app').searches[0].matches.length, 1);
});
