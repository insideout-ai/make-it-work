import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { parseRemote, pullRequest } from './deliver.mjs';

const packageCli = path.resolve('skills/implement/scripts/final-package.mjs');
const deliveryCli = path.resolve('skills/implement/scripts/deliver.mjs');
function git(repo, ...args) { return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim(); }
function cli(file, action, root, state, extra = [], env = process.env) {
  return JSON.parse(execFileSync(process.execPath, [file, action, '--root', root, '--state', state, ...extra], { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'] }));
}
function stateMarkdown(phase = 'final-approval', status = 'In Progress') {
  const fields = {
    ticket: 'DEMO', handoff_version: '1', final_package_version: '1', status, phase,
    autonomy: 'guided', start_time: '2026-01-01T10:00:00Z', execution_mode: 'inline', inline_pause_mode: 'run-straight-through',
    spec: 'make-it-work/DEMO-spec.md', spec_hash: 'spec', plan: 'make-it-work/DEMO-plan.md', plan_version: '1', plan_hash: 'plan',
    execution: 'passed', review: 'clean', review_cycle: '1', fix_cycle: '0', fix_plan_round_steps: 'none', fix_plan_dispatch: 'none',
    replans_used: '0', gate: 'full-suite', pause_reason: 'none', branch: 'DEMO', base: 'main', head: 'abc',
    worktree_fingerprint: 'fingerprint', execute_report: 'make-it-work/DEMO-execute.md', context_updated: 'none',
    current_activity: 'none', real_rows_from: '1',
  };
  return `# Workflow state — DEMO\n\n\`\`\`\n${Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join('\n')}\n\`\`\`\n\n## Known regressions\n\nNone\n\n## Decided findings\n\nNone\n\n## Context discoveries\n\nNone\n\n## Audit log\n\n| # | Time | From | To | Outcome / reason |\n| --- | --- | --- | --- | --- |\n| 1 | 2026-01-01T10:00:00Z | final-sync | final-approval | ready |\n`;
}

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'delivery-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const repo = path.join(root, 'service');
  const bare = path.join(root, 'remote.git');
  await mkdir(repo);
  git(root, 'init', '-q', '--bare', bare);
  git(repo, 'init', '-q');
  git(repo, 'branch', '-m', 'main');
  await writeFile(path.join(repo, '.gitignore'), 'make-it-work/\n');
  await writeFile(path.join(repo, 'code.txt'), 'before\n');
  git(repo, 'add', '.gitignore', 'code.txt');
  git(repo, '-c', 'user.name=Test', '-c', 'user.email=test@example.test', 'commit', '-qm', 'Initial');
  git(repo, 'switch', '-qc', 'DEMO');
  git(repo, 'remote', 'add', 'origin', bare);
  git(repo, 'config', 'url.' + bare + '.insteadOf', 'https://github.com/example/service.git');
  git(repo, 'remote', 'set-url', 'origin', 'https://github.com/example/service.git');
  await writeFile(path.join(repo, 'code.txt'), 'after\n');
  const artifacts = path.join(root, 'make-it-work');
  await mkdir(artifacts);
  for (const name of ['spec', 'plan', 'execute', 'review']) await writeFile(path.join(artifacts, `DEMO-${name}.md`), `# ${name}\n`);
  const draft = path.join(artifacts, 'DEMO-final-draft.json');
  await writeFile(draft, JSON.stringify({ commit_message: 'DEMO: Update code', pr_title: 'DEMO: Update code', pr_description: 'Verified change.' }));
  const state = path.join(artifacts, 'DEMO-state.md');
  await writeFile(state, stateMarkdown());
  const built = cli(packageCli, 'build', root, state, ['--draft', draft, '--repo', repo]);
  cli(packageCli, 'approve', root, state, ['--hash', built.sha256]);
  await writeFile(state, stateMarkdown('complete', 'Complete'));
  return { root, repo, bare, state, artifacts };
}

test('delivery refuses changed content before any commit', async (t) => {
  const { root, repo, state } = await fixture(t);
  const prepared = cli(deliveryCli, 'prepare', root, state);
  await writeFile(path.join(repo, 'code.txt'), 'later\n');
  assert.throws(() => cli(deliveryCli, 'run', root, state, ['--hash', prepared.sha256]), /stale|Working tree changed/);
  assert.equal(git(repo, 'rev-list', '--count', 'HEAD'), '1');
});

test('delivery commits, pushes, creates a PR, and resumes without duplication', async (t) => {
  const { root, repo, bare, state, artifacts } = await fixture(t);
  // The fixture rewrites a GitHub-shaped remote to a local bare transport; no network is contacted.
  const bin = path.join(root, 'bin');
  await mkdir(bin);
  const ghLog = path.join(root, 'gh.log');
  const gh = path.join(bin, 'gh');
  await writeFile(gh, '#!/bin/sh\nif [ "$1" = "--version" ] || [ "$1" = "auth" ]; then echo "gh test"; exit 0; fi\nif [ "$2" = "list" ]; then echo "[]"; else echo "https://github.com/example/service/pull/1"; fi\nprintf "%s\\n" "$*" >> "$GH_LOG"\n');
  git(repo, 'config', 'user.name', 'Test');
  git(repo, 'config', 'user.email', 'test@example.test');
  await chmod(gh, 0o755);
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, GH_LOG: ghLog };
  const prepared = cli(deliveryCli, 'prepare', root, state, [], env);
  assert.match(await readFile(prepared.plan, 'utf8'), /https:\/\/github.com\/example\/service.git/);
  const result = cli(deliveryCli, 'run', root, state, ['--hash', prepared.sha256], env);
  assert.equal(result.delivered, true);
  assert.equal(result.repos.service.pr.url, 'https://github.com/example/service/pull/1');
  assert.equal(git(repo, 'rev-list', '--count', 'HEAD'), '2');
  assert.equal(git(root, '--git-dir', bare, 'rev-parse', 'refs/heads/DEMO'), git(repo, 'rev-parse', 'HEAD'));
  const repeated = cli(deliveryCli, 'run', root, state, ['--hash', prepared.sha256], env);
  assert.equal(repeated.repos.service.commit, result.repos.service.commit);
  assert.equal((await readFile(ghLog, 'utf8')).trim().split('\n').length, 2);
  assert.equal(JSON.parse(await readFile(path.join(artifacts, 'DEMO-delivery-progress.json'), 'utf8')).repos.service.pushed, result.repos.service.commit);
});

test('a hook-rewritten tree stops delivery before push', async (t) => {
  const { root, repo, state } = await fixture(t);
  git(repo, 'config', 'user.name', 'Test');
  git(repo, 'config', 'user.email', 'test@example.test');
  const bin = path.join(root, 'bin');
  await mkdir(bin);
  const gh = path.join(bin, 'gh');
  await writeFile(gh, '#!/bin/sh\nexit 0\n');
  await chmod(gh, 0o755);
  const hook = path.join(repo, '.git', 'hooks', 'pre-commit');
  await writeFile(hook, '#!/bin/sh\nprintf "hook changed\\n" > code.txt\ngit add code.txt\n');
  await chmod(hook, 0o755);
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
  const prepared = cli(deliveryCli, 'prepare', root, state, [], env);
  assert.throws(() => cli(deliveryCli, 'run', root, state, ['--hash', prepared.sha256], env), /hook changed approved tree/);
  assert.equal(git(repo, 'ls-remote', '--heads', 'origin', 'refs/heads/DEMO'), '');
});

test('a PR failure resumes after the recorded commit and push', async (t) => {
  const { root, repo, state, artifacts } = await fixture(t);
  git(repo, 'config', 'user.name', 'Test');
  git(repo, 'config', 'user.email', 'test@example.test');
  const bin = path.join(root, 'bin');
  await mkdir(bin);
  const gh = path.join(bin, 'gh');
  await writeFile(gh, '#!/bin/sh\nif [ "$1" = "--version" ] || [ "$1" = "auth" ]; then exit 0; fi\nif [ "$2" = "list" ]; then echo "[]"; exit 0; fi\nif [ "$FAIL_PR" = "1" ]; then echo "temporary PR failure" >&2; exit 1; fi\necho "https://github.com/example/service/pull/2"\n');
  await chmod(gh, 0o755);
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
  const prepared = cli(deliveryCli, 'prepare', root, state, [], env);
  assert.throws(() => cli(deliveryCli, 'run', root, state, ['--hash', prepared.sha256], { ...env, FAIL_PR: '1' }), /temporary PR failure/);
  const progress = JSON.parse(await readFile(path.join(artifacts, 'DEMO-delivery-progress.json'), 'utf8'));
  assert.equal(progress.repos.service.commit, git(repo, 'rev-parse', 'HEAD'));
  assert.equal(progress.repos.service.pushed, progress.repos.service.commit);
  assert.equal(progress.repos.service.pr, undefined);
  const completed = cli(deliveryCli, 'run', root, state, ['--hash', prepared.sha256], env);
  assert.equal(completed.repos.service.pr.url, 'https://github.com/example/service/pull/2');
  assert.equal(git(repo, 'rev-list', '--count', 'HEAD'), '2');
});

test('Bitbucket PR creation uses the approved source, base, and text', async (t) => {
  assert.deepEqual(parseRemote('git@bitbucket.org:team/service.git'), { provider: 'bitbucket', owner: 'team', repo: 'service' });
  const beforeToken = process.env.MAKE_IT_WORK_BITBUCKET_TOKEN_JSON;
  const beforeBase = process.env.MAKE_IT_WORK_BITBUCKET_API_BASE;
  const beforeFetch = global.fetch;
  t.after(() => {
    if (beforeToken === undefined) delete process.env.MAKE_IT_WORK_BITBUCKET_TOKEN_JSON;
    else process.env.MAKE_IT_WORK_BITBUCKET_TOKEN_JSON = beforeToken;
    if (beforeBase === undefined) delete process.env.MAKE_IT_WORK_BITBUCKET_API_BASE;
    else process.env.MAKE_IT_WORK_BITBUCKET_API_BASE = beforeBase;
    global.fetch = beforeFetch;
  });
  process.env.MAKE_IT_WORK_BITBUCKET_TOKEN_JSON = JSON.stringify({ auth: 'bearer', token: 'test-token' });
  process.env.MAKE_IT_WORK_BITBUCKET_API_BASE = 'https://example.test/api';
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => options.method === 'GET' ? { values: [] }
      : { id: 7, links: { html: { href: 'https://bitbucket.org/team/service/pull-requests/7' } } } };
  };
  const result = await pullRequest({ provider: 'bitbucket', owner: 'team', repo: 'service', name: 'service', branch: 'DEMO', base: 'main' },
    { pr_title: 'Approved title', pr_description: 'Approved body' });
  assert.equal(result.action, 'created');
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /pullrequests\?q=/);
  assert.deepEqual(JSON.parse(calls[1].options.body), { title: 'Approved title', description: 'Approved body',
    source: { branch: { name: 'DEMO' } }, destination: { branch: { name: 'main' } } });
});
