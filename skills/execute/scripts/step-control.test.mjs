import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { executionControl, mutateExecution } from './step-control.mjs';
import { parseSteps, nextBatch } from '../../../scripts/lib/plan.mjs';
import { validateVerification } from '../../implement/scripts/verification.mjs';
import { initializeWorkflow } from '../../implement/scripts/workflow.mjs';
import { generateDashboard, parseState } from '../../implement/scripts/render-status.mjs';
import { checkpointDashboard } from '../../implement/scripts/dashboard-checkpoint.mjs';

const plan = (parallel = false) => `# Plan\n\n## Execution Status\n\n**Mode:** Inline — execute here.\n\n**Progress:** Step 0 of 2 complete.\n\n## Steps\n\n### Step 1 — First\n\n- **Files:** \`src/a.js\`\n- **Depends on:** none\n- **Can run in parallel with:** ${parallel ? '2' : 'none'}\n\n**Verify:** Check A.\n\n### Step 2 — Second\n\n- **Files:** \`src/b.js\`\n- **Depends on:** ${parallel ? 'none' : '1'}\n- **Can run in parallel with:** ${parallel ? '1' : 'none'}\n\n**Verify:** Check B.\n\n## Test Plan\n\n**AC traceability:**\n\n| Acceptance criterion | Test scenario |\n| --- | --- |\n| AC1 | A works |\n| AC2 | B works |\n`;
const evidence = (number) => ({ number, checks: [{ type: 'automated', subject: number === 1 ? 'A works' : 'B works', command: 'node --test', result: 'pass', note: 'Actual check passed.' }] });
async function fixture(t, parallel = false) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'step-control-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const file = path.join(root, 'DEMO-plan.md'); await writeFile(file, plan(parallel));
  const options = { ledgerPath: path.join(root, 'DEMO-verification-v1.json'), ticket: 'DEMO', planVersion: 1 };
  return { file, options, run: (event) => executionControl(file, event, options) };
}
test('parses dependencies and conservatively batches only mutually marked disjoint steps', () => {
  assert.deepEqual(nextBatch(parseSteps(plan()), 0, true), [1]);
  assert.deepEqual(nextBatch(parseSteps(plan(true)), 0, true), [1, 2]);
  assert.deepEqual(nextBatch(parseSteps(plan(true).replace('src/b.js', 'src/a.js')), 0, true), [1]);
  assert.throws(() => parseSteps(plan().replace('**Depends on:** none', '**Depends on:** 2')), /later step/);
});
test('persists attempts across invocations and refuses a sixth attempt or later dispatch', async (t) => {
  const { run } = await fixture(t);
  for (let n = 1; n <= 5; n += 1) assert.equal((await run({ action: 'begin-attempt', id: `fix-${n}`, step: 1 })).attempts[1], n);
  assert.equal((await run({ action: 'begin-attempt', id: 'fix-5', step: 1 })).attempts[1], 5);
  await assert.rejects(run({ action: 'begin-attempt', id: 'fix-6', step: 1 }), /sixth/);
  await run({ action: 'stop', reason: 'retry-limit' });
  await assert.rejects(run({ action: 'begin-attempt', id: 'later', step: 2 }), /stopped/);
  assert.deepEqual((await run({ action: 'inspect' })).next, []);
});
test('evidence is persisted before Progress, resume validates it, and exact completion retries are idempotent', async (t) => {
  const { file, options, run } = await fixture(t);
  await assert.rejects(run({ action: 'complete', steps: [{ number: 1, checks: [] }] }), /passing evidence/);
  const event = { action: 'complete', steps: [evidence(1)] };
  await run(event);
  assert.match(await readFile(file, 'utf8'), /Step 1 of 2 complete/);
  assert.equal(JSON.parse(await readFile(options.ledgerPath)).acceptance[0].status, 'automated');
  assert.equal((await run(event)).replayed, true);
  assert.deepEqual((await run({ action: 'inspect' })).next, [2]);
  await writeFile(options.ledgerPath, JSON.stringify({ version: 1, ticket: 'DEMO', plan_version: 1, steps: [], gate: null, acceptance: [] }));
  await assert.rejects(run({ action: 'inspect' }), /no evidence/);
});
test('a failed batch leaves both Progress and evidence unchanged; successful batches advance together', async (t) => {
  const { file, options, run } = await fixture(t, true);
  const bad = evidence(2); bad.checks[0].result = 'fail';
  await assert.rejects(run({ action: 'complete', steps: [evidence(1), bad] }), /Every batch member/);
  assert.match(await readFile(file, 'utf8'), /Step 0 of 2 complete/);
  await assert.rejects(readFile(options.ledgerPath), /ENOENT/);
  assert.equal((await run({ action: 'complete', steps: [evidence(1), evidence(2)] })).completed, 2);
});
test('guardrails preempt retry counting and changes to a plan invalidate its journal', async (t) => {
  const { file, run } = await fixture(t);
  await run({ action: 'stop', reason: 'guardrail' });
  await assert.rejects(run({ action: 'complete', steps: [evidence(1)] }), /stopped/);
  await writeFile(file, plan().replace('Check A.', 'Different check.'));
  await assert.rejects(run({ action: 'inspect' }), /changed plan/);
});
test('attempts cannot skip sequential steps', () => {
  const journal = { version: 1, attempts: {}, stopped: null };
  assert.throws(() => mutateExecution(journal, { action: 'begin-attempt', id: 'skip', step: 2 }, parseSteps(plan(true)), 0), /eligible batch/);
});
test('append-only fix amendments preserve completed evidence while changed prior steps are rejected', async (t) => {
  const { file, options, run } = await fixture(t);
  await run({ action: 'complete', steps: [evidence(1)] });
  await run({ action: 'complete', steps: [evidence(2)] });
  const prior = JSON.parse(await readFile(options.ledgerPath, 'utf8'));
  prior.gate = { mode: 'full-suite', result: 'pass', note: 'Pre-amendment suite passed.' };
  await writeFile(options.ledgerPath, JSON.stringify(prior));
  let amended = (await readFile(file, 'utf8')).replace('of 2 complete', 'of 3 complete').replace('## Test Plan', '### Step 3 — Fix\n\n- **Files:** `src/c.js`\n- **Depends on:** 2\n- **Can run in parallel with:** none\n\n**Verify:** Fixed behavior.\n\n## Test Plan');
  await writeFile(file, amended);
  assert.deepEqual((await run({ action: 'inspect' })).next, [3]);
  assert.equal(JSON.parse(await readFile(options.ledgerPath, 'utf8')).gate, null);
  await run({ action: 'complete', steps: [evidence(3)] });
  const finished = JSON.parse(await readFile(options.ledgerPath, 'utf8'));
  assert.throws(() => validateVerification(finished, { ticket: 'DEMO', planVersion: 1, plan: amended, outcome: 'PASSED' }), /gate evidence/);
  amended = amended.replace('Check A.', 'Changed A.'); await writeFile(file, amended);
  await assert.rejects(run({ action: 'inspect' }), /changed plan/);
});
test('retrying completion after a failed dashboard render still requires rendering to recover', async (t) => {
  const { file, options, run } = await fixture(t);
  // Parseable state with a deliberately unrenderable legacy layout: the failure
  // occurs after evidence/Progress persist, rather than failing state lookup.
  const statePath = path.join(path.dirname(file), 'DEMO-state.md');
  const state = (await readFile(new URL('../../../evals/implement/feedback-clean/fixture/fixture-artifacts/DEMO-state.md', import.meta.url), 'utf8')).replace('phase: final-sync', 'phase: execute');
  await writeFile(statePath, state); await writeFile(statePath.replace('-state.md', '-status.html'), 'Existing dashboard');
  const event = { action: 'complete', steps: [evidence(1)] };
  await assert.rejects(executionControl(file, event, { ...options, dashboardState: statePath }), /State must be/);
  assert.match(await readFile(file, 'utf8'), /Step 1 of 2 complete/);
  await assert.rejects(executionControl(file, event, { ...options, dashboardState: statePath }), /State must be/);
  await assert.rejects(run({ action: 'start', id: 'premature-step-2', steps: [2] }), /Recover the pending completion checkpoint/);
  assert.equal((await run(event)).replayed, true);
});
test('dispatch is durable and distinct from completion or fix-attempt counting', async (t) => {
  const { run, file } = await fixture(t);
  const start = { action: 'start', id: 'step-1-dispatch', steps: [1] };
  const first = await run(start);
  assert.deepEqual(first.active_steps, [1]); assert.deepEqual(first.attempts, {});
  assert.match(await readFile(file, 'utf8'), /Step 0 of 2 complete/);
  assert.equal((await run(start)).started_at, first.started_at);
  await assert.rejects(run({ action: 'start', id: 'duplicate-dispatch', steps: [1] }), /already active/);
  await assert.rejects(run({ action: 'start', id: 'skip', steps: [2] }), /eligible/);
  await run({ action: 'begin-attempt', id: 'fix-1', step: 1 });
  assert.deepEqual((await run({ action: 'inspect' })).active_steps, [1]);
  await run({ action: 'complete', steps: [evidence(1)] });
  assert.deepEqual((await run({ action: 'inspect' })).active_steps, []);
  await run({ action: 'start', id: 'step-2-dispatch', steps: [2] });
  await assert.rejects(run({ action: 'complete', steps: [evidence(1)] }), /older than the active dispatch/);
  await run({ action: 'stop', reason: 'execution-failed', detail: 'The step agent failed before returning verification.' });
  assert.deepEqual((await run({ action: 'inspect' })).active_steps, []);
  assert.match(await readFile(file, 'utf8'), /Step 1 of 2 complete/);
});
test('a real batch starts together and failed evidence cannot clear its running state or advance Progress', async (t) => {
  const { run, file } = await fixture(t, true);
  await run({ action: 'start', id: 'batch-1', steps: [1, 2] });
  await assert.rejects(run({ action: 'complete', steps: [evidence(1)] }), /exact step\/batch/);
  const bad = evidence(2); bad.checks[0].result = 'fail';
  await assert.rejects(run({ action: 'complete', steps: [evidence(1), bad] }), /passing evidence/);
  assert.deepEqual((await run({ action: 'inspect' })).active_steps, [1, 2]);
  assert.match(await readFile(file, 'utf8'), /Step 0 of 2 complete/);
  await run({ action: 'complete', steps: [evidence(1), evidence(2)] });
  assert.deepEqual((await run({ action: 'inspect' })).active_steps, []);
});
test('a failed start checkpoint blocks dispatch and the same event recovers without a new start time', async (t) => {
  const { file, options, run } = await fixture(t);
  const event = { action: 'start', id: 'recover-start', steps: [1] };
  await assert.rejects(executionControl(file, event, { ...options, dashboardState: `${file}.missing-state.md` }), /ENOENT/);
  const saved = JSON.parse(await readFile(`${file}.execution.json`, 'utf8'));
  assert.deepEqual(saved.active_steps, [1]);
  assert.equal((await run(event)).started_at, saved.started_at);
  assert.match(await readFile(file, 'utf8'), /Step 0 of 2 complete/);
});

