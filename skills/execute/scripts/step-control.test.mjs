import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { executionControl, mutateExecution } from './step-control.mjs';
import { parseSteps, nextBatch } from '../../../scripts/lib/plan.mjs';
import { validateVerification } from '../../implement/scripts/verification.mjs';
import { initializeWorkflow } from '../../implement/scripts/workflow.mjs';
import { generateDashboard, parseState } from '../../implement/scripts/render-status.mjs';
import { checkpointDashboard } from '../../implement/scripts/dashboard-checkpoint.mjs';
import { inspectState } from '../../implement/scripts/write-feedback.mjs';

const plan = (parallel = false) => `# Plan\n\n## Execution Status\n\n**Mode:** Inline — execute here.\n\n**Progress:** Step 0 of 2 complete.\n\n## Steps\n\n### Step 1 — First\n\n- **Files:** \`src/a.js\`\n- **Depends on:** none\n- **Can run in parallel with:** ${parallel ? '2' : 'none'}\n\n**Verify:** Check A.\n\n### Step 2 — Second\n\n- **Files:** \`src/b.js\`\n- **Depends on:** ${parallel ? 'none' : '1'}\n- **Can run in parallel with:** ${parallel ? '1' : 'none'}\n\n**Verify:** Check B.\n\n## Test Plan\n\n**AC traceability:**\n\n| Acceptance criterion | Test scenario |\n| --- | --- |\n| AC1 | A works |\n| AC2 | B works |\n`;
const evidence = (number) => ({ number, checks: [{ type: 'automated', subject: number === 1 ? 'A works' : 'B works', command: 'node --test', result: 'pass', note: 'Actual check passed.' }] });
const diagnosis = (prior = false) => ({ failure: 'Expected one result; received two.', evidence: 'node --test results.test.js: duplicate selection fails; src/results.js:42 appends a fallback.', cause: 'The fallback also runs after a successful selection.', next_change: 'Restrict the fallback to empty selection.', expected_result: 'Duplicate selection returns one item; empty selection still returns the fallback.', ...(prior ? { prior_result: 'The earlier null guard did not affect nonempty selection; the failure output points to fallback append.' } : {}) });
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
  for (let n = 1; n <= 5; n += 1) assert.equal((await run({ action: 'begin-attempt', id: `fix-${n}`, step: 1, diagnosis: diagnosis(n > 1) })).attempts[1], n);
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
  await run({ action: 'begin-attempt', id: 'fix-1', step: 1, diagnosis: diagnosis() });
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
  assert.doesNotMatch((await html()).split('<h2>Audit log</h2>')[0], /Running step 1/); assert.match(await html(), /1 of 2 steps verified complete/);
  assert.match(await html(), /Activity: Running step 1/);
  await checkpointDashboard(statePath, { activity: 'Preparing the second step inputs.' });
  const completedAt = parseState(await readFile(statePath, 'utf8')).fields.current_activity_updated_at;
  await run({ action: 'complete', steps: [evidence(1)] });
  assert.match(await html(), /Preparing the second step inputs/);
  assert.equal(parseState(await readFile(statePath, 'utf8')).fields.current_activity_updated_at, completedAt);
  await run({ action: 'start', id: 'second-step', steps: [2] });
  assert.match(await html(), /Running step 2 of 2 — Second/); assert.match(await html(), /1 of 2 verified complete/);
  await run({ action: 'stop', reason: 'execution-failed', detail: 'Agent exited unexpectedly' });
  assert.doesNotMatch((await html()).split('<h2>Audit log</h2>')[0], /Running step 2/); assert.match(await html(), /Execution stopped at step 2/);
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
  assert.doesNotMatch((await html()).split('<h2>Audit log</h2>')[0], /Running steps/); assert.match(await html(), /2 of 2 steps verified complete/);
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
  assert.doesNotMatch((await html()).split('<h2>Audit log</h2>')[0], /Running step 1/);
});
test('explicit user guidance can resolve a stopped invocation while preserving its history', async (t) => {
  const { file, run } = await fixture(t);
  await run({ action: 'begin-attempt', id: 'first-fix', step: 1, diagnosis: diagnosis() });
  await run({ action: 'stop', reason: 'guardrail' });
  await assert.rejects(run({ action: 'resolve-stop', reason: 'Guessed default' }), /explicit user/);
  await writeFile(file, plan().replace('Check A.', 'Check clarified A.'));
  const resolved = await run({ action: 'resolve-stop', source: 'user', via: 'chat', reason: 'Confirmed expected behavior; retry this step.' });
  assert.equal(resolved.stopped, null); assert.equal(resolved.history.length, 1);
  assert.equal((await run({ action: 'begin-attempt', id: 'new-fix', step: 1, diagnosis: diagnosis() })).attempts[1], 1);
});

