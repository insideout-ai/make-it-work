import { artifactJoin } from '../../../scripts/lib/artifact-path.mjs';
import assert from 'node:assert/strict';
import { appendFile, mkdtemp, mkdir, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { initializeWorkflow, applyWorkflow } from './workflow.mjs';
import { digest } from '../../../scripts/lib/artifacts.mjs';
import { pendingStartup, startupHook, startupProgress } from './startup-presentation.mjs';
import { testingReadiness } from './testing-readiness.mjs';
import { authorizePlanningTests } from './planning-tests.mjs';
import { readHookEvents } from './hook-feedback.mjs';
import { checkFeedback, inspectFeedback, writeFeedback, unavailableFeedback, finalizeSavedFeedback } from './write-feedback.mjs';
import { feedbackAction } from './feedback-handoff.mjs';
import { parseState } from './render-status.mjs';
import { evidenceText } from './feedback-evidence.mjs';
import { generateDashboard } from './render-status.mjs';
import { acceptDelegateReport } from './delegate-report.mjs';

function withoutFeedbackNotes(markdown) {
  return markdown.replace(/^\| \d+ \| [^\n]*\[audit-note: (?:activity|result); id: feedback-(?:start|saved|unavailable):[a-f0-9]{64}\] \|\n/gm, '');
}

const dashboard = '/tmp/project space/#run/DEMO-status.html';
const initialized = { startup_message: `[Open implementation dashboard](<${encodeURI(dashboard).replace('#', '%23')}>)`,
  dashboard, state: '/tmp/project space/#run/DEMO-state.md' };
const assistant = (...content) => ({ type: 'assistant', message: { role: 'assistant', content } });
const text = (value) => ({ type: 'text', text: value });
const startup = () => [assistant({ type: 'tool_use', id: 'init', name: 'Bash', input: { command: 'workflow.mjs init' } }),
  { type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'init', content: JSON.stringify(initialized) }] } }];

test('tool output, thinking, wrong targets and code samples cannot substitute for assistant chat', () => {
  for (const message of [assistant({ type: 'thinking', thinking: initialized.startup_message }),
    assistant(text('[Open implementation dashboard](</tmp/other-status.html>)')),
    assistant(text(`\`${initialized.startup_message}\``)),
    assistant(text(`\`\`\`markdown\n${initialized.startup_message}\n\`\`\``))]) {
    assert.equal(pendingStartup([...startup(), message]).dashboard, dashboard);
  }
  assert.equal(pendingStartup([...startup(), assistant(text(initialized.startup_message))]), null);
});

test('initialization failures and Resume do not impose a startup announcement', () => {
  const failed = startup();
  failed[1].message.content[0].is_error = true;
  assert.equal(pendingStartup(failed), null);
  assert.equal(pendingStartup([...startup(), { type: 'user', message: { role: 'user', content: 'Resume this run' } }]), null);
  assert.equal(pendingStartup([...startup(), { type: 'user', message: { role: 'user', content: [text('Resume')] } }]), null);
  assert.equal(pendingStartup([...startup(), assistant(text(initialized.startup_message)), ...startup()]).dashboard, dashboard);
});

