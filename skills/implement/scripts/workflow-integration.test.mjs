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

for (const autonomy of ['autonomous', 'guided']) test(`a real red-to-green ${autonomy} implementation completes through regression, review and exact final package`, async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'workflow-integration-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp('evals/execute/execute-full-pass/fixture', root, { recursive: true });
  await cp('evals/implement/fixture-base/.claude', path.join(root, '.claude'), { recursive: true });
  await cp('evals/implement/fixture-base/CLAUDE.md', path.join(root, 'CLAUDE.md'));
  const git = (...argv) => execFileSync('git', ['-C', root, ...argv], { stdio: 'pipe' });
  git('init', '-b', 'main'); git('config', 'user.name', 'Test'); git('config', 'user.email', 'test@example.invalid');
  git('add', '.'); git('commit', '-m', 'fixture'); git('switch', '-c', 'DEMO-2');
  const initialHead = git('rev-parse', 'HEAD').toString().trim();
  const initialized = await initializeWorkflow(root, { ticket: 'DEMO-2', autonomy, base: 'main', repos: [root], branch_guard: 'Existing feature branch' });
  const statePath = initialized.state;
  let eventId = 0;
  const apply = async (event, extra = {}) => applyWorkflow({ root, statePath, input: { event, id: `event-${++eventId}`, expected_hash: digest(await readFile(statePath, 'utf8')), repos: [root], ...extra } });
  await apply('context-ready');
  const directory = path.join(root, 'make-it-work/DEMO-2');
  const handoffs = path.join(directory, 'DEMO-2-handoffs'); await mkdir(handoffs);
  const saveHandoff = async (stage, body) => {
    const file = path.join(handoffs, `${stage}-1.json`);
    await writeFile(file, JSON.stringify({ version: 1, ticket: 'DEMO-2', plan_version: 1, stage, status: 'done', ...body }));
    return path.relative(root, file);
  };
  await writeFile(path.join(directory, 'DEMO-2-spec.md'), '# Formal greeting\n\nAdd a formal greeting while preserving the existing greeting.\n');
  const specResult = await apply('handoff', { handoff: await saveHandoff('gaps', { outcome: 'SPEC_SAVED', artifacts: { spec: 'make-it-work/DEMO-2/DEMO-2-spec.md' }, data: { tbd_items: 0, context_updated: [] } }) });
  if (autonomy === 'guided') {
    assert.equal(specResult.fields.status, 'Paused');
    await apply('resolve-input', { pending_id: specResult.pending[0].id, answer: 'approve', source: 'user', via: 'chat' });
  }
  const planPath = path.join(directory, 'DEMO-2-plan.md');
  const plan = (await readFile(planPath, 'utf8')).replace('## Codebase Gaps', '## Verification Policy\n\n| Repo | Mode | Decision | Reason |\n| --- | --- | --- | --- |\n| tiny-greeter-full | automated | configured | Actual test script |\n\n## Codebase Gaps');
  await writeFile(planPath, plan); await updatePlan(planPath, 'set-total', { total: 1 }); await updatePlan(planPath, 'set-mode', { mode: 'inline' });
  await writeFile(path.join(directory, 'DEMO-2-testing-readiness.md'), '# Testing readiness\n\nStatus: ready\nConfigured node test.js executes real greeting assertions.\n');
  await writeFile(statePath, (await readFile(statePath, 'utf8')).replace('testing_readiness: none', 'testing_readiness: make-it-work/DEMO-2/DEMO-2-testing-readiness.md'));
  const planResult = await apply('handoff', { handoff: await saveHandoff('plan', { outcome: 'PLAN_SAVED', artifacts: { plan: 'make-it-work/DEMO-2/DEMO-2-plan.md' }, data: { mode: 'initial', steps_added: null, recommend_replan: null, context_updated: [] } }) });
  if (autonomy === 'guided') {
    assert.equal(planResult.fields.status, 'Paused');
    await apply('resolve-input', { pending_id: planResult.pending[0].id, answer: 'approve', source: 'user', via: 'question' });
  }
  const regression = () => runRegression({ version: 1, mode: 'full', runs: [{ repo: 'tiny-greeter-full', cwd: root, scope: 'full', command: { bin: process.execPath, args: ['test.js'] } }] });
  assert.equal((await regression()).overall, 'fail');
  await executionControl(planPath, { action: 'begin-attempt', id: 'formal-greeting-fix-1', step: 1 });
  await writeFile(path.join(root, 'src/greeting.js'), 'function greet(name) { return `Hello, ${name}!`; }\nfunction greetFormally(name) { return `Good day, ${name}.`; }\nmodule.exports = { greet, greetFormally };\n');
  const result = await regression(); assert.equal(result.overall, 'pass');
  const ledgerPath = path.join(directory, 'DEMO-2-verification-v1.json');
  const checks = ['Happy path row above', 'Regression row above'].map((subject) => ({ type: 'automated', subject, command: 'node test.js', result: 'pass', note: 'Executed actual greeting assertions.' }));
  await executionControl(planPath, { action: 'complete', steps: [{ number: 1, checks }] }, { ledgerPath, ticket: 'DEMO-2', dashboardState: statePath });
  const ledger = JSON.parse(await readFile(ledgerPath, 'utf8'));
  ledger.gate = { mode: 'full-suite', result: result.overall, note: 'Actual regression command result.', full_suites: [{ repo: 'tiny-greeter-full', command: 'node test.js', result: 'pass', note: 'Exited 0.' }] };
  await writeFile(ledgerPath, JSON.stringify(ledger));
  await writeFile(path.join(directory, 'DEMO-2-execute.md'), 'Execute outcome: PASSED\n');
  const execution = await apply('handoff', { handoff: await saveHandoff('execute', { outcome: 'PASSED', artifacts: { report: 'make-it-work/DEMO-2/DEMO-2-execute.md', verification: 'make-it-work/DEMO-2/DEMO-2-verification-v1.json' }, data: { discoveries: [], failing_tests: [], gate: 'full-suite' } }) });
  assert.equal(execution.fields.review_cycle, '1');
  // This test supplies a clean review artifact; semantic independence is exercised by the separate forward-test rehearsal.
  const review = await writeReview(root, { version: 1, ticket: 'DEMO-2', branch: 'DEMO-2', commit: `working tree on ${initialHead}`, working_tree: true, coverage: 'Compared with the formal-greeting spec and actual passing assertions.', findings: [], repo_roots: { 'tiny-greeter-full': root }, implement: { handoff_version: 1, plan_version: 1, review_cycle: 1 } });
  await apply('handoff', { handoff: path.relative(root, review.handoff) }); await apply('sync-complete');
  const draft = path.join(directory, 'DEMO-2-final-draft.json');
  await writeFile(draft, JSON.stringify({ commit_message: 'Add formal greeting', pr_title: 'Add formal greeting', pr_description: 'Add formal greeting while preserving greet. Actual node test.js assertions pass.' }));
  const helper = path.resolve('skills/implement/scripts/final-package.mjs');
  execFileSync(process.execPath, [helper, 'build', '--root', root, '--state', statePath, '--draft', draft, '--repo', root, '--base', 'main'], { stdio: 'pipe' });
  let completed;
  if (autonomy === 'guided') {
    const waiting = await apply('await-input', { pending: { id: 'final-package-approval', kind: 'approval', question: 'Approve this final package?' } });
    assert.equal(waiting.fields.status, 'Paused');
    const changedDraft = JSON.parse(await readFile(draft, 'utf8')); changedDraft.pr_description += ' Clarified reviewer notes.';
    await writeFile(draft, JSON.stringify(changedDraft));
    await assert.rejects(apply('resolve-input', { pending_id: 'final-package-approval', answer: 'approve', source: 'user', via: 'chat' }), /stale/);
    execFileSync(process.execPath, [helper, 'build', '--root', root, '--state', statePath, '--draft', draft, '--repo', root, '--base', 'main'], { stdio: 'pipe' });
    await apply('refresh-input', { pending_id: 'final-package-approval', pending: { id: 'final-package-approval-2', kind: 'approval', question: 'Approve the updated final package?' } });
    completed = await apply('resolve-input', { pending_id: 'final-package-approval-2', answer: 'approve', source: 'user', via: 'chat' });
  } else completed = await apply('complete');
  assert.equal(completed.fields.status, 'Complete'); assert.equal(completed.fields.phase, 'complete');
  assert.equal(git('rev-parse', 'HEAD').toString().trim(), initialHead);
});