test('guardrail resolution retains details, steps, timestamps and actual user channel without changing extra-round counts', async (t) => {
  const { statePath, run } = await dashboardFixture(t);
  await run({ action: 'start', id: 'guarded-step', steps: [1] });
  const stopped = await run({ action: 'stop', reason: 'guardrail', detail: 'The expected result needs clarification.' });
  const repeated = await run({ action: 'stop', reason: 'guardrail', detail: 'The expected result needs clarification.' });
  assert.equal(stopped.stop_id, repeated.stop_id);
  assert.equal(stopped.stopped_at, repeated.stopped_at);
  await assert.rejects(run({ action: 'resolve-stop', source: 'policy', via: 'chat', reason: 'Assumed outcome.' }), /explicit user/);
  const resolved = await run({ action: 'resolve-stop', source: 'user', via: 'question', reason: 'Confirmed the expected outcome.' });
  const record = resolved.history.at(-1);
  assert.equal(record.stop_id, stopped.stop_id);
  assert.equal(record.stop_detail, 'The expected result needs clarification.');
  assert.deepEqual(record.affected_steps, [1]);
  assert.equal(record.stopped_at, stopped.stopped_at);
  assert.ok(Date.parse(record.resolved_at) >= Date.parse(record.stopped_at));
  assert.equal(record.source, 'user'); assert.equal(record.via, 'question');
  await run({ action: 'inspect' });
  const state = parseState(await readFile(statePath, 'utf8'));
  const stops = state.audit.filter(row => row.note?.id === `guardrail-stop:${record.stop_id}`);
  const resolutions = state.audit.filter(row => row.note?.id === `guardrail-resolve:${record.stop_id}`);
  assert.equal(stops.length, 1); assert.equal(resolutions.length, 1);
  assert.match(resolutions[0].outcome, /via question/);
  let completed = (await readFile(statePath, 'utf8')).replace('status: In Progress', 'status: Complete').replace('phase: execute', 'phase: complete');
  completed = completed.trimEnd() + `\n| ${state.audit.length + 1} | ${new Date().toISOString()} | execute | complete | Completed |\n`;
  const feedback = inspectState(completed);
  assert.equal(feedback.guardrails.length, 1);
  assert.equal(feedback.guardrails[0].source, 'user');
  assert.equal(feedback.guardrails[0].via, 'question');
  assert.equal(feedback.minimal, true);
  assert.equal(feedback.analysisRequired, true);
  assert.equal(feedback.fixRounds, 0); assert.equal(feedback.replans, 0);
});

test('inspect repairs a journaled guardrail checkpoint after dashboard failure without duplicate stop entries', async (t) => {
  const { statePath, run } = await dashboardFixture(t);
  const html = statePath.replace(/-state\.md$/, '-status.html');
  await rename(html, `${html}.saved`);
  await mkdir(html);
  await assert.rejects(run({ action: 'stop', reason: 'guardrail', detail: 'Clarification required.' }), /regular file/);
  await rm(html, { recursive: true }); await rename(`${html}.saved`, html);
  assert.equal((await run({ action: 'inspect' })).stopped, 'guardrail');
  await run({ action: 'inspect' });
  const state = parseState(await readFile(statePath, 'utf8'));
  assert.equal(state.audit.filter(row => row.note?.id.startsWith('guardrail-stop:')).length, 1);
});

test('legacy stops retain unavailable metadata explicitly when resolved', () => {
  const journal = { version: 1, attempts: {}, stopped: 'guardrail', history: [{ stopped: 'guardrail', reason: 'Earlier guidance' }] };
  const result = mutateExecution(journal, { action: 'resolve-stop', source: 'user', via: 'chat', reason: 'Current guidance' }, [], 0);
  assert.deepEqual(result.history[0], journal.history[0]);
  assert.equal(result.history[1].stopped_at, null);
  assert.equal(result.history[1].stop_detail, null);
  assert.equal(result.history[1].source, 'user');
});