test('init, tool and Stop holds require actual chat delivery', async (t) => {
  const root = await mkdtemp(artifactJoin(os.tmpdir(), 'startup-presentation-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const transcript = artifactJoin(root, 'transcript.jsonl');
  const write = (events) => writeFile(transcript, events.map((event) => JSON.stringify(event)).join('\n') + '\n');
  await write(startup());
  const before = await readFile(transcript, 'utf8');
  const held = await startupHook({ hook_event_name: 'PreToolUse', transcript_path: transcript });
  assert.equal(held.hookSpecificOutput.permissionDecision, 'deny');
  assert.ok(held.hookSpecificOutput.permissionDecisionReason.includes(initialized.startup_message));
  assert.equal((await startupHook({ hook_event_name: 'Stop', transcript_path: transcript })).decision, 'block');
  const reminder = await startupHook({ hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_response: { stdout: JSON.stringify(initialized) } });
  assert.equal(reminder.decision, 'block');
  assert.ok(reminder.reason.includes(initialized.startup_message));
  assert.equal(await readFile(transcript, 'utf8'), before);
  await write([...startup(), assistant(text(initialized.startup_message))]);
  assert.deepEqual(await startupHook({ hook_event_name: 'PreToolUse', transcript_path: transcript }), {});
  assert.deepEqual(await startupHook({ hook_event_name: 'Stop', transcript_path: transcript }), {});
  assert.deepEqual(await startupHook({ hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_response: { stdout: '{}' } }), {});
});

test('a chat link flushed shortly after tool dispatch releases the hold automatically', async (t) => {
  const root = await mkdtemp(artifactJoin(os.tmpdir(), 'startup-flush-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const transcript = artifactJoin(root, 'transcript.jsonl');
  const events = startup();
  await writeFile(transcript, events.map(JSON.stringify).join('\n') + '\n');
  const checking = startupHook({ hook_event_name: 'PreToolUse', transcript_path: transcript });
  await new Promise((resolve) => setTimeout(resolve, 1800));
  await writeFile(transcript, [...events, assistant(text(initialized.startup_message))].map(JSON.stringify).join('\n') + '\n');
  assert.deepEqual(await checking, {});
  assert.deepEqual(await startupHook({ hook_event_name: 'Stop', transcript_path: transcript }), {});
});

async function freshRun(t, autonomy, offline = false) {
  const root = await mkdtemp(artifactJoin(os.tmpdir(), 'startup-continuation-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
  git('init', '-q', '-b', 'main');
  git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'Baseline', '--allow-empty');
  git('switch', '-qc', 'feature');
  await mkdir(artifactJoin(root, '.claude/rules'), { recursive: true });
  await mkdir(artifactJoin(root, '.claude/skills/domain-demo'), { recursive: true });
  await writeFile(artifactJoin(root, 'CLAUDE.md'), '# Skill Loading Gate\n');
  await writeFile(artifactJoin(root, '.claude/rules/product.md'), '# Product\n');
  await writeFile(artifactJoin(root, '.claude/rules/architecture.md'), '# Architecture\n');
  await writeFile(artifactJoin(root, '.claude/skills/domain-demo/SKILL.md'), '---\nname: domain-demo\n---\n');
  const result = await initializeWorkflow(root, { ticket: 'DEMO', autonomy, base: 'main', repos: [root], branch_guard: 'Existing feature branch', offline_pending: offline });
  const initialized = { ...result, continuation: offline ? 'wait_for_offline_answers' : 'continue_context_check_without_user_reply' };
  const events = [assistant({ type: 'tool_use', id: 'init', name: 'Bash' }),
    { type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'init', content: JSON.stringify(initialized) }] } },
    assistant(text(result.startup_message + '\nSend another message to continue.'))];
  const transcript = artifactJoin(root, 'make-it-work/transcript.jsonl');
  const saveEvents = () => writeFile(transcript, events.map(JSON.stringify).join('\n') + '\n');
  await saveEvents();
  const check = () => startupHook({ hook_event_name: 'Stop', transcript_path: transcript });
  let id = 0;
  const apply = async (event) => applyWorkflow({ root, statePath: result.state, input: { id: `event-${++id}`, event, repos: [root], reason: 'Recorded checkpoint', expected_hash: digest(await readFile(result.state, 'utf8')) } });
  return { root, result, events, transcript, saveEvents, check, apply };
}

test('new planning activity checks recover through real chat and persisted boundary checkpoints', async t => {
  const run = await freshRun(t, 'guided');
  const raw = await readFile(run.result.state, 'utf8');
  await writeFile(run.result.state, raw.replace('phase: context-check', 'phase: plan').replace('mode: none', 'mode: tdd')
    .replace('mode_source: none', 'mode_source: assessed').replace('risk: none', 'risk: medium').replace('risk_rationale: none', 'risk_rationale: Existing caller changes'));
  const plan = artifactJoin(path.dirname(run.result.state), 'DEMO-plan.md');
  const before = await readFile(run.result.state, 'utf8');
  assert.throws(() => execFileSync(process.execPath, [path.resolve('skills/implement/scripts/dashboard-checkpoint.mjs'), 'activity', '--state', run.result.state, '--activity', 'Invalid boundary', '--planning-activity', 'unknown'], { cwd: run.root, stdio: 'pipe' }), /Unknown planning activity/);
  assert.equal(await readFile(run.result.state, 'utf8'), before);
  const check = (tool_name, tool_input) => startupHook({ hook_event_name: 'PreToolUse', transcript_path: run.transcript, cwd: run.root, tool_name, tool_input });
  assert.match((await check('Write', { file_path: plan })).hookSpecificOutput.permissionDecisionReason, /--planning-activity discovery/);
  const checkpoint = async boundary => {
    const sentence = `I am doing planning ${boundary}.`;
    run.events.push(assistant(text(sentence))); await run.saveEvents();
    const args = [path.resolve('skills/implement/scripts/dashboard-checkpoint.mjs'), 'activity', '--state', run.result.state, '--activity', sentence, '--planning-activity', boundary, '--category', 'investigation/setup'];
    assert.deepEqual(await check('Bash', { command: `node ${args.map(value => JSON.stringify(value)).join(' ')}` }), {});
    execFileSync(process.execPath, args, { cwd: run.root });
  };
  await checkpoint('discovery');
  assert.match((await check('Write', { file_path: plan })).hookSpecificOutput.permissionDecisionReason, /--planning-activity drafting/);
  await checkpoint('drafting');
  assert.deepEqual(await check('Write', { file_path: plan }), {});
  const validation = { command: 'node /plugin/validate-plan.mjs check --plan plan.md' };
  assert.match((await check('Bash', validation)).hookSpecificOutput.permissionDecisionReason, /--planning-activity validation/);
  await checkpoint('validation');
  assert.deepEqual(await check('Bash', validation), {});
  const saved = parseState(await readFile(run.result.state, 'utf8'));
  assert.deepEqual(saved.audit.filter(row => row.note?.id.startsWith('planning-')).map(row => row.note.id.split(':')[0]), ['planning-discovery', 'planning-drafting', 'planning-validation']);
});

test('WF-015 reproduction: narration missing from the snapshot denies once, persisted chat releases without a Stop round', async t => {
  const run = await freshRun(t, 'guided');
  await writeFile(run.result.state, (await readFile(run.result.state, 'utf8')).replace('phase: context-check', 'phase: plan').replace('mode: none', 'mode: tdd')
    .replace('mode_source: none', 'mode_source: assessed').replace('risk: none', 'risk: medium').replace('risk_rationale: none', 'risk_rationale: Existing caller changes'));
  const sentence = 'I am inspecting the existing test boundaries.';
  const input = { hook_event_name: 'PreToolUse', transcript_path: run.transcript, cwd: run.root, tool_name: 'Bash',
    tool_input: { command: `node /plugin/dashboard-checkpoint.mjs activity --state "${run.result.state}" --activity "${sentence}" --planning-activity discovery` } };
  const before = await readFile(run.result.state, 'utf8');
  const denied = await startupHook(input);
  assert.match(denied.hookSpecificOutput.permissionDecisionReason, /match actual assistant chat/);
  run.events.push({ ...assistant(text(sentence)), timestamp: new Date(Date.now() + 1000).toISOString() }); await run.saveEvents();
  assert.deepEqual(await startupHook(input), {}, 'one newly persisted announcement suffices; no duplicate chat or Stop event supplied');
  assert.equal(await readFile(run.result.state, 'utf8'), before, 'neither check advances workflow state');
});

async function planningRun(t, phase = 'plan') {
  const run = await freshRun(t, 'guided');
  await writeFile(run.result.state, (await readFile(run.result.state, 'utf8')).replace('phase: context-check', `phase: ${phase}`)
    .replace('| start | context-check |', `| start | ${phase} |`).replace('mode: none', 'mode: tdd')
    .replace('mode_source: none', 'mode_source: assessed').replace('risk: none', 'risk: medium').replace('risk_rationale: none', 'risk_rationale: Existing caller changes'));
  return run;
}
const planningCall = (run, sentence) => ({ hook_event_name: 'PreToolUse', transcript_path: run.transcript, cwd: run.root, tool_name: 'Bash',
  tool_input: { command: `node /plugin/dashboard-checkpoint.mjs activity --state "${run.result.state}" --activity "${sentence}" --planning-activity discovery` } });

test('delayed planning chat including a partial JSONL append releases the same hook call in plan and fix-plan', async t => {
  for (const phase of ['plan', 'fix-plan']) {
    const run = await planningRun(t, phase), sentence = 'I am checking the affected test boundaries.';
    const before = await readFile(run.result.state, 'utf8');
    const checking = startupHook(planningCall(run, sentence));
    await new Promise(resolve => setTimeout(resolve, 150));
    const event = JSON.stringify({ ...assistant(text(sentence)), timestamp: new Date().toISOString() });
    const half = Math.floor(event.length / 2);
    await appendFile(run.transcript, event.slice(0, half));
    await new Promise(resolve => setTimeout(resolve, 100));
    await appendFile(run.transcript, event.slice(half) + '\n');
    assert.deepEqual(await checking, {}, 'one persisted sentence releases the original call without a Stop event or retry');
    const prematureWrite = await startupHook({ hook_event_name: 'PreToolUse', transcript_path: run.transcript, cwd: run.root, tool_name: 'Write',
      tool_input: { file_path: artifactJoin(path.dirname(run.result.state), 'DEMO-plan.md') } });
    assert.match(prematureWrite.hookSpecificOutput.permissionDecisionReason, /--planning-activity discovery/, 'chat alone does not perform the required activity checkpoint');
    assert.equal(await readFile(run.result.state, 'utf8'), before);
    const events = (await readFile(run.transcript, 'utf8')).trim().split('\n').map(JSON.parse);
    assert.equal(events.filter(row => row.message?.content?.some(part => part.type === 'text' && part.text === sentence)).length, 1);
  }
});

test('the bounded planning wait still denies fake, stale and permanently missing narration', async t => {
  const run = await planningRun(t), sentence = 'I am inspecting the changed rule.';
  const timestamp = new Date().toISOString();
  run.events.push(
    { ...assistant(text(sentence)), timestamp, isSidechain: true },
    { ...assistant(text(sentence)), timestamp, isSynthetic: true },
    { ...assistant(text(sentence)), timestamp, parent_tool_use_id: 'child' },
    { ...assistant(text('```\n' + sentence + '\n```')), timestamp },
    { ...assistant({ type: 'thinking', thinking: sentence }), timestamp },
    { ...assistant(text(sentence)), timestamp: '2020-01-01T00:00:00Z' },
    { type: 'user', timestamp, message: { role: 'user', content: [{ type: 'tool_result', content: sentence }] } },
  );
  await run.saveEvents();
  const before = await readFile(run.result.state, 'utf8'), start = performance.now();
  const held = await startupHook(planningCall(run, sentence));
  assert.match(held.hookSpecificOutput.permissionDecisionReason, /match actual assistant chat/);
  assert.ok(performance.now() - start < 5000, 'missing chat gets a finite local wait');
  assert.equal(await readFile(run.result.state, 'utf8'), before);
});

test('planning flush retries reread the phase entry instead of accepting chat from a prior cycle', async t => {
  const run = await planningRun(t), sentence = 'I am checking the updated tests.';
  const checking = startupHook(planningCall(run, sentence));
  await new Promise(resolve => setTimeout(resolve, 150));
  const entered = new Date(Date.now() + 5000).toISOString();
  await writeFile(run.result.state, (await readFile(run.result.state, 'utf8')).trimEnd() + `\n| 2 | ${entered} | plan-approval | plan | Begin a new plan cycle |\n`);
  await appendFile(run.transcript, JSON.stringify({ ...assistant(text(sentence)), timestamp: new Date().toISOString() }) + '\n');
  const held = await checking;
  assert.match(held.hookSpecificOutput.permissionDecisionReason, /match actual assistant chat/);
  assert.equal(parseState(await readFile(run.result.state, 'utf8')).audit.length, 2, 'the wait writes no checkpoint');
});

async function sourceReview(run) {
  const summary = await inspectFeedback(run.result.state), packet = summary._packet;
  const timestamp = new Date(Date.now() + 1000).toISOString();
  run.events.push({ ...assistant({ type: 'tool_use', id: 'source-evidence', name: 'Bash', input: { command: `node "${path.resolve('skills/implement/scripts/write-feedback.mjs')}" evidence --state "${run.result.state}"` } }), timestamp },
    { type: 'user', timestamp, message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'source-evidence', content: evidenceText(packet) }] } });
  await run.saveEvents();
  return { packet_hash: packet.packetHash, dashboard: { status: 'inspected', sections: ['markup', 'styles'].map(id => ({ id, status: 'checked', observations: [{ line: packet.dashboard.sections[id].find(row => id === 'styles' ? /body\s*\{/.test(row.text) : /<h1/.test(row.text))?.line ?? packet.dashboard.sections[id][0].line, note: id === 'styles' ? 'Declared layout rules inspected; actual rendering remains unverified' : 'Dashboard headline and source content compared with the saved terminal state' }] })) }, process: [] };
}

async function readSavedFeedback(run, id = 'feedback-readback', body) {
  const file = artifactJoin(path.dirname(run.result.state), 'workflow-feedback.md');
  const content = body ?? await readFile(file, 'utf8'), timestamp = new Date(Date.now() + 1000).toISOString();
  run.events.push({ ...assistant({ type: 'tool_use', id, name: 'Read', input: { file_path: file } }), timestamp },
    { type: 'user', timestamp, message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content }] } });
  await run.saveEvents();
}

async function completedRecoveryRun(t) {
  const run = await freshRun(t, 'autopilot');
  const state = (await readFile(run.result.state, 'utf8')).replace('status: In Progress', 'status: Complete').replace('phase: context-check', 'phase: complete');
  await writeFile(run.result.state, state.trimEnd() + `\n| 2 | ${new Date().toISOString()} | context-check | complete | Terminal recovery fixture |\n`);
  // No discoverable startup/controller output, as in a resumed, projected run.
  run.events.splice(0);
  await writeFeedback(run.result.state, { sessionReview: { status: 'pending', context: ['Visible conversation reviewed'], findings: [], userInput: [], limitations: ['Runtime rendering unverified'], evidence_review: await sourceReview(run) } });
  return run;
}

