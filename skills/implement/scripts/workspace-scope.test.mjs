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
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'workspace-scope-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [id, base] of [['api', 'main'], ['web', 'develop'], ['unrelated', 'main']]) {
    const repo = path.join(root, id); await mkdir(repo);
    git(repo, 'init', '-b', base); git(repo, 'config', 'user.name', 'Test'); git(repo, 'config', 'user.email', 'test@example.invalid');
    await writeFile(path.join(repo, 'source.txt'), 'baseline'); git(repo, 'add', '.'); git(repo, 'commit', '-m', 'baseline');
    git(repo, 'update-ref', 'refs/remotes/origin/' + base, 'HEAD'); git(repo, 'symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/' + base);
  }
  await mkdir(path.join(root, 'make-it-work/DEMO'), { recursive: true });
  const report = 'make-it-work/DEMO/DEMO-repos.md'; await writeFile(path.join(root, report), '# Repo Shortlist — DEMO\n');
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
  assert.equal(git(path.join(root, 'api'), 'branch', '--show-current'), 'main');
  await assert.rejects(runScope(root, 'DEMO', preview.hash), /Explicit approval/);
  await assert.rejects(approveScope(root, 'DEMO', preview.hash, { source: 'autopilot', via: 'chat' }), /explicit user/);
  await assert.rejects(approveScope(root, 'DEMO', 'stale', consent), /exact pending/);
  await approveScope(root, 'DEMO', preview.hash, consent);
  const done = await runScope(root, 'DEMO', preview.hash);
  assert.equal(done.status, 'applied');
  assert.deepEqual(done.plan.repos.map((repo) => repo.base), ['main', 'develop']);
  assert.equal(git(path.join(root, 'api'), 'branch', '--show-current'), 'DEMO');
  assert.equal(git(path.join(root, 'web'), 'branch', '--show-current'), 'DEMO');
  assert.equal(git(path.join(root, 'unrelated'), 'branch', '--show-current'), 'main');
  assert.equal((await runScope(root, 'DEMO', preview.hash)).status, 'applied');
});
test('collision handling, existing branches, and a single affected workspace repo', async (t) => {
  const { root, input } = await fixture(t);
  git(path.join(root, 'api'), 'branch', 'DEMO');
  input.repos = [input.repos[0]];
  const preview = await prepareScope(root, input);
  assert.equal(preview.plan.repos[0].branch, 'DEMO-2');
  input.repos[0].target_branch = 'DEMO';
  const revised = await prepareScope(root, input);
  assert.equal(revised.plan.repos[0].action, 'switch');
  await assert.rejects(approveScope(root, 'DEMO', preview.hash, consent), /exact pending/);
  await approveScope(root, 'DEMO', revised.hash, consent); await runScope(root, 'DEMO', revised.hash);
  assert.equal((await approvedScope(root, 'DEMO', [path.join(root, 'api')])).repos.length, 1);
});
test('stale worktrees and changed reports invalidate approval before branch changes', async (t) => {
  const { root, input } = await fixture(t), preview = await prepareScope(root, input);
  await approveScope(root, 'DEMO', preview.hash, consent);
  await writeFile(path.join(root, 'web/source.txt'), 'changed');
  await assert.rejects(runScope(root, 'DEMO', preview.hash), /changed since selection/);
  assert.equal(git(path.join(root, 'api'), 'branch', '--show-current'), 'main');
  const revised = await prepareScope(root, input);
  await writeFile(path.join(root, input.report), 'revised assessment');
  await assert.rejects(approveScope(root, 'DEMO', revised.hash, consent), /assessment changed/);
});
test('partial application records results and resumes without recreating branches', async (t) => {
  const { root, input } = await fixture(t), preview = await prepareScope(root, input);
  await approveScope(root, 'DEMO', preview.hash, consent);
  const lock = path.join(root, 'web/.git/refs/heads/DEMO.lock'); await writeFile(lock, 'blocked');
  await assert.rejects(runScope(root, 'DEMO', preview.hash));
  const partial = await readScope(root, 'DEMO');
  assert.equal(partial.status, 'partial'); assert.equal(partial.progress.api.status, 'applied');
  await assert.rejects(prepareScope(root, input), /partially applied/);
  await rm(lock);
  assert.equal((await runScope(root, 'DEMO', preview.hash)).status, 'applied');
});
test('workspace initialization enforces approval and checkpoints cannot silently change scope or branches', async (t) => {
  const { root, input } = await fixture(t), repos = input.repos.map((repo) => path.join(root, repo.id));
  const init = { ticket: 'DEMO', autonomy: 'autopilot', repos, branch_guard: 'Exact repository selection approved' };
  await assert.rejects(initializeWorkflow(root, init));
  await applySelection(root, input);
  const result = await initializeWorkflow(root, init);
  assert.equal(result.fields.workspace_version, '1');
  const stateBeforeResume = digest(await readFile(result.state, 'utf8'));
  await applyWorkflow({ root, statePath: result.state, input: { event: 'resume', id: 'matching-resume', expected_hash: stateBeforeResume, repos, blocker_resolved: true } });
  assert.match(await readFile(result.dashboard, 'utf8'), /Scope approved by user/);
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
  const result = await initializeWorkflow(root, { ticket: 'DEMO', autonomy: 'autopilot', repos: [path.join(root, 'api')], branch_guard: 'Approved' });
  let id = 0;
  const apply = async (event, extra = {}) => applyWorkflow({ root, statePath: result.state, input: { event, id: `scope-${++id}`,
    expected_hash: digest(await readFile(result.state, 'utf8')), repos: [path.join(root, 'api')], ...extra } });
  await assert.rejects(prepareScope(root, input), /Pause the active/);
  const spec = 'make-it-work/DEMO/DEMO-spec.md';
  const oldPlan = 'make-it-work/DEMO/DEMO-plan.md';
  await writeFile(path.join(root, spec), '# Accepted behavior');
  await writeFile(path.join(root, oldPlan), '# Earlier implementation plan');
  await writeFile(result.state, (await readFile(result.state, 'utf8')).replace('spec: none', `spec: ${spec}`).replace('plan: none', `plan: ${oldPlan}`));
  await apply('pause', { reason: 'New web dependency discovered' });
  input.repos.push({ id: 'web', reason: 'New cross-service dependency' });
  const revised = await prepareScope(root, input);
  await assert.rejects(apply('resume', { blocker_resolved: true }), /selection is pending/);
  await assert.rejects(apply('scope-update', { repos: input.repos.map((repo) => path.join(root, repo.id)), reason: 'Expand scope', ...consent }), /Apply an explicitly approved/);
  let html = await readFile(result.dashboard, 'utf8');
  assert.match(html, /Proposed scope change/); assert.match(html, /awaiting-approval/);
  await approveScope(root, 'DEMO', revised.hash, consent); await runScope(root, 'DEMO', revised.hash);
  const updated = await apply('scope-update', { repos: input.repos.map((repo) => path.join(root, repo.id)), reason: 'Include web', ...consent });
  assert.equal(updated.fields.plan_version, '2'); assert.equal(updated.fields.phase, 'context-check');
  assert.equal(updated.fields.spec, spec); assert.equal(updated.fields.scope_previous_plan, oldPlan);
  assert.equal(updated.fields.plan, 'none');
  assert.equal(updated.fields.review, 'not-started'); assert.equal(updated.fields.execution, 'not-started');
  assert.equal(JSON.parse(updated.fields.workspace_contract).repos.length, 2);
  html = await readFile(result.dashboard, 'utf8'); assert.doesNotMatch(html, /Proposed scope change/);
  await assert.rejects(apply('context-ready', { repos: input.repos.map((repo) => path.join(root, repo.id)) }), /context incomplete in api/);
});
test('a revised preview cannot drop a changed approved repo, including after earlier preview revisions', async (t) => {
  const { root, input } = await fixture(t);
  await applySelection(root, input);
  const repos = input.repos.map((repo) => path.join(root, repo.id));
  const result = await initializeWorkflow(root, { ticket: 'DEMO', autonomy: 'autopilot', repos, branch_guard: 'Approved' });
  await writeFile(path.join(root, 'api/source.txt'), 'ticket implementation');
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
  input.repos.pop(); git(path.join(root, 'web'), 'checkout', '--detach');
  await assert.rejects(prepareScope(root, input));
  assert.equal(git(path.join(root, 'api'), 'branch', '--show-current'), 'main');
});