test('a supplied workflow state records guardrails without creating a missing legacy dashboard', async (t) => {
  const { statePath, run } = await dashboardFixture(t);
  const html = statePath.replace(/-state\.md$/, '-status.html');
  await rm(html);
  await run({ action: 'stop', reason: 'guardrail', detail: 'Clarification required.' });
  await run({ action: 'resolve-stop', source: 'user', via: 'chat', reason: 'Confirmed expected behavior.' });
  const inspection = await run({ action: 'inspect' });
  assert.equal(inspection.history.length, 1);
  assert.equal(inspection.history[0].stop_detail, 'Clarification required.');
  assert.equal(inspection.history[0].via, 'chat');
  assert.equal(parseState(await readFile(statePath, 'utf8')).audit.filter(row => row.note?.id.startsWith('guardrail-')).length, 2);
  await assert.rejects(readFile(html), /ENOENT/);
});
test('verification writes cannot target an unrelated source file', async (t) => {
  const { file, options } = await fixture(t);
  const source = path.join(path.dirname(file), 'source.js'); await writeFile(source, 'original source');
  await assert.rejects(executionControl(file, { action: 'complete', steps: [evidence(1)] }, { ...options, ledgerPath: source }), /ledger must match/);
  assert.equal(await readFile(source, 'utf8'), 'original source');
});

test('a correction requires diagnosis; a repeat also requires learning from the previous outcome', async (t) => {
  const { run, file } = await fixture(t);
  const event = { action: 'begin-attempt', id: 'first', step: 1 };
  await assert.rejects(run(event), /diagnosis is required/);
  for (const field of Object.keys(diagnosis())) {
    await assert.rejects(run({ ...event, diagnosis: { ...diagnosis(), [field]: ' ' } }), /Diagnosis/);
  }
  await assert.rejects(readFile(`${file}.execution.json`), /ENOENT/);
  const unknown = { ...diagnosis(), cause: 'Unknown: checking whether selection or fallback adds the duplicate.' };
  // Investigation/inspection alone neither creates an attempt nor consumes budget.
  assert.deepEqual((await run({ action: 'inspect' })).attempts, {});
  const first = await run({ ...event, diagnosis: diagnosis() });
  assert.equal(first.attempts[1], 1);
  await assert.rejects(run({ action: 'begin-attempt', id: 'second', step: 1, diagnosis: diagnosis() }), /prior_result/);
  await assert.rejects(run({ ...event, diagnosis: unknown }), /different diagnosis/);
  assert.equal((await run(event)).attempts[1], 1);
  const second = await run({ action: 'begin-attempt', id: 'second', step: 1, diagnosis: diagnosis(true) });
  assert.equal(second.attempts[1], 2);
  assert.deepEqual((await run({ action: 'inspect' })).diagnoses.second.diagnosis, diagnosis(true));
  await run({ action: 'stop', reason: 'guardrail' });
  await assert.rejects(run({ action: 'begin-attempt', id: 'third', step: 1, diagnosis: diagnosis(true) }), /stopped/);
  const resolved = await run({ action: 'resolve-stop', source: 'user', via: 'chat', reason: 'Confirmed the intended behavior.' });
  assert.deepEqual(resolved.diagnoses, {});
  assert.deepEqual(resolved.history[0].diagnoses, second.diagnoses);
  assert.equal(resolved.history[0].attempt_events.second, 1);
});

test('legacy attempt history remains readable while every new correction requires diagnosis', async (t) => {
  const { file, run } = await fixture(t);
  await run({ action: 'begin-attempt', id: 'old', step: 1, diagnosis: diagnosis() });
  const saved = JSON.parse(await readFile(`${file}.execution.json`, 'utf8'));
  delete saved.diagnoses;
  await writeFile(`${file}.execution.json`, JSON.stringify(saved));
  assert.deepEqual((await run({ action: 'inspect' })).diagnoses, {});
  assert.equal((await run({ action: 'begin-attempt', id: 'old', step: 1 })).attempts[1], 1);
  await assert.rejects(run({ action: 'begin-attempt', id: 'new', step: 1 }), /diagnosis/);
  assert.equal((await run({ action: 'begin-attempt', id: 'new', step: 1, diagnosis: diagnosis(true) })).attempts[1], 2);
});

