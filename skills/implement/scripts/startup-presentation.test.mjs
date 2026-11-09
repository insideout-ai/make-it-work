import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { initializeWorkflow, applyWorkflow } from './workflow.mjs';
import { digest } from '../../../scripts/lib/artifacts.mjs';
import { pendingStartup, startupHook } from './startup-presentation.mjs';
import { testingReadiness } from './testing-readiness.mjs';
import { authorizePlanningTests } from './planning-tests.mjs';
import { readHookEvents } from './hook-feedback.mjs';

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
  const root = await mkdtemp(path.join(os.tmpdir(), 'startup-presentation-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const transcript = path.join(root, 'transcript.jsonl');
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
  const root = await mkdtemp(path.join(os.tmpdir(), 'startup-flush-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const transcript = path.join(root, 'transcript.jsonl');
  const events = startup();
  await writeFile(transcript, events.map(JSON.stringify).join('\n') + '\n');
  const checking = startupHook({ hook_event_name: 'PreToolUse', transcript_path: transcript });
  await new Promise((resolve) => setTimeout(resolve, 1800));
  await writeFile(transcript, [...events, assistant(text(initialized.startup_message))].map(JSON.stringify).join('\n') + '\n');
  assert.deepEqual(await checking, {});
  assert.deepEqual(await startupHook({ hook_event_name: 'Stop', transcript_path: transcript }), {});
});

async function freshRun(t, autonomy, offline = false) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'startup-continuation-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
  git('init', '-q', '-b', 'main');
  git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'Baseline', '--allow-empty');
  git('switch', '-qc', 'feature');
  await mkdir(path.join(root, '.claude/rules'), { recursive: true });
  await mkdir(path.join(root, '.claude/skills/domain-demo'), { recursive: true });
  await writeFile(path.join(root, 'CLAUDE.md'), '# Skill Loading Gate\n');
  await writeFile(path.join(root, '.claude/rules/product.md'), '# Product\n');
  await writeFile(path.join(root, '.claude/rules/architecture.md'), '# Architecture\n');
  await writeFile(path.join(root, '.claude/skills/domain-demo/SKILL.md'), '---\nname: domain-demo\n---\n');
  const result = await initializeWorkflow(root, { ticket: 'DEMO', autonomy, base: 'main', repos: [root], branch_guard: 'Existing feature branch', offline_pending: offline });
  const initialized = { ...result, continuation: offline ? 'wait_for_offline_answers' : 'continue_context_check_without_user_reply' };
  const events = [assistant({ type: 'tool_use', id: 'init', name: 'Bash' }),
    { type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'init', content: JSON.stringify(initialized) }] } },
    assistant(text(result.startup_message + '\nSend another message to continue.'))];
  const transcript = path.join(root, 'make-it-work/transcript.jsonl');
  const saveEvents = () => writeFile(transcript, events.map(JSON.stringify).join('\n') + '\n');
  await saveEvents();
  const check = () => startupHook({ hook_event_name: 'Stop', transcript_path: transcript });
  let id = 0;
  const apply = async (event) => applyWorkflow({ root, statePath: result.state, input: { id: `event-${++id}`, event, repos: [root], reason: 'Recorded checkpoint', expected_hash: digest(await readFile(result.state, 'utf8')) } });
  return { root, result, events, transcript, saveEvents, check, apply };
}

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
  await writeFile(path.join(run.root, 'app.js'), 'export const fallbackDays = 30;');
  const afterWrite = await startupHook({ hook_event_name: 'PostToolUse', tool_name: 'Bash', transcript_path: run.transcript });
  assert.match(afterWrite.hookSpecificOutput.additionalContext, /Application files changed/);
  await run.apply('stop');
  const held = await run.check();
  assert.equal(held.decision, 'block');
  assert.match(held.reason, /Recording Stopped.*does not complete recovery/);
  assert.equal(await readFile(path.join(run.root, 'app.js'), 'utf8'), 'export const fallbackDays = 30;');
  run.events.push({ type: 'user', message: { role: 'user', content: 'Keep the edits; stop this run.' } });
  await run.saveEvents();
  assert.deepEqual(await run.check(), {});
});

