import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { digest } from '../../../scripts/lib/artifacts.mjs';
import { runRegression } from '../../../scripts/regression.mjs';
import { writeReview } from '../../../scripts/review-report.mjs';
import { executionControl } from '../../execute/scripts/step-control.mjs';
import { updatePlan } from '../../execute/scripts/plan-status.mjs';
import { applyWorkflow, initializeWorkflow } from './workflow.mjs';
import { testingReadiness } from './testing-readiness.mjs';
import { testingPolicy } from './testing-policy.mjs';
import { prepareReviewScope } from './review-scope.mjs';
import { prepareScope, approveScope, runScope } from './workspace-scope.mjs';
import { realpath } from 'node:fs/promises';

for (const { autonomy, workspace } of [{ autonomy: 'autonomous' }, { autonomy: 'guided' }, { autonomy: 'autonomous', workspace: true }]) test(`a real red-to-green ${autonomy} ${workspace ? 'multi-repo' : 'single-repo'} implementation completes through regression, review and exact final package`, async (t) => {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'workflow-integration-')));
  const sourceRoot = workspace ? path.join(root, 'api') : root;
  const secondRoot = path.join(root, 'web');
  const repos = workspace ? [sourceRoot, secondRoot] : [root];
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp('evals/execute/execute-full-pass/fixture', sourceRoot, { recursive: true });
  await cp('evals/implement/fixture-base/.claude', path.join(sourceRoot, '.claude'), { recursive: true });
  await cp('evals/implement/fixture-base/CLAUDE.md', path.join(sourceRoot, 'CLAUDE.md'));
  const git = (...argv) => execFileSync('git', ['-C', sourceRoot, ...argv], { stdio: 'pipe' });
  git('init', '-b', 'main'); git('config', 'user.name', 'Test'); git('config', 'user.email', 'test@example.invalid');
  git('add', '.'); git('commit', '-m', 'fixture');
  if (workspace) {
    await cp(sourceRoot, secondRoot, { recursive: true });
    execFileSync('git', ['-C', secondRoot, 'branch', '-m', 'develop'], { stdio: 'pipe' });
    await mkdir(path.join(root, 'make-it-work/DEMO-2'), { recursive: true });
    await cp(path.join(sourceRoot, 'make-it-work/DEMO-2'), path.join(root, 'make-it-work/DEMO-2'), { recursive: true });
    const report = 'make-it-work/DEMO-2/DEMO-2-repos.md';
    await writeFile(path.join(root, report), '# Definite: api and web — greeting exports\n');
    const preview = await prepareScope(root, { ticket: 'DEMO-2', report, repos: [{ id: 'api', reason: 'src/greeting.js:1', base: 'main' }, { id: 'web', reason: 'src/greeting.js:1', base: 'develop' }] });
    await approveScope(root, 'DEMO-2', preview.hash, { source: 'user', via: 'chat' });
    await runScope(root, 'DEMO-2', preview.hash);
  } else git('switch', '-c', 'DEMO-2');
  const initialHead = git('rev-parse', 'HEAD').toString().trim();
  const initialized = await initializeWorkflow(root, { ticket: 'DEMO-2', autonomy, base: 'main', repos, branch_guard: 'Existing feature branch' });
  const statePath = initialized.state;
  let eventId = 0;
  const apply = async (event, extra = {}) => applyWorkflow({ root, statePath, input: { event, id: `event-${++eventId}`, expected_hash: digest(await readFile(statePath, 'utf8')), repos, ...extra } });
  await apply('context-ready');
  const directory = path.join(root, 'make-it-work/DEMO-2');
  const handoffs = path.join(directory, 'DEMO-2-handoffs'); await mkdir(handoffs);
  const saveHandoff = async (stage, body) => {
    const file = path.join(handoffs, `${stage}-1.json`);
    await writeFile(file, JSON.stringify({ version: 1, ticket: 'DEMO-2', plan_version: 1, stage, status: 'done', ...body }));
    return path.relative(root, file);
  };
  await writeFile(path.join(directory, 'DEMO-2-spec.md'), '# Formal greeting\n\nAdd a formal greeting while preserving the existing greeting.\n');
  await apply('mode', { risk: 'medium', mode: 'tdd', source: 'assessed', rationale: 'Touches shared behavior with existing callers.' });
  const specResult = await apply('handoff', { handoff: await saveHandoff('gaps', { outcome: 'SPEC_SAVED', artifacts: { spec: 'make-it-work/DEMO-2/DEMO-2-spec.md' }, data: { tbd_items: 0, context_updated: [] } }) });
  if (autonomy === 'guided') {
    assert.equal(specResult.fields.status, 'Paused');
    await apply('resolve-input', { pending_id: specResult.pending[0].id, answer: 'approve', source: 'user', via: 'chat' });
  }
  const planPath = path.join(directory, 'DEMO-2-plan.md');
  let plan = (await readFile(planPath, 'utf8')).replace('## Codebase Gaps', '## Verification Policy\n\n| Repo | Mode | Decision | Reason |\n| --- | --- | --- | --- |\n| tiny-greeter-full | automated | configured | Actual test script |\n\n## Codebase Gaps');
  plan = plan.replace('| Acceptance criterion | Test scenario |\n| --- | --- |', '| Acceptance criterion | Requirement clause | Test scenario |\n| --- | --- | --- |')
    .replace('| Happy path row above |', '| Formal output includes the supplied name and ends in a period | Happy path row above |')
    .replace('| Regression row above |', '| Existing greeting retains its name and punctuation | Regression row above |');
  if (workspace) plan = plan.replaceAll('tiny-greeter-full', 'api').replace('## Verification Policy', '### `web`\n\n| File | Change | Summary |\n| --- | --- | --- |\n| `src/greeting.js` | Modify | Add the formal greeting in the second service. |\n\n## Verification Policy').replace('| api | automated | configured | Actual test script |', '| api | automated | configured | Actual test script |\n| web | automated | configured | Actual test script |');
  await writeFile(planPath, plan); await updatePlan(planPath, 'set-total', { total: 1 }); await updatePlan(planPath, 'set-mode', { mode: 'inline' });
  const regression = () => runRegression({ version: 1, mode: 'full', workspace: Boolean(workspace), runs: repos.map((cwd, index) => ({ repo: workspace ? index === 0 ? 'api' : 'web' : 'tiny-greeter-full', cwd, scope: 'full', command: { bin: process.execPath, args: ['test.js'] } })) });
  assert.equal((await regression()).overall, 'fail');
  const begun = await testingReadiness(statePath, 'begin');
  const policy = testingPolicy(plan, { required: true });
  await writeFile(path.join(root, begun.report), '# Readiness\n\n## Verification Policy\n\n| Repo | Mode | Decision | Reason |\n| --- | --- | --- | --- |\n' + policy.map((row) => `| ${row.Repo} | ${row.Mode} | ${row.Decision} | ${row.Reason} |`).join('\n') + '\n\n## Readiness results\n\n| Repo | Status | Setup | Baseline | Evidence |\n| --- | --- | --- | --- | --- |\n' + policy.map((row) => `| ${row.Repo} | ready | existing | fail | Existing configured runner executed; the fixture already contains a red feature progression test |`).join('\n') + '\n');
  await testingReadiness(statePath, 'complete');
  const planResult = await apply('handoff', { handoff: await saveHandoff('plan', { outcome: 'PLAN_SAVED', artifacts: { plan: 'make-it-work/DEMO-2/DEMO-2-plan.md' }, data: { mode: 'initial', steps_added: null, recommend_replan: null, context_updated: [] } }) });
  if (autonomy === 'guided') {
    assert.equal(planResult.fields.status, 'Paused');
    await apply('resolve-input', { pending_id: planResult.pending[0].id, answer: 'approve', source: 'user', via: 'question' });
  }
  if (workspace) {
    for (const run of [{ repo: 'unselected', cwd: sourceRoot }, { repo: 'api', cwd: secondRoot }]) {
      await assert.rejects(runRegression({ version: 1, mode: 'full', runs: [{ ...run, scope: 'full', command: { bin: process.execPath, args: ['test.js'] } }] }, { statePath, auditId: 'reject-unapproved-scope' }), /outside the approved repository scope/);
    }
  }
  await executionControl(planPath, { action: 'start', id: 'formal-greeting-step-1', steps: [1] }, { dashboardState: statePath });
  await executionControl(planPath, { action: 'begin-attempt', id: 'formal-greeting-fix-1', step: 1, diagnosis: { failure: 'The formal greeting assertion fails.', evidence: 'node test.js output; src/greeting.js lacks greetFormally.', cause: 'The required formal greeting function is missing.', next_change: 'Implement and export greetFormally.', expected_result: 'Formal greeting and existing greeting assertions pass.' } });
  for (const repo of repos) await writeFile(path.join(repo, 'src/greeting.js'), 'function greet(name) { return `Hello, ${name}!`; }\nfunction greetFormally(name) { return `Good day, ${name}.`; }\nmodule.exports = { greet, greetFormally };\n');
  const result = await regression(); assert.equal(result.overall, 'pass');
  const ledgerPath = path.join(directory, 'DEMO-2-verification-v1.json');
  const checks = ['Happy path row above', 'Regression row above'].map((subject) => ({ type: 'automated', subject, command: 'node test.js', result: 'pass', note: 'Executed actual greeting assertions.', assertions: [{ clause: subject === 'Happy path row above' ? 'Formal output includes the supplied name and ends in a period' : 'Existing greeting retains its name and punctuation', expected: subject === 'Happy path row above' ? 'Good day, Ann.' : 'Hello, Ann!', observed: subject === 'Happy path row above' ? 'Good day, Ann.' : 'Hello, Ann!', source: `${workspace ? 'api/' : ''}test.js:${subject === 'Happy path row above' ? 6 : 5} strictEqual` }] }));
  await executionControl(planPath, { action: 'complete', steps: [{ number: 1, checks }] }, { ledgerPath, ticket: 'DEMO-2', dashboardState: statePath });
  const ledger = JSON.parse(await readFile(ledgerPath, 'utf8'));
  ledger.acceptance = ledger.acceptance.map((row) => ({ ...row, status: 'automated', step: 1, note: 'Exact output assertion passed.' }));
  ledger.gate = { mode: 'full-suite', result: result.overall, note: 'Actual regression command result.', full_suites: repos.map((repo, index) => ({ repo: workspace ? index === 0 ? 'api' : 'web' : 'tiny-greeter-full', command: 'node test.js', result: 'pass', note: 'Exited 0.' })) };
  await writeFile(ledgerPath, JSON.stringify(ledger));
  await writeFile(path.join(directory, 'DEMO-2-execute.md'), 'Execute outcome: PASSED\n');
  const execution = await apply('handoff', { handoff: await saveHandoff('execute', { outcome: 'PASSED', artifacts: { report: 'make-it-work/DEMO-2/DEMO-2-execute.md', verification: 'make-it-work/DEMO-2/DEMO-2-verification-v1.json' }, data: { discoveries: [], failing_tests: [], gate: 'full-suite' } }) });
  assert.equal(execution.fields.review_cycle, '1');
  // This test supplies a clean review artifact; semantic independence is exercised by the separate forward-test rehearsal.
  const roots = workspace ? { api: sourceRoot, web: secondRoot } : { 'tiny-greeter-full': root };
  const target = await prepareReviewScope(root, statePath);
  const review = await writeReview(root, { version: 1, ticket: 'DEMO-2', branch: 'DEMO-2', commit: `working tree on ${initialHead}`, working_tree: true,
    coverage: 'Compared the full delivery target with the formal-greeting spec and actual passing assertions.', findings: [], repo_roots: roots,
    review_target: target.review_target, review_target_sha256: target.sha256,
    review_scope: target.repos.map((repo) => ({ repo: Object.keys(roots).find((key) => roots[key] === repo.root), base: repo.base, scope: 'branch', paths: repo.paths })),
    implement: { handoff_version: 1, plan_version: 1, review_cycle: 1, review_scope_version: 1 } });
  await apply('handoff', { handoff: path.relative(root, review.handoff) }); await apply('sync-complete');
  const draft = path.join(directory, 'DEMO-2-final-draft.json');
  await writeFile(draft, JSON.stringify({ commit_message: 'Add formal greeting', pr_title: 'Add formal greeting', pr_description: 'Add formal greeting while preserving greet. Actual node test.js assertions pass.' }));
  const helper = path.resolve('skills/implement/scripts/final-package.mjs');
  execFileSync(process.execPath, [helper, 'build', '--root', root, '--state', statePath, '--draft', draft, ...repos.flatMap((repo) => ['--repo', repo]), ...(workspace ? [] : ['--base', 'main'])], { stdio: 'pipe' });
  const scopedPackage = JSON.parse(await readFile(path.join(directory, 'DEMO-2-final-package.json'), 'utf8'));
  assert.ok(scopedPackage.review_scope.every((repo) => repo.status === 'covered'));
  assert.ok(scopedPackage.evidence.review_target);
  if (workspace) {
    const pkg = scopedPackage;
    assert.deepEqual(pkg.repos.map((repo) => repo.base), ['main', 'develop']);
    assert.throws(() => execFileSync(process.execPath, [helper, 'build', '--root', root, '--state', statePath, '--draft', draft, '--repo', sourceRoot], { stdio: 'pipe' }), /every approved repository/);
    assert.match(await readFile(initialized.dashboard, 'utf8'), /Full suite: pass/);
  }
  let completed;
  if (autonomy === 'guided') {
    const waiting = await apply('await-input', { pending: { id: 'final-package-approval', kind: 'approval', question: 'Approve this final package?' } });
    assert.equal(waiting.fields.status, 'Paused');
    const changedDraft = JSON.parse(await readFile(draft, 'utf8')); changedDraft.pr_description += ' Clarified reviewer notes.';
    await writeFile(draft, JSON.stringify(changedDraft));
    await assert.rejects(apply('resolve-input', { pending_id: 'final-package-approval', answer: 'approve', source: 'user', via: 'chat' }), /stale/);
    execFileSync(process.execPath, [helper, 'build', '--root', root, '--state', statePath, '--draft', draft, ...repos.flatMap((repo) => ['--repo', repo]), ...(workspace ? [] : ['--base', 'main'])], { stdio: 'pipe' });
    await apply('refresh-input', { pending_id: 'final-package-approval', pending: { id: 'final-package-approval-2', kind: 'approval', question: 'Approve the updated final package?' } });
    completed = await apply('resolve-input', { pending_id: 'final-package-approval-2', answer: 'approve', source: 'user', via: 'chat' });
  } else completed = await apply('complete');
  assert.equal(completed.fields.status, 'Complete'); assert.equal(completed.fields.phase, 'complete');
  assert.equal(git('rev-parse', 'HEAD').toString().trim(), initialHead);
});
