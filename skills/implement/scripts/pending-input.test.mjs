import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { digest } from '../../../scripts/lib/artifacts.mjs';
import { createPendingInput, pendingInputs } from './pending-input.mjs';
import { applyWorkflow, initializeWorkflow } from './workflow.mjs';
import { parseState } from './render-status.mjs';

async function fixture(t, autonomy = 'autonomous') {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pending-input-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = (...argv) => execFileSync('git', ['-C', root, ...argv], { stdio: 'pipe' });
  git('init', '-b', 'main'); git('config', 'user.email', 'test@example.invalid'); git('config', 'user.name', 'Test');
  await writeFile(path.join(root, 'source.txt'), 'baseline'); git('add', '.'); git('commit', '-m', 'fixture'); git('switch', '-c', 'DEMO');
  const initialized = await initializeWorkflow(root, { ticket: 'DEMO', autonomy, base: 'main', repos: [root], branch_guard: 'Existing feature branch' });
  const statePath = initialized.state;
  let id = 0;
  const input = async (event, extra = {}) => ({ event, id: `event-${++id}`, expected_hash: digest(await readFile(statePath, 'utf8')), repos: [root], ...extra });
  const apply = async (event, extra = {}) => applyWorkflow({ root, statePath, input: await input(event, extra) });
  const state = async () => parseState(await readFile(statePath, 'utf8'), statePath);
  const html = () => readFile(initialized.dashboard, 'utf8');
  const seed = async (fields) => {
    let markdown = await readFile(statePath, 'utf8');
    for (const [key, value] of Object.entries(fields)) markdown = markdown.replace(new RegExp(`^${key}:.*$`, 'm'), `${key}: ${value}`);
    await writeFile(statePath, markdown);
  };
  return { root, statePath, apply, input, state, html, seed };
}
const choices = [{ id: 'continue', label: 'Continue' }, { id: 'stop', label: 'Stop' }];
const question = (extra = {}) => ({ id: 'question-1', kind: 'question', question: 'Which behavior should apply?', choices, ...extra });