test('explicit finalization recovers missing hook context, preserves approvals and is idempotent', async t => {
  const run = await completedRecoveryRun(t);
  const state = await readFile(run.result.state, 'utf8');
  const report = await readFile(artifactJoin(path.dirname(run.result.state), 'workflow-feedback.md'), 'utf8');
  await assert.rejects(finalizeSavedFeedback(run.result.state), /requires --transcript/);
  await assert.rejects(finalizeSavedFeedback(run.result.state, { transcriptPath: run.transcript }), /current body has not been read back/);
  await readSavedFeedback(run);
  const args = [path.resolve('skills/implement/scripts/write-feedback.mjs'), 'finalize', '--state', run.result.state, '--transcript', run.transcript];
  const first = execFileSync(process.execPath, args, { encoding: 'utf8' });
  assert.equal(JSON.parse(first).status, 'saved');
  const receiptPath = artifactJoin(path.dirname(run.result.state), 'feedback-finalized.json');
  const receipt = await readFile(receiptPath, 'utf8');
  execFileSync(process.execPath, args, { encoding: 'utf8' });
  assert.equal(await readFile(receiptPath, 'utf8'), receipt);
  assert.equal(withoutFeedbackNotes(await readFile(run.result.state, 'utf8')), withoutFeedbackNotes(state));
  assert.equal(await readFile(artifactJoin(path.dirname(run.result.state), 'workflow-feedback.md'), 'utf8'), report);
  await writeFile(artifactJoin(path.dirname(run.result.state), 'workflow-feedback.md'), report + '\nUpdated report\n');
  await assert.rejects(finalizeSavedFeedback(run.result.state, { transcriptPath: run.transcript }), /current body has not been read back/);
});

test('finalization rejects delegated readback and surfaces receipt I/O errors without reopening workflow', async t => {
  const run = await completedRecoveryRun(t);
  await readSavedFeedback(run);
  const events = structuredClone(run.events);
  run.events.slice(-2).forEach(event => { event.isSidechain = true; });
  await run.saveEvents();
  await assert.rejects(finalizeSavedFeedback(run.result.state, { transcriptPath: run.transcript }), /current body has not been read back/);
  run.events.splice(0, run.events.length, ...events);
  await run.saveEvents();
  const receiptPath = artifactJoin(path.dirname(run.result.state), 'feedback-finalized.json');
  await mkdir(receiptPath);
  await assert.rejects(finalizeSavedFeedback(run.result.state, { transcriptPath: run.transcript }), /Could not persist feedback finalization/);
  assert.match(await readFile(run.result.state, 'utf8'), /status: Complete/);
  await rm(receiptPath, { recursive: true });
  assert.equal((await finalizeSavedFeedback(run.result.state, { transcriptPath: run.transcript })).status, 'saved');
  const state = await readFile(run.result.state, 'utf8');
  await writeFile(run.result.state, state.replace('Terminal recovery fixture', 'A newer terminal boundary'));
  await assert.rejects(finalizeSavedFeedback(run.result.state, { transcriptPath: run.transcript }), /required feedback work is not complete/);
});

test('delegate reports deduplicate by native task and revision without changing workflow state', async t => {
  const run = await completedRecoveryRun(t);
  const state = await readFile(run.result.state, 'utf8');
  const report = artifactJoin(path.dirname(run.result.state), 'workflow-feedback.md');
  const options = { statePath: run.result.state, agent: 'worker', task: 'task-1', report };
  assert.equal((await acceptDelegateReport(options)).duplicate, false);
  assert.equal((await acceptDelegateReport(options)).duplicate, true);
  await writeFile(report, (await readFile(report, 'utf8')) + '\nRevised findings\n');
  const revised = await acceptDelegateReport(options);
  assert.equal(revised.duplicate, false); assert.equal(revised.revised, true);
  assert.equal((await acceptDelegateReport({ ...options, task: 'task-2' })).duplicate, false);
  await assert.rejects(acceptDelegateReport({ ...options, report: path.join(run.root, 'CLAUDE.md') }), /inside this run/);
  const escaped = path.join(path.dirname(report), 'outside-report.md');
  await symlink(path.join(run.root, 'CLAUDE.md'), escaped);
  await assert.rejects(acceptDelegateReport({ ...options, report: escaped }), /inside this run/);
  assert.equal(await readFile(run.result.state, 'utf8'), state);
});

test('Complete cannot skip feedback by proceeding directly to delivery or the terminal summary', async (t) => {
  const run = await freshRun(t, 'autopilot');
  let state = await readFile(run.result.state, 'utf8');
  state = state.replace('status: In Progress', 'status: Complete').replace('phase: context-check', 'phase: complete');
  state = state.trimEnd() + `\n| 2 | ${new Date().toISOString()} | context-check | complete | Fixture terminal checkpoint |\n`;
  await writeFile(run.result.state, state);
  assert.equal((await run.check()).decision, 'block');
  const delivery = await startupHook({ hook_event_name: 'PreToolUse', tool_name: 'AskUserQuestion', transcript_path: run.transcript });
  assert.equal(delivery.hookSpecificOutput.permissionDecision, 'deny');
  run.events.push({ type: 'user', message: { role: 'user', content: 'Please give me the transcript path.' } });
  await run.saveEvents();
  assert.equal((await run.check()).decision, 'block');
  assert.equal((await startupHook({ hook_event_name: 'PreToolUse', tool_name: 'AskUserQuestion', transcript_path: run.transcript })).hookSpecificOutput.permissionDecision, 'deny');
  await writeFeedback(run.result.state, { sessionReview: {
    status: 'pending', context: ['Current visible conversation reviewed'], findings: [], userInput: [], limitations: ['Client version unknown'],
    evidence_review: await sourceReview(run),
  } });
  assert.match((await run.check()).reason, /current body has not been read back/);
  await readSavedFeedback(run, 'partial-readback', '# Implement workflow feedback');
  assert.equal((await run.check()).decision, 'block');
  await readSavedFeedback(run);
  await startupHook({ hook_event_name: 'PostToolUse', tool_name: 'Read', transcript_path: run.transcript });
  const dashboardMtime = (await stat(run.result.dashboard)).mtimeMs;
  assert.deepEqual(await run.check(), {});
  assert.equal((await stat(run.result.dashboard)).mtimeMs, dashboardMtime);
  const file = artifactJoin(path.dirname(run.result.state), 'workflow-feedback.md');
  await writeFile(file, (await readFile(file, 'utf8')).replace('Client version unknown', 'Client version not captured'));
  assert.match((await run.check()).reason, /current body has not been read back/);
  await readSavedFeedback(run, 'revised-readback');
  assert.deepEqual(await run.check(), {});
  assert.equal(withoutFeedbackNotes(await readFile(run.result.state, 'utf8')), state);
});

async function oneFixTerminal(t) {
  const run = await freshRun(t, 'autopilot');
  const time = new Date().toISOString();
  let state = (await readFile(run.result.state, 'utf8')).replace('status: In Progress', 'status: Complete').replace('phase: context-check', 'phase: complete').replace('fix_cycle: 0', 'fix_cycle: 1').replace('review_cycle: 0', 'review_cycle: 2');
  state = state.trimEnd() + [
    `\n| 2 | ${time} | context-check | review | Initial review |`,
    `\n| 3 | ${time} | review | lightweight | Required behavior was missed |`,
    `\n| 4 | ${time} | lightweight | review | Fix completed |`,
    `\n| 5 | ${time} | review | final-sync | Review clean |`,
    `\n| 6 | ${time} | final-sync | complete | Completion checkpoint |\n`,
  ].join('');
  await writeFile(run.result.state, state);
  await generateDashboard(run.result.state);
  const add = (name, id, input, content, isError = false) => {
    const timestamp = new Date(Date.now() + 1000).toISOString();
    run.events.push({ ...assistant({ type: 'tool_use', id, name, input }), timestamp },
      { type: 'user', timestamp, message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content, is_error: isError }] } });
  };
  const summary = await inspectFeedback(run.result.state);
  assert.equal(summary.fixRounds, 1); assert.equal(summary.reviewCycles, 2); assert.equal(summary.analysisRequired, true);
  add('Bash', 'feedback-inspect', { command: `node "${path.resolve('skills/implement/scripts/write-feedback.mjs')}" inspect --state "${run.result.state}"` }, JSON.stringify(summary));
  const prompt = `Review the terminal workflow using ${path.resolve('skills/implement/references/feedback.md')} and return the structured retrospective.`;
  return { ...run, state, summary, add, prompt };
}

