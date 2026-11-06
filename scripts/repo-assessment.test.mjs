import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { boundedSearch, collectAssessments, ownerEvidence, repositoryInventory, searchExecutable, writeAssessmentReport } from './repo-assessment.mjs';
async function requireRipgrep() {
  assert.ok(await searchExecutable(), 'Search integration tests require ripgrep (rg) on PATH. Install ripgrep before running this suite.');
}
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
test('artifact helpers execute when their plugin directory is reached through a symlink', async (t) => {
  const { root } = await fixture(t);
  const alias = path.join(root, 'helper-alias');
  await symlink(import.meta.dirname, alias);
  const stdout = execFileSync(process.execPath, [path.join(alias, 'repo-assessment.mjs'), 'inventory', '--root', root], { encoding: 'utf8' });
  assert.deepEqual(JSON.parse(stdout).map((repo) => repo.id), ['app']);
});
test('owner metadata keeps catalog accountability and both CODEOWNERS sources separate', async (t) => {
  const { repo } = await fixture(t); await mkdir(path.join(repo, '.github'));
  await writeFile(path.join(repo, 'catalog-info.yaml'), 'spec:\n  owner: group:payments\n  system: payroll\n');
  await writeFile(path.join(repo, 'CODEOWNERS'), '* @root-team\n'); await writeFile(path.join(repo, '.github/CODEOWNERS'), '/src/ @reviewers\n');
  const owners = await ownerEvidence(repo); assert.equal(owners.length, 4); assert.equal(owners[0].value, 'group:payments');
  assert.equal(owners.filter((entry) => entry.kind === 'review-rule').length, 2);
});
test('search respects total line budgets, preserves exact patterns as data and reports truncation', async (t) => {
  await requireRipgrep();
  const { repo } = await fixture(t); await writeFile(path.join(repo, 'many.txt'), Array.from({ length: 80 }, () => 'exactConcept').join('\n'));
  const result = await boundedSearch(repo, ['exactConcept']); assert.equal(result.matches.length, 60); assert.equal(result.complete, false);
  const literal = await boundedSearch(repo, ['$(touch must-not-exist)']); assert.equal(literal.matches.length, 0); assert.equal(literal.complete, true);
});
test('assessment visits each repo once and retains named missing repositories as unavailable', async (t) => {
  await requireRipgrep();
  const { root } = await fixture(t);
  const result = await collectAssessments(root, { terms: ['exactConcept'], named_repos: ['app', 'missing', 'missing'] });
  assert.equal(result.assessments.length, 2); assert.equal(result.assessments.find((r) => r.id === 'missing').status, 'Not assessed / unavailable');
  assert.equal(result.assessments.find((r) => r.id === 'app').searches[0].matches.length, 1);
});

test('workspace metadata keeps absent checkouts in inventory, collection and the saved report table', async (t) => {
  const { root } = await fixture(t);
  await writeFile(path.join(root, 'CLAUDE.md'), '# Workspace\n\n| Repo | Purpose |\n|---|---|\n| `app` | Live app |\n| `archive-service` | Not yet checked out |\n');
  const inventory = await repositoryInventory(root);
  assert.deepEqual(inventory.map((repo) => repo.id), ['app', 'archive-service']);
  assert.equal(inventory[1].unavailable, 'absent on disk');
  const collection = await collectAssessments(root, { terms: ['exactConcept'] });
  assert.equal(collection.assessments.find((repo) => repo.id === 'archive-service').status, 'Not assessed / unavailable');
  const spec = { ticket: 'EX-1', markdown: '# Shortlist\nStatus: Pending review\n\n## Assessment Evidence\n\nStale partial table.\n\n## Excluded\n\nUser annotation to retain.\n',
    assessments: [{ id: 'app', status: 'Definite', docs: 'README.md', search: 'exactConcept: source.js:1' },
      { id: 'archive-service', status: 'Definite', search: 'Invented search' }] };
  const result = await writeAssessmentReport(root, spec);
  const markdown = await readFile(result.file, 'utf8');
  assert.match(markdown, /\| app \| Definite \|/);
  assert.match(markdown, /\| archive-service \| Not assessed \/ unavailable \| Unknown \| None \| None \| Not searched \| absent on disk; CLAUDE.md:6 \|/);
  assert.doesNotMatch(markdown, /Invented search|Stale partial/);
  assert.match(markdown, /## Excluded\n\nUser annotation to retain/);
  spec.assessments = [];
  await writeAssessmentReport(root, spec);
  assert.match(await readFile(result.file, 'utf8'), /\| app \| Not assessed \/ unavailable \|/);
  await assert.rejects(writeAssessmentReport(root, { ...spec, report_path: '../escape.md' }), /inside make-it-work/);
});
