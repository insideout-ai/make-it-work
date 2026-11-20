import assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { lstat, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import test from 'node:test';
import { allocateSession, listSessions } from './session-workspace.mjs';
import { resolveWorkspace } from './workspace.mjs';
import { resolveRepository, resolveRepoIdentity } from './repo-identity.mjs';
import { writeAssessmentReport } from './repo-assessment.mjs';
import { prepareScope, approveScope, runScope, readScope } from '../skills/implement/scripts/workspace-scope.mjs';
import { initializeWorkflow, applyWorkflow } from '../skills/implement/scripts/workflow.mjs';
import { digest } from './lib/artifacts.mjs';
const git = (root, ...argv) => execFileSync('git', ['-C', root, ...argv], { encoding: 'utf8', stdio: 'pipe' }).trim();
const user = { source: 'user', via: 'chat' };
async function fixture(t, count = 2) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'session-worktrees-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'source'); await mkdir(source);
  for (const id of ['api', 'web'].slice(0, count)) {
    const repo = path.join(source, id); await mkdir(repo);
    git(repo, 'init', '-qb', 'main'); git(repo, 'config', 'user.name', 'Test'); git(repo, 'config', 'user.email', 'test@example.invalid');
    await writeFile(path.join(repo, 'code.txt'), 'baseline'); git(repo, 'add', '.'); git(repo, 'commit', '-qm', 'Baseline');
    await writeFile(path.join(repo, 'code.txt'), 'existing staged edit'); git(repo, 'add', 'code.txt');
    await writeFile(path.join(repo, 'local.txt'), 'untracked local work');
  }
  return { root, source, directory: path.join(root, 'sessions') };
}
async function preview(f, source = f.source, options = { directory: f.directory }) {
  const session = await allocateSession(source, { ticket: 'DEMO', ...options });
  const report = await writeAssessmentReport(source, { ticket: 'DEMO', markdown: '# Repositories\n\n## Assessment Evidence\n',
    assessments: session.repositories.map(repo => ({ id: repo.id, status: 'Definite', search: 'code.txt:1' })) }, { artifactRoot: session.artifact_root });
  const plan = await prepareScope(session.artifact_root, { ticket: 'DEMO', report: path.relative(session.artifact_root, report.file),
    repos: session.repositories.map(repo => ({ id: repo.id, base: 'main', reason: 'code.txt:1' })) });
  return { session, plan };
}

test('current checkout is an unchanged, allocation-free option', async t => {
  const f = await fixture(t);
  const selected = await allocateSession(f.source, { ticket: 'DEMO', checkout: 'current', directory: f.directory });
  assert.equal(selected.artifact_root, f.source); assert.equal(selected.checkout, 'current');
  assert.deepEqual(await listSessions(f.source, { directory: f.directory }), []);
});