test('one fix then Complete requires retrospective dispatch and saved combined feedback before delivery', async (t) => {
  const run = await oneFixTerminal(t);
  const delivery = () => startupHook({ hook_event_name: 'PreToolUse', tool_name: 'AskUserQuestion', transcript_path: run.transcript });
  await run.saveEvents();
  assert.equal((await delivery()).hookSpecificOutput.permissionDecision, 'deny');
  const offerInput = { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: `node "${path.resolve('skills/implement/scripts/deliver.mjs')}" offer --root "${run.root}" --state "${run.result.state}"` }, transcript_path: run.transcript };
  assert.equal((await startupHook(offerInput)).hookSpecificOutput.permissionDecision, 'deny');
  const analysis = { version: 2, events: run.summary.events.map(event => ({ ...event, trigger: 'Required behavior was missed', rootCause: 'execution deviation', explanation: 'The implementation omitted required behavior', earliestStage: 'implement', preventability: 'likely', owner: 'implement', improvement: 'Check the required behavior against actual results', confidence: 'high',
    basis: { requirement: 'Source row 1 required the behavior', knownEvidence: 'Source row 2 showed the affected path', observedAction: 'Source row 3 omitted the required behavior', attribution: 'The implementation departed from the stated behavior' } })), recommendations: ['Check the required behavior against actual results'], clarifications: [], openQuestions: [] };
  const sessionReview = { version: 2, status: 'pending', context: ['Visible conversation reviewed'], findings: [], userInput: [], limitations: ['Input not requested under Autopilot'] };
  sessionReview.evidence_review = await sourceReview(run);
  assert.equal((await checkFeedback(run.result.state, { analysis, sessionReview })).valid, true);
  assert.equal((await run.check()).decision, 'block'); // Validation is not saving.
  await writeFeedback(run.result.state, { analysis, sessionReview });
  assert.equal((await delivery()).hookSpecificOutput.permissionDecision, 'deny'); // An inline diagnosis is not the required delegate.
  run.add('Agent', 'fork-feedback', { prompt: run.prompt, subagent_type: 'fork' }, 'The fork wrote its own analysis.');
  run.events.push({ type: 'user', origin: { kind: 'task-notification', producer: 'session-task' }, promptSource: 'system', turnOrigin: 'task_notification',
    message: { role: 'user', content: '<task-notification>\n<task-id>fork-feedback</task-id>\n<status>completed</status>\n</task-notification>' } });
  await run.saveEvents();
  assert.equal((await delivery()).hookSpecificOutput.permissionDecision, 'deny');
  assert.equal((await run.check()).decision, 'block');
  run.add('Agent', 'retrospective', { prompt: run.prompt }, 'Structured analysis returned');
  const written = await writeFeedback(run.result.state, { analysis, sessionReview });
  const writeCommand = `node "${path.resolve('skills/implement/scripts/write-feedback.mjs')}" write --state "${run.result.state}"`;
  run.add('Bash', 'feedback-written', { command: writeCommand }, JSON.stringify(written));
  await run.saveEvents();
  await startupHook({ hook_event_name: 'PostToolUse', tool_name: 'Bash', transcript_path: run.transcript });
  assert.equal((await delivery()).hookSpecificOutput.permissionDecision, 'deny');
  await readSavedFeedback(run);
  await startupHook({ hook_event_name: 'PostToolUse', tool_name: 'Read', transcript_path: run.transcript });
  const directory = path.dirname(run.result.state), receiptPath = artifactJoin(directory, 'feedback-finalized.json');
  const receipt = await readFile(receiptPath, 'utf8');
  assert.equal(JSON.parse(receipt).writerId, 'feedback-written');
  assert.deepEqual(await startupHook(offerInput), {});
  assert.deepEqual(await delivery(), {});
  assert.deepEqual(await run.check(), {});
  const report = await readFile(artifactJoin(path.dirname(run.result.state), 'workflow-feedback.md'), 'utf8');
  assert.match(report, /Fix rounds: 1/); assert.match(report, /### Session review/);
  assert.ok(report.includes(`Plugin version: ${run.summary.pluginVersion}`));
  // Later delivery choices and presentation changes must reuse the sealed
  // result, even if the old source/journal can no longer be re-inspected.
  await writeFile(artifactJoin(directory, 'hook-events.jsonl'), 'No longer readable as an event journal\n');
  assert.deepEqual(await startupHook({ hook_event_name: 'PostToolUse', tool_name: 'Write', transcript_path: run.transcript }), {});
  const question = 'Prepare delivery for this completed run?';
  for (const answer of ['Not now', 'Prepare delivery']) {
    const timestamp = new Date(Date.now() + 3000).toISOString(), id = `delivery-${answer}`;
    run.events.push({ ...assistant({ type: 'tool_use', id, name: 'AskUserQuestion', input: { questions: [{ header: 'Delivery', question }] } }), timestamp },
      { type: 'user', timestamp, toolUseResult: { answers: { [question]: answer } }, message: { content: [{ type: 'tool_result', tool_use_id: id, content: answer }] } });
    await run.saveEvents();
    assert.deepEqual(await run.check(), {});
    assert.equal(await readFile(receiptPath, 'utf8'), receipt);
    assert.equal(await readFile(artifactJoin(directory, 'workflow-feedback.md'), 'utf8'), report);
  }
  assert.equal(withoutFeedbackNotes(await readFile(run.result.state, 'utf8')), run.state);
});

test('an already-answered delivery question reuses earlier saved feedback instead of late retrospective repair', async t => {
  const run = await freshRun(t, 'autopilot');
  const state = (await readFile(run.result.state, 'utf8')).replace('status: In Progress', 'status: Complete').replace('phase: context-check', 'phase: complete').trimEnd() + `\n| 2 | ${new Date().toISOString()} | context-check | complete | Terminal checkpoint |\n`;
  await writeFile(run.result.state, state);
  const sessionReview = { version: 2, status: 'pending', context: ['Earlier collection reviewed the session'], findings: [], userInput: [], limitations: ['Browser unverified'], evidence_review: await sourceReview(run) };
  await writeFeedback(run.result.state, { sessionReview });
  // The earlier collection has no verifiable parent source call, as in the
  // mixed-version live session. A question alone must not bypass the guard.
  run.events.splice(3);
  await run.saveEvents();
  assert.equal((await run.check()).decision, 'block');
  const question = 'Prepare delivery for this completed run?', timestamp = new Date(Date.now() + 3000).toISOString();
  await writeFile(artifactJoin(path.dirname(run.result.state), 'DEMO-delivery-progress.json'), JSON.stringify({ version: 1, ticket: 'DEMO', status: 'offered', repos: {}, offered_at: timestamp }));
  run.events.push({ ...assistant({ type: 'tool_use', id: 'delivery-existing', name: 'AskUserQuestion', input: { questions: [{ header: 'Delivery', question }] } }), timestamp });
  await run.saveEvents();
  assert.equal((await run.check()).decision, 'block');
  const base = [...run.events], report = await readFile(artifactJoin(path.dirname(run.result.state), 'workflow-feedback.md'), 'utf8');
  for (const answer of ['Not now', 'Prepare delivery']) {
    run.events.splice(0, run.events.length, ...base, { type: 'user', timestamp, toolUseResult: { answers: { [question]: answer } }, message: { content: [{ type: 'tool_result', tool_use_id: 'delivery-existing', content: answer }] } });
    await run.saveEvents();
    assert.deepEqual(await run.check(), {});
    assert.equal(await readFile(artifactJoin(path.dirname(run.result.state), 'workflow-feedback.md'), 'utf8'), report);
  }
});

test('a failed terminal retrospective dispatch permits receipt-only fallback, including an unverified report and receipt-save failure', async (t) => {
  const run = await oneFixTerminal(t);
  run.add('Agent', 'invalid-retrospective', { prompt: run.prompt }, 'Invalid subagent argument', true);
  await run.saveEvents();
  await assert.rejects(unavailableFeedback(run.result.state, { transcriptPath: run.transcript, failureId: 'invalid-retrospective', reason: 'The dispatch input was rejected' }), /No qualifying technical failure/);
  run.add('Agent', 'failed-retrospective', { prompt: run.prompt }, 'Agent service unavailable', true);
  const reportPath = artifactJoin(path.dirname(run.result.state), 'workflow-feedback.md');
  await writeFile(reportPath, `# Incomplete earlier report\n<!-- run:${run.summary.runId} -->\n### Session review\n<!-- feedback-state:${run.summary.stateHash} -->\n<!-- /run:${run.summary.runId} -->\n`);
  await run.saveEvents();
  const options = { transcriptPath: run.transcript, failureId: 'failed-retrospective', reason: 'The retrospective service failed to start' };
  const outcome = await unavailableFeedback(run.result.state, options);
  assert.equal(outcome.receiptSaved, true); assert.equal(outcome.reportSaved, false);
  assert.equal(outcome.reportStatus, 'unverified');
  run.add('Bash', 'unavailable-1', { command: `node "${path.resolve('skills/implement/scripts/write-feedback.mjs')}" unavailable --state "${run.result.state}"` }, JSON.stringify(outcome));
  await run.saveEvents();
  const released = await startupHook({ hook_event_name: 'PreToolUse', tool_name: 'AskUserQuestion', transcript_path: run.transcript });
  assert.equal(released.hookSpecificOutput, undefined);
  assert.match(released.systemMessage, /existing report remains unverified/);
  assert.match(released.systemMessage, /Only a failure receipt was saved/);
  await rm(outcome.receiptPath);
  await mkdir(outcome.receiptPath); // Genuine local receipt-write failure.
  const unsaved = await unavailableFeedback(run.result.state, options);
  assert.equal(unsaved.receiptSaved, false); assert.equal(unsaved.receiptPath, null);
  run.events.splice(-2);
  run.add('Bash', 'unavailable-2', { command: `node "${path.resolve('skills/implement/scripts/write-feedback.mjs')}" unavailable --state "${run.result.state}"` }, JSON.stringify(unsaved));
  await run.saveEvents();
  assert.match((await run.check()).systemMessage, /receipt could not be saved either/);
  assert.equal(withoutFeedbackNotes(await readFile(run.result.state, 'utf8')), run.state);
  assert.match(await readFile(reportPath, 'utf8'), /Incomplete earlier report/);
});

