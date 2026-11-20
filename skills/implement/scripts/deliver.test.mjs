import { artifactJoin } from '../../../scripts/lib/artifact-path.mjs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { parseRemote, pullRequest } from './deliver.mjs';
import { generateDashboard } from './render-status.mjs';
import { writeReview } from '../../../scripts/review-report.mjs';
import { summarizeAssurance } from './assurance-summary.mjs';
import { checkFinalPackage } from './final-package.mjs';
import { createHash } from 'node:crypto';
import { writeFeedback } from './write-feedback.mjs';

const packageCli = path.resolve('skills/implement/scripts/final-package.mjs');
const deliveryCli = path.resolve('skills/implement/scripts/deliver.mjs');
function git(repo, ...args) { return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim(); }
function cli(file, action, root, state, extra = [], env = process.env) {
  return JSON.parse(execFileSync(process.execPath, [file, action, '--root', root, '--state', state, ...extra], { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'] }));
}
function stateMarkdown(phase = 'final-approval', status = 'In Progress', marked = false) {
  const fields = {
    ...(marked ? { artifact_naming_version: '1' } : {}),
    ticket: 'DEMO', handoff_version: '1', final_package_version: '1', status, phase,
    autonomy: 'guided', start_time: '2026-01-01T10:00:00Z', execution_mode: 'inline', inline_pause_mode: 'run-straight-through',
    spec: 'make-it-work/DEMO/DEMO-spec.md', spec_hash: 'spec', plan: 'make-it-work/DEMO/DEMO-plan.md', plan_version: '1', plan_hash: 'plan',
    execution: 'passed', review: 'clean', review_cycle: '1', fix_cycle: '0', fix_plan_round_steps: 'none', fix_plan_dispatch: 'none',
    replans_used: '0', gate: 'full-suite', pause_reason: 'none', branch: 'DEMO', base: 'main', head: 'abc',
    worktree_fingerprint: 'fingerprint', execute_report: 'make-it-work/DEMO/DEMO-execute.md', context_updated: 'none',
    current_activity: 'none', real_rows_from: '1',
  };
  return `# Workflow state — DEMO\n\n\`\`\`\n${Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join('\n')}\n\`\`\`\n\n## Known regressions\n\nNone\n\n## Decided findings\n\nNone\n\n## Context discoveries\n\nNone\n\n## Audit log\n\n| # | Time | From | To | Outcome / reason |\n| --- | --- | --- | --- | --- |\n| 1 | 2026-01-01T10:00:00Z | final-sync | final-approval | ready |\n`;
}

async function fixture(t, { dashboard = false, qualified = false, marked = false, initial = {}, setup } = {}) {
  const root = await mkdtemp(artifactJoin(os.tmpdir(), 'delivery-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const repo = artifactJoin(root, 'service');
  const bare = artifactJoin(root, 'remote.git');
  await mkdir(repo);
  git(root, 'init', '-q', '--bare', bare);
  git(repo, 'init', '-q');
  git(repo, 'branch', '-m', 'main');
  await writeFile(artifactJoin(repo, '.gitignore'), 'make-it-work/\n');
  await writeFile(artifactJoin(repo, 'code.txt'), 'before\n');
  for (const [file, text] of Object.entries(initial)) await writeFile(path.join(repo, file), text);
  git(repo, 'add', '.');
  git(repo, '-c', 'user.name=Test', '-c', 'user.email=test@example.test', 'commit', '-qm', 'Initial');
  git(repo, 'switch', '-qc', 'DEMO');
  git(repo, 'remote', 'add', 'origin', bare);
  git(repo, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  git(repo, 'config', 'url.' + bare + '.insteadOf', 'https://github.com/example/service.git');
  git(repo, 'remote', 'set-url', 'origin', 'https://github.com/example/service.git');
  await writeFile(artifactJoin(repo, 'code.txt'), 'after\n');
  const artifacts = artifactJoin(root, 'make-it-work', 'DEMO');
  await mkdir(artifacts, { recursive: true });
  if (marked) await writeFile(path.join(artifacts, 'miw-run.json'), '{"artifact_naming_version":1}');
  for (const name of ['spec', 'plan', 'execute', 'review']) await writeFile(artifactJoin(artifacts, `DEMO-${name}.md`), `# ${name}\n`);
  const draft = artifactJoin(artifacts, 'DEMO-final-draft.json');
  await writeFile(draft, JSON.stringify({ commit_message: 'DEMO: Update code', pr_title: 'DEMO: Update code', pr_description: 'Verified change.' }));
  const state = artifactJoin(artifacts, 'DEMO-state.md');
  await writeFile(state, stateMarkdown(undefined, undefined, marked));
  if (qualified) await writeReview(root, {
    version: 1, ticket: 'DEMO', branch: 'DEMO', commit: git(repo, 'rev-parse', 'HEAD'), working_tree: true,
    coverage: 'Earlier work was only skimmed from the diff.', findings: [], repo_roots: { service: repo },
    review_scope: [{ repo: 'service', scope: 'branch', base: 'main', paths: ['code.txt'] }],
    review_limitations: [{ repo: 'service', depth: 'skimmed', paths: ['code.txt'], reason: 'Requirements of earlier work were not verified' }],
    ...(qualified === true ? { validation_notes: [
      'Introduced TS2322 in the new component; shared wrapper typings are the evidenced cause; runtime impact remains unchecked',
      'Other build failures are suspected baseline issues by inspection; no clean baseline was run. Import integration and real service responses remain unverified.',
      'An earlier commit establishes an inherited starting-branch failure outside ticket fix scope; the branch build still fails. PR-destination provenance is unknown; no destination baseline build was performed.',
      'Compiler exit 2; complete stdout and stderr retained in compile.stdout.txt and compile.stderr.txt before filtering. Emitted-JavaScript tests exited 0; TypeScript compilation did not pass.',
      'A missing command utility failed startup with ENOENT and no compiler exit status; that compilation attempt was not performed.',
    ] } : {}),
    ui_verification: { status: 'not-applicable', note: 'No UI changes' },
  });
  const extraRepos = await setup?.({ root, repo, state, artifacts, draft }) ?? [];
  const built = cli(packageCli, 'build', root, state, ['--draft', draft, '--repo', repo, ...extraRepos.flatMap(item => ['--repo', item])]);
  cli(packageCli, 'approve', root, state, ['--hash', built.sha256]);
  await writeFile(state, stateMarkdown('complete', 'Complete', marked) + '| 2 | 2026-01-01T10:01:00Z | final-approval | complete | Implementation complete |\n');
  // Optional delivery starts after terminal feedback has been collected.
  await writeFeedback(state, { sessionReview: { version: 2, status: 'pending', context: ['Available conversation reviewed'], findings: [], userInput: [], limitations: ['Browser behavior unverified'] } });
  if (dashboard) await generateDashboard(state);
  return { root, repo, bare, state, artifacts };
}

async function select(f, repos, draft = { commit_message: 'DEMO: Selected changes', pr_title: 'DEMO: Selected changes', pr_description: 'Deliver the explicitly selected changes.' }) {
  const file = artifactJoin(f.artifacts, 'DEMO-selection.json');
  await writeFile(file, JSON.stringify({ version: 1, repos, draft }));
  const prepared = cli(deliveryCli, 'prepare', f.root, f.state, ['--selection', file]);
  return { ...prepared, data: JSON.parse(await readFile(artifactJoin(f.artifacts, 'DEMO-delivery-plan.json'), 'utf8')) };
}

async function mockDelivery(f) {
  const bin = artifactJoin(f.root, 'bin');
  await mkdir(bin);
  const gh = artifactJoin(bin, 'gh');
  await writeFile(gh, '#!/bin/sh\nif [ "$1" = "--version" ] || [ "$1" = "auth" ]; then exit 0; fi\nprintf "%s\\n" "$*" >> "$GH_LOG"\nif [ "$2" = "list" ]; then echo "[]"; exit 0; fi\nif [ "$4" = "example/service-two" ] && [ "$FAIL_SECOND" = "1" ]; then echo "temporary PR failure" >&2; exit 1; fi\necho "https://github.com/$4/pull/7"\n');
  await chmod(gh, 0o755);
  for (const name of ['service', 'service-two']) {
    const repo = artifactJoin(f.root, name);
    if (!await stat(repo).catch(error => { if (error.code === 'ENOENT') return null; throw error; })) continue;
    git(repo, 'config', 'user.name', 'Test'); git(repo, 'config', 'user.email', 'test@example.test');
  }
  return { ...process.env, PATH: `${bin}:${process.env.PATH}`, GH_LOG: artifactJoin(f.root, 'gh.log') };
}

// Version-1 artifacts as saved before full_delivery_version existed.
async function legacyPrepared(f, prepared) {
  const file = artifactJoin(f.artifacts, 'DEMO-delivery-plan.json');
  const plan = JSON.parse(await readFile(file, 'utf8'));
  delete plan.full_delivery_version;
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'legacy-delivery-index-'));
  try {
    for (const repo of plan.repos) {
      repo.paths = repo.full_result.source_paths;
      delete repo.full_result;
      const env = { ...process.env, GIT_INDEX_FILE: path.join(temporary, 'index') };
      const indexed = (...args) => execFileSync('git', ['-C', repo.path, ...args], { env, encoding: 'utf8' }).trim();
      indexed('read-tree', repo.head);
      indexed('add', '-A', '--', ...repo.paths.map(file => `:(literal)${file}`));
      repo.target_tree = indexed('write-tree');
    }
  } finally { await rm(temporary, { recursive: true, force: true }); }
  const lines = [`# Optional delivery — ${plan.ticket}`, '', `Approved package SHA-256: \`${plan.package_sha256}\``, '',
    'This is a separate request to commit, push to origin, and create or update pull requests. It does not merge or post to Jira.', ''];
  for (const repo of plan.repos) lines.push(`## ${repo.name}`, '', `Repository: \`${repo.path}\``, `Origin: \`${repo.remote}\``, `Push transport: \`${repo.push_url}\``,
    `Branch: \`${repo.branch}\` → base \`${repo.base}\``, `Provider: ${repo.provider}`, '',
    `Commit message: ${plan.draft.commit_message}`, `PR title: ${plan.draft.pr_title}`, '',
    plan.draft.pr_description, '', 'Paths:', '', ...repo.paths.map(file => `- \`${file}\``), '');
  lines.push('Approval is for this exact delivery plan. Hooks may run during commit; if they change the approved tree, delivery stops before push.', '');
  const sha256 = createHash('sha256').update(JSON.stringify(plan)).digest('hex');
  await writeFile(file, JSON.stringify(plan));
  await writeFile(prepared.plan, lines.join('\n'));
  const progressFile = artifactJoin(f.artifacts, 'DEMO-delivery-progress.json');
  const progress = JSON.parse(await readFile(progressFile, 'utf8'));
  progress.plan_sha256 = sha256;
  await writeFile(progressFile, JSON.stringify(progress));
  return { ...prepared, sha256 };
}

test('delivery refuses changed content before any commit', async (t) => {
  const { root, repo, state, artifacts } = await fixture(t);
  const prepared = cli(deliveryCli, 'prepare', root, state);
  await writeFile(artifactJoin(repo, 'code.txt'), 'later\n');
  assert.throws(() => cli(deliveryCli, 'run', root, state, ['--hash', prepared.sha256]), /stale|Working tree changed/);
  assert.equal(git(repo, 'rev-list', '--count', 'HEAD'), '1');
  await assert.rejects(readFile(artifactJoin(artifacts, 'DEMO-status.html')), { code: 'ENOENT' });
});

test('review-depth qualifications survive package, delivery preview and generated PR text', async (t) => {
  const f = await fixture(t, { qualified: true });
  const prepared = cli(deliveryCli, 'prepare', f.root, f.state);
  const preview = await readFile(prepared.plan, 'utf8');
  assert.match(preview, /Review qualification.*skimmed.*code\.txt/);
  assert.match(preview, /Requirements of earlier work were not verified/);
  const plan = JSON.parse(await readFile(artifactJoin(f.artifacts, 'DEMO-delivery-plan.json'), 'utf8'));
  assert.match(plan.draft.pr_description, /Review qualification.*skimmed.*code\.txt/);
  assert.match(preview, /Validation qualification.*Introduced TS2322/);
  assert.match(plan.draft.pr_description, /Introduced TS2322.*runtime impact remains unchecked/);
  const pkg = JSON.parse(await readFile(artifactJoin(f.artifacts, 'DEMO-final-package.json'), 'utf8'));
  assert.match(pkg.validation_notes[0], /Introduced TS2322/);
  assert.match(summarizeAssurance(pkg).text, /Introduced TS2322/);
  assert.match(pkg.validation_notes[1], /suspected baseline issues.*no clean baseline was run/);
  assert.match(pkg.validation_notes[2], /branch build still fails.*provenance is unknown/);
  assert.match(pkg.validation_notes[3], /Compiler exit 2.*tests exited 0.*compilation did not pass/);
  assert.match(pkg.validation_notes[4], /ENOENT.*not performed/);
  for (const qualification of pkg.validation_notes) for (const text of [preview, plan.draft.pr_description, summarizeAssurance(pkg).text]) {
    assert.ok(text.includes(qualification), 'Every compilation, provenance and runtime-test qualification must survive delivery.');
  }
  assert.equal(git(f.repo, 'rev-list', '--count', 'HEAD'), '1');
});

test('historical review evidence without validation notes preserves the exact saved package approval', async (t) => {
  const f = await fixture(t, { qualified: 'scope-only' });
  const hash = value => createHash('sha256').update(value).digest('hex');
  const evidencePath = artifactJoin(f.artifacts, 'DEMO-review-evidence.json');
  const evidence = JSON.parse(await readFile(evidencePath, 'utf8'));
  delete evidence.validation_notes;
  const evidenceBytes = JSON.stringify(evidence, null, 2) + '\n';
  await writeFile(evidencePath, evidenceBytes);
  const packagePath = artifactJoin(f.artifacts, 'DEMO-final-package.json');
  const pkg = JSON.parse(await readFile(packagePath, 'utf8'));
  delete pkg.validation_notes;
  pkg.evidence.review_scope.sha256 = hash(evidenceBytes);
  const packageBytes = JSON.stringify(pkg, null, 2) + '\n';
  await writeFile(packagePath, packageBytes);
  const approvalPath = artifactJoin(f.artifacts, 'DEMO-final-approval.json');
  const approval = JSON.parse(await readFile(approvalPath, 'utf8'));
  approval.package_sha256 = hash(JSON.stringify(pkg));
  const approvalBytes = JSON.stringify(approval, null, 2) + '\n';
  await writeFile(approvalPath, approvalBytes);
  const checked = await checkFinalPackage(await realpath(f.root), await realpath(f.state), true);
  assert.equal(checked.approved, true);
  assert.deepEqual(checked.validation_notes, []);
  assert.equal(await readFile(packagePath, 'utf8'), packageBytes);
  assert.equal(await readFile(approvalPath, 'utf8'), approvalBytes);
});

test('delivery commits, pushes, creates a PR, and resumes without duplication', async (t) => {
  const { root, repo, bare, state, artifacts } = await fixture(t, { dashboard: true });
  const dashboard = artifactJoin(artifacts, 'DEMO-status.html');
  const originalState = await readFile(state, 'utf8');
  const originalApproval = await readFile(artifactJoin(artifacts, 'DEMO-final-approval.json'), 'utf8');
  // The fixture rewrites a GitHub-shaped remote to a local bare transport; no network is contacted.
  const bin = artifactJoin(root, 'bin');
  await mkdir(bin);
  const ghLog = artifactJoin(root, 'gh.log');
  const gh = artifactJoin(bin, 'gh');
  await writeFile(gh, '#!/bin/sh\nif [ "$1" = "--version" ] || [ "$1" = "auth" ]; then echo "gh test"; exit 0; fi\ncp "$DASHBOARD" "$RUNNING_SNAPSHOT"\nif [ "$2" = "list" ]; then echo "[]"; else echo "https://github.com/example/service/pull/1"; fi\nprintf "%s\\n" "$*" >> "$GH_LOG"\n');
  git(repo, 'config', 'user.name', 'Test');
  git(repo, 'config', 'user.email', 'test@example.test');
  await chmod(gh, 0o755);
  const runningSnapshot = artifactJoin(root, 'running.html');
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, GH_LOG: ghLog, DASHBOARD: dashboard, RUNNING_SNAPSHOT: runningSnapshot };
  const prepared = cli(deliveryCli, 'prepare', root, state, [], env);
  assert.match(await readFile(prepared.plan, 'utf8'), /https:\/\/github.com\/example\/service.git/);
  assert.match(await readFile(prepared.plan, 'utf8'), /Review scope — service: unknown/);
  assert.match(await readFile(prepared.plan, 'utf8'), /Browser verification: pending/);
  assert.match(await readFile(dashboard, 'utf8'), /phase-mode">Awaiting approval/);
  const result = cli(deliveryCli, 'run', root, state, ['--hash', prepared.sha256], env);
  assert.equal(result.delivered, true);
  assert.equal(result.repos.service.pr.url, 'https://github.com/example/service/pull/1');
  assert.match(await readFile(ghLog, 'utf8'), /Review scope — service: unknown/);
  assert.match(await readFile(ghLog, 'utf8'), /Browser verification: pending/);
  assert.match(await readFile(runningSnapshot, 'utf8'), /phase-mode">Running/);
  assert.match(await readFile(runningSnapshot, 'utf8'), /http-equiv="refresh"/);
  const html = await readFile(dashboard, 'utf8');
  assert.match(html, /phase-mode">Delivered/);
  assert.match(html, /href="https:\/\/github.com\/example\/service\/pull\/1"/);
  assert.doesNotMatch(html, /http-equiv="refresh"|Changes remain local and uncommitted/);
  assert.equal(await readFile(state, 'utf8'), originalState);
  assert.equal(await readFile(artifactJoin(artifacts, 'DEMO-final-approval.json'), 'utf8'), originalApproval);
  assert.equal(git(repo, 'rev-list', '--count', 'HEAD'), '2');
  assert.equal(git(root, '--git-dir', bare, 'rev-parse', 'refs/heads/DEMO'), git(repo, 'rev-parse', 'HEAD'));
  const repeated = cli(deliveryCli, 'run', root, state, ['--hash', prepared.sha256], env);
  assert.equal(repeated.repos.service.commit, result.repos.service.commit);
  assert.equal((await readFile(ghLog, 'utf8')).match(/^pr (?:list|create) /gm).length, 3);
  assert.equal(JSON.parse(await readFile(artifactJoin(artifacts, 'DEMO-delivery-progress.json'), 'utf8')).repos.service.pushed, result.repos.service.commit);
  assert.equal(cli(deliveryCli, 'status', root, state).status, 'delivered');
});

test('repository SSO failure stops delivery before staging, committing or pushing', async (t) => {
  const { root, repo, state } = await fixture(t);
  const bin = artifactJoin(root, 'bin');
  await mkdir(bin);
  const gh = artifactJoin(bin, 'gh');
  await writeFile(gh, '#!/bin/sh\nif [ "$1" = "--version" ] || [ "$1" = "auth" ]; then exit 0; fi\necho "organization SAML SSO authorization required" >&2\nexit 1\n');
  await chmod(gh, 0o755);
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
  const prepared = cli(deliveryCli, 'prepare', root, state, [], env);
  const before = { head: git(repo, 'rev-parse', 'HEAD'), index: git(repo, 'write-tree'),
    refs: git(repo, 'ls-remote', '--heads', 'origin'), status: git(repo, 'status', '--porcelain') };
  assert.throws(() => cli(deliveryCli, 'run', root, state, ['--hash', prepared.sha256], env), /SAML SSO/);
  assert.deepEqual({ head: git(repo, 'rev-parse', 'HEAD'), index: git(repo, 'write-tree'),
    refs: git(repo, 'ls-remote', '--heads', 'origin'), status: git(repo, 'status', '--porcelain') }, before);
  const progress = cli(deliveryCli, 'status', root, state);
  assert.equal(progress.status, 'failed');
  assert.deepEqual(progress.repos, {});
});

test('a hook-rewritten tree stops delivery before push', async (t) => {
  const { root, repo, state, artifacts } = await fixture(t, { dashboard: true });
  git(repo, 'config', 'user.name', 'Test');
  git(repo, 'config', 'user.email', 'test@example.test');
  const bin = artifactJoin(root, 'bin');
  await mkdir(bin);
  const gh = artifactJoin(bin, 'gh');
  await writeFile(gh, '#!/bin/sh\nif [ "$2" = "list" ]; then echo "[]"; fi\nexit 0\n');
  await chmod(gh, 0o755);
  const hook = artifactJoin(repo, '.git', 'hooks', 'pre-commit');
  await writeFile(hook, '#!/bin/sh\nprintf "hook changed\\n" > code.txt\ngit add code.txt\n');
  await chmod(hook, 0o755);
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
  const prepared = cli(deliveryCli, 'prepare', root, state, [], env);
  assert.throws(() => cli(deliveryCli, 'run', root, state, ['--hash', prepared.sha256], env), /hook changed approved tree/);
  assert.equal(git(repo, 'ls-remote', '--heads', 'origin', 'refs/heads/DEMO'), '');
  const progress = cli(deliveryCli, 'status', root, state);
  assert.equal(progress.status, 'partial');
  assert.equal(progress.repos.service.commit, git(repo, 'rev-parse', 'HEAD'));
  const html = await readFile(artifactJoin(artifacts, 'DEMO-status.html'), 'utf8');
  assert.match(html, /Partially delivered/);
  assert.match(html, /Not pushed/);
  assert.doesNotMatch(html, /Changes remain local and uncommitted/);
  assert.throws(() => cli(deliveryCli, 'run', root, state, ['--hash', prepared.sha256], env), /Committed content changed/);
  assert.equal(git(repo, 'rev-list', '--count', 'HEAD'), '2');
});

test('a PR failure resumes after the recorded commit and push', async (t) => {
  const { root, repo, state, artifacts } = await fixture(t, { dashboard: true });
  git(repo, 'config', 'user.name', 'Test');
  git(repo, 'config', 'user.email', 'test@example.test');
  const bin = artifactJoin(root, 'bin');
  await mkdir(bin);
  const gh = artifactJoin(bin, 'gh');
  await writeFile(gh, '#!/bin/sh\nif [ "$1" = "--version" ] || [ "$1" = "auth" ]; then exit 0; fi\nif [ "$2" = "list" ]; then echo "[]"; exit 0; fi\nif [ "$FAIL_PR" = "1" ]; then echo "temporary PR failure" >&2; exit 1; fi\necho "https://github.com/example/service/pull/2"\n');
  await chmod(gh, 0o755);
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
  const prepared = await legacyPrepared({ artifacts }, cli(deliveryCli, 'prepare', root, state, [], env));
  assert.throws(() => cli(deliveryCli, 'run', root, state, ['--hash', prepared.sha256], { ...env, FAIL_PR: '1' }), /temporary PR failure/);
  const progress = JSON.parse(await readFile(artifactJoin(artifacts, 'DEMO-delivery-progress.json'), 'utf8'));
  assert.equal(progress.repos.service.commit, git(repo, 'rev-parse', 'HEAD'));
  assert.equal(progress.repos.service.pushed, progress.repos.service.commit);
  assert.equal(progress.repos.service.pr, undefined);
  assert.equal(progress.status, 'partial');
  const partialHtml = await readFile(artifactJoin(artifacts, 'DEMO-status.html'), 'utf8');
  assert.match(partialHtml, /temporary PR failure/);
  assert.match(partialHtml, /<td>Pushed<\/td><td>Not created/);
  assert.doesNotMatch(partialHtml, /Changes remain local and uncommitted/);
  // An older helper saved only these fields. Resume must preserve the actual commit/push.
  await writeFile(artifactJoin(artifacts, 'DEMO-delivery-progress.json'), JSON.stringify({ version: 1, plan_sha256: progress.plan_sha256, repos: progress.repos }));
  const completed = cli(deliveryCli, 'run', root, state, ['--hash', prepared.sha256], env);
  assert.equal(completed.repos.service.pr.url, 'https://github.com/example/service/pull/2');
  assert.equal(git(repo, 'rev-list', '--count', 'HEAD'), '2');
  assert.match(await readFile(artifactJoin(artifacts, 'DEMO-status.html'), 'utf8'), /phase-mode">Delivered/);
});

test('a saved report alone cannot open delivery for evidence-enabled runs', async t => {
  const { root, state, artifacts } = await fixture(t);
  await writeFile(state, (await readFile(state, 'utf8')).replace('status: Complete', 'status: Complete\nfeedback_evidence_version: 1'));
  assert.throws(() => cli(deliveryCli, 'offer', root, state), /saved-report readback/);
  await assert.rejects(readFile(artifactJoin(artifacts, 'DEMO-delivery-progress.json')), { code: 'ENOENT' });
});

test('offering and declining update delivery alone and never authorize a commit', async (t) => {
  const { root, repo, state, artifacts } = await fixture(t, { dashboard: true });
  const original = await readFile(state, 'utf8');
  const sessionPath = artifactJoin(artifacts, 'workflow-feedback.md'), session = await readFile(sessionPath);
  await rm(sessionPath);
  assert.throws(() => cli(deliveryCli, 'offer', root, state), /Finish session feedback/);
  await assert.rejects(readFile(artifactJoin(artifacts, 'DEMO-delivery-progress.json')), { code: 'ENOENT' });
  await writeFile(sessionPath, session);
  const dashboard = artifactJoin(artifacts, 'DEMO-status.html');
  const offered = cli(deliveryCli, 'offer', root, state);
  assert.equal(offered.status, 'offered');
  assert.match(await readFile(dashboard, 'utf8'), /Awaiting choice/);
  assert.match(await readFile(dashboard, 'utf8'), /http-equiv="refresh"/);
  cli(deliveryCli, 'decline', root, state);
  assert.match(await readFile(dashboard, 'utf8'), /Not requested/);
  assert.doesNotMatch(await readFile(dashboard, 'utf8'), /http-equiv="refresh"/);
  const prepared = cli(deliveryCli, 'prepare', root, state);
  assert.match(await readFile(prepared.plan, 'utf8'), /Optional delivery/);
  assert.equal(cli(deliveryCli, 'status', root, state).status, 'awaiting-approval');
  cli(deliveryCli, 'decline', root, state);
  assert.equal(git(repo, 'rev-list', '--count', 'HEAD'), '1');
  assert.equal(await readFile(state, 'utf8'), original);
});

test('a stale package is displayed as failed before delivery starts', async (t) => {
  const { root, repo, state, artifacts } = await fixture(t, { dashboard: true });
  cli(deliveryCli, 'offer', root, state);
  await writeFile(artifactJoin(repo, 'code.txt'), 'changed after approval\n');
  assert.throws(() => cli(deliveryCli, 'prepare', root, state), /stale/);
  assert.equal(cli(deliveryCli, 'status', root, state).status, 'failed');
  const html = await readFile(artifactJoin(artifacts, 'DEMO-status.html'), 'utf8');
  assert.match(html, /Delivery failed/);
  assert.doesNotMatch(html, /Changes remain local and uncommitted|http-equiv="refresh"/);
  assert.equal(git(repo, 'rev-list', '--count', 'HEAD'), '1');
});

test('dashboard checkpoint failure stops before publishing and retains the journal', async (t) => {
  const { root, repo, state, artifacts } = await fixture(t, { dashboard: true });
  const prepared = cli(deliveryCli, 'prepare', root, state);
  const dashboard = artifactJoin(artifacts, 'DEMO-status.html');
  await rm(dashboard);
  await mkdir(dashboard);
  assert.throws(() => cli(deliveryCli, 'run', root, state, ['--hash', prepared.sha256]), /dashboard refresh failed/);
  const progress = cli(deliveryCli, 'status', root, state);
  assert.equal(progress.status, 'failed');
  assert.match(progress.error, /dashboard refresh failed/);
  assert.equal(git(repo, 'rev-list', '--count', 'HEAD'), '1');
  assert.equal(git(repo, 'ls-remote', '--heads', 'origin', 'refs/heads/DEMO'), '');
});

test('delivery skips unchanged supporting repositories while retaining them in the approved package', async (t) => {
  const { root, repo, state, artifacts } = await fixture(t);
  const support = artifactJoin(root, 'support');
  git(root, 'clone', '-q', repo, support);
  git(support, 'branch', 'main', 'origin/main');
  // No remote setup for support: it must not be prepared for delivery.
  git(support, 'remote', 'remove', 'origin');
  await writeFile(state, stateMarkdown());
  const built = cli(packageCli, 'build', root, state, ['--draft', artifactJoin(artifacts, 'DEMO-final-draft.json'), '--repo', repo, '--repo', support]);
  cli(packageCli, 'approve', root, state, ['--hash', built.sha256]);
  await writeFile(state, stateMarkdown('complete', 'Complete') + '| 2 | 2026-01-01T10:01:00Z | final-approval | complete | Implementation complete |\n');
  await writeFeedback(state, { sessionReview: { version: 2, status: 'pending', context: ['Available conversation reviewed'], findings: [], userInput: [], limitations: ['Browser behavior unverified'] } });
  const prepared = cli(deliveryCli, 'prepare', root, state);
  assert.deepEqual(prepared.repos.map((entry) => entry.name), ['service']);
  const pkg = JSON.parse(await readFile(artifactJoin(artifacts, 'DEMO-final-package.json'), 'utf8'));
  assert.deepEqual(pkg.repos.map((entry) => entry.name), ['service', 'support']);
});

test('multi-repo partial delivery shows each actual result and resumes without duplicate commits', async (t) => {
  const { root, repo, state, artifacts } = await fixture(t, { dashboard: true });
  const second = artifactJoin(root, 'service-two');
  const secondRemote = artifactJoin(root, 'remote-two.git');
  git(root, 'clone', '-q', repo, second);
  git(second, 'branch', 'main', 'origin/main');
  git(root, 'init', '-q', '--bare', secondRemote);
  git(second, 'config', 'url.' + secondRemote + '.insteadOf', 'https://github.com/example/service-two.git');
  git(second, 'remote', 'set-url', 'origin', 'https://github.com/example/service-two.git');
  await writeFile(artifactJoin(second, 'code.txt'), 'second change\n');
  for (const target of [repo, second]) {
    git(target, 'config', 'user.name', 'Test');
    git(target, 'config', 'user.email', 'test@example.test');
  }
  await writeFile(state, stateMarkdown());
  const built = cli(packageCli, 'build', root, state, ['--draft', artifactJoin(artifacts, 'DEMO-final-draft.json'), '--repo', repo, '--repo', second]);
  cli(packageCli, 'approve', root, state, ['--hash', built.sha256]);
  await writeFile(state, stateMarkdown('complete', 'Complete') + '| 2 | 2026-01-01T10:01:00Z | final-approval | complete | Implementation complete |\n');
  await writeFeedback(state, { sessionReview: { version: 2, status: 'pending', context: ['Available conversation reviewed'], findings: [], userInput: [], limitations: ['Browser behavior unverified'] } });
  await generateDashboard(state);
  const bin = artifactJoin(root, 'bin');
  await mkdir(bin);
  const gh = artifactJoin(bin, 'gh');
  await writeFile(gh, '#!/bin/sh\nif [ "$1" = "--version" ] || [ "$1" = "auth" ]; then exit 0; fi\nif [ "$2" = "list" ]; then\n  if [ "$4" = "example/service-two" ] && [ "$FAIL_PREFLIGHT" = "1" ]; then echo "second repository SSO required" >&2; exit 1; fi\n  echo "[]"; exit 0; fi\nif [ "$4" = "example/service-two" ] && [ "$FAIL_SECOND" = "1" ]; then echo "second repository PR failed" >&2; exit 1; fi\necho "https://github.com/$4/pull/7"\n');
  await chmod(gh, 0o755);
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
  const prepared = cli(deliveryCli, 'prepare', root, state, [], env);
  const snapshot = target => ({ head: git(target, 'rev-parse', 'HEAD'), index: git(target, 'write-tree'),
    refs: git(target, 'ls-remote', '--heads', 'origin'), status: git(target, 'status', '--porcelain') });
  const before = [snapshot(repo), snapshot(second)];
  assert.throws(() => cli(deliveryCli, 'run', root, state, ['--hash', prepared.sha256], { ...env, FAIL_PREFLIGHT: '1' }), /second repository SSO required/);
  assert.deepEqual([snapshot(repo), snapshot(second)], before);
  assert.deepEqual(cli(deliveryCli, 'status', root, state).repos, {});
  assert.throws(() => cli(deliveryCli, 'run', root, state, ['--hash', prepared.sha256], { ...env, FAIL_SECOND: '1' }), /second repository PR failed/);
  const progress = cli(deliveryCli, 'status', root, state);
  assert.equal(progress.status, 'partial');
  assert.equal(progress.repos.service.pr.url, 'https://github.com/example/service/pull/7');
  assert.equal(progress.repos['service-two'].pushed, git(second, 'rev-parse', 'HEAD'));
  const html = await readFile(artifactJoin(artifacts, 'DEMO-status.html'), 'utf8');
  assert.match(html, /Partially delivered/);
  assert.match(html, /href="https:\/\/github.com\/example\/service\/pull\/7"/);
  assert.match(html, /<td>service-two<\/td>[\s\S]*<td>Pushed<\/td><td>Not created/);
  const packageData = JSON.parse(await readFile(built.json, 'utf8'));
  const diffFile = artifactJoin(artifacts, packageData.repos[0].diff_file);
  const savedDiff = await readFile(diffFile);
  const heads = [git(repo, 'rev-parse', 'HEAD'), git(second, 'rev-parse', 'HEAD')];
  await writeFile(diffFile, 'changed after the recorded commits\n');
  assert.throws(() => cli(deliveryCli, 'run', root, state, ['--hash', prepared.sha256], env), /Saved package diff changed/);
  assert.deepEqual([git(repo, 'rev-parse', 'HEAD'), git(second, 'rev-parse', 'HEAD')], heads);
  await writeFile(diffFile, savedDiff);
  const delivered = cli(deliveryCli, 'run', root, state, ['--hash', prepared.sha256], env);
  assert.equal(delivered.delivered, true);
  assert.equal(git(repo, 'rev-list', '--count', 'HEAD'), '2');
  assert.equal(git(second, 'rev-list', '--count', 'HEAD'), '2');
  assert.match(await readFile(artifactJoin(artifacts, 'DEMO-status.html'), 'utf8'), /phase-mode">Delivered/);
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

test('selected delivery preserves omitted work and package approval, rejects the old hash, and resumes', async t => {
  const f = await fixture(t, { dashboard: true, qualified: true, initial: { 'other.txt': 'before\n' }, setup: async ({ repo }) => {
    await writeFile(path.join(repo, 'other.txt'), 'unrelated tracked work\n');
    await writeFile(path.join(repo, 'notes.txt'), 'unrelated untracked work\n');
  } });
  const env = await mockDelivery(f);
  const snapshot = () => ({ head: git(f.repo, 'rev-parse', 'HEAD'), index: git(f.repo, 'write-tree'), status: git(f.repo, 'status', '--porcelain') });
  const before = snapshot();
  const preserved = await Promise.all(['DEMO-final-package.json', 'DEMO-final-approval.json', 'DEMO-state.md'].map(name => readFile(path.join(f.artifacts, name), 'utf8')));
  const full = cli(deliveryCli, 'prepare', f.root, f.state);
  const selected = await select(f, [{ name: 'service', paths: ['code.txt'] }]);
  assert.notEqual(selected.sha256, full.sha256);
  assert.deepEqual(snapshot(), before);
  assert.deepEqual(selected.data.repos[0].selection.omitted_local_paths, ['notes.txt', 'other.txt']);
  assert.match(await readFile(selected.plan, 'utf8'), /has not been separately reviewed or tested/);
  assert.match(selected.data.draft.pr_description, /Full source-package review/);
  for (const note of JSON.parse(preserved[0]).validation_notes) assert.ok(selected.data.draft.pr_description.includes(note));
  assert.match(selected.data.draft.pr_description, /skimmed/);
  assert.throws(() => cli(deliveryCli, 'run', f.root, f.state, ['--hash', full.sha256], env), /hash/);
  assert.deepEqual(snapshot(), before);
  const result = cli(deliveryCli, 'run', f.root, f.state, ['--hash', selected.sha256], env);
  assert.equal(result.delivered, true);
  assert.deepEqual(git(f.repo, 'diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD').split('\n'), ['code.txt']);
  assert.equal(await readFile(path.join(f.repo, 'other.txt'), 'utf8'), 'unrelated tracked work\n');
  assert.equal(await readFile(path.join(f.repo, 'notes.txt'), 'utf8'), 'unrelated untracked work\n');
  assert.match(git(f.repo, 'status', '--porcelain'), /other.txt/);
  assert.equal(git(f.repo, 'diff', '--cached', '--name-only'), '');
  assert.equal(git(f.root, '--git-dir', f.bare, 'show', 'DEMO:other.txt'), 'before');
  assert.equal(git(f.root, '--git-dir', f.bare, 'show', 'DEMO:code.txt'), 'after');
  const repeated = cli(deliveryCli, 'run', f.root, f.state, ['--hash', selected.sha256], env);
  assert.equal(repeated.repos.service.commit, result.repos.service.commit);
  assert.equal(git(f.repo, 'rev-list', '--count', 'HEAD'), '2');
  assert.deepEqual(await Promise.all(['DEMO-final-package.json', 'DEMO-final-approval.json', 'DEMO-state.md'].map(name => readFile(path.join(f.artifacts, name), 'utf8'))), preserved);
});

test('candidate preview and local push expose inherited content absent from the source package net diff', async t => {
  let inherited;
  const f = await fixture(t, { initial: { 'prior.txt': 'base\n' }, setup: async ({ repo }) => {
    await writeFile(path.join(repo, 'prior.txt'), 'earlier unrelated work\n');
    git(repo, 'add', 'prior.txt');
    git(repo, '-c', 'user.name=Test', '-c', 'user.email=test@example.test', 'commit', '-qm', 'Earlier branch work');
    inherited = git(repo, 'rev-parse', 'HEAD');
    await writeFile(path.join(repo, 'prior.txt'), 'base\n');
    await writeFile(path.join(repo, 'notes.txt'), 'omit me\n');
  } });
  const selected = await select(f, [{ name: 'service', paths: ['code.txt'] }]);
  const scope = selected.data.repos[0].selection;
  assert.deepEqual(scope.branch_paths, ['code.txt', 'prior.txt']);
  assert.deepEqual(scope.outside_package_paths, ['prior.txt']);
  assert.deepEqual(scope.inherited_commits, [inherited]);
  assert.deepEqual(scope.omitted_local_paths, ['notes.txt', 'prior.txt']);
  assert.match(await readFile(selected.plan, 'utf8'), /omitted committed work remains reachable/);
  assert.match(await readFile(path.join(f.artifacts, scope.branch_diff_file), 'utf8'), /earlier unrelated work/);
  cli(deliveryCli, 'run', f.root, f.state, ['--hash', selected.sha256], await mockDelivery(f));
  assert.equal(git(f.root, '--git-dir', f.bare, 'show', 'DEMO:prior.txt'), 'earlier unrelated work');
  assert.equal(await readFile(path.join(f.repo, 'prior.txt'), 'utf8'), 'base\n');
});

test('source tests passing do not become candidate test evidence when a helper change is omitted', async t => {
  const f = await fixture(t, { initial: {
    'util.mjs': 'export const value = 1;\n',
    'app.mjs': "import { value } from './util.mjs';\nexport const result = value * 2;\n",
    'test.mjs': "import assert from 'node:assert/strict';\nimport { result } from './app.mjs';\nassert.equal(result, 2);\n",
  }, setup: async ({ repo }) => {
    await writeFile(path.join(repo, 'util.mjs'), 'export const value = 1;\nexport const twice = n => n * 2;\n');
    await writeFile(path.join(repo, 'app.mjs'), "import { value, twice } from './util.mjs';\nexport const result = twice(value);\n");
  } });
  execFileSync(process.execPath, [path.join(f.repo, 'test.mjs')]);
  const selected = await select(f, [{ name: 'service', paths: ['app.mjs'] }]);
  const candidate = path.join(f.root, 'candidate');
  await mkdir(candidate);
  const archive = execFileSync('git', ['-C', f.repo, 'archive', selected.data.repos[0].target_tree]);
  execFileSync('tar', ['-x', '-C', candidate], { input: archive });
  assert.throws(() => execFileSync(process.execPath, [path.join(candidate, 'test.mjs')], { stdio: ['ignore', 'pipe', 'pipe'] }), /does not provide an export named 'twice'/);
  assert.match(selected.data.draft.pr_description, /passing source-tree checks do not establish/);
  assert.match(await readFile(selected.plan, 'utf8'), /has not been separately reviewed or tested/);
  assert.equal(git(f.repo, 'rev-list', '--count', 'HEAD'), '1');
});

test('literal selection supports additions, deletions and rename pairs while preserving omitted changes', async t => {
  const f = await fixture(t, { marked: true, initial: { 'old.txt': 'rename\n', 'delete.txt': 'delete\n' }, setup: async ({ repo }) => {
    await rm(path.join(repo, 'old.txt'));
    await rm(path.join(repo, 'delete.txt'));
    await writeFile(path.join(repo, 'new [*].txt'), 'rename\n');
    await writeFile(path.join(repo, 'new other.txt'), 'leave untracked\n');
  } });
  const selected = await select(f, [{ name: 'service', paths: ['old.txt', 'delete.txt', 'new [*].txt'] }]);
  assert.match(path.basename(selected.plan), /^miw-DEMO-/);
  assert.match(selected.data.repos[0].selection.branch_diff_file, /^miw-DEMO-/);
  assert.deepEqual(selected.data.repos[0].selection.commit_paths, ['delete.txt', 'new [*].txt', 'old.txt']);
  cli(deliveryCli, 'run', f.root, f.state, ['--hash', selected.sha256], await mockDelivery(f));
  assert.deepEqual(git(f.repo, 'diff-tree', '--no-renames', '--no-commit-id', '--name-only', '-r', 'HEAD').split('\n').sort(), ['delete.txt', 'new [*].txt', 'old.txt']);
  assert.equal(git(f.repo, 'show', 'HEAD:code.txt'), 'before');
  assert.equal(await readFile(path.join(f.repo, 'code.txt'), 'utf8'), 'after\n');
  assert.match(git(f.repo, 'status', '--porcelain'), /new other.txt/);
});

test('invalid or empty selections can be corrected before actions and cannot alter checkout or package', async t => {
  const f = await fixture(t);
  const before = { head: git(f.repo, 'rev-parse', 'HEAD'), index: git(f.repo, 'write-tree'), status: git(f.repo, 'status', '--porcelain') };
  for (const repos of [[], [{ name: 'unknown', paths: ['code.txt'] }], [{ name: 'service', paths: [] }],
    [{ name: 'service', paths: ['../code.txt'] }], [{ name: 'service', paths: ['code.txt', 'code.txt'] }],
    [{ name: 'service', paths: ['code.txt'] }, { name: 'service', paths: ['code.txt'] }]]) {
    await assert.rejects(select(f, repos), /Selection|Select/);
  }
  await assert.rejects(select(f, [{ name: 'service', paths: ['code.txt'] }], {}), /draft/);
  assert.deepEqual({ head: git(f.repo, 'rev-parse', 'HEAD'), index: git(f.repo, 'write-tree'), status: git(f.repo, 'status', '--porcelain') }, before);
  const fixed = await select(f, [{ name: 'service', paths: ['code.txt'] }]);
  assert.equal(fixed.data.selection_version, 1);
  cli(deliveryCli, 'prepare', f.root, f.state);
  assert.equal(JSON.parse(await readFile(path.join(f.artifacts, 'DEMO-delivery-plan.json'), 'utf8')).selection_version, undefined);
  assert.equal((await select(f, [{ name: 'service', paths: ['code.txt'] }])).sha256, fixed.sha256);
  const journalFile = path.join(f.artifacts, 'DEMO-delivery-progress.json');
  const journal = await readFile(journalFile, 'utf8');
  await writeFile(path.join(f.artifacts, 'DEMO-delivery.lock'), 'another operation\n');
  await assert.rejects(select(f, [{ name: 'service', paths: ['code.txt'] }]), /running or interrupted/);
  assert.equal(await readFile(journalFile, 'utf8'), journal);
  assert.throws(() => cli(deliveryCli, 'run', f.root, f.state, ['--hash', fixed.sha256]), /running or interrupted/);
  assert.equal(await readFile(journalFile, 'utf8'), journal);
});

test('committed-only selection cannot silently broaden scope and can be corrected or declined', async t => {
  const f = await fixture(t, { initial: { 'prior.txt': 'before\n' }, setup: async ({ repo }) => {
    await writeFile(path.join(repo, 'prior.txt'), 'committed earlier\n');
    git(repo, 'add', 'prior.txt');
    git(repo, '-c', 'user.name=Test', '-c', 'user.email=test@example.test', 'commit', '-qm', 'Earlier branch work');
  } });
  const before = git(f.repo, 'rev-parse', 'HEAD');
  await assert.rejects(select(f, [{ name: 'service', paths: ['prior.txt'] }]), /no new commit changes/);
  assert.equal(git(f.repo, 'rev-parse', 'HEAD'), before);
  assert.equal(git(f.repo, 'diff', '--cached', '--name-only'), '');
  assert.equal(cli(deliveryCli, 'decline', f.root, f.state).status, 'declined');
  const fixed = await select(f, [{ name: 'service', paths: ['code.txt'] }]);
  assert.deepEqual(fixed.data.repos[0].selection.omitted_package_paths, ['prior.txt']);
  assert.deepEqual(fixed.data.repos[0].selection.branch_paths, ['code.txt', 'prior.txt']);
});

test('selected delivery rejects changed content, tampered candidate diffs and hook-rewritten trees', async t => {
  for (const mode of ['content', 'diff', 'hook']) await t.test(mode, async t => {
    const f = await fixture(t, { setup: async ({ repo }) => writeFile(path.join(repo, 'notes.txt'), 'omit\n').then(() => undefined) });
    const selected = await select(f, [{ name: 'service', paths: ['code.txt'] }]);
    const env = await mockDelivery(f);
    if (mode === 'content') await writeFile(path.join(f.repo, 'code.txt'), 'changed\n');
    if (mode === 'diff') await writeFile(path.join(f.artifacts, selected.data.repos[0].selection.branch_diff_file), 'tampered\n');
    if (mode === 'hook') {
      const hook = path.join(f.repo, '.git/hooks/pre-commit');
      await writeFile(hook, '#!/bin/sh\nprintf "hook changed\\n" > code.txt\ngit add code.txt\n');
      await chmod(hook, 0o755);
    }
    assert.throws(() => cli(deliveryCli, 'run', f.root, f.state, ['--hash', selected.sha256], env), /stale|Candidate diff changed|hook changed approved tree/);
    assert.equal(git(f.repo, 'ls-remote', '--heads', 'origin', 'refs/heads/DEMO'), '');
    assert.equal(git(f.repo, 'rev-list', '--count', 'HEAD'), mode === 'hook' ? '2' : '1');
  });
});

test('selected multi-repo delivery omits a repository and retains the same plan through partial retry', async t => {
  let second, skipped;
  const f = await fixture(t, { setup: async ({ root, repo }) => {
    second = path.join(root, 'service-two'); skipped = path.join(root, 'skip');
    for (const target of [second, skipped]) {
      git(root, 'clone', '-q', repo, target);
      git(target, 'branch', 'main', 'origin/main');
      await writeFile(path.join(target, 'code.txt'), 'additional change\n');
    }
    const bare = path.join(root, 'remote-two.git');
    git(root, 'init', '-q', '--bare', bare);
    git(second, 'config', `url.${bare}.insteadOf`, 'https://github.com/example/service-two.git');
    git(second, 'remote', 'set-url', 'origin', 'https://github.com/example/service-two.git');
    git(skipped, 'remote', 'remove', 'origin');
    return [second, skipped];
  } });
  const selected = await select(f, [{ name: 'service-two', paths: ['code.txt'] }, { name: 'service', paths: ['code.txt'] }]);
  assert.deepEqual(selected.data.repos.map(repo => repo.name), ['service', 'service-two']);
  assert.deepEqual(selected.data.selection.omitted_repos, ['skip']);
  const env = await mockDelivery(f);
  assert.throws(() => cli(deliveryCli, 'run', f.root, f.state, ['--hash', selected.sha256], { ...env, FAIL_SECOND: '1' }), /temporary PR failure/);
  const progressPath = path.join(f.artifacts, 'DEMO-delivery-progress.json');
  const partial = await readFile(progressPath, 'utf8');
  assert.equal(JSON.parse(partial).status, 'partial');
  await assert.rejects(select(f, [{ name: 'service', paths: ['code.txt'] }]), /already started/);
  assert.equal(await readFile(progressPath, 'utf8'), partial);
  assert.equal(cli(deliveryCli, 'run', f.root, f.state, ['--hash', selected.sha256], env).delivered, true);
  for (const repo of [f.repo, second]) assert.equal(git(repo, 'rev-list', '--count', 'HEAD'), '2');
  assert.equal(git(skipped, 'rev-list', '--count', 'HEAD'), '1');
  assert.equal(await readFile(path.join(skipped, 'code.txt'), 'utf8'), 'additional change\n');
});

test('new full delivery restores canceled binary, mode, addition and deletion changes without staging excluded work', async t => {
  for (const noPrefix of [false, true]) await t.test(noPrefix ? 'no-prefix marked package' : 'standard legacy-named package', async t => {
    const originalBytes = Buffer.from([0, 1, 2, 255]);
    const f = await fixture(t, { marked: noPrefix, initial: {
      'restore [*].txt': 'restore\n', 'data.bin': originalBytes, 'script.sh': '#!/bin/sh\nexit 0\n',
    }, setup: async ({ repo }) => {
      git(repo, 'config', 'core.filemode', 'true');
      git(repo, 'config', 'diff.noprefix', String(noPrefix));
      await rm(path.join(repo, 'restore [*].txt'));
      await writeFile(path.join(repo, 'earlier.txt'), 'remove again\n');
      await writeFile(path.join(repo, 'data.bin'), Buffer.from([0, 3, 4, 254]));
      await chmod(path.join(repo, 'script.sh'), 0o755);
      git(repo, 'add', '-A', '--', 'restore [*].txt', 'earlier.txt', 'data.bin', 'script.sh');
      git(repo, '-c', 'user.name=Test', '-c', 'user.email=test@example.test', 'commit', '-qm', 'Earlier branch changes');
      await writeFile(path.join(repo, 'restore [*].txt'), 'restore\n');
      await rm(path.join(repo, 'earlier.txt'));
      await writeFile(path.join(repo, 'data.bin'), originalBytes);
      await chmod(path.join(repo, 'script.sh'), 0o644);
      await writeFile(path.join(repo, 'new [*].bin'), Buffer.from([0, 8, 9, 253]));
      await writeFile(path.join(repo, '.git/info/exclude'), 'local-notes.txt\n.env.local\n');
      await writeFile(path.join(repo, 'local-notes.txt'), 'excluded local work\n');
      await writeFile(path.join(repo, '.env.local'), 'fixture-only secret\n');
    } });
    const saved = await Promise.all(['DEMO-final-package.json', 'DEMO-final-approval.json', 'DEMO-state.md'].map(name => readFile(artifactJoin(f.artifacts, name))));
    const before = { head: git(f.repo, 'rev-parse', 'HEAD'), index: git(f.repo, 'write-tree'), status: git(f.repo, 'status', '--porcelain') };
    const prepared = cli(deliveryCli, 'prepare', f.root, f.state);
    const plan = JSON.parse(await readFile(artifactJoin(f.artifacts, 'DEMO-delivery-plan.json'), 'utf8'));
    assert.equal(plan.full_delivery_version, 1);
    assert.deepEqual(plan.repos[0].full_result.source_paths, ['code.txt', 'new [*].bin', 'restore [*].txt']);
    assert.deepEqual(plan.repos[0].full_result.reversal_paths, ['data.bin', 'earlier.txt', 'script.sh']);
    assert.match(await readFile(prepared.plan, 'utf8'), /Required reversals outside the source-package path list:/);
    assert.deepEqual({ head: git(f.repo, 'rev-parse', 'HEAD'), index: git(f.repo, 'write-tree'), status: git(f.repo, 'status', '--porcelain') }, before);
    const env = await mockDelivery(f);
    const result = cli(deliveryCli, 'run', f.root, f.state, ['--hash', prepared.sha256], env);
    assert.equal(result.delivered, true);
    assert.equal(git(f.repo, 'status', '--porcelain'), '');
    assert.equal(git(f.root, '--git-dir', f.bare, 'show', 'DEMO:restore [*].txt'), 'restore');
    assert.equal(git(f.root, '--git-dir', f.bare, 'ls-tree', 'DEMO', '--', 'earlier.txt'), '');
    assert.match(git(f.root, '--git-dir', f.bare, 'ls-tree', 'DEMO', '--', 'script.sh'), /^100644 /);
    assert.deepEqual(execFileSync('git', ['--git-dir', f.bare, 'show', 'DEMO:data.bin']), originalBytes);
    assert.deepEqual(execFileSync('git', ['--git-dir', f.bare, 'show', 'DEMO:new [*].bin']), Buffer.from([0, 8, 9, 253]));
    assert.equal(git(f.root, '--git-dir', f.bare, 'ls-tree', 'DEMO', '--', 'local-notes.txt', '.env.local'), '');
    assert.equal(await readFile(path.join(f.repo, 'local-notes.txt'), 'utf8'), 'excluded local work\n');
    assert.deepEqual(await Promise.all(['DEMO-final-package.json', 'DEMO-final-approval.json', 'DEMO-state.md'].map(name => readFile(artifactJoin(f.artifacts, name)))), saved);
    assert.equal(cli(deliveryCli, 'run', f.root, f.state, ['--hash', prepared.sha256], env).repos.service.commit, result.repos.service.commit);
  });
});

test('a repository with zero net package paths still includes the commit needed to cancel inherited work', async t => {
  const f = await fixture(t, { initial: { 'setting.txt': 'false\n' }, setup: async ({ repo }) => {
    await writeFile(path.join(repo, 'setting.txt'), 'true\n');
    git(repo, 'add', 'setting.txt');
    git(repo, '-c', 'user.name=Test', '-c', 'user.email=test@example.test', 'commit', '-qm', 'Earlier setting');
    await writeFile(path.join(repo, 'setting.txt'), 'false\n');
    await writeFile(path.join(repo, 'code.txt'), 'before\n');
  } });
  const prepared = cli(deliveryCli, 'prepare', f.root, f.state);
  const plan = JSON.parse(await readFile(artifactJoin(f.artifacts, 'DEMO-delivery-plan.json'), 'utf8'));
  assert.deepEqual(plan.repos[0].full_result.source_paths, []);
  assert.deepEqual(plan.repos[0].full_result.commit_paths, ['setting.txt']);
  cli(deliveryCli, 'run', f.root, f.state, ['--hash', prepared.sha256], await mockDelivery(f));
  assert.equal(git(f.root, '--git-dir', f.bare, 'show', 'DEMO:setting.txt'), 'false');
});

test('an already saved legacy full plan retains its exact approved tree instead of being migrated', async t => {
  const f = await fixture(t, { initial: { 'setting.txt': 'false\n' }, setup: async ({ repo }) => {
    await writeFile(path.join(repo, 'setting.txt'), 'true\n');
    git(repo, 'add', 'setting.txt');
    git(repo, '-c', 'user.name=Test', '-c', 'user.email=test@example.test', 'commit', '-qm', 'Earlier setting');
    await writeFile(path.join(repo, 'setting.txt'), 'false\n');
  } });
  const legacy = await legacyPrepared(f, cli(deliveryCli, 'prepare', f.root, f.state));
  const file = artifactJoin(f.artifacts, 'DEMO-delivery-plan.json');
  const saved = await readFile(file, 'utf8');
  cli(deliveryCli, 'run', f.root, f.state, ['--hash', legacy.sha256], await mockDelivery(f));
  assert.equal(await readFile(file, 'utf8'), saved);
  assert.equal(git(f.root, '--git-dir', f.bare, 'show', 'DEMO:setting.txt'), 'true');
  assert.equal(await readFile(path.join(f.repo, 'setting.txt'), 'utf8'), 'false\n');
});