test('default single-repo checkout uses .claude/worktrees with separate private state and correct resume/lookup', async t => {
  const f = await fixture(t, 1), source = path.join(f.source, 'api');
  await writeFile(path.join(source, '.gitignore'), 'node_modules/\n');
  git(source, 'add', '.gitignore'); git(source, 'commit', '-qm', 'Ignore dependencies', '--only', '--', '.gitignore');
  await writeFile(path.join(source, '.gitignore'), 'node_modules/\n# User local edit\n.local-cache/\n');
  const original = git(source, 'status', '--porcelain'), ignore = await readFile(path.join(source, '.gitignore'), 'utf8');
  const { session, plan } = await preview(f, source, {});
  const name = path.basename(session.artifact_root), target = path.join(source, '.claude', 'worktrees', name);
  assert.equal(session.version, 2);
  assert.equal(session.artifact_root, path.join(source, '.claude', 'miw-sessions', name));
  assert.equal(plan.plan.repos[0].root, target);
  await assert.rejects(lstat(target), { code: 'ENOENT' });
  assert.equal(git(source, 'status', '--porcelain'), original);
  const revised = await prepareScope(session.artifact_root, { ticket: 'DEMO', report: plan.plan.report.path,
    repos: [{ id: 'api', base: 'main', target_branch: 'custom-worktree-name', reason: 'code.txt:1' }] });
  assert.equal(revised.plan.repos[0].root, target);
  await assert.rejects(approveScope(session.artifact_root, 'DEMO', plan.hash, user), /exact pending/);
  await approveScope(session.artifact_root, 'DEMO', revised.hash, user);
  await runScope(session.artifact_root, 'DEMO', revised.hash);
  assert.equal(git(target, 'branch', '--show-current'), 'custom-worktree-name');
  assert.equal(git(source, 'branch', '--show-current'), 'main');
  assert.equal(await readFile(path.join(target, 'code.txt'), 'utf8'), 'baseline');
  assert.equal((await resolveWorkspace(target)).artifact_root, session.artifact_root);
  assert.equal((await resolveWorkspace(source, { savedRoot: session.artifact_root })).artifact_root, session.artifact_root);
  await mkdir(path.join(target, 'nested'));
  assert.equal((await resolveWorkspace(path.join(target, 'nested'))).artifact_root, session.artifact_root);
  assert.equal((await resolveRepository({ root: session.artifact_root, repo: 'api' })).root, target);
  assert.equal((await resolveRepository({ root: session.artifact_root, workspaceRoot: f.source, repo: 'api' })).root, target);
  assert.equal((await resolveRepository({ root: source, workspaceRoot: session.artifact_root, repo: 'api' })).root, target);
  assert.equal((await allocateSession(target, { ticket: 'OTHER', checkout: 'current' })).artifact_root, session.artifact_root);
  const initialized = await initializeWorkflow(session.artifact_root, { ticket: 'DEMO', autonomy: 'guided', repos: [target], branch_guard: 'Approved local worktree' });
  const state = { root: session.artifact_root, statePath: initialized.state };
  await applyWorkflow({ ...state, input: { id: 'pause', event: 'pause', repos: [target], expected_hash: digest(await readFile(initialized.state, 'utf8')), reason: 'User pause' } });
  await applyWorkflow({ ...state, input: { id: 'resume', event: 'resume', repos: [target], expected_hash: digest(await readFile(initialized.state, 'utf8')), blocker_resolved: true } });
  assert.equal(git(source, 'status', '--porcelain'), original);
  assert.equal(await readFile(path.join(source, '.gitignore'), 'utf8'), ignore);
  assert.equal(await readFile(path.join(target, '.gitignore'), 'utf8'), 'node_modules/\n');
});

test('conflicting ignore rules do not rewrite the source .gitignore or authorize a fallback location', async t => {
  const f = await fixture(t, 1), source = path.join(f.source, 'api');
  const contents = '!.claude/miw-sessions/**\n!.claude/worktrees/**\n';
  await writeFile(path.join(source, '.gitignore'), contents);
  await assert.rejects(allocateSession(source, { ticket: 'DEMO' }), /ignore rules expose/);
  assert.equal(await readFile(path.join(source, '.gitignore'), 'utf8'), contents);
  assert.equal(git(source, 'worktree', 'list', '--porcelain').split('\n').filter(line => line.startsWith('worktree ')).length, 1);
});

test('an explicit multi-repo workspace inside another Git checkout keeps its boundary and local artifact exclusions', async t => {
  const f = await fixture(t);
  git(f.root, 'init', '-qb', 'main'); git(f.root, 'config', 'user.name', 'Test'); git(f.root, 'config', 'user.email', 'test@example.invalid');
  await writeFile(path.join(f.root, 'wrapper.txt'), 'Workspace wrapper'); git(f.root, 'add', 'wrapper.txt'); git(f.root, 'commit', '-qm', 'Wrapper');
  const original = git(f.root, 'status', '--porcelain');
  const { session, plan } = await preview(f, f.source, { workspaceRoot: f.source });
  assert.equal(session.source_root, f.source);
  assert.equal(path.dirname(session.artifact_root), path.join(f.source, '.claude', 'miw-sessions'));
  assert.deepEqual(plan.plan.repos.map(repo => repo.id), ['api', 'web']);
  await approveScope(session.artifact_root, 'DEMO', plan.hash, user); await runScope(session.artifact_root, 'DEMO', plan.hash);
  assert.equal((await resolveRepository({ root: session.artifact_root, repo: 'api' })).root, plan.plan.repos[0].root);
  assert.equal(git(f.root, 'status', '--porcelain'), original);
  await assert.rejects(lstat(path.join(f.root, '.gitignore')), { code: 'ENOENT' });
});