test('a blocking question is persisted and rendered before returning, and only an explicit offered answer resumes it', async (t) => {
  const { apply, state, html, seed } = await fixture(t);
  await seed({ current_activity: 'Investigating the requirement.', current_activity_updated_at: '2026-01-01T10:00:00Z' });
  const before = await state();
  const waiting = await apply('await-input', { pending: question({ question: 'Choose <script>behavior</script>?' }) });
  assert.equal(waiting.fields.status, 'Paused'); assert.equal(waiting.fields.current_activity, 'none');
  assert.equal(waiting.fields.current_activity_updated_at, 'none');
  const saved = await state(); assert.equal(saved.fields.phase, before.fields.phase); assert.equal(saved.fields.review_cycle, before.fields.review_cycle);
  assert.equal(saved.pendingInputs[0].id, 'question-1'); assert.ok(Number.isFinite(Date.parse(saved.pendingInputs[0].requested_at)));
  const page = await html(); assert.match(page, /Waiting for your input/); assert.match(page, /Choose &lt;script&gt;behavior&lt;\/script&gt;/);
  assert.match(page, /<li>Continue<\/li>/); assert.match(page, /data-wait-since=/); assert.match(page, /http-equiv="refresh"/); assert.doesNotMatch(page, /class="current-activity"/);
  await assert.rejects(apply('resolve-input', { pending_id: 'question-1', answer: 'continue' }), /explicit answer/);
  await assert.rejects(apply('resolve-input', { pending_id: 'question-1', answer: 'invented', source: 'user', via: 'chat' }), /offered/);
  const resumed = await apply('resolve-input', { pending_id: 'question-1', answer: 'continue', source: 'user', via: 'question' });
  assert.equal(resumed.fields.status, 'In Progress'); assert.deepEqual(resumed.pending, []);
  assert.equal(resumed.fields.current_activity_updated_at, 'none');
  assert.match((await state()).audit.at(-1).outcome, /resolved: Continue; source: user/);
  assert.doesNotMatch(await html(), /aria-label="Pending input"/);
});
test('Resume redisplays the same pending request without treating silence as an answer or adding audit rows', async (t) => {
  const { apply, state, seed } = await fixture(t);
  await apply('await-input', { pending: question() }); const original = await state();
  const resumed = await apply('resume', { blocker_resolved: true });
  assert.equal(resumed.fields.status, 'Paused'); assert.equal(resumed.pending[0].requested_at, original.pendingInputs[0].requested_at);
  assert.equal((await state()).audit.length, original.audit.length);
  await assert.rejects(apply('await-input', { pending: question({ id: 'another-blocker' }) }), /cannot be replaced/);
  await seed({ status: 'Stopped' });
  const reopened = await apply('resume', { blocker_resolved: true });
  assert.equal(reopened.fields.status, 'Paused'); assert.equal(reopened.pending[0].id, 'question-1');
});
test('optional decisions can coexist with a blocker and resolving them preserves the blocking wait', async (t) => {
  const { apply, state } = await fixture(t);
  const optional = await apply('await-input', { pending: question({ id: 'ticket-consent', kind: 'permission', blocking: false }) });
  assert.equal(optional.fields.status, 'In Progress');
  await apply('await-input', { pending: question() });
  assert.equal((await state()).pendingInputs.length, 2);
  const resolved = await apply('resolve-input', { pending_id: 'ticket-consent', answer: 'continue', source: 'user', via: 'chat' });
  assert.equal(resolved.fields.status, 'Paused'); assert.equal(resolved.pending[0].id, 'question-1');
  assert.equal((await state()).fields.pause_reason, 'Which behavior should apply?');
});
test('nonblocking answers do not accept unrelated ongoing source changes into the saved fingerprint', async (t) => {
  const { root, apply, state, seed, html } = await fixture(t);
  await seed({ current_activity: 'Implementing the feature.' });
  await apply('await-input', { pending: question({ blocking: false }) });
  const baseline = (await state()).fields.worktree_fingerprint;
  await writeFile(path.join(root, 'source.txt'), 'Independent ongoing work');
  const resolved = await apply('resolve-input', { pending_id: 'question-1', answer: 'continue', source: 'user', via: 'chat' });
  assert.equal(resolved.fields.worktree_fingerprint, baseline); assert.equal(resolved.fields.current_activity, 'Implementing the feature.');
  assert.match(await html(), /Implementing the feature/);
});
test('handoff questions save their own continuation and the answer applies it exactly once', async (t) => {
  const { root, apply, state, seed } = await fixture(t);
  const directory = path.join(root, 'make-it-work/DEMO'); await mkdir(path.join(directory, 'DEMO-handoffs'));
  const plan = 'make-it-work/DEMO/DEMO-plan.md';
  await writeFile(path.join(root, plan), '# Plan\n\n## Execution Status\n\n**Mode:** Inline — execute.\n\n**Progress:** Step 1 of 1 complete.\n');
  await seed({ phase: 'review', review_cycle: '1', plan });
  const report = 'make-it-work/DEMO/DEMO-review.md'; await writeFile(path.join(root, report), 'Orchestrator outcome: HUMAN_DECISION\n');
  const handoff = 'make-it-work/DEMO/DEMO-handoffs/review-1.json';
  await writeFile(path.join(root, handoff), JSON.stringify({ version: 1, ticket: 'DEMO', plan_version: 1, review_cycle: 1, stage: 'review', status: 'done', outcome: 'HUMAN_DECISION', artifacts: { report }, data: { findings: [{ id: '#1', route: 'human', region: 'source:behavior', introduced_by_fix_of: null }], context_gaps: [] } }));
  const waiting = await apply('handoff', { handoff });
  assert.equal(waiting.fields.status, 'Paused'); assert.equal(waiting.pending[0].continuation.event, 'handoff');
  const resolved = await apply('resolve-input', { pending_id: waiting.pending[0].id, answer: 'decide-and-fix', source: 'user', via: 'chat' });
  assert.equal(resolved.fields.phase, 'fix-plan'); assert.equal(resolved.fields.status, 'In Progress'); assert.equal(resolved.fields.fix_cycle, '0');
  assert.deepEqual((await state()).pendingInputs, []);
});
test('stage needs_input resumes the same stage with its answer rather than asking the old handoff again', async (t) => {
  const { root, apply, seed } = await fixture(t); await seed({ phase: 'close-the-gaps' });
  const handoff = 'make-it-work/DEMO/DEMO-handoffs/gaps-1.json'; await mkdir(path.dirname(path.join(root, handoff)));
  await writeFile(path.join(root, handoff), JSON.stringify({ version: 1, ticket: 'DEMO', plan_version: 1, stage: 'gaps', status: 'needs_input', questions: ['What should the empty state show?'] }));
  const waiting = await apply('handoff', { handoff });
  const result = await apply('resolve-input', { pending_id: waiting.pending[0].id, answer: 'Show the existing empty-state message.', source: 'user', via: 'chat' });
  assert.equal(result.fields.phase, 'close-the-gaps'); assert.equal(result.fields.status, 'In Progress'); assert.equal(result.continuation, 'resume-stage');
});
test('stale bound approvals cannot resolve and must be reissued with a fresh pending identity', async (t) => {
  const { root, apply, state } = await fixture(t);
  const artifact = 'make-it-work/DEMO/DEMO-preview.md'; await writeFile(path.join(root, artifact), 'Shown version');
  const pending = question({ kind: 'approval', binding: { kind: 'artifact', path: artifact, strict: true } });
  await apply('await-input', { pending });
  await writeFile(path.join(root, artifact), 'Changed version'); const before = await state();
  await assert.rejects(apply('resolve-input', { pending_id: 'question-1', answer: 'continue', source: 'user', via: 'chat' }), /stale/);
  assert.equal((await state()).audit.length, before.audit.length);
  const refreshed = await apply('refresh-input', { pending_id: 'question-1', pending: { ...pending, id: 'question-2' } });
  assert.equal(refreshed.pending[0].id, 'question-2');
  await assert.rejects(apply('resolve-input', { pending_id: 'question-1', answer: 'continue', source: 'user', via: 'chat' }), /no longer pending/);
  await apply('resolve-input', { pending_id: 'question-2', answer: 'continue', source: 'user', via: 'chat' });
});
test('render failures retain durable waits and answers; replay repairs HTML without duplicate events', async (t) => {
  const { root, statePath, input, state } = await fixture(t);
  const request = await input('await-input', { pending: question() });
  const broken = async () => { throw new Error('renderer failed'); };
  await assert.rejects(applyWorkflow({ root, statePath, input: request, render: broken }), /renderer failed/);
  const since = (await state()).pendingInputs[0].requested_at;
  assert.equal((await applyWorkflow({ root, statePath, input: request })).replayed, true);
  assert.equal((await state()).pendingInputs[0].requested_at, since);
  const answer = await input('resolve-input', { pending_id: 'question-1', answer: 'continue', source: 'user', via: 'chat' });
  await assert.rejects(applyWorkflow({ root, statePath, input: answer, render: broken }), /renderer failed/);
  assert.equal((await state()).fields.status, 'In Progress');
  assert.equal((await applyWorkflow({ root, statePath, input: answer })).replayed, true);
  assert.equal((await state()).audit.length, 3);
});
test('mode changes preserve unanswered questions; a saved fixed policy may resolve only its actual documented default', async (t) => {
  const { apply, state } = await fixture(t);
  const options = [{ id: 'subagent-driven', label: 'Subagent driven' }, { id: 'inline', label: 'Inline' }];
  await apply('await-input', { pending: question({ choices: options, policy: { skill: 'execute', site: 'mode-choice', phase: 'Phase 0', question: 'Execution mode?', options } }) });
  await apply('autonomy', { mode: 'autopilot', source: 'user', via: 'chat' });
  assert.equal((await state()).fields.status, 'Paused'); assert.equal((await state()).pendingInputs[0].id, 'question-1');
  const result = await apply('resolve-input', { pending_id: 'question-1', source: 'autopilot', via: 'policy' });
  assert.equal(result.response, 'subagent-driven'); assert.equal(result.fields.status, 'In Progress');
});
test('Slack waits identify the PM and require an actual reply reference before accepting a PM answer', async (t) => {
  const { root, apply, html, seed } = await fixture(t); await seed({ phase: 'close-the-gaps' });
  const directory = path.join(root, 'make-it-work/DEMO'); await mkdir(path.join(directory, 'DEMO-handoffs'));
  await writeFile(path.join(directory, 'DEMO-questions.md'), '# Questions\nAwaiting PM answers.');
  const handoff = 'make-it-work/DEMO/DEMO-handoffs/gaps-1.json';
  await writeFile(path.join(root, handoff), JSON.stringify({ version: 1, ticket: 'DEMO', plan_version: 1, stage: 'gaps', status: 'done', outcome: 'QUESTIONS_SENT', artifacts: { questions: 'make-it-work/DEMO/DEMO-questions.md' }, data: {} }));
  const waiting = await apply('handoff', { handoff }); assert.match(await html(), /Waiting for the Product Manager/);
  await assert.rejects(apply('resolve-input', { pending_id: waiting.pending[0].id, answer: 'PM answered', source: 'pm', via: 'slack' }), /reply reference/);
  const result = await apply('resolve-input', { pending_id: waiting.pending[0].id, answer: 'PM answered the recorded questions.', source: 'pm', via: 'slack', reply_reference: 'recorded-thread-reply-id' });
  assert.equal(result.fields.status, 'In Progress'); assert.equal(result.fields.phase, 'close-the-gaps');
});
test('inline-step waits preserve actual step progress; completed-run delivery does not become Paused', async (t) => {
  const { root, apply, seed } = await fixture(t);
  const plan = 'make-it-work/DEMO/DEMO-plan.md';
  await writeFile(path.join(root, plan), '# Plan\n\n## Execution Status\n\n**Mode:** Inline — execute.\n\n**Progress:** Step 1 of 2 complete.\n');
  await seed({ phase: 'execute', plan, execution: 'running' });
  await apply('await-input', { pending: question({ kind: 'step' }) });
  await apply('resolve-input', { pending_id: 'question-1', answer: 'continue', source: 'user', via: 'chat' });
  assert.match(await readFile(path.join(root, plan), 'utf8'), /Step 1 of 2 complete/);
  await apply('await-input', { pending: { id: 'inline-stop', kind: 'step', question: 'Continue with the next step?' } });
  const stopped = await apply('resolve-input', { pending_id: 'inline-stop', answer: 'stop', source: 'user', via: 'chat' });
  assert.equal(stopped.fields.status, 'Stopped'); assert.deepEqual(stopped.pending, []);
  assert.match(await readFile(path.join(root, plan), 'utf8'), /Step 1 of 2 complete/);
  await seed({ phase: 'complete', status: 'Complete' });
  await assert.rejects(apply('await-input', { pending: question({ id: 'deliver' }) }), /delivery journal/);
});
test('pending-state validation rejects active blocking waits and preserves missing legacy metadata', () => {
  const record = createPendingInput(question(), 'execute', new Date().toISOString());
  assert.throws(() => pendingInputs({ pending_inputs: JSON.stringify([record]), phase: 'execute', status: 'In Progress', current_activity: 'none' }), /paused\/stopped/);
  assert.deepEqual(pendingInputs({}), []);
});
test('switching away from Guided skips the saved approval gate without recording user artifact approval', async (t) => {
  const { root, apply, state, seed } = await fixture(t, 'guided');
  const directory = path.join(root, 'make-it-work/DEMO'); await mkdir(path.join(directory, 'DEMO-handoffs'));
  await seed({ phase: 'close-the-gaps' });
  await writeFile(path.join(directory, 'DEMO-spec.md'), '# Refined spec');
  const handoff = 'make-it-work/DEMO/DEMO-handoffs/gaps-1.json';
  await writeFile(path.join(root, handoff), JSON.stringify({ version: 1, ticket: 'DEMO', plan_version: 1, stage: 'gaps', status: 'done', outcome: 'SPEC_SAVED', artifacts: { spec: 'make-it-work/DEMO/DEMO-spec.md' }, data: { tbd_items: 0, context_updated: [] } }));
  await apply('mode', { risk: 'medium', mode: 'tdd', source: 'assessed', rationale: 'Touches shared behavior with existing callers.' });
  const gate = await apply('handoff', { handoff }); assert.equal(gate.fields.status, 'Paused'); assert.equal(gate.fields.phase, 'spec-approval');
  await apply('autonomy', { mode: 'autonomous', source: 'user', via: 'chat' });
  assert.equal((await state()).pendingInputs[0].id, gate.pending[0].id);
  const skipped = await apply('skip-approval');
  assert.equal(skipped.fields.phase, 'plan'); assert.equal(skipped.fields.status, 'In Progress'); assert.deepEqual(skipped.pending, []);
  assert.equal((await state()).audit.at(-1).outcome.startsWith('skip-approval'), true);
});
test('an answer to a blocking wait cannot silently accept source drift', async (t) => {
  const { root, apply, state } = await fixture(t);
  await apply('await-input', { pending: question() }); const previous = await state();
  await writeFile(path.join(root, 'source.txt'), 'Unrelated edit while paused');
  await assert.rejects(apply('resolve-input', { pending_id: 'question-1', answer: 'continue', source: 'user', via: 'chat' }), /Workspace changed/);
  assert.equal((await state()).audit.length, previous.audit.length); assert.equal((await state()).fields.status, 'Paused');
});
test('an outstanding optional permission can resolve after completion while implementation stays Complete', async (t) => {
  const { apply, seed, state, html } = await fixture(t);
  await apply('await-input', { pending: question({ kind: 'permission', blocking: false }) });
  await seed({ status: 'Complete', phase: 'complete' });
  const resolved = await apply('resolve-input', { pending_id: 'question-1', answer: 'stop', source: 'user', via: 'chat' });
  assert.equal(resolved.fields.status, 'Complete'); assert.equal(resolved.fields.phase, 'complete'); assert.equal((await state()).pendingInputs.length, 0);
  assert.match(await html(), /Implementation complete/);
});
test('a legacy run may record a wait without changing hash definitions or enabling the controller', async (t) => {
  const { root, statePath, apply, seed, state } = await fixture(t);
  const spec = 'make-it-work/DEMO/DEMO-spec.md'; await writeFile(path.join(root, spec), '# Existing spec');
  await seed({ spec, spec_hash: 'a'.repeat(40) });
  await writeFile(statePath, (await readFile(statePath, 'utf8')).replace(/^controller_version:.*\n/m, '').replace(/^workspace_snapshot:.*\n/m, ''));
  const before = (await state()).fields;
  await apply('await-input', { pending: question() });
  const result = await apply('resolve-input', { pending_id: 'question-1', answer: 'continue', source: 'user', via: 'chat' });
  assert.equal(result.fields.spec_hash, before.spec_hash); assert.equal(result.fields.worktree_fingerprint, before.worktree_fingerprint); assert.equal(result.fields.controller_version, undefined); assert.equal(result.fields.workspace_snapshot, undefined);
});
test('request identities cannot be reused after resolution and artifact bindings cannot traverse outside the run', async (t) => {
  const { apply } = await fixture(t);
  await apply('await-input', { pending: question() });
  await apply('resolve-input', { pending_id: 'question-1', answer: 'continue', source: 'user', via: 'chat' });
  await assert.rejects(apply('await-input', { pending: question() }), /cannot be reused/);
  await assert.rejects(apply('await-input', { pending: question({ id: 'new-question', binding: { kind: 'artifact', path: 'make-it-work/DEMO/../../source.txt', strict: true } }) }), /belong to the ticket/);
});
test('one grouped wait renders every actual question/choice and requires the whole wave of answers', async (t) => {
  const { apply, html, state } = await fixture(t);
  const pending = { id: 'wave-1', kind: 'question', question: 'Please answer these independent refinement questions.', questions: [
    { id: 'Q1', question: 'Which trigger?', choices: [{ id: 'manual', label: 'Manual trigger' }, { id: 'scheduled', label: 'Scheduled trigger', description: 'Run on the saved schedule.' }] },
    { id: 'Q2', question: 'What should the empty-state message say?', choices: [] },
  ] };
  await apply('await-input', { pending });
  const page = await html(); assert.match(page, /Which trigger/); assert.match(page, /Scheduled trigger/); assert.match(page, /empty-state message/);
  assert.match(page, /Run on the saved schedule/);
  await assert.rejects(apply('resolve-input', { pending_id: 'wave-1', answer: { Q1: 'manual' }, source: 'user', via: 'question' }), /Every grouped/);
  await assert.rejects(apply('resolve-input', { pending_id: 'wave-1', answer: { Q1: 'invented', Q2: 'No tasks yet.' }, source: 'user', via: 'question' }), /offered/);
  const result = await apply('resolve-input', { pending_id: 'wave-1', answer: { Q1: 'manual', Q2: 'No tasks yet.' }, source: 'user', via: 'question' });
  assert.equal(result.fields.status, 'In Progress'); assert.equal(result.response.Q1, 'manual');
  assert.match((await state()).audit.at(-1).outcome, /Responses received for Q1, Q2/); assert.doesNotMatch((await state()).audit.at(-1).outcome, /No tasks yet/);
});
test('stale or unavailable final packages may still be rejected without stamping approval or accepting code drift', async (t) => {
  const { root, apply, statePath, state, seed } = await fixture(t, 'guided');
  await seed({ phase: 'final-approval', review: 'clean', status: 'Paused', pause_reason: 'Approve the package?' });
  const request = createPendingInput({ id: 'unavailable-package', kind: 'approval', question: 'Approve the package?', choices: [{ id: 'approve', label: 'Approve' }, { id: 'redo', label: 'Request changes' }, { id: 'stop', label: 'Stop' }], binding: { kind: 'package', sha256: 'a'.repeat(64), strict: true }, continuation: { event: 'final-approval' } }, 'final-approval', new Date().toISOString());
  await seed({ pending_inputs: JSON.stringify([request]) });
  await writeFile(path.join(root, 'source.txt'), 'Edited while reviewing the package');
  const before = await readFile(statePath, 'utf8');
  await assert.rejects(apply('resolve-input', { pending_id: request.id, answer: 'approve', source: 'user', via: 'chat' }), /ENOENT/);
  assert.equal(await readFile(statePath, 'utf8'), before);
  const rejected = await apply('resolve-input', { pending_id: request.id, answer: 'redo', source: 'user', via: 'chat' });
  assert.equal(rejected.fields.status, 'In Progress'); assert.equal(rejected.fields.phase, 'final-approval'); assert.deepEqual(rejected.pending, []);
  assert.equal(rejected.fields.worktree_fingerprint, parseState(before, statePath).fields.worktree_fingerprint);
  await assert.rejects(readFile(path.join(root, 'make-it-work/DEMO/DEMO-final-approval.json')), /ENOENT/);
  assert.match((await state()).audit.at(-1).outcome, /Request changes/);
});
test('an explicit stop cancels its blocking question without pretending it was answered and can later resume', async (t) => {
  const { apply, state } = await fixture(t);
  await apply('await-input', { pending: question() });
  await assert.rejects(apply('input-answered'), /must use resolve-input/);
  const stopped = await apply('stop', { reason: 'Developer stopped this run.' });
  assert.equal(stopped.fields.status, 'Stopped'); assert.deepEqual(stopped.pending, []);
  assert.match((await state()).audit.at(-1).outcome, /cancelled without an answer/);
  assert.equal((await apply('resume', { blocker_resolved: true })).fields.status, 'In Progress');
});
