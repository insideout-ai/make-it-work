import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
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

test('post-init reminder, tool hold and terminal hold clear only after the chat link appears', async (t) => {
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
  await new Promise((resolve) => setTimeout(resolve, 50));
  await writeFile(transcript, [...events, assistant(text(initialized.startup_message))].map(JSON.stringify).join('\n') + '\n');
  assert.deepEqual(await checking, {});
});