test('default multi-repo checkouts are repo-local with shared state, bound resume and legacy discovery', async t => {
  const f = await fixture(t);
  t.mock.method(os, 'homedir', () => f.root);
  const old = await allocateSession(f.source, { ticket: 'DEMO', directory: path.join(f.root, '.make-it-work', 'sessions') });
  const grouped = await allocateSession(f.source, { ticket: 'DEMO', directory: path.join(f.source, '.claude', 'worktrees') });
  const pair = await Promise.all([preview(f, f.source, {}), preview(f, f.source, {})]);
  assert.notEqual(pair[0].session.artifact_root, pair[1].session.artifact_root);
  git(path.join(f.source, 'api'), 'switch', '-c', 'other-source-session');
  for (const { session, plan } of pair) {
    assert.equal(path.dirname(session.artifact_root), path.join(f.source, '.claude', 'miw-sessions'));
    assert.equal(session.version, 3);
    for (const repo of plan.plan.repos) assert.equal(repo.root, path.join(f.source, repo.id, '.claude', 'worktrees', path.basename(session.artifact_root)));
    await approveScope(session.artifact_root, 'DEMO', plan.hash, user); await runScope(session.artifact_root, 'DEMO', plan.hash);
    for (const repo of plan.plan.repos) {
      await mkdir(path.join(repo.root, 'nested'));
      assert.equal((await resolveWorkspace(path.join(repo.root, 'nested'))).artifact_root, session.artifact_root);
      assert.equal((await resolveRepository({ root: session.artifact_root, repo: repo.id })).root, repo.root);
      assert.equal(git(repo.source_root, 'status', '--porcelain'), 'M  code.txt\n?? local.txt');
    }
    const roots = plan.plan.repos.map(repo => repo.root);
    const initialized = await initializeWorkflow(session.artifact_root, { ticket: 'DEMO', autonomy: 'guided', repos: roots, branch_guard: 'Approved repo-local worktrees' });
    await applyWorkflow({ root: session.artifact_root, statePath: initialized.state, input: { event: 'pause', id: 'pause', expected_hash: digest(await readFile(initialized.state, 'utf8')), repos: roots, reason: 'User pause' } });
    await applyWorkflow({ root: session.artifact_root, statePath: initialized.state, input: { event: 'resume', id: 'resume', expected_hash: digest(await readFile(initialized.state, 'utf8')), repos: roots, blocker_resolved: true } });
  }
  const sessions = await listSessions(f.source, { ticket: 'DEMO' });
  assert.deepEqual(new Set(sessions.map(entry => entry.artifact_root)), new Set([old.artifact_root, grouped.artifact_root, ...pair.map(entry => entry.session.artifact_root)]));
  assert.equal((await resolveWorkspace(old.artifact_root)).artifact_root, old.artifact_root);
  assert.equal((await resolveWorkspace(grouped.artifact_root)).artifact_root, grouped.artifact_root);
});

test('multi-repo preflight only prepares selected source parents and rejects occupied targets without hiding them', async t => {
  const f = await fixture(t), session = await allocateSession(f.source, { ticket: 'DEMO' });
  for (const repo of session.repositories) await assert.rejects(lstat(path.join(repo.source_root, '.claude')), { code: 'ENOENT' });
  const report = await writeAssessmentReport(f.source, { ticket: 'DEMO', markdown: '# Assessment\n\n## Assessment Evidence\n', assessments: session.repositories.map(repo => ({ id: repo.id, status: 'Definite', search: 'code.txt:1' })) }, { artifactRoot: session.artifact_root });
  const input = { ticket: 'DEMO', report: path.relative(session.artifact_root, report.file), repos: [{ id: 'api', base: 'main', reason: 'code.txt:1' }] };
  await prepareScope(session.artifact_root, input);
  await assert.rejects(lstat(path.join(f.source, 'web', '.claude')), { code: 'ENOENT' });
  const web = session.repositories.find(repo => repo.id === 'web');
  await mkdir(web.root, { recursive: true }); await writeFile(path.join(web.root, 'user.txt'), 'Existing user files');
  await assert.rejects(prepareScope(session.artifact_root, { ...input, repos: [{ id: 'web', base: 'main', reason: 'code.txt:1' }] }), /occupied/);
  assert.equal(await readFile(path.join(web.root, 'user.txt'), 'utf8'), 'Existing user files');
  assert.throws(() => git(web.source_root, 'check-ignore', '-q', '--', path.join(web.root, 'user.txt')));
});