test('a resumed terminal handoff is enforced without a fresh startup announcement', async (t) => {
  const run = await freshRun(t, 'autonomous');
  let state = await readFile(run.result.state, 'utf8');
  state = state.replace('status: In Progress', 'status: Complete').replace('phase: context-check', 'phase: complete');
  state = state.trimEnd() + `\n| 2 | ${new Date().toISOString()} | context-check | complete | Fixture terminal checkpoint |\n`;
  await writeFile(run.result.state, state);
  const fields = parseState(state, run.result.state).fields;
  run.events.push({ type: 'user', message: { role: 'user', content: 'Resume this implementation' } },
    assistant({ type: 'tool_use', id: 'terminal', name: 'Bash', input: { command: 'workflow.mjs apply' } }),
    { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'terminal', content: JSON.stringify({ fields, ...feedbackAction(run.result.state, fields) }) }] } });
  await run.saveEvents();
  const held = await run.check();
  assert.equal(held.decision, 'block');
  assert.match(held.reason, /feedback-on-session/);
  assert.doesNotMatch(held.reason, /dashboard link/);
});

test('all modes continue through active stages while tools remain available', async (t) => {
  for (const mode of ['guided', 'autonomous', 'autopilot']) {
    const run = await freshRun(t, mode);
    const before = await readFile(run.result.state, 'utf8');
    const held = await run.check();
    assert.equal(held.decision, 'block');
    assert.match(held.reason, /Continue Context check now/);
    assert.equal(await readFile(run.result.state, 'utf8'), before);
    assert.deepEqual(await startupHook({ hook_event_name: 'PreToolUse', transcript_path: run.transcript }), {});
    await run.apply('context-ready');
    assert.match((await run.check()).reason, /still In Progress at close-the-gaps/);
  }
});

test('saved pauses, stops and offline waits are allowed after the link', async (t) => {
  for (const event of ['pause', 'stop']) {
    const run = await freshRun(t, 'autonomous');
    await run.apply(event);
    assert.deepEqual(await run.check(), {});
  }
  const offline = await freshRun(t, 'autonomous', true);
  assert.deepEqual(await offline.check(), {});
});

test('a new user turn clears continuation and missing or invalid state cannot silently clear it', async (t) => {
  const run = await freshRun(t, 'autonomous');
  const original = await readFile(run.result.state, 'utf8');
  await writeFile(run.result.state, 'invalid state');
  assert.match((await run.check()).reason, /could not verify the saved workflow state/);
  await rm(run.result.state);
  assert.equal((await run.check()).decision, 'block');
  await writeFile(run.result.state, original);
  for (const content of ['Resume', [text('Resume')]]) {
    run.events.push({ type: 'user', message: { role: 'user', content } });
    await run.saveEvents();
    assert.deepEqual(await run.check(), {});
  }
  assert.deepEqual(await startupHook({ hook_event_name: 'Stop' }), {});
});


test('early application edits cannot be hidden by recording a same-phase stop', async (t) => {
  const run = await freshRun(t, 'autopilot');
  await writeFile(artifactJoin(run.root, 'app.js'), 'export const fallbackDays = 30;');
  const afterWrite = await startupHook({ hook_event_name: 'PostToolUse', tool_name: 'Bash', transcript_path: run.transcript });
  assert.match(afterWrite.hookSpecificOutput.additionalContext, /Application files changed/);
  await run.apply('stop');
  const held = await run.check();
  assert.equal(held.decision, 'block');
  assert.match(held.reason, /Recording Stopped.*does not complete recovery/);
  assert.equal(await readFile(artifactJoin(run.root, 'app.js'), 'utf8'), 'export const fallbackDays = 30;');
  run.events.push({ type: 'user', message: { role: 'user', content: 'Keep the edits; stop this run.' } });
  await run.saveEvents();
  assert.deepEqual(await run.check(), {});
});

test('refinement edits are detected while documentation changes are permitted', async (t) => {
  const run = await freshRun(t, 'autopilot');
  await run.apply('context-ready');
  await writeFile(artifactJoin(run.root, '.claude/rules/product.md'), '# Updated rules');
  await writeFile(artifactJoin(run.root, 'notes.md'), '# Refinement');
  await run.apply('stop');
  assert.deepEqual(await run.check(), {});
  await writeFile(artifactJoin(run.root, 'app.js'), 'export const amount = 10;');
  assert.match((await run.check()).reason, /Application files changed/);
});

test('buffered partial transcript lines and diagnostic replay events do not manufacture a new init', async (t) => {
  const root = await mkdtemp(artifactJoin(os.tmpdir(), 'startup-partial-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const transcript = artifactJoin(root, 'transcript.jsonl');
  const events = [...startup(), assistant(text(initialized.startup_message)),
    { type: 'api-request-blob', message: startup()[1].message }];
  await writeFile(transcript, events.map(JSON.stringify).join('\n') + '\n{"type":');
  assert.deepEqual(await startupHook({ hook_event_name: 'PreToolUse', transcript_path: transcript }), {});
  assert.deepEqual(await startupHook({ hook_event_name: 'Stop', transcript_path: transcript }), {});
});


test('synthetic Stop feedback cannot release a fresh-run continuation or premature-edit hold', async (t) => {
 const run = await freshRun(t, 'autopilot');
 run.events.push({ type: 'user', isSynthetic: true, message: { role: 'user', content: 'Stop hook feedback: continue.' } });
 await run.saveEvents();
 assert.match((await run.check()).reason, /Continue Context check/);
 await writeFile(artifactJoin(run.root, 'app.js'), 'premature edit');
 await run.apply('stop');
 run.events.push({ type: 'user', isSynthetic: true, message: { role: 'user', content: 'Stop hook feedback: recover the skipped stages.' } });
 await run.saveEvents();
 assert.match((await run.check()).reason, /Application files changed/);
});

async function activeAgentRun(t, phase = 'execute') {
  const run = await freshRun(t, 'autonomous');
  const epoch = Date.now() + 10;
  const state = (await readFile(run.result.state, 'utf8')).replace('phase: context-check', `phase: ${phase}`)
    .replace(/(## Audit log\n[\s\S]*?)(?=\n## |$)/, (section) => `${section.trimEnd()}\n| 2 | ${new Date(epoch).toISOString()} | context-check | ${phase} | Stage entered |\n`);
  await writeFile(run.result.state, state.replace(/^mode: none$/m, `mode: ${phase === 'lightweight' ? 'lightweight' : 'tdd'}`)
    .replace(/^mode_source: none$/m, 'mode_source: assessed').replace(/^risk: none$/m, 'risk: medium'));
  const launch = (id = 'worker', at = epoch + 1) => {
    run.events.push(assistant({ type: 'tool_use', id: `launch-${id}`, name: 'Agent' }),
      { type: 'user', timestamp: new Date(at).toISOString(), toolUseResult: { isAsync: true, status: 'async_launched', agentId: id },
        message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: `launch-${id}`, content: 'Agent launched.' }] } });
  };
  return { ...run, launch, epoch };
}

test('native task-completion envelopes close a terminal wait without clearing feedback tracking', async t => {
  const run = await activeAgentRun(t, 'review');
  let state = (await readFile(run.result.state, 'utf8')).replace('status: In Progress', 'status: Complete').replace('phase: review', 'phase: complete');
  state = state.trimEnd() + `\n| 3 | ${new Date(run.epoch + 2).toISOString()} | review | complete | Terminal checkpoint |\n`;
  await writeFile(run.result.state, state);
  run.launch('retrospective', run.epoch + 3);
  await run.saveEvents();
  assert.deepEqual(await run.check(), {});
  const notification = '<task-notification>\n<task-id>retrospective</task-id>\n<status>completed</status>\n</task-notification>';
  for (const content of [notification, [text(notification)]]) {
    const event = { type: 'user', origin: { kind: 'task-notification', producer: 'session-task' }, promptSource: 'system', turnOrigin: 'task_notification', message: { role: 'user', content } };
    const progress = startupProgress([...run.events, event]);
    assert.equal(progress.agents.length, 0);
    assert.equal(progress.feedbackRun.state, run.result.state);
    assert.ok(progress.initialized);
  }
  run.events.push({ type: 'user', origin: { kind: 'task-notification' }, promptSource: 'system', message: { role: 'user', content: notification } });
  await run.saveEvents();
  assert.equal((await run.check()).decision, 'block');
});

test('a live terminal retrospective may finish, but its handback still requires the report', async (t) => {
  const run = await activeAgentRun(t, 'review');
  let state = await readFile(run.result.state, 'utf8');
  state = state.replace('status: In Progress', 'status: Complete').replace('phase: review', 'phase: complete');
  state = state.trimEnd() + `\n| 3 | ${new Date(run.epoch + 2).toISOString()} | review | complete | Fixture terminal checkpoint |\n`;
  await writeFile(run.result.state, state);
  run.launch('earlier-review', run.epoch + 1);
  await run.saveEvents();
  assert.equal((await run.check()).decision, 'block');
  run.launch('retrospective', run.epoch + 3);
  await run.saveEvents();
  assert.deepEqual(await run.check(), {});
  run.events.push({ type: 'queue-operation', operation: 'enqueue',
    content: '<task-notification><task-id>retrospective</task-id><status>completed</status></task-notification>' });
  await run.saveEvents();
  assert.equal((await run.check()).decision, 'block');
  assert.equal(withoutFeedbackNotes(await readFile(run.result.state, 'utf8')), state);
});

test('live agents permit yielding in their active stage without completing or pausing the workflow', async (t) => {
  for (const phase of ['close-the-gaps', 'plan', 'execute', 'review', 'lightweight', 'fix-plan']) {
    const run = await activeAgentRun(t, phase);
    run.launch();
    run.events.push(assistant(text('The delegated agent is still running; waiting for its report.')));
    await run.saveEvents();
    const state = await readFile(run.result.state, 'utf8');
    assert.deepEqual(await run.check(), {});
    assert.equal(withoutFeedbackNotes(await readFile(run.result.state, 'utf8')), state);
    run.events.push({ type: 'user', isSynthetic: true, message: { role: 'user', content: 'Stop hook feedback: continue.' } });
    await run.saveEvents();
    assert.deepEqual(await run.check(), {});
  }
});

test('completion or failure notifications restore the active-stage continuation hold', async (t) => {
  for (const phase of ['close-the-gaps', 'plan', 'review']) for (const status of ['completed', 'failed', 'killed', 'cancelled', 'stopped']) {
    const run = await activeAgentRun(t, phase);
    run.launch();
    run.events.push({ type: 'queue-operation', operation: 'enqueue', content: `<task-notification>\n<task-id>worker</task-id>\n<status>${status}</status>\n</task-notification>` });
    await run.saveEvents();
    assert.equal((await run.check()).decision, 'block');
  }
});

test('runtime inventories invalidate stale agents without treating busy peers as live children', async (t) => {
  for (const status of ['completed', 'failed', 'idle', null]) {
    const run = await activeAgentRun(t);
    run.launch();
    run.events.push(assistant({ type: 'tool_use', id: 'inventory', name: 'ListAgents' }),
      { type: 'user', toolUseResult: { sections: [
        { kind: 'subagents', rows: status ? [{ id: 'worker', status }] : [] },
        { kind: 'sessions', rows: [{ id: 'worker', status: 'busy' }] },
      ] }, message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'inventory', content: 'Inventory' }] } });
    await run.saveEvents();
    assert.equal((await run.check()).decision, 'block');
  }
});