async function dashboardFixture(t, parallel = false) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'step-dashboard-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-C', root, ...args], { stdio: 'pipe' });
  git('init', '-b', 'main'); git('config', 'user.name', 'Fixture'); git('config', 'user.email', 'fixture@example.invalid');
  await writeFile(path.join(root, 'code.txt'), 'Baseline'); git('add', '.'); git('commit', '-m', 'Fixture'); git('switch', '-c', 'DEMO');
  const initialized = await initializeWorkflow(root, { ticket: 'DEMO', autonomy: 'autopilot', base: 'main', repos: [root], branch_guard: 'Existing feature branch' });
  const directory = path.dirname(initialized.state), file = path.join(directory, 'DEMO-plan.md');
  await writeFile(file, plan(parallel));
  let state = await readFile(initialized.state, 'utf8');
  state = state.replace(/^phase: .*$/m, 'phase: execute').replace(/^plan: .*$/m, 'plan: make-it-work/DEMO/DEMO-plan.md');
  state += `| 2 | ${new Date().toISOString()} | context-check | execute | Ready to execute |\n`;
  await writeFile(initialized.state, state); await generateDashboard(initialized.state);
  const options = { dashboardState: initialized.state, ledgerPath: path.join(directory, 'DEMO-verification-v1.json'), ticket: 'DEMO' };
  return { file, statePath: initialized.state, html: () => readFile(initialized.dashboard, 'utf8'), run: (event) => executionControl(file, event, options) };
}
test('dashboard updates at dispatch, verified completion and failure without treating a start as completed', async (t) => {
  const { file, statePath, html, run } = await dashboardFixture(t);
  await assert.rejects(run({ action: 'complete', steps: [evidence(1)] }), /Start the exact/);
  const event = { action: 'start', id: 'first-step', steps: [1] };
  await run(event);
  assert.match(await html(), /Running step 1 of 2/); assert.match(await html(), /Running step 1 of 2 — First/);
  assert.match(await readFile(file, 'utf8'), /Step 0 of 2 complete/);
  const timestamp = parseState(await readFile(statePath, 'utf8')).fields.current_activity_updated_at;
  await run(event);
  assert.equal(parseState(await readFile(statePath, 'utf8')).fields.current_activity_updated_at, timestamp);
  await checkpointDashboard(statePath, { activity: 'Checking the first step before continuing.' });
  const later = parseState(await readFile(statePath, 'utf8')).fields.current_activity_updated_at;
  await run(event);
  assert.match(await html(), /Checking the first step before continuing/);
  assert.equal(parseState(await readFile(statePath, 'utf8')).fields.current_activity_updated_at, later);
  await run({ action: 'complete', steps: [evidence(1)] });
  assert.doesNotMatch(await html(), /Running step 1/); assert.match(await html(), /1 of 2 steps verified complete/);
  await checkpointDashboard(statePath, { activity: 'Preparing the second step inputs.' });
  const completedAt = parseState(await readFile(statePath, 'utf8')).fields.current_activity_updated_at;
  await run({ action: 'complete', steps: [evidence(1)] });
  assert.match(await html(), /Preparing the second step inputs/);
  assert.equal(parseState(await readFile(statePath, 'utf8')).fields.current_activity_updated_at, completedAt);
  await run({ action: 'start', id: 'second-step', steps: [2] });
  assert.match(await html(), /Running step 2 of 2 — Second/); assert.match(await html(), /1 of 2 verified complete/);
  await run({ action: 'stop', reason: 'execution-failed', detail: 'Agent exited unexpectedly' });
  assert.doesNotMatch(await html(), /Running step 2/); assert.match(await html(), /Execution stopped at step 2/);
  assert.match(await readFile(file, 'utf8'), /Step 1 of 2 complete/);
});
test('running-step display survives resume but rejects changed plans and reports batches accurately', async (t) => {
  const { file, statePath, html, run } = await dashboardFixture(t, true);
  await run({ action: 'start', id: 'parallel-batch', steps: [1, 2] });
  await generateDashboard(statePath);
  assert.match(await html(), /Running steps 1, 2 of 2/);
  assert.deepEqual((await run({ action: 'inspect' })).active_steps, [1, 2]);
  const original = await readFile(file, 'utf8');
  await writeFile(file, original.replace('Check A.', 'Changed check.'));
  await assert.rejects(generateDashboard(statePath), /changed plan/);
  await writeFile(file, original);
  await run({ action: 'complete', steps: [evidence(1), evidence(2)] });
  assert.doesNotMatch(await html(), /Running steps/); assert.match(await html(), /2 of 2 steps verified complete/);
});
test('an explicitly resolved stop can repair edited unfinished work before the parent resumes the workflow', async (t) => {
  const { file, statePath, html, run } = await dashboardFixture(t);
  await run({ action: 'start', id: 'first-dispatch', steps: [1] });
  await run({ action: 'stop', reason: 'guardrail' });
  let state = await readFile(statePath, 'utf8');
  state = state.replace(/^status: .*$/m, 'status: Stopped').replace(/^current_activity: .*$/m, 'current_activity: none').replace(/^current_activity_updated_at: .*$/m, 'current_activity_updated_at: none');
  await writeFile(statePath, state);
  await writeFile(file, (await readFile(file, 'utf8')).replace('Check A.', 'Check clarified A.'));
  await run({ action: 'resolve-stop', source: 'user', via: 'chat', reason: 'Confirmed the expected behavior.' });
  const saved = parseState(await readFile(statePath, 'utf8'));
  assert.equal(saved.fields.status, 'Stopped'); assert.equal(saved.fields.current_activity, 'none');
  assert.doesNotMatch(await html(), /Running step 1/);
});
test('explicit user guidance can resolve a stopped invocation while preserving its history', async (t) => {
  const { file, run } = await fixture(t);
  await run({ action: 'begin-attempt', id: 'first-fix', step: 1 });
  await run({ action: 'stop', reason: 'guardrail' });
  await assert.rejects(run({ action: 'resolve-stop', reason: 'Guessed default' }), /explicit user/);
  await writeFile(file, plan().replace('Check A.', 'Check clarified A.'));
  const resolved = await run({ action: 'resolve-stop', source: 'user', via: 'chat', reason: 'Confirmed expected behavior; retry this step.' });
  assert.equal(resolved.stopped, null); assert.equal(resolved.history.length, 1);
  assert.equal((await run({ action: 'begin-attempt', id: 'new-fix', step: 1 })).attempts[1], 1);
});
test('verification writes cannot target an unrelated source file', async (t) => {
  const { file, options } = await fixture(t);
  const source = path.join(path.dirname(file), 'source.js'); await writeFile(source, 'original source');
  await assert.rejects(executionControl(file, { action: 'complete', steps: [evidence(1)] }, { ...options, ledgerPath: source }), /ledger must match/);
  assert.equal(await readFile(source, 'utf8'), 'original source');
});