test('repo-local multi-repo markers reject source redirects and require explicit resolution for conflicting bindings', async t => {
  const f = await fixture(t), { session, plan } = await preview(f, f.source, {});
  const marker = path.join(session.artifact_root, 'miw-session.json');
  const bad = JSON.parse(await readFile(marker, 'utf8'));
  bad.repositories[0].source_root = path.join(f.root, 'outside');
  bad.repositories[0].root = path.join(f.root, 'outside', '.claude', 'worktrees', path.basename(session.artifact_root));
  await writeFile(marker, JSON.stringify(bad));
  await assert.rejects(resolveWorkspace(session.artifact_root), /source binding/);
  await writeFile(marker, JSON.stringify({ ...session, checkout: undefined, instruction: undefined }));
  await approveScope(session.artifact_root, 'DEMO', plan.hash, user); await runScope(session.artifact_root, 'DEMO', plan.hash);
  const repo = plan.plan.repos[0], conflicting = path.join(repo.source_root, '.claude', 'miw-sessions', path.basename(session.artifact_root));
  await mkdir(conflicting, { recursive: true });
  await writeFile(path.join(conflicting, 'miw-session.json'), JSON.stringify({ version: 2, ticket: 'DEMO', artifact_root: conflicting, source_root: repo.source_root,
    repositories: [{ id: repo.id, source_root: repo.source_root, root: repo.root }] }));
  await assert.rejects(resolveWorkspace(repo.root), /Ambiguous managed session/);
  assert.equal((await resolveWorkspace(repo.root, { savedRoot: session.artifact_root })).artifact_root, session.artifact_root);
});

test('recorded identity independent of the source folder still resolves the bound single-repo worktree', async t => {
  const f = await fixture(t, 1), source = path.join(f.source, 'api');
  const strategy = '.claude/skills/test-strategy/SKILL.md';
  await mkdir(path.dirname(path.join(source, strategy)), { recursive: true });
  await writeFile(path.join(source, strategy), '# Strategy\n\n## Repo ID\n\n`domain-api`\n');
  git(source, 'add', strategy); git(source, 'commit', '-qm', 'Record identity', '--only', '--', strategy);
  const { session, plan } = await preview(f, source, {});
  await approveScope(session.artifact_root, 'DEMO', plan.hash, user); await runScope(session.artifact_root, 'DEMO', plan.hash);
  const target = plan.plan.repos[0].root;
  assert.equal((await resolveRepoIdentity(target)).repoId, 'domain-api');
  assert.equal((await resolveRepository({ root: session.artifact_root, repo: 'api' })).root, target);
  assert.equal((await resolveRepository({ root: target, repo: 'api' })).root, target);
  assert.equal((await resolveRepository({ root: session.artifact_root, repo: 'domain-api' })).root, target);
});

test('concurrent local single-repo allocations retain both sessions exclusions and source status', async t => {
  const f = await fixture(t, 1), source = path.join(f.source, 'api');
  const original = git(source, 'status', '--porcelain');
  const pair = await Promise.all([allocateSession(source, { ticket: 'DEMO' }), allocateSession(source, { ticket: 'DEMO' })]);
  assert.notEqual(pair[0].artifact_root, pair[1].artifact_root);
  for (const session of pair) {
    assert.match(git(source, 'check-ignore', '--', path.join(session.artifact_root, 'miw-session.json')), /miw-session.json$/);
    assert.match(git(source, 'check-ignore', '--no-index', '--', path.join(session.repositories[0].root, 'probe')), /probe$/);
  }
  assert.equal(git(source, 'status', '--porcelain'), original);
});