test('waiting claims, diagnostic replays, shell jobs and earlier-stage launches cannot bypass Stop', async (t) => {
  const run = await activeAgentRun(t, 'review');
  run.launch('old-worker', run.epoch - 1);
  run.events.push(assistant(text('Still waiting for a background agent.')),
    assistant({ type: 'tool_use', id: 'shell', name: 'Bash' }),
    { type: 'user', toolUseResult: { isAsync: true, status: 'async_launched', agentId: 'shell-job' },
      message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'shell', content: 'background shell' }] } },
    { type: 'api-request-blob', toolUseResult: { isAsync: true, status: 'async_launched', agentId: 'replay' },
      message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'launch-old-worker', content: 'diagnostic' }] } });
  await run.saveEvents();
  assert.equal((await run.check()).decision, 'block');
});

test('agent waits never release missing-link or premature-implementation protection', async (t) => {
  const run = await freshRun(t, 'autopilot');
  const launch = [assistant({ type: 'tool_use', id: 'launch', name: 'Agent' }),
    { type: 'user', timestamp: new Date().toISOString(), toolUseResult: { isAsync: true, status: 'async_launched', agentId: 'worker' },
      message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'launch', content: 'Launched' }] } }];
  run.events.splice(2, 1); // remove the announcement
  run.events.push(...launch);
  await run.saveEvents();
  assert.match((await run.check()).reason, /ASSISTANT CHAT MESSAGE/);
  run.events.push(assistant(text(run.result.startup_message)));
  await writeFile(artifactJoin(run.root, 'app.js'), 'premature edit');
  await run.saveEvents();
  assert.match((await run.check()).reason, /Application files changed/);
});

test('one completed child does not close another live wait, and TaskOutput closes the last child', async (t) => {
  const run = await activeAgentRun(t);
  run.launch('first');
  run.launch('second');
  run.events.push({ type: 'queue-operation', operation: 'enqueue', content: '<task-notification>\n<task-id>first</task-id>\n<status>completed</status>\n</task-notification>' });
  await run.saveEvents();
  assert.deepEqual(await run.check(), {});
  run.events.push(assistant({ type: 'tool_use', id: 'output', name: 'TaskOutput' }),
    { type: 'user', toolUseResult: { task: { task_id: 'second', status: 'completed' } },
      message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'output', content: 'Done' }] } });
  await run.saveEvents();
  assert.equal((await run.check()).decision, 'block');
});


test('hook decisions persist deduplicated observations and record a later release without rewriting state', async (t) => {
  const run = await activeAgentRun(t);
  const state = await readFile(run.result.state, 'utf8');
  await run.check(); await run.check();
  let events = await readHookEvents(run.result.state);
  assert.equal(events.length, 1); assert.equal(events[0].kind, 'active-stage');
  run.launch(); await run.saveEvents();
  assert.deepEqual(await run.check(), {});
  events = await readHookEvents(run.result.state);
  assert.equal(events.length, 2); assert.equal(events[1].kind, 'agent-wait');
  run.events.push({ type: 'queue-operation', operation: 'enqueue', content: '<task-notification>\n<task-id>worker</task-id>\n<status>completed</status>\n</task-notification>' });
  run.events.push(assistant(text('The agent finished; processing the hand-back.'))); await run.saveEvents();
  assert.equal((await run.check()).decision, 'block');
  assert.equal(withoutFeedbackNotes(await readFile(run.result.state, 'utf8')), state);
  const paused = state.replace('status: In Progress', 'status: Paused');
  await writeFile(run.result.state, paused);
  assert.deepEqual(await run.check(), {});
  events = await readHookEvents(run.result.state);
  assert.equal(events.at(-1).kind, 'clear');
  assert.equal(await readFile(run.result.state, 'utf8'), paused)
});

test('journal write failures are visible without releasing enforcement or blocking an otherwise valid yield', async (t) => {
  const run = await activeAgentRun(t);
  await mkdir(artifactJoin(path.dirname(run.result.state), 'hook-events.jsonl'));
  const blocked = await run.check();
  assert.equal(blocked.decision, 'block'); assert.match(blocked.systemMessage, /could not be recorded/);
  run.launch(); await run.saveEvents();
  const allowed = await run.check();
  assert.equal(allowed.decision, undefined); assert.match(allowed.systemMessage, /could not be recorded/);
});