test('diagnosis audit survives render failure and replay repairs it once without changing progress', async (t) => {
  const { file, statePath, run } = await dashboardFixture(t);
  await run({ action: 'start', id: 'dispatch', steps: [1] });
  const output = statePath.replace('-state.md', '-status.html');
  await rm(output); await mkdir(output);
  const event = { action: 'begin-attempt', id: 'diagnosed-fix', step: 1, diagnosis: diagnosis() };
  await assert.rejects(run(event), /regular file/);
  assert.equal(JSON.parse(await readFile(`${file}.execution.json`)).attempts[1], 1);
  await rm(output, { recursive: true });
  // With no HTML, the explicit state still receives the audit entry.
  await run(event);
  let state = parseState(await readFile(statePath, 'utf8'));
  const notes = () => state.audit.filter((row) => row.note?.kind === 'result');
  assert.equal(notes().length, 1);
  assert.match(notes()[0].outcome, /fix attempt 1/);
  assert.match(notes()[0].outcome, /execution.json#diagnosed-fix/);
  await generateDashboard(statePath);
  assert.equal((await run(event)).attempts[1], 1);
  state = parseState(await readFile(statePath, 'utf8'));
  assert.equal(notes().length, 1);
  assert.match(await readFile(file, 'utf8'), /Step 0 of 2 complete/);
});

test('render failure after audit persistence retains one diagnosis entry across retries', async (t) => {
  const { file, options } = await fixture(t);
  const statePath = path.join(path.dirname(file), 'DEMO-state.md');
  const legacy = (await readFile(new URL('../../../evals/implement/feedback-clean/fixture/fixture-artifacts/DEMO-state.md', import.meta.url), 'utf8')).replace('phase: final-sync', 'phase: execute');
  await writeFile(statePath, legacy);
  await writeFile(statePath.replace('-state.md', '-status.html'), 'Existing dashboard');
  const event = { action: 'begin-attempt', id: 'render-recovery', step: 1, diagnosis: diagnosis() };
  for (let n = 0; n < 2; n += 1) {
    await assert.rejects(executionControl(file, event, { ...options, dashboardState: statePath }), /State must be/);
    const audit = parseState(await readFile(statePath, 'utf8')).audit;
    assert.equal(audit.filter((row) => row.note?.kind === 'result').length, 1);
    assert.equal(JSON.parse(await readFile(`${file}.execution.json`)).attempts[1], 1);
  }
  await rm(statePath.replace('-state.md', '-status.html'));
  await executionControl(file, event, { ...options, dashboardState: statePath });
  assert.equal(parseState(await readFile(statePath, 'utf8')).audit.filter((row) => row.note?.kind === 'result').length, 1);
});

test('completion and resume only verify clauses with actual matching assertions', async (t) => {
  const { file, options, run } = await fixture(t);
  const original = plan().replace('| Acceptance criterion | Test scenario |\n| --- | --- |', '| Acceptance criterion | Requirement clause | Test scenario |\n| --- | --- | --- |')
    .replace('| AC1 | A works |', '| AC1 | Include prepaid | A works |\n| AC1 | Preserve order | A works |')
    .replace('| AC2 | B works |', '| AC2 | Preserve existing result | B works |');
  await writeFile(file, original);
  const first = evidence(1);
  first.checks[0].assertions = [{ clause: 'Include prepaid', expected: '125', observed: '125', source: 'test.js:12 total assertion' }];
  await run({ action: 'complete', steps: [first] });
  let saved = JSON.parse(await readFile(options.ledgerPath, 'utf8'));
  assert.deepEqual(saved.acceptance.map(({ clause, status }) => ({ clause, status })), [
    { clause: 'Include prepaid', status: 'automated' },
    { clause: 'Preserve order', status: 'unverified' },
    { clause: 'Preserve existing result', status: 'unverified' },
  ]);
  assert.deepEqual((await run({ action: 'inspect' })).next, [2]);
  const second = evidence(2);
  second.checks[0].assertions = [{ clause: 'Preserve existing result', expected: 'old', observed: 'old', source: 'test.js:20 regression assertion' }];
  await run({ action: 'complete', steps: [second] });
  saved = JSON.parse(await readFile(options.ledgerPath, 'utf8'));
  assert.equal(saved.acceptance[1].status, 'unverified');
  assert.equal(saved.acceptance[2].status, 'automated');
  assert.equal((await run({ action: 'inspect' })).completed, 2);
});