test('default single-repo discovery retains legacy sessions and rejects redirected parents or marker destinations', async t => {
  const f = await fixture(t, 1), source = path.join(f.source, 'api');
  t.mock.method(os, 'homedir', () => f.root);
  const old = await allocateSession(source, { ticket: 'DEMO', directory: path.join(f.root, '.make-it-work', 'sessions') });
  const fresh = await allocateSession(source, { ticket: 'DEMO' });
  assert.deepEqual(new Set((await listSessions(source, { ticket: 'DEMO' })).map(entry => entry.artifact_root)), new Set([old.artifact_root, fresh.artifact_root]));
  const marker = path.join(fresh.artifact_root, 'miw-session.json');
  const altered = JSON.parse(await readFile(marker, 'utf8')); altered.repositories[0].root = source;
  await writeFile(marker, JSON.stringify(altered));
  await assert.rejects(resolveWorkspace(fresh.artifact_root), /binding/);
  const g = await fixture(t, 1), other = path.join(g.source, 'api'), redirected = path.join(g.root, 'redirected');
  await mkdir(redirected); await symlink(redirected, path.join(other, '.claude'));
  await assert.rejects(allocateSession(other, { ticket: 'DEMO' }), /real directories/);
  assert.deepEqual(await readdir(redirected), []);
});

test('two same-ticket sessions prepare concurrently and apply isolated branches, files, indexes and artifacts', async t => {
  const f = await fixture(t), original = {};
  for (const id of ['api', 'web']) original[id] = { status: git(path.join(f.source, id), 'status', '--porcelain'), head: git(path.join(f.source, id), 'rev-parse', 'HEAD') };
  const pair = await Promise.all([preview(f), preview(f)]);
  assert.notEqual(pair[0].session.artifact_root, pair[1].session.artifact_root);
  assert.notEqual(pair[0].plan.plan.repos[0].branch, pair[1].plan.plan.repos[0].branch);
  for (const { session, plan } of pair) {
    await assert.rejects(runScope(session.artifact_root, 'DEMO', plan.hash), /Explicit approval/);
    await approveScope(session.artifact_root, 'DEMO', plan.hash, user);
  }
  // Another session may change its source checkout after both previews.
  git(path.join(f.source, 'api'), 'switch', '-c', 'another-source-session');
  await Promise.all(pair.map(async ({ session, plan }) => {
    const { stdout } = await promisify(execFile)(process.execPath, [path.resolve('skills/implement/scripts/workspace-scope.mjs'), 'run', '--root', session.artifact_root, '--ticket', 'DEMO', '--hash', plan.hash]);
    assert.equal(JSON.parse(stdout).status, 'applied');
  }));
  for (const { session, plan } of pair) {
    assert.equal((await runScope(session.artifact_root, 'DEMO', plan.hash)).status, 'applied');
    const roots = plan.plan.repos.map(repo => repo.root);
    for (const repo of roots) {
      assert.equal(await readFile(path.join(repo, 'code.txt'), 'utf8'), 'baseline');
      assert.equal(git(repo, 'status', '--porcelain'), '');
    }
    const initialized = await initializeWorkflow(session.artifact_root, { ticket: 'DEMO', autonomy: 'guided', repos: roots, branch_guard: 'Approved private worktrees' });
    assert.equal(JSON.parse(initialized.fields.workspace_contract).checkout, 'worktree');
    const input = { repos: roots, expected_hash: digest(await readFile(initialized.state, 'utf8')) };
    await applyWorkflow({ root: session.artifact_root, statePath: initialized.state, input: { ...input, id: 'pause', event: 'pause', reason: 'User pause' } });
    await applyWorkflow({ root: session.artifact_root, statePath: initialized.state, input: { ...input, expected_hash: digest(await readFile(initialized.state, 'utf8')), id: 'resume', event: 'resume', blocker_resolved: true } });
    await assert.rejects(applyWorkflow({ root: session.artifact_root, statePath: initialized.state, input: { id: 'wrong-roots', event: 'context-ready', repos: plan.plan.repos.map(repo => repo.source_root), expected_hash: digest(await readFile(initialized.state, 'utf8')) } }), /scope changed/);
    assert.equal((await resolveWorkspace(roots[0])).artifact_root, session.artifact_root);
    assert.equal((await resolveRepository({ root: session.artifact_root, repo: 'api' })).root, roots[0]);
    assert.equal((await resolveWorkspace(f.source, { savedRoot: session.artifact_root })).artifact_root, session.artifact_root);
  }
  for (const id of ['api', 'web']) {
    assert.equal(git(path.join(f.source, id), 'status', '--porcelain'), original[id].status);
    assert.equal(git(path.join(f.source, id), 'rev-parse', 'HEAD'), original[id].head);
  }
  assert.equal((await listSessions(f.source, { ticket: 'DEMO', directory: f.directory })).filter(item => item.state).length, 2);
  const [a, b] = pair.map(item => item.plan.plan.repos[0].root);
  await writeFile(path.join(a, 'code.txt'), 'Session A'); git(a, 'add', 'code.txt');
  assert.equal(await readFile(path.join(b, 'code.txt'), 'utf8'), 'baseline'); assert.equal(git(b, 'diff', '--cached', '--name-only'), '');
});