test('Stop confirms runtime assistant text before the transcript flushes and subsequent tools use its receipt', async (t) => {
  const run = await freshRun(t, 'autonomous');
  run.events.splice(2, 1);
  await run.saveEvents();
  const before = await readFile(run.transcript, 'utf8');
  const input = { hook_event_name: 'Stop', transcript_path: run.transcript, session_id: 'runtime-session', last_assistant_message: run.result.startup_message };
  const stop = await startupHook(input);
  assert.equal(stop.decision, 'block');
  assert.match(stop.reason, /Continue Context check now/);
  assert.doesNotMatch(stop.reason, /still needs an ASSISTANT/);
  assert.equal(await readFile(run.transcript, 'utf8'), before);
  assert.deepEqual(await startupHook({ hook_event_name: 'PreToolUse', transcript_path: run.transcript, session_id: 'runtime-session' }), {});
  assert.deepEqual(await readHookEvents(run.result.state), []); // expected internal boundary, not an interruption
  const receipt = await readFile(artifactJoin(path.dirname(run.result.state), 'startup-confirmation.json'), 'utf8');
  assert.doesNotMatch(receipt, /Open implementation dashboard|runtime-session|DEMO-status|\/Users\/|\/tmp\//);
});

test('runtime text is not confirmation on tool hooks, and a code sample cannot confirm Stop', async (t) => {
  const run = await freshRun(t, 'autonomous'); run.events.splice(2, 1); await run.saveEvents();
  const input = { transcript_path: run.transcript, last_assistant_message: run.result.startup_message };
  const tool = await startupHook({ ...input, hook_event_name: 'PostToolUse' });
  assert.match(tool.hookSpecificOutput.additionalContext, /ASSISTANT CHAT MESSAGE/);
  const stop = await startupHook({ ...input, hook_event_name: 'Stop', last_assistant_message: `\`\`\`markdown\n${run.result.startup_message}\n\`\`\`` });
  assert.match(stop.reason, /ASSISTANT CHAT MESSAGE/);
  await assert.rejects(readFile(artifactJoin(path.dirname(run.result.state), 'startup-confirmation.json')), { code: 'ENOENT' });
});

test('a confirmation receipt cannot cross sessions, initializations, runs or dashboard targets', async (t) => {
  const run = await freshRun(t, 'autonomous'); run.events.splice(2, 1); await run.saveEvents();
  const input = { hook_event_name: 'Stop', transcript_path: run.transcript, session_id: 'first', last_assistant_message: run.result.startup_message };
  await startupHook(input);
  const check = (session_id = 'first') => startupHook({ hook_event_name: 'PostToolUse', transcript_path: run.transcript, session_id });
  assert.deepEqual(await check(), {});
  assert.match((await check('other')).hookSpecificOutput.additionalContext, /ASSISTANT CHAT MESSAGE/);
  const receiptPath = artifactJoin(path.dirname(run.result.state), 'startup-confirmation.json');
  const original = await readFile(receiptPath, 'utf8');
  for (const key of ['runId', 'initializationHash', 'dashboardHash']) {
    const modified = JSON.parse(original); modified[key] = 'stale'; await writeFile(receiptPath, JSON.stringify(modified));
    assert.match((await check()).hookSpecificOutput.additionalContext, /ASSISTANT CHAT MESSAGE/);
  }
  await writeFile(receiptPath, '{partial');
  assert.match((await check()).hookSpecificOutput.additionalContext, /ASSISTANT CHAT MESSAGE/);
  await startupHook(input); // actual Stop evidence repairs a malformed regular-file receipt
  assert.deepEqual(await check(), {});
});

test('runtime announcement confirmation preserves premature-edit and stage-continuation guards', async (t) => {
  const run = await freshRun(t, 'autopilot'); run.events.splice(2, 1); await run.saveEvents();
  await writeFile(artifactJoin(run.root, 'app.js'), 'premature implementation');
  const held = await startupHook({ hook_event_name: 'Stop', transcript_path: run.transcript, last_assistant_message: run.result.startup_message });
  assert.equal(held.decision, 'block'); assert.match(held.reason, /Application files changed/);
  assert.equal((await readHookEvents(run.result.state))[0].kind, 'premature-implementation');
});


test('receipt write failure is visible while runtime confirmation still requires stage continuation', async (t) => {
  const run = await freshRun(t, 'autonomous'); run.events.splice(2, 1); await run.saveEvents();
  await mkdir(artifactJoin(path.dirname(run.result.state), 'startup-confirmation.json'));
  const result = await startupHook({ hook_event_name: 'Stop', transcript_path: run.transcript, last_assistant_message: run.result.startup_message });
  assert.equal(result.decision, 'block'); assert.match(result.reason, /Continue Context check now/);
  assert.match(result.systemMessage, /receipt could not be saved/);
});

test('authorized Plan test edits remove only the premature-edit hold; active-stage and production guards remain', async (t) => {
  const run = await freshRun(t, 'autopilot');
  const spec = 'make-it-work/DEMO/DEMO-spec.md';
  await writeFile(artifactJoin(run.root, spec), '# accepted spec\n');
  await writeFile(run.result.state, (await readFile(run.result.state, 'utf8')).replace(/^test_writing_version: 1\n/m, '').replace('phase: context-check', 'phase: plan').replace('mode: none', 'mode: tdd').replace('mode_source: none', 'mode_source: assessed').replace('risk: none', 'risk: medium').replace('risk_rationale: none', 'risk_rationale: caller change').replace('spec: none', `spec: ${spec}`).replace('spec_hash: none', `spec_hash: ${digest('# accepted spec\n')}`));
  await mkdir(artifactJoin(run.root, 'test'));
  await writeFile(artifactJoin(run.root, 'make-it-work/DEMO/DEMO-plan.md'), '# Plan\n\n## Steps\n\n### Step 1 — Feature\n\n**Tests:** app: `test/policy.test.js`, node --test, progression pending\n');
  const readiness = await testingReadiness(run.result.state, 'begin');
  await writeFile(artifactJoin(run.root, readiness.report), '# Readiness\n\n## Verification Policy\n\n| Repo | Mode | Decision | Reason |\n| --- | --- | --- | --- |\n| app | automated | configured | Existing Node runner |\n\n## Readiness results\n\n| Repo | Status | Setup | Baseline | Evidence |\n| --- | --- | --- | --- | --- |\n| app | ready | existing | not-run | Hook-only fixture; baseline not requested |\n');
  await testingReadiness(run.result.state, 'complete');
  await authorizePlanningTests(run.result.state, { repo: run.root, file: 'test/policy.test.js', kind: 'test-file', step: 1, reason: 'Progression assertion' });
  await writeFile(artifactJoin(run.root, 'test/policy.test.js'), '// planned red test\n');
  const after = await startupHook({ hook_event_name: 'PostToolUse', tool_name: 'Write', transcript_path: run.transcript });
  assert.deepEqual(after, {});
  assert.match((await run.check()).reason, /still In Progress at plan/);
  assert.equal((await readHookEvents(run.result.state)).some((event) => event.kind === 'premature-implementation'), false);
  await writeFile(artifactJoin(run.root, 'app.js'), '// unauthorized production change\n');
  assert.match((await run.check()).reason, /Application files changed/);
});

test('Plan waits exclude prior phase/Plan-cycle agents and resume the hold when the current delegate finishes', async (t) => {
  const run = await activeAgentRun(t, 'plan');
  run.launch('prior-phase', run.epoch - 1);
  await run.saveEvents();
  assert.match((await run.check()).reason, /still In Progress at plan/);
  run.launch('first-plan'); await run.saveEvents();
  assert.equal((await run.check()).decision, undefined);
  const next = run.epoch + 1000;
  await writeFile(run.result.state, (await readFile(run.result.state, 'utf8')).trimEnd() + `\n| 3 | ${new Date(next).toISOString()} | execute | plan | New Plan entry |\n`);
  await run.saveEvents();
  assert.match((await run.check()).reason, /still In Progress at plan/);
  run.launch('current-plan', next + 1); await run.saveEvents();
  assert.equal((await run.check()).decision, undefined);
  run.events.push({ type: 'queue-operation', operation: 'enqueue', content: '<task-notification>\n<task-id>current-plan</task-id>\n<status>completed</status>\n</task-notification>' });
  await run.saveEvents();
  assert.match((await run.check()).reason, /still In Progress at plan/);
});

test('Plan waits require runtime proof and never hide production edits or release other phases', async (t) => {
  const plan = await activeAgentRun(t, 'plan');
  plan.events.push(assistant(text('A planning agent is still running.'))); await plan.saveEvents();
  assert.match((await plan.check()).reason, /still In Progress at plan/);
  plan.launch(); await plan.saveEvents();
  assert.equal((await plan.check()).decision, undefined);
  await writeFile(artifactJoin(plan.root, 'app.js'), '// unauthorized production change\n');
  assert.match((await plan.check()).reason, /Application files changed/);
  for (const phase of ['context-check', 'spec-approval', 'plan-approval', 'final-sync']) {
    const run = await activeAgentRun(t, phase); run.launch(); await run.saveEvents();
    assert.equal((await run.check()).decision, 'block');
  }
});

test('readiness cannot be completed with a live Plan delegate, while waiting remains allowed', async (t) => {
  const run = await activeAgentRun(t, 'plan'); run.launch(); await run.saveEvents();
  const input = { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'node "/plugin/scripts/testing-readiness.mjs" complete --state STATE' }, transcript_path: run.transcript };
  assert.equal((await startupHook(input)).hookSpecificOutput.permissionDecision, 'deny');
  assert.equal((await startupHook({ ...input, tool_input: { command: 'node /plugin/scripts/testing-readiness.mjs begin --state STATE' } })).hookSpecificOutput.permissionDecision, 'deny');
  assert.equal((await run.check()).decision, undefined);
  assert.deepEqual(await startupHook({ ...input, tool_input: { command: 'git status --short' } }), {});
  run.events.push({ type: 'queue-operation', operation: 'enqueue', content: '<task-notification>\n<task-id>worker</task-id>\n<status>completed</status>\n</task-notification>' });
  await run.saveEvents();
  assert.equal((await startupHook(input)).hookSpecificOutput?.permissionDecision, undefined);
  assert.match((await run.check()).reason, /still In Progress at plan/);
  assert.ok((await readHookEvents(run.result.state)).some((row) => row.kind === 'readiness-pending'));
  const saved = await readFile(run.result.state, 'utf8');
  await writeFile(run.result.state, 'invalid state');
  assert.match((await startupHook(input)).hookSpecificOutput.additionalContext, /could not verify/);
  await writeFile(run.result.state, saved);
});

