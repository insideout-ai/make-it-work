import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { initializeWorkflow, applyWorkflow } from './workflow.mjs';
import { digest } from '../../../scripts/lib/artifacts.mjs';
import { pendingStartup, startupHook } from './startup-presentation.mjs';

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