test('single-repo worktrees keep an explicit starting commit and preview the source and destination', async t => {
  const f = await fixture(t, 1), source = path.join(f.source, 'api');
  git(source, 'reset', '--hard', 'HEAD'); git(source, 'switch', '-c', 'OTHER-42');
  await writeFile(path.join(source, 'other.txt'), 'other ticket'); git(source, 'add', 'other.txt'); git(source, 'commit', '-qm', 'Other ticket');
  const { session, plan } = await preview(f, source);
  assert.equal(plan.plan.repos[0].start_point.sha, git(source, 'rev-parse', 'main'));
  const html = await readFile(plan.dashboard, 'utf8');
  assert.match(html, /Create isolated worktree at/); assert.ok(html.includes(source)); assert.ok(html.includes(plan.plan.repos[0].root));
  await approveScope(session.artifact_root, 'DEMO', plan.hash, user); await runScope(session.artifact_root, 'DEMO', plan.hash);
  assert.equal(git(plan.plan.repos[0].root, 'rev-parse', 'HEAD'), git(source, 'rev-parse', 'main'));
  assert.equal(git(source, 'branch', '--show-current'), 'OTHER-42');
});

test('partial creation retries preserve completed worktrees and recover only the exact recorded intent', async t => {
  const f = await fixture(t), { session, plan } = await preview(f);
  await approveScope(session.artifact_root, 'DEMO', plan.hash, user);
  const second = plan.plan.repos[1], lock = path.join(second.source_root, '.git', 'refs/heads', second.branch + '.lock');
  await writeFile(lock, 'blocked');
  await assert.rejects(runScope(session.artifact_root, 'DEMO', plan.hash));
  const partial = await readScope(session.artifact_root, 'DEMO'); assert.equal(partial.status, 'partial');
  assert.equal(partial.progress.api.status, 'applied'); assert.equal(partial.progress.web.status, 'creating');
  const firstGitDir = git(plan.plan.repos[0].root, 'rev-parse', '--absolute-git-dir');
  await rm(lock); git(second.source_root, 'worktree', 'add', '-b', second.branch, second.root, second.start_point.sha);
  assert.equal((await runScope(session.artifact_root, 'DEMO', plan.hash)).status, 'applied');
  assert.equal(git(plan.plan.repos[0].root, 'rev-parse', '--absolute-git-dir'), firstGitDir);
});

test('an occupied destination or stolen branch stops before creating any worktree', async t => {
  for (const problem of ['destination', 'branch', 'parent']) {
    const f = await fixture(t), { session, plan } = await preview(f);
    await approveScope(session.artifact_root, 'DEMO', plan.hash, user);
    const second = plan.plan.repos[1];
    if (problem === 'destination') await mkdir(second.root);
    else if (problem === 'branch') git(second.source_root, 'branch', second.branch);
    else {
      const outside = path.join(f.root, 'elsewhere'); await mkdir(outside);
      await rm(path.join(session.artifact_root, 'repos'), { recursive: true });
      await symlink(outside, path.join(session.artifact_root, 'repos'));
    }
    await assert.rejects(runScope(session.artifact_root, 'DEMO', plan.hash), /occupied|now exists|parent changed/);
    await assert.rejects(readFile(path.join(plan.plan.repos[0].root, '.git')), { code: 'ENOENT' });
  }
});


