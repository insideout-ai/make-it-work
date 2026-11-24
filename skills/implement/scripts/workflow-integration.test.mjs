import { artifactJoin } from '../../../scripts/lib/artifact-path.mjs';
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
import { recordPreparation, plannedScenarios } from '../../write-the-tests/scripts/preparation.mjs';
import { planHash } from '../../../scripts/lib/plan.mjs';
import { authorizePlanningTests } from './planning-tests.mjs';
import { impactRegressionManifest } from './repo-impact.mjs';
import { testingReadiness } from './testing-readiness.mjs';
import { testingPolicy } from './testing-policy.mjs';
import { inspectReviewScope, prepareReviewScope } from './review-scope.mjs';
import { startupHook } from './startup-presentation.mjs';
import { prematureImplementation } from './implementation-guard.mjs';
import { parseState } from './render-status.mjs';
import { prepareScope, approveScope, runScope } from './workspace-scope.mjs';
import { realpath } from 'node:fs/promises';
import { allocateSession } from '../../../scripts/session-workspace.mjs';

for (const { autonomy, workspace, worktree } of [{ autonomy: 'autonomous' }, { autonomy: 'guided' }, { autonomy: 'autonomous', workspace: true }, { autonomy: 'autonomous', workspace: true, worktree: true }]) test(`a real red-to-green ${autonomy} ${worktree ? 'isolated worktree' : workspace ? 'multi-repo' : 'single-repo'} implementation completes through regression, review and exact final package`, async (t) => {
  let root = await realpath(await mkdtemp(artifactJoin(os.tmpdir(), 'workflow-integration-')));
  const fixtureRoot = root;
  let sourceRoot = workspace ? artifactJoin(root, 'api') : root;
  let secondRoot = artifactJoin(root, 'web');
  let repos = workspace ? [sourceRoot, secondRoot] : [root];
  let originalRepos = [];
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  await cp('evals/execute/execute-full-pass/fixture', sourceRoot, { recursive: true });
  await cp('evals/implement/fixture-base/.claude', artifactJoin(sourceRoot, '.claude'), { recursive: true });
  await cp('evals/implement/fixture-base/CLAUDE.md', artifactJoin(sourceRoot, 'CLAUDE.md'));
  const git = (...argv) => execFileSync('git', ['-C', sourceRoot, ...argv], { stdio: 'pipe' });
  git('init', '-b', 'main'); git('config', 'user.name', 'Test'); git('config', 'user.email', 'test@example.invalid');
  await writeFile(artifactJoin(sourceRoot, '.gitignore'), '/make-it-work/\n');
  git('add', '.'); git('commit', '-m', 'fixture');
  if (workspace) {
    await cp(sourceRoot, secondRoot, { recursive: true });
    execFileSync('git', ['-C', secondRoot, 'branch', '-m', 'develop'], { stdio: 'pipe' });
    await mkdir(artifactJoin(root, 'make-it-work/DEMO-2'), { recursive: true });
    await cp(artifactJoin(sourceRoot, 'make-it-work/DEMO-2'), artifactJoin(root, 'make-it-work/DEMO-2'), { recursive: true });
    originalRepos = [...repos];
    if (worktree) {
      const session = await allocateSession(root, { ticket: 'DEMO-2' });
      await cp(artifactJoin(root, 'make-it-work/DEMO-2'), path.join(session.artifact_root, 'make-it-work/DEMO-2'), { recursive: true });
      root = session.artifact_root;
    }
    const report = 'make-it-work/DEMO-2/DEMO-2-repos.md';
    await writeFile(artifactJoin(root, report), '# Definite: api and web — greeting exports\n');
    const preview = await prepareScope(root, { ticket: 'DEMO-2', report, repos: [{ id: 'api', reason: 'src/greeting.js:1', base: 'main', ...(worktree ? { target_branch: 'DEMO-2' } : {}) }, { id: 'web', reason: 'src/greeting.js:1', base: 'develop', ...(worktree ? { target_branch: 'DEMO-2' } : {}) }] });
    await approveScope(root, 'DEMO-2', preview.hash, { source: 'user', via: 'chat' });
    await runScope(root, 'DEMO-2', preview.hash);
    if (worktree) {
      sourceRoot = preview.plan.repos.find(repo => repo.id === 'api').root; secondRoot = preview.plan.repos.find(repo => repo.id === 'web').root; repos = [sourceRoot, secondRoot];
      for (const original of originalRepos) assert.equal(execFileSync('git', ['-C', original, 'status', '--porcelain'], { encoding: 'utf8' }).trim(), '', 'original checkout is unchanged');
    }
  } else git('switch', '-c', 'DEMO-2');
  let initialHead = git('rev-parse', 'HEAD').toString().trim();
  const initialized = await initializeWorkflow(root, { ticket: 'DEMO-2', autonomy, base: 'main', repos, branch_guard: 'Existing feature branch' });
  const statePath = initialized.state;
  let eventId = 0;
  const apply = async (event, extra = {}) => applyWorkflow({ root, statePath, input: { event, id: `event-${++eventId}`, expected_hash: digest(await readFile(statePath, 'utf8')), repos, ...extra } });
  if (!workspace && autonomy === 'autonomous') {
    // Rehearse the transcript's approved advance before refinement, then a
    // real runtime-evidenced survey wait before the normal red-to-green flow.
    await writeFile(artifactJoin(root, 'upstream.json'), '{"approved":true}\n');
    git('add', 'upstream.json'); git('commit', '-m', 'Approved upstream advance');
    const advanced = git('rev-parse', 'HEAD').toString().trim();
    assert.match(await prematureImplementation(initialized, parseState(await readFile(statePath, 'utf8'))), /Application files changed/);
    await apply('accept-workspace', { source: 'user', via: 'chat', reason: 'User approved exact upstream advance',
      branch_baseline: [{ root, from_head: initialHead, to_head: advanced, branch: 'DEMO-2' }] });
    initialHead = advanced;
  }
  await apply('context-ready');
  if (!workspace && autonomy === 'autonomous') {
    const events = [
      { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'init', name: 'Bash' }] } },
      { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'init', content: JSON.stringify({ ...initialized, continuation: 'continue_context_check_without_user_reply' }) }] } },
      { type: 'assistant', message: { content: [{ type: 'text', text: initialized.startup_message }, { type: 'tool_use', id: 'survey', name: 'Agent' }] } },
      { type: 'user', timestamp: new Date(Date.now() + 10).toISOString(), toolUseResult: { isAsync: true, status: 'async_launched', agentId: 'survey-agent' },
        message: { content: [{ type: 'tool_result', tool_use_id: 'survey', content: 'Launched' }] } },
    ];
    const transcript = artifactJoin(root, 'make-it-work/survey-transcript.jsonl');
    const check = async () => {
      await writeFile(transcript, events.map(JSON.stringify).join('\n') + '\n');
      return startupHook({ hook_event_name: 'Stop', transcript_path: transcript });
    };
    assert.deepEqual(await check(), {});
    events.push({ type: 'queue-operation', operation: 'enqueue', content: '<task-notification><task-id>survey-agent</task-id><status>completed</status></task-notification>' });
    assert.match((await check()).reason, /still In Progress at close-the-gaps/);
  }
  const directory = artifactJoin(root, 'make-it-work/DEMO-2');
  const handoffs = artifactJoin(directory, 'DEMO-2-handoffs'); await mkdir(handoffs);
  const saveHandoff = async (stage, body) => {
    const file = artifactJoin(handoffs, `${stage}-1.json`);
    await writeFile(file, JSON.stringify({ version: 1, ticket: 'DEMO-2', plan_version: 1, stage, status: 'done', ...body }));
    return path.relative(root, file);
  };
  await writeFile(artifactJoin(directory, 'DEMO-2-spec.md'), '# Formal greeting\n\nAdd a formal greeting while preserving the existing greeting.\n');
  await apply('mode', { risk: 'medium', mode: 'tdd', source: 'assessed', rationale: 'Touches shared behavior with existing callers.' });
  const specResult = await apply('handoff', { handoff: await saveHandoff('gaps', { outcome: 'SPEC_SAVED', artifacts: { spec: 'make-it-work/DEMO-2/DEMO-2-spec.md' }, data: { tbd_items: 0, context_updated: [] } }) });
  if (autonomy === 'guided') {
    assert.equal(specResult.fields.status, 'Paused');
    await apply('resolve-input', { pending_id: specResult.pending[0].id, answer: 'approve', source: 'user', via: 'chat' });
  }
  const planPath = artifactJoin(directory, 'DEMO-2-plan.md');
  let plan = (await readFile(planPath, 'utf8')).replace('## Codebase Gaps', '## Verification Policy\n\n| Repo | Mode | Decision | Reason |\n| --- | --- | --- | --- |\n| tiny-greeter-full | automated | configured | Actual test script |\n\n## Codebase Gaps');
  plan = plan.replace('| Acceptance criterion | Test scenario |\n| --- | --- |', '| Acceptance criterion | Requirement clause | Test scenario |\n| --- | --- | --- |')
    .replace('| Happy path row above |', '| Formal output includes the supplied name and ends in a period | Happy path row above |')
    .replace('| Regression row above |', '| Existing greeting retains its name and punctuation | Regression row above |');
  if (workspace) plan = plan.replaceAll('tiny-greeter-full', 'api').replace('## Verification Policy', '### `web`\n\n| File | Change | Summary |\n| --- | --- | --- |\n| `src/greeting.js` | Modify | Add the formal greeting in the second service. |\n\n## Verification Policy').replace('| api | automated | configured | Actual test script |', '| api | automated | configured | Actual test script |\n| web | automated | configured | Actual test script |');
  let impact = null;
  if (workspace) {
    impact = { version: 1, repos: ['api', 'web'].map(repo => ({ repo, role: 'product', classification: 'change', planned_paths: ['src/greeting.js', 'test.js'], reason: 'Formal greeting is required in this service.', evidence: [{ repo, path: 'package.json' }] })),
      checks: ['api', 'web'].map(repo => ({ id: `${repo}-full`, repos: [repo], run_repo: repo, scope: 'full', command: { bin: 'node', args: ['test.js'] }, scenario: `${repo} greeting regression`, expected: 'New and existing greetings pass.', prerequisites: 'Existing Node runtime.', source: 'configured', reason: 'Changed product service keeps full verification.' })) };
    await apply('repo-impact', { assessment: impact });
    plan = plan.replace('# Plan for', '**Repository impact contract:** 1\n\n# Plan for').replace('## Verification Policy', `## Repository Impact\n\n\`\`\`json\n${JSON.stringify(impact)}\n\`\`\`\n\n## Verification Policy`);
  }
  await writeFile(planPath, plan); await updatePlan(planPath, 'set-total', { total: 1 }); await updatePlan(planPath, 'set-mode', { mode: 'inline' });
  const regression = async (audited = false) => runRegression(impact && audited ? impactRegressionManifest(impact, parseState(await readFile(statePath, 'utf8')).fields) : { version: 1, mode: 'full', workspace: Boolean(workspace), runs: repos.map((cwd, index) => ({ repo: workspace ? index === 0 ? 'api' : 'web' : 'tiny-greeter-full', cwd, scope: 'full', command: { bin: process.execPath, args: ['test.js'] } })) }, impact && audited ? { statePath, auditId: 'final-impact-gate' } : {});
  assert.equal((await regression()).overall, 'fail');
  const begun = await testingReadiness(statePath, 'begin');
  const policy = testingPolicy(plan, { required: true });
  await writeFile(artifactJoin(root, begun.report), '# Readiness\n\n## Verification Policy\n\n| Repo | Mode | Decision | Reason |\n| --- | --- | --- | --- |\n' + policy.map((row) => `| ${row.Repo} | ${row.Mode} | ${row.Decision} | ${row.Reason} |`).join('\n') + '\n\n## Readiness results\n\n| Repo | Status | Setup | Baseline | Evidence |\n| --- | --- | --- | --- | --- |\n' + policy.map((row) => `| ${row.Repo} | ready | existing | fail | Existing configured runner executed; the fixture already contains a red feature progression test |`).join('\n') + '\n');
  await testingReadiness(statePath, 'complete');
  const planResult = await apply('handoff', { handoff: await saveHandoff('plan', { outcome: 'PLAN_SAVED', artifacts: { plan: 'make-it-work/DEMO-2/DEMO-2-plan.md' }, data: { mode: 'initial', steps_added: null, recommend_replan: null, context_updated: [] } }) });
  if (autonomy === 'guided') {
    assert.equal(planResult.fields.status, 'Paused');
    await apply('resolve-input', { pending_id: planResult.pending[0].id, answer: 'approve', source: 'user', via: 'question' });
  }
  assert.equal(parseState(await readFile(statePath, 'utf8')).fields.phase, 'write-tests');
  const compaction = await apply('compaction-checkpoint', { notes: 'The feature progression baseline is intentionally red; readiness records that result.' });
  assert.equal(compaction.fields.status, 'Paused');
  if (autonomy === 'guided') {
    const waiting = await apply('resolve-input', { pending_id: compaction.pending[0].id, answer: 'compact', source: 'user', via: 'question' });
    assert.match(waiting.next_action.compact_command, /^\/compact /);
    await apply('resolve-input', { pending_id: waiting.pending[0].id, answer: 'continue', source: 'user', via: 'chat' });
  } else await apply('resolve-input', { pending_id: compaction.pending[0].id, answer: 'continue', source: 'user', via: 'question' });

  const scenarios = plannedScenarios(plan), entries = [];
  for (const [index, cwd] of repos.entries()) {
    await authorizePlanningTests(statePath, { repo: cwd, file: 'test.js', kind: 'test-file', step: 1, reason: 'Assert a formal greeting function exists before checking its output' });
    await writeFile(artifactJoin(cwd, 'test.js'), (await readFile(artifactJoin(cwd, 'test.js'), 'utf8')).replace("assert.strictEqual(greetFormally", "assert.strictEqual(typeof greetFormally, 'function');\nassert.strictEqual(greetFormally"));
    let red;
    try { execFileSync(process.execPath, ['test.js'], { cwd, stdio: 'pipe' }); } catch (error) { red = error.stderr.toString(); }
    assert.match(red, /AssertionError/);
    execFileSync(process.execPath, ['-e', "require('node:assert/strict').equal(require('./src/greeting').greet('Ann'), 'Hello, Ann!')"], { cwd, stdio: 'pipe' });
    for (const [n, row] of scenarios.entries()) entries.push({ scenario: row.Scenario, step: 1, repo: workspace ? index === 0 ? 'api' : 'web' : 'tiny-greeter-full', cwd, file: 'test.js', command: n === 0 ? 'node test.js' : "node -e \"require('node:assert/strict').equal(require('./src/greeting').greet('Ann'), 'Hello, Ann!')\"", kind: n === 0 ? 'progression' : 'regression', result: n === 0 ? 'expected-red' : 'pass', reason: n === 0 ? 'Missing formal greeting function assertion fails' : 'Existing greeting retains punctuation', evidence: 'Observed node assertion output in this integration test' });
  }
  const preparation = await recordPreparation(planPath, { version: 1, plan_hash: planHash(await readFile(planPath, 'utf8')), status: 'ready', entries });
  await apply('preparation-saved', { preparation: path.relative(root, preparation.file) });
  await apply('handoff', { handoff: await saveHandoff('tests', { outcome: 'TESTS_PREPARED', artifacts: { report: path.relative(root, preparation.report), preparation: path.relative(root, preparation.file) }, data: {} }) });
  assert.equal(parseState(await readFile(statePath, 'utf8')).fields.phase, 'execute');
  if (workspace) {
    for (const run of [{ repo: 'unselected', cwd: sourceRoot }, { repo: 'api', cwd: secondRoot }]) {
      await assert.rejects(runRegression({ version: 1, mode: 'full', runs: [{ ...run, scope: 'full', command: { bin: process.execPath, args: ['test.js'] } }] }, { statePath, auditId: 'reject-unapproved-scope' }), /outside the approved repository scope/);
    }
  }
  await executionControl(planPath, { action: 'start', id: 'formal-greeting-step-1', steps: [1] }, { dashboardState: statePath });
  await executionControl(planPath, { action: 'begin-attempt', id: 'formal-greeting-fix-1', step: 1, diagnosis: { failure: 'The formal greeting assertion fails.', evidence: 'node test.js output; src/greeting.js lacks greetFormally.', cause: 'The required formal greeting function is missing.', next_change: 'Implement and export greetFormally.', expected_result: 'Formal greeting and existing greeting assertions pass.' } });
  for (const repo of repos) await writeFile(artifactJoin(repo, 'src/greeting.js'), 'function greet(name) { return `Hello, ${name}!`; }\nfunction greetFormally(name) { return `Good day, ${name}.`; }\nmodule.exports = { greet, greetFormally };\n');
  const result = await regression(true); assert.equal(result.overall, 'pass');
  const ledgerPath = artifactJoin(directory, 'DEMO-2-verification-v1.json');
  const checks = ['Happy path row above', 'Regression row above'].map((subject) => ({ type: 'automated', subject, command: 'node test.js', result: 'pass', note: 'Executed actual greeting assertions.', assertions: [{ clause: subject === 'Happy path row above' ? 'Formal output includes the supplied name and ends in a period' : 'Existing greeting retains its name and punctuation', expected: subject === 'Happy path row above' ? 'Good day, Ann.' : 'Hello, Ann!', observed: subject === 'Happy path row above' ? 'Good day, Ann.' : 'Hello, Ann!', source: `${workspace ? 'api/' : ''}test.js:${subject === 'Happy path row above' ? 6 : 5} strictEqual` }] }));
  await executionControl(planPath, { action: 'complete', steps: [{ number: 1, checks }] }, { ledgerPath, ticket: 'DEMO-2', dashboardState: statePath });
  const ledger = JSON.parse(await readFile(ledgerPath, 'utf8'));
  ledger.acceptance = ledger.acceptance.map((row) => ({ ...row, status: 'automated', step: 1, note: 'Exact output assertion passed.' }));
  ledger.gate = { ...(impact ? { checks: impact.checks.map(c => ({ id: c.id, run_repo: c.run_repo, scope: c.scope, command: c.command, result: 'pass', note: 'Actual regression exited 0.' })) } : {}), mode: 'full-suite', result: result.overall, note: 'Actual regression command result.', full_suites: repos.map((repo, index) => ({ repo: workspace ? index === 0 ? 'api' : 'web' : 'tiny-greeter-full', command: 'node test.js', result: 'pass', note: 'Exited 0.' })) };
  await writeFile(ledgerPath, JSON.stringify(ledger));
  await writeFile(artifactJoin(directory, 'DEMO-2-execute.md'), 'Execute outcome: PASSED\n');
  const execution = await apply('handoff', { handoff: await saveHandoff('execute', { outcome: 'PASSED', artifacts: { report: 'make-it-work/DEMO-2/DEMO-2-execute.md', verification: 'make-it-work/DEMO-2/DEMO-2-verification-v1.json' }, data: { discoveries: [], failing_tests: [], gate: 'full-suite' } }) });
  assert.equal(execution.fields.review_cycle, '1');
  // This test supplies a clean review artifact; semantic independence is exercised by the separate forward-test rehearsal.
  const roots = workspace ? { api: sourceRoot, web: secondRoot } : { 'tiny-greeter-full': root };
  await apply('review-context', { context_updated: [], test_map_maintenance: repos.map(repo => ({ repo, status: 'not-applicable', affected_tests: [], reason: 'Fixture has no current test-map strategy.' })), review_requirements: repos.map(repo => ({ repo, skills: [{ name: 'domain-demo', method: 'Read' }], reason: 'Formal greeting belongs to the fixture demo domain.' })) });
  const scope = await inspectReviewScope(root, statePath);
  assert.equal(scope.ready, true, 'scope advisories require no synthetic user receipt');
  const target = await prepareReviewScope(root, statePath);
  const required = JSON.parse(await readFile(artifactJoin(root, target.review_target), 'utf8')).review_requirements;
  const reviewChecks = required.map(r => ({ repo: r.repo, skills: r.skills.map(s => ({ name: s.name, method: s.method, sha256: s.sha256, rules: [{ line: 1, rule: 'Preserve existing demo behavior', observation: 'Formal greeting assertions and existing greeting regression pass', result: 'satisfied' }] })), test_map: { status: 'not-applicable', note: 'Fixture has no current mapping strategy.', tests: [] } }));
  const review = await writeReview(root, { version: 1, ticket: 'DEMO-2', branch: 'DEMO-2', commit: `working tree on ${initialHead}`, working_tree: true,
    coverage: 'Compared the full delivery target with the formal-greeting spec and actual passing assertions.', findings: [], repo_roots: roots, review_limitations: [], review_checks: reviewChecks,
    review_target: target.review_target, review_target_sha256: target.sha256,
    review_scope: target.repos.map((repo) => ({ repo: Object.keys(roots).find((key) => roots[key] === repo.root), base: repo.base, scope: 'branch', paths: repo.paths })),
    implement: { handoff_version: 1, plan_version: 1, review_cycle: 1, review_scope_version: 1 } });
  await apply('handoff', { handoff: path.relative(root, review.handoff) }); await apply('sync-complete');
  const draft = artifactJoin(directory, 'DEMO-2-final-draft.json');
  await writeFile(draft, JSON.stringify({ commit_message: 'Add formal greeting', pr_title: 'Add formal greeting', pr_description: 'Add formal greeting while preserving greet. Actual node test.js assertions pass.' }));
  const helper = path.resolve('skills/implement/scripts/final-package.mjs');
  execFileSync(process.execPath, [helper, 'build', '--root', root, '--state', statePath, '--draft', draft, ...repos.flatMap((repo) => ['--repo', repo]), ...(workspace ? [] : ['--base', 'main'])], { stdio: 'pipe' });
  const scopedPackage = JSON.parse(await readFile(artifactJoin(directory, 'DEMO-2-final-package.json'), 'utf8'));
  assert.ok(scopedPackage.review_scope.every((repo) => repo.status === 'covered'));
  assert.ok(scopedPackage.evidence.review_target);
  if (workspace) {
    const pkg = scopedPackage;
    assert.deepEqual(pkg.repos.map(repo => repo.name), ['api', 'web']);
    assert.deepEqual(pkg.repos.map((repo) => repo.base), ['main', 'develop']);
    assert.throws(() => execFileSync(process.execPath, [helper, 'build', '--root', root, '--state', statePath, '--draft', draft, '--repo', sourceRoot], { stdio: 'pipe' }), /every approved repository/);
    assert.deepEqual(pkg.validation, { mode: 'full-suite', result: 'pass' });
    const packagedVerification = JSON.parse(await readFile(path.join(root, pkg.evidence.verification.path), 'utf8'));
    assert.deepEqual(packagedVerification.gate.full_suites.map(({ repo, result }) => ({ repo, result })),
      [{ repo: 'api', result: 'pass' }, { repo: 'web', result: 'pass' }]);
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
  if (worktree) for (const original of originalRepos) assert.equal(execFileSync('git', ['-C', original, 'status', '--porcelain'], { encoding: 'utf8' }).trim(), '', 'completed work stays in the isolated checkout');
});
