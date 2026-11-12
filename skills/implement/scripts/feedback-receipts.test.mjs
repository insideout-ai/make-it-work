import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { readFeedbackReceipts, recordFeedbackReceipt } from './feedback-receipts.mjs';
import { feedbackRuntimeEvidence } from './feedback-handoff.mjs';
import { parseState } from './render-status.mjs';
import { inspectFeedback, writeFeedback } from './write-feedback.mjs';

const script = path.resolve('skills/implement/scripts/write-feedback.mjs');
const reference = path.resolve('skills/implement/references/feedback.md');
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'feedback-receipts-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const dir = path.join(root, 'make-it-work/DEMO'); await mkdir(dir, { recursive: true });
  const statePath = path.join(dir, 'DEMO-state.md');
  const markdown = (await readFile('evals/implement/feedback-clean/fixture/fixture-artifacts/DEMO-state.md', 'utf8')).replace('status: In Progress', 'status: Complete').replace('phase: final-sync', 'phase: complete\nfeedback_evidence_version: 1').trimEnd() + '\n| 7 | 2026-01-01T10:06:00Z | final-sync | complete | Context synchronized |\n';
  await writeFile(statePath, markdown);
  await writeFile(path.join(dir, 'DEMO-status.html'), '<html>\n<style>body{margin:1em}</style>\n<h1>Complete</h1>\n</html>');
  return { root, dir, statePath, state: parseState(markdown) };
}

test('inspection and evidence receipts survive output piping; output files stay beside the state', async t => {
  const f = await fixture(t);
  const inspect = spawnSync(`node '${script}' inspect --state '${f.statePath}' | head -c 1`, { shell: true, encoding: 'utf8' });
  assert.equal(inspect.status, 0, inspect.stderr);
  const summary = await inspectFeedback(f.statePath);
  assert.equal((await readFeedbackReceipts(f.statePath, summary)).analysisRequired, false);
  const output = path.join(f.dir, 'feedback-evidence.txt');
  const result = spawnSync(process.execPath, [script, 'evidence', '--state', f.statePath, '--output', output], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const receipt = JSON.parse(result.stdout);
  assert.ok(result.stdout.length < 1000);
  assert.match(await readFile(output, 'utf8'), /Dashboard markup/);
  assert.equal((await readFeedbackReceipts(f.statePath, summary)).packets[0], receipt.packetHash);
  assert.equal(await readFeedbackReceipts(f.statePath, { ...summary, stateHash: '0'.repeat(64) }), null);
  const outside = spawnSync(process.execPath, [script, 'evidence', '--state', f.statePath, '--output', path.join(f.root, 'feedback-evidence.txt')], { encoding: 'utf8' });
  assert.equal(outside.status, 1);
});

test('dispatch receipts require a real matching tool result after inspection and remain bound to the run', async t => {
  const f = await fixture(t), summary = await inspectFeedback(f.statePath);
  const receipts = await recordFeedbackReceipt(f.statePath, summary, { inspect: true, analysisRequired: true });
  const at = new Date(Date.parse(receipts.inspectedAt) + 1000).toISOString();
  const events = [
    { type: 'assistant', timestamp: at, message: { content: [{ type: 'tool_use', id: 'retro', name: 'Agent', input: { prompt: `Read ${reference}`, subagent_type: 'general-purpose' } }] } },
    { type: 'user', timestamp: at, message: { content: [{ type: 'tool_result', tool_use_id: 'retro', content: 'Agent launched' }] } },
  ];
  const run = list => feedbackRuntimeEvidence(list, f.statePath, f.state.fields, f.state.audit, undefined, receipts);
  assert.equal(run(events).retrospectiveDispatched, true);
  assert.equal(run(events.slice(0, 1)).retrospectiveDispatched, false);
  assert.equal(run(events.map(e => ({ ...e, type: 'api-request-blob' }))).retrospectiveDispatched, false);
  const prior = events.map(e => ({ ...e, timestamp: '2026-01-01T10:07:00Z' }));
  assert.equal(run(prior).retrospectiveDispatched, false);
  const saved = await recordFeedbackReceipt(f.statePath, summary, { dispatches: run(events).dispatches });
  assert.equal(feedbackRuntimeEvidence([], f.statePath, f.state.fields, f.state.audit, undefined, saved).retrospectiveDispatched, true);
});

test('writer preflight identifies missing evidence before changing reports', async t => {
  const f = await fixture(t), summary = await inspectFeedback(f.statePath), packet = summary._packet;
  const sessionReview = { version: 2, status: 'pending', context: ['Available conversation reviewed'], findings: [], userInput: [], limitations: ['Rendering unverified'], evidence_review: {
    packet_hash: packet.packetHash, dashboard: { status: 'inspected', sections: [
      { id: 'markup', status: 'checked', observations: [{ line: 3, note: 'Headline agrees with completion' }] },
      { id: 'styles', status: 'checked', observations: [{ line: 2, note: 'Margins declared; rendered behavior unverified' }] },
    ] }, process: [],
  } };
  const transcriptPath = path.join(f.dir, 'transcript.jsonl'); await writeFile(transcriptPath, '');
  await assert.rejects(writeFeedback(f.statePath, { sessionReview, transcriptPath }), /prerequisites missing: the inspected source packet/);
  await assert.rejects(readFile(path.join(f.dir, 'workflow-feedback.md')), { code: 'ENOENT' });
  await recordFeedbackReceipt(f.statePath, summary, { packetHash: packet.packetHash });
  await writeFeedback(f.statePath, { sessionReview, transcriptPath });
  assert.match(await readFile(path.join(f.dir, 'workflow-feedback.md'), 'utf8'), /### Session review/);
});