test('resume rejects a different Git repository substituted at the same session path while pause remains available', async t => {
  const f = await fixture(t, 1), { session, plan } = await preview(f);
  await approveScope(session.artifact_root, 'DEMO', plan.hash, user); await runScope(session.artifact_root, 'DEMO', plan.hash);
  const repo = plan.plan.repos[0];
  const initialized = await initializeWorkflow(session.artifact_root, { ticket: 'DEMO', autonomy: 'guided', repos: [repo.root], branch_guard: 'Approved isolated checkout' });
  await rename(repo.root, repo.root + '-retained');
  git(f.root, 'clone', '--no-hardlinks', repo.source_root, repo.root);
  git(repo.root, 'switch', '-c', repo.branch, repo.start_point.sha);
  const apply = (event, extra = {}) => applyWorkflow({ root: session.artifact_root, statePath: initialized.state,
    input: { event, id: event, repos: [repo.root], ...extra } });
  await apply('pause', { expected_hash: digest(await readFile(initialized.state, 'utf8')), reason: 'Inspect replaced checkout' });
  await assert.rejects(apply('resume', { expected_hash: digest(await readFile(initialized.state, 'utf8')), blocker_resolved: true }), /repository binding changed/);
});


test('branch-only interrupted creation can resume without resetting or deleting its approved branch', async t => {
  const f = await fixture(t, 1), { session, plan } = await preview(f);
  await approveScope(session.artifact_root, 'DEMO', plan.hash, user);
  const repo = plan.plan.repos[0], saved = await readScope(session.artifact_root, 'DEMO');
  saved.status = 'partial'; saved.progress[repo.id] = { status: 'creating' };
  await writeFile(plan.file, JSON.stringify(saved));
  git(repo.source_root, 'branch', repo.branch, repo.start_point.sha);
  assert.equal((await runScope(session.artifact_root, 'DEMO', plan.hash)).status, 'applied');
  assert.equal(git(repo.root, 'rev-parse', 'HEAD'), repo.start_point.sha);
});

test('unreadable unrelated session discovery is advisory and marker bindings cannot escape the private root', async t => {
  const f = await fixture(t, 1), session = await allocateSession(f.source, { ticket: 'DEMO', directory: f.directory });
  const marker = path.join(session.artifact_root, 'miw-session.json');
  const saved = JSON.parse(await readFile(marker, 'utf8'));
  saved.repositories[0].root = saved.repositories[0].source_root;
  await writeFile(marker, JSON.stringify(saved));
  const entries = await listSessions(f.source, { ticket: 'DEMO', directory: f.directory });
  assert.match(entries[0].unavailable, /binding/);
  await assert.rejects(resolveWorkspace(session.artifact_root), /binding/);
  assert.equal((await allocateSession(f.source, { ticket: 'DEMO', checkout: 'current' })).artifact_root, f.source);
});


test('a repository named make-it-work gets its own worktree alongside the artifact directory', async t => {
  const f = await fixture(t, 1);
  await rename(path.join(f.source, 'api'), path.join(f.source, 'make-it-work'));
  const { session, plan } = await preview(f);
  await approveScope(session.artifact_root, 'DEMO', plan.hash, user); await runScope(session.artifact_root, 'DEMO', plan.hash);
  assert.equal(plan.plan.repos[0].root, path.join(session.artifact_root, 'repos', 'make-it-work'));
  assert.ok((await readFile(path.join(plan.plan.repos[0].root, '.git'), 'utf8')).startsWith('gitdir:'));
  assert.equal((await resolveWorkspace(plan.plan.repos[0].root)).artifact_root, session.artifact_root);
});

test('a detached source checkout does not block creating an approved named worktree from its base', async t => {
  const f = await fixture(t, 1), source = path.join(f.source, 'api');
  git(source, 'checkout', '--detach', 'HEAD');
  const original = git(source, 'status', '--porcelain');
  const { session, plan } = await preview(f);
  assert.equal(plan.plan.repos[0].baseline.branch, '(detached HEAD)');
  await approveScope(session.artifact_root, 'DEMO', plan.hash, user); await runScope(session.artifact_root, 'DEMO', plan.hash);
  assert.equal(git(plan.plan.repos[0].root, 'branch', '--show-current'), plan.plan.repos[0].branch);
  assert.equal(git(source, 'status', '--porcelain'), original);
});