test('a resumed run tracks the terminal delegate even when completion output is projected', () => {
  const events = [...startup(), assistant(text(initialized.startup_message)),
    { type: 'user', message: { role: 'user', content: 'Continue to review without manual checks' } },
    assistant({ type: 'tool_use', id: 'done', name: 'Bash', input: { command: 'workflow.mjs apply | head' } }),
    { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'done', content: 'complete Complete {truncated' }] } },
    assistant({ type: 'tool_use', id: 'retro', name: 'Agent', input: { prompt: 'Retrospective' } }),
    { type: 'user', timestamp: '2026-11-12T11:21:13Z', toolUseResult: { isAsync: true, status: 'async_launched', agentId: 'retro-agent' },
      message: { content: [{ type: 'tool_result', tool_use_id: 'retro', content: 'Launched' }] } }];
  const progress = startupProgress(events);
  assert.equal(progress.initialized, null);
  assert.equal(progress.terminalFeedback, null);
  assert.equal(progress.agents[0].id, 'retro-agent');
});

test('refinement waits require a live current-stage child and never hide application edits', async t => {
  const run = await activeAgentRun(t, 'close-the-gaps');
  run.events.push(assistant(text('Waiting for the survey.'))); await run.saveEvents();
  assert.equal((await run.check()).decision, 'block');
  run.launch('old-survey', run.epoch - 1); await run.saveEvents();
  assert.equal((await run.check()).decision, 'block');
  run.launch('current-survey'); await run.saveEvents();
  assert.deepEqual(await run.check(), {});
  await writeFile(artifactJoin(run.root, 'app.js'), '// premature edit');
  assert.match((await run.check()).reason, /Application files changed/);
});

function launchBackground(run, tool = 'Bash', result = { backgroundTaskId: 'baseline' }, at = run.epoch + 1) {
  run.events.push(assistant({ type: 'tool_use', id: `bg-${tool}`, name: tool }),
    { type: 'user', timestamp: new Date(at).toISOString(), toolUseResult: result,
      message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: `bg-${tool}`, content: 'Started' }] } });
}

test('native Bash and finite Monitor waits preserve workflow and restore enforcement on terminal events', async t => {
  for (const tool of ['Bash', 'Monitor']) {
    const run = await activeAgentRun(t, 'plan');
    launchBackground(run, tool, tool === 'Bash' ? { backgroundTaskId: 'baseline' } : { taskId: 'baseline', timeoutMs: 60000 });
    await run.saveEvents();
    const before = await readFile(run.result.state, 'utf8');
    assert.deepEqual(await run.check(), {});
    assert.equal(await readFile(run.result.state, 'utf8'), before);
    assert.equal((await readHookEvents(run.result.state)).at(-1).kind, 'task-wait');
    for (const status of ['completed', 'failed', 'killed', 'cancelled', 'stopped']) {
      const notification = { type: 'system', subtype: 'task_notification', task_id: 'baseline', status };
      assert.equal(startupProgress([...run.events, notification]).tasks.length, 0);
    }
    run.events.push({ type: 'queue-operation', operation: 'enqueue', content: '<task-notification><task-id>baseline</task-id><status>completed</status></task-notification>' });
    await run.saveEvents();
    assert.equal((await run.check()).decision, 'block');
  }
});

test('background wait rejects stale, expired, turn-bound and persistent work', async t => {
  for (const [tool, output, old] of [
    ['Bash', { backgroundTaskId: 'old' }, true],
    ['Bash', { backgroundTaskId: 'interrupted', interrupted: true }],
    ['Bash', { backgroundTaskId: 'turn-bound', backgroundEndsWithFinalResponse: true }],
    ['Monitor', { taskId: 'persistent', timeoutMs: 60000, persistent: true }],
    ['Monitor', { taskId: 'unbounded' }],
    ['Monitor', { taskId: 'expired', timeoutMs: 1 }],
  ]) {
    const run = await activeAgentRun(t, 'plan');
    launchBackground(run, tool, output, output.taskId === 'expired' ? Date.now() - 60000 : old ? run.epoch - 1 : run.epoch + 1);
    if (output.taskId === 'expired') assert.equal(startupProgress(run.events).tasks.length, 0);
    await run.saveEvents();
    assert.equal((await run.check()).decision, 'block');
  }
});

test('background tasks cannot bypass premature edits or readiness completion and cancellation closes only its task', async t => {
  const run = await activeAgentRun(t, 'plan');
  launchBackground(run);
  launchBackground(run, 'Monitor', { taskId: 'watch', timeoutMs: 60000 });
  await run.saveEvents();
  const denied = await startupHook({ hook_event_name: 'PreToolUse', transcript_path: run.transcript, tool_name: 'Bash', tool_input: { command: `node testing-readiness.mjs complete --state "${run.result.state}"` } });
  assert.equal(denied.hookSpecificOutput.permissionDecision, 'deny');
  run.events.push(assistant({ type: 'tool_use', id: 'stop-watch', name: 'TaskStop' }),
    { type: 'user', toolUseResult: { task_id: 'watch' }, message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'stop-watch', content: 'Stopped' }] } });
  assert.deepEqual(startupProgress(run.events).tasks.map(task => task.id), ['baseline']);
  await writeFile(artifactJoin(run.root, 'app.js'), 'premature production edit');
  await run.saveEvents();
  assert.match((await run.check()).reason, /Application files changed/);
});


test('runtime task inventories and status updates invalidate launches without accepting unrelated work', async t => {
  const run = await activeAgentRun(t, 'plan');
  launchBackground(run);
  for (const event of [
    { type: 'system', subtype: 'background_tasks_changed', tasks: [] },
    { type: 'system', subtype: 'background_tasks_changed', tasks: [{ task_id: 'baseline', ambient: true }] },
    { type: 'system', subtype: 'task_updated', task_id: 'baseline', patch: { status: 'failed' } },
  ]) assert.equal(startupProgress([...run.events, event]).tasks.length, 0);
  assert.deepEqual(startupProgress([...run.events, { type: 'system', subtype: 'background_tasks_changed', tasks: [{ task_id: 'baseline' }, { task_id: 'unrelated' }] }]).tasks.map(task => task.id), ['baseline']);
});


test('older headless Bash waits require a Monitor wake-up source', async t => {
  const run = await activeAgentRun(t, 'plan');
  launchBackground(run);
  Object.assign(run.events.at(-1), { entrypoint: 'sdk-cli', version: '2.1.267' });
  await run.saveEvents();
  assert.match((await run.check()).reason, /finite Monitor/);
  launchBackground(run, 'Monitor', { taskId: 'wake', timeoutMs: 60000 });
  await run.saveEvents();
  assert.deepEqual(await run.check(), {});
});

test('a successful native resume of this phase child restores quiet waiting, not completion', async t => {
  const run = await activeAgentRun(t, 'close-the-gaps'); run.launch();
  run.events.push({ type: 'queue-operation', operation: 'enqueue', content: '<task-notification><task-id>worker</task-id><status>completed</status></task-notification>' });
  run.events.push(assistant({ type: 'tool_use', id: 'resume-worker', name: 'SendMessage', input: { to: 'worker', message: 'Continue with the recorded reply.' } }),
    { type: 'user', timestamp: new Date(run.epoch + 3).toISOString(), toolUseResult: { success: true, resumedAgentId: 'worker' },
      message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'resume-worker', content: 'Resuming worker.' }] } });
  await run.saveEvents(); assert.deepEqual(await run.check(), {});
  assert.equal(startupProgress(run.events).agents[0].launchedAt, run.epoch + 1);
  run.events.push({ type: 'system', subtype: 'task_notification', task_id: 'worker', status: 'completed' });
  await run.saveEvents(); assert.equal((await run.check()).decision, 'block');
  run.events.push(run.events.find(event => event.toolUseResult?.resumedAgentId === 'worker'));
  await run.saveEvents(); assert.equal((await run.check()).decision, 'block', 'A replayed old resume receipt cannot resurrect completed work.');
});

test('resume claims, failed sends, unknown peers and earlier-stage agents cannot release Stop', async t => {
  for (const kind of ['text-only', 'failed', 'unknown', 'wrong-target', 'old-stage', 'synthetic']) {
    const run = await activeAgentRun(t, 'plan');
    if (kind !== 'unknown') run.launch('worker', kind === 'old-stage' ? run.epoch - 1 : run.epoch + 1);
    run.events.push({ type: 'system', subtype: 'task_notification', task_id: 'worker', status: 'completed' });
    run.events.push(assistant({ type: 'tool_use', id: 'resume', name: 'SendMessage', input: { to: kind === 'wrong-target' ? 'peer' : 'worker' } }),
      { type: 'user', timestamp: new Date(run.epoch + 3).toISOString(), ...(kind === 'synthetic' ? { isSynthetic: true } : {}),
        ...(kind === 'text-only' ? {} : { toolUseResult: { success: true, resumedAgentId: 'worker' } }),
        message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'resume', is_error: kind === 'failed', content: '{"success":true,"resumedAgentId":"worker"}' }] } });
    await run.saveEvents(); assert.equal((await run.check()).decision, 'block', kind);
  }
});
