import { artifactJoin } from '../../../scripts/lib/artifact-path.mjs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { prepareScope, approveScope, runScope, readScope, approvedScope } from './workspace-scope.mjs';
import { initializeWorkflow, applyWorkflow } from './workflow.mjs';
import { digest } from '../../../scripts/lib/artifacts.mjs';

const git = (root, ...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: 'pipe' }).trim();
async function fixture(t) {
  const root = await realpath(await mkdtemp(artifactJoin(os.tmpdir(), 'workspace-scope-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [id, base] of [['api', 'main'], ['web', 'develop'], ['unrelated', 'main']]) {
    const repo = artifactJoin(root, id); await mkdir(repo);
    git(repo, 'init', '-b', base); git(repo, 'config', 'user.name', 'Test'); git(repo, 'config', 'user.email', 'test@example.invalid');
    await writeFile(artifactJoin(repo, 'source.txt'), 'baseline'); git(repo, 'add', '.'); git(repo, 'commit', '-m', 'baseline');
    git(repo, 'update-ref', 'refs/remotes/origin/' + base, 'HEAD'); git(repo, 'symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/' + base);
  }
  await mkdir(artifactJoin(root, 'make-it-work/DEMO'), { recursive: true });
  const report = 'make-it-work/DEMO/DEMO-repos.md'; await writeFile(artifactJoin(root, report), '# Repo Shortlist — DEMO\n');
  const input = { ticket: 'DEMO', report, repos: [{ id: 'api', reason: 'source.txt:1 policy' }, { id: 'web', reason: 'source.txt:1 display' }] };
  return { root, input };
}
const consent = { source: 'user', via: 'chat' };
async function applySelection(root, input) {
  const preview = await prepareScope(root, input);
  await approveScope(root, 'DEMO', preview.hash, consent);
  await runScope(root, 'DEMO', preview.hash);
  return preview;
}
test('no branch mutation before exact user approval, including automated sources', async (t) => {
  const { root, input } = await fixture(t), preview = await prepareScope(root, input);
  assert.equal(git(artifactJoin(root, 'api'), 'branch', '--show-current'), 'main');
  await assert.rejects(runScope(root, 'DEMO', preview.hash), /Explicit approval/);
  await assert.rejects(approveScope(root, 'DEMO', preview.hash, { source: 'autopilot', via: 'chat' }), /explicit user/);
  await assert.rejects(approveScope(root, 'DEMO', 'stale', consent), /exact pending/);
  await approveScope(root, 'DEMO', preview.hash, consent);
  const done = await runScope(root, 'DEMO', preview.hash);
  assert.equal(done.status, 'applied');
  assert.deepEqual(done.plan.repos.map((repo) => repo.base), ['main', 'develop']);
  assert.equal(git(artifactJoin(root, 'api'), 'branch', '--show-current'), 'DEMO');
  assert.equal(git(artifactJoin(root, 'web'), 'branch', '--show-current'), 'DEMO');
  assert.equal(git(artifactJoin(root, 'unrelated'), 'branch', '--show-current'), 'main');
  assert.equal((await runScope(root, 'DEMO', preview.hash)).status, 'applied');
});
test('collision handling, existing branches, and a single affected workspace repo', async (t) => {
  const { root, input } = await fixture(t);
  git(artifactJoin(root, 'api'), 'branch', 'DEMO');
  input.repos = [input.repos[0]];
  const preview = await prepareScope(root, input);
  assert.equal(preview.plan.repos[0].branch, 'DEMO-2');
  input.repos[0].target_branch = 'DEMO';
  const revised = await prepareScope(root, input);
  assert.equal(revised.plan.repos[0].action, 'switch');
  await assert.rejects(approveScope(root, 'DEMO', preview.hash, consent), /exact pending/);
  await approveScope(root, 'DEMO', revised.hash, consent); await runScope(root, 'DEMO', revised.hash);
  assert.equal((await approvedScope(root, 'DEMO', [artifactJoin(root, 'api')])).repos.length, 1);
});
test('preview binds the actual creation point and stale local base without moving dirty work', async t => {
  const { root, input } = await fixture(t), repo = artifactJoin(root, 'api');
  input.repos = [{ ...input.repos[0], target_branch: 'DEMO' }];
  const base = git(repo, 'rev-parse', 'main');
  git(repo, 'switch', '-c', 'OTHER-42');
  await writeFile(artifactJoin(repo, 'feature.txt'), 'other ticket');
  git(repo, 'add', '.'); git(repo, 'commit', '-m', 'Other ticket');
  const head = git(repo, 'rev-parse', 'HEAD');
  git(repo, 'update-ref', 'refs/remotes/origin/main', head);
  await writeFile(artifactJoin(repo, 'source.txt'), 'uncommitted');
  const before = git(repo, 'status', '--porcelain');
  const preview = await prepareScope(root, input), selection = preview.plan.repos[0];
  assert.deepEqual(selection.start_point, { sha: head, ahead: 1, behind: 0 });
  assert.deepEqual(selection.remote_base, { ref: 'origin/main', sha: head, ahead: 0, behind: 1 });
  const html = await readFile(preview.dashboard, 'utf8');
  assert.match(html, /Create at current HEAD/); assert.match(html, new RegExp(head));
  assert.match(html, /1 ahead, 0 behind main/); assert.match(html, /Local base: 0 ahead, 1 behind origin\/main/);
  assert.match(html, /Starting commit differs from base/);
  assert.equal(git(repo, 'status', '--porcelain'), before);
  await approveScope(root, 'DEMO', preview.hash, consent);
  git(repo, 'update-ref', 'refs/remotes/origin/main', base);
  const applied = await runScope(root, 'DEMO', preview.hash);
  assert.equal(applied.hash, preview.hash, 'remote metadata does not change the approved operation');
  assert.equal(applied.status, 'applied');
  assert.match(applied.warnings[0], /Remote-tracking base changed/);
  assert.equal(git(repo, 'branch', '--show-current'), 'DEMO');
  assert.equal(git(repo, 'rev-parse', 'HEAD'), head, 'creation still uses current HEAD');
  assert.equal(git(repo, 'status', '--porcelain'), before);
});
test('existing-branch preview uses the target commit and old saved selections still apply', async t => {
  const { root, input } = await fixture(t), repo = artifactJoin(root, 'api');
  git(repo, 'switch', '-c', 'existing');
  await writeFile(artifactJoin(repo, 'feature.txt'), 'existing work');
  git(repo, 'add', '.'); git(repo, 'commit', '-m', 'Existing work');
  const target = git(repo, 'rev-parse', 'HEAD');
  git(repo, 'switch', 'main'); git(repo, 'update-ref', '-d', 'refs/remotes/origin/main');
  input.repos = [{ ...input.repos[0], target_branch: 'existing' }];
  const preview = await prepareScope(root, input);
  assert.deepEqual(preview.plan.repos[0].start_point, { sha: target, ahead: 1, behind: 0 });
  assert.equal(preview.plan.repos[0].remote_base, null);
  const html = await readFile(preview.dashboard, 'utf8');
  assert.match(html, /Switch to existing branch at/); assert.match(html, /freshness unknown/);
  // Historical journal bytes/hashes have no preview metadata; do not migrate them.
  const legacy = await readScope(root, 'DEMO');
  delete legacy.plan.repos[0].start_point; delete legacy.plan.repos[0].remote_base;
  legacy.hash = digest(JSON.stringify(legacy.plan));
  await writeFile(preview.file, JSON.stringify(legacy));
  await approveScope(root, 'DEMO', legacy.hash, consent); await runScope(root, 'DEMO', legacy.hash);
  assert.equal(git(repo, 'rev-parse', 'HEAD'), target);
});
test('stale worktrees and changed reports invalidate approval before branch changes', async (t) => {
  const { root, input } = await fixture(t), preview = await prepareScope(root, input);
  await approveScope(root, 'DEMO', preview.hash, consent);
  await writeFile(artifactJoin(root, 'web/source.txt'), 'changed');
  await assert.rejects(runScope(root, 'DEMO', preview.hash), /changed since selection/);
  assert.equal(git(artifactJoin(root, 'api'), 'branch', '--show-current'), 'main');
  const revised = await prepareScope(root, input);
  await writeFile(artifactJoin(root, input.report), 'revised assessment');
  await assert.rejects(approveScope(root, 'DEMO', revised.hash, consent), /assessment changed/);
});
test('partial application records results and resumes without recreating branches', async (t) => {
  const { root, input } = await fixture(t), preview = await prepareScope(root, input);
  await approveScope(root, 'DEMO', preview.hash, consent);
  const lock = artifactJoin(root, 'web/.git/refs/heads/DEMO.lock'); await writeFile(lock, 'blocked');
  await assert.rejects(runScope(root, 'DEMO', preview.hash));
  const partial = await readScope(root, 'DEMO');
  assert.equal(partial.status, 'partial'); assert.equal(partial.progress.api.status, 'applied');
  await assert.rejects(prepareScope(root, input), /partially applied/);
  await rm(lock);
  assert.equal((await runScope(root, 'DEMO', preview.hash)).status, 'applied');
});
test('workspace initialization enforces approval and checkpoints cannot silently change scope or branches', async (t) => {
  const { root, input } = await fixture(t), repos = input.repos.map((repo) => artifactJoin(root, repo.id));
  const init = { ticket: 'DEMO', autonomy: 'autopilot', repos, branch_guard: 'Exact repository selection approved' };
  await assert.rejects(initializeWorkflow(root, init));
  await applySelection(root, input);
  const result = await initializeWorkflow(root, init);
  assert.equal(result.fields.workspace_version, '1');
  const stateBeforeResume = digest(await readFile(result.state, 'utf8'));
  await applyWorkflow({ root, statePath: result.state, input: { event: 'resume', id: 'matching-resume', expected_hash: stateBeforeResume, repos, blocker_resolved: true } });
  assert.match(await readFile(result.dashboard, 'utf8'), /<th>Working branch<\/th>/);
  assert.match(await readFile(result.dashboard, 'utf8'), /develop/);
  const apply = async (extra) => applyWorkflow({ root, statePath: result.state, input: { id: 'change', event: 'pause', reason: 'Check scope', repos,
    expected_hash: digest(await readFile(result.state, 'utf8')), ...extra } });
  await assert.rejects(apply({ repos: [repos[0]] }), /scope changed/);
  git(repos[0], 'switch', 'main');
  await assert.rejects(apply({ event: 'context-ready' }), /Branch differs/);
});
test('preflight HTML escapes evidence and shows selection history without overwriting active dashboard', async (t) => {
  const { root, input } = await fixture(t); input.repos[0].reason = '<script>alert(1)</script>';
  let preview = await prepareScope(root, input);
  let html = await readFile(preview.dashboard, 'utf8');
  assert.match(html, /awaiting-approval/); assert.match(html, /&lt;script&gt;/); assert.doesNotMatch(html, /<script>/);
  preview = await prepareScope(root, input);
  html = await readFile(preview.dashboard, 'utf8'); assert.match(html, /api: DEMO/);
});
test('scope expansion requires renewed approval, preserves the retained spec and invalidates execution evidence', async (t) => {
  const { root, input } = await fixture(t);
  input.repos = [input.repos[0]];
  await applySelection(root, input);
  const result = await initializeWorkflow(root, { ticket: 'DEMO', autonomy: 'autopilot', repos: [artifactJoin(root, 'api')], branch_guard: 'Approved' });
  const initialReviewBaseline = JSON.parse(result.fields.review_baseline);
  await writeFile(artifactJoin(root, 'api/later.md'), 'created after initial selection');
  await writeFile(artifactJoin(root, 'web/local.md'), 'pre-existing before web joins');
  let id = 0;
  const apply = async (event, extra = {}) => applyWorkflow({ root, statePath: result.state, input: { event, id: `scope-${++id}`,
    expected_hash: digest(await readFile(result.state, 'utf8')), repos: [artifactJoin(root, 'api')], ...extra } });
  await assert.rejects(prepareScope(root, input), /Pause the active/);
  const spec = 'make-it-work/DEMO/DEMO-spec.md';
  const oldPlan = 'make-it-work/DEMO/DEMO-plan.md';
  await writeFile(artifactJoin(root, spec), '# Accepted behavior');
  await writeFile(artifactJoin(root, oldPlan), '# Earlier implementation plan');
  await writeFile(result.state, (await readFile(result.state, 'utf8')).replace('spec: none', `spec: ${spec}`).replace('plan: none', `plan: ${oldPlan}`));
  await apply('pause', { reason: 'New web dependency discovered' });
  input.repos.push({ id: 'web', reason: 'New cross-service dependency' });
  const revised = await prepareScope(root, input);
  await assert.rejects(apply('resume', { blocker_resolved: true }), /selection is pending/);
  await assert.rejects(apply('scope-update', { repos: input.repos.map((repo) => artifactJoin(root, repo.id)), reason: 'Expand scope', ...consent }), /Apply an explicitly approved/);
  let html = await readFile(result.dashboard, 'utf8');
  assert.match(html, /Proposed scope change/); assert.match(html, /awaiting-approval/);
  await approveScope(root, 'DEMO', revised.hash, consent); await runScope(root, 'DEMO', revised.hash);
  const updated = await apply('scope-update', { repos: input.repos.map((repo) => artifactJoin(root, repo.id)), reason: 'Include web', ...consent });
  assert.equal(updated.fields.plan_version, '2'); assert.equal(updated.fields.phase, 'context-check');
  assert.equal(updated.fields.spec, spec); assert.equal(updated.fields.scope_previous_plan, oldPlan);
  assert.equal(updated.fields.plan, 'none');
  assert.equal(updated.fields.review, 'not-started'); assert.equal(updated.fields.execution, 'not-started');
  assert.equal(JSON.parse(updated.fields.workspace_contract).repos.length, 2);
  const expandedBaseline = JSON.parse(updated.fields.review_baseline);
  assert.deepEqual(expandedBaseline.repos.find(repo => repo.root === artifactJoin(root, 'api')), initialReviewBaseline.repos[0], 'retained repository is never recaptured');
  assert.ok(expandedBaseline.repos.find(repo => repo.root === artifactJoin(root, 'web')).changes.some(entry => entry.file === 'local.md' && !entry.tracked));
  html = await readFile(result.dashboard, 'utf8'); assert.doesNotMatch(html, /Proposed scope change/);
  // Mixed workspace: api needs discovery while web already has go-deep context.
  await mkdir(artifactJoin(root, 'web/.claude/rules'), { recursive: true });
  await mkdir(artifactJoin(root, 'web/.claude/skills/domain-web'), { recursive: true });
  await writeFile(artifactJoin(root, 'web/CLAUDE.md'), '# Skill Loading Gate');
  await writeFile(artifactJoin(root, 'web/.claude/rules/product.md'), '# Product');
  await writeFile(artifactJoin(root, 'web/.claude/rules/architecture.md'), '# Architecture');
  await writeFile(artifactJoin(root, 'web/.claude/skills/domain-web/SKILL.md'), '# Web');
  const ready = await apply('context-ready', { repos: input.repos.map((repo) => artifactJoin(root, repo.id)) });
  assert.equal(ready.fields.phase, 'close-the-gaps');
  assert.match(await readFile(result.state, 'utf8'), /Context discovery required in api/);
  assert.doesNotMatch(await readFile(result.state, 'utf8'), /Context discovery required in web/);
  assert.equal(ready.fields.review_baseline, updated.fields.review_baseline, 'stage changes retain scope-entry provenance');
});
test('a revised preview cannot drop a changed approved repo, including after earlier preview revisions', async (t) => {
  const { root, input } = await fixture(t);
  await applySelection(root, input);
  const repos = input.repos.map((repo) => artifactJoin(root, repo.id));
  const result = await initializeWorkflow(root, { ticket: 'DEMO', autonomy: 'autopilot', repos, branch_guard: 'Approved' });
  await writeFile(artifactJoin(root, 'api/source.txt'), 'ticket implementation');
  await applyWorkflow({ root, statePath: result.state, input: { event: 'pause', id: 'scope-change', expected_hash: digest(await readFile(result.state, 'utf8')), repos, reason: 'Reconsider scope' } });
  await prepareScope(root, input);
  input.repos = [input.repos[1]];
  await assert.rejects(prepareScope(root, input), /Cannot remove changed repository api/);
});
test('detached HEAD, missing base and unknown selections stop before branch creation', async (t) => {
  const { root, input } = await fixture(t);
  input.repos[0].base = 'absent'; await assert.rejects(prepareScope(root, input));
  delete input.repos[0].base;
  input.repos.push({ id: 'absent', reason: 'Not local' }); await assert.rejects(prepareScope(root, input), /Unknown, unavailable/);
  input.repos.pop(); git(artifactJoin(root, 'web'), 'checkout', '--detach');
  await assert.rejects(prepareScope(root, input));
  assert.equal(git(artifactJoin(root, 'api'), 'branch', '--show-current'), 'main');
});