test('refinement edits are detected while documentation changes are permitted', async (t) => {
  const run = await freshRun(t, 'autopilot');
  await run.apply('context-ready');
  await writeFile(path.join(run.root, '.claude/rules/product.md'), '# Updated rules');
  await writeFile(path.join(run.root, 'notes.md'), '# Refinement');
  await run.apply('stop');
  assert.deepEqual(await run.check(), {});
  await writeFile(path.join(run.root, 'app.js'), 'export const amount = 10;');
  assert.match((await run.check()).reason, /Application files changed/);
});

test('buffered partial transcript lines and diagnostic replay events do not manufacture a new init', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'startup-partial-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const transcript = path.join(root, 'transcript.jsonl');
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
 await writeFile(path.join(run.root, 'app.js'), 'premature edit');
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

test('live agents permit yielding in their active stage without completing or pausing the workflow', async (t) => {
  for (const phase of ['plan', 'execute', 'review', 'lightweight', 'fix-plan']) {
    const run = await activeAgentRun(t, phase);
    run.launch();
    run.events.push(assistant(text('The delegated agent is still running; waiting for its report.')));
    await run.saveEvents();
    const state = await readFile(run.result.state, 'utf8');
    assert.deepEqual(await run.check(), {});
    assert.equal(await readFile(run.result.state, 'utf8'), state);
    run.events.push({ type: 'user', isSynthetic: true, message: { role: 'user', content: 'Stop hook feedback: continue.' } });
    await run.saveEvents();
    assert.deepEqual(await run.check(), {});
  }
});

test('completion or failure notifications restore the active-stage continuation hold', async (t) => {
  for (const phase of ['plan', 'review']) for (const status of ['completed', 'failed', 'killed', 'cancelled', 'stopped']) {
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
  await writeFile(path.join(run.root, 'app.js'), 'premature edit');
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
  assert.equal(await readFile(run.result.state, 'utf8'), state);
  const paused = state.replace('status: In Progress', 'status: Paused');
  await writeFile(run.result.state, paused);
  assert.deepEqual(await run.check(), {});
  events = await readHookEvents(run.result.state);
  assert.equal(events.at(-1).kind, 'clear');
  assert.equal(await readFile(run.result.state, 'utf8'), paused)
});

test('journal write failures are visible without releasing enforcement or blocking an otherwise valid yield', async (t) => {
  const run = await activeAgentRun(t);
  await mkdir(path.join(path.dirname(run.result.state), 'hook-events.jsonl'));
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
  const receipt = await readFile(path.join(path.dirname(run.result.state), 'startup-confirmation.json'), 'utf8');
  assert.doesNotMatch(receipt, /Open implementation dashboard|runtime-session|DEMO-status|\/Users\/|\/tmp\//);
});

test('runtime text is not confirmation on tool hooks, and a code sample cannot confirm Stop', async (t) => {
  const run = await freshRun(t, 'autonomous'); run.events.splice(2, 1); await run.saveEvents();
  const input = { transcript_path: run.transcript, last_assistant_message: run.result.startup_message };
  const tool = await startupHook({ ...input, hook_event_name: 'PostToolUse' });
  assert.match(tool.hookSpecificOutput.additionalContext, /ASSISTANT CHAT MESSAGE/);
  const stop = await startupHook({ ...input, hook_event_name: 'Stop', last_assistant_message: `\`\`\`markdown\n${run.result.startup_message}\n\`\`\`` });
  assert.match(stop.reason, /ASSISTANT CHAT MESSAGE/);
  await assert.rejects(readFile(path.join(path.dirname(run.result.state), 'startup-confirmation.json')), { code: 'ENOENT' });
});

test('a confirmation receipt cannot cross sessions, initializations, runs or dashboard targets', async (t) => {
  const run = await freshRun(t, 'autonomous'); run.events.splice(2, 1); await run.saveEvents();
  const input = { hook_event_name: 'Stop', transcript_path: run.transcript, session_id: 'first', last_assistant_message: run.result.startup_message };
  await startupHook(input);
  const check = (session_id = 'first') => startupHook({ hook_event_name: 'PostToolUse', transcript_path: run.transcript, session_id });
  assert.deepEqual(await check(), {});
  assert.match((await check('other')).hookSpecificOutput.additionalContext, /ASSISTANT CHAT MESSAGE/);
  const receiptPath = path.join(path.dirname(run.result.state), 'startup-confirmation.json');
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
  await writeFile(path.join(run.root, 'app.js'), 'premature implementation');
  const held = await startupHook({ hook_event_name: 'Stop', transcript_path: run.transcript, last_assistant_message: run.result.startup_message });
  assert.equal(held.decision, 'block'); assert.match(held.reason, /Application files changed/);
  assert.equal((await readHookEvents(run.result.state))[0].kind, 'premature-implementation');
});


test('receipt write failure is visible while runtime confirmation still requires stage continuation', async (t) => {
  const run = await freshRun(t, 'autonomous'); run.events.splice(2, 1); await run.saveEvents();
  await mkdir(path.join(path.dirname(run.result.state), 'startup-confirmation.json'));
  const result = await startupHook({ hook_event_name: 'Stop', transcript_path: run.transcript, last_assistant_message: run.result.startup_message });
  assert.equal(result.decision, 'block'); assert.match(result.reason, /Continue Context check now/);
  assert.match(result.systemMessage, /receipt could not be saved/);
});

test('authorized Plan test edits remove only the premature-edit hold; active-stage and production guards remain', async (t) => {
  const run = await freshRun(t, 'autopilot');
  const spec = 'make-it-work/DEMO/DEMO-spec.md';
  await writeFile(path.join(run.root, spec), '# accepted spec\n');
  await writeFile(run.result.state, (await readFile(run.result.state, 'utf8')).replace('phase: context-check', 'phase: plan').replace('mode: none', 'mode: tdd').replace('mode_source: none', 'mode_source: assessed').replace('risk: none', 'risk: medium').replace('risk_rationale: none', 'risk_rationale: caller change').replace('spec: none', `spec: ${spec}`).replace('spec_hash: none', `spec_hash: ${digest('# accepted spec\n')}`));
  await mkdir(path.join(run.root, 'test'));
  await writeFile(path.join(run.root, 'make-it-work/DEMO/DEMO-plan.md'), '# Plan\n\n## Steps\n\n### Step 1 — Feature\n\n**Tests:** app: `test/policy.test.js`, node --test, progression pending\n');
  const readiness = await testingReadiness(run.result.state, 'begin');
  await writeFile(path.join(run.root, readiness.report), '# Readiness\n\n## Verification Policy\n\n| Repo | Mode | Decision | Reason |\n| --- | --- | --- | --- |\n| app | automated | configured | Existing Node runner |\n\n## Readiness results\n\n| Repo | Status | Setup | Baseline | Evidence |\n| --- | --- | --- | --- | --- |\n| app | ready | existing | not-run | Hook-only fixture; baseline not requested |\n');
  await testingReadiness(run.result.state, 'complete');
  await authorizePlanningTests(run.result.state, { repo: run.root, file: 'test/policy.test.js', kind: 'test-file', step: 1, reason: 'Progression assertion' });
  await writeFile(path.join(run.root, 'test/policy.test.js'), '// planned red test\n');
  const after = await startupHook({ hook_event_name: 'PostToolUse', tool_name: 'Write', transcript_path: run.transcript });
  assert.deepEqual(after, {});
  assert.match((await run.check()).reason, /still In Progress at plan/);
  assert.equal((await readHookEvents(run.result.state)).some((event) => event.kind === 'premature-implementation'), false);
  await writeFile(path.join(run.root, 'app.js'), '// unauthorized production change\n');
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
  await writeFile(path.join(plan.root, 'app.js'), '// unauthorized production change\n');
  assert.match((await plan.check()).reason, /Application files changed/);
  for (const phase of ['context-check', 'close-the-gaps', 'spec-approval', 'plan-approval', 'final-sync']) {
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
