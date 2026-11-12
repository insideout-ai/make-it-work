import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { feedbackEvidence, validateEvidenceReview } from './feedback-evidence.mjs';
import { inspectFeedback, checkFeedback, writeFeedback } from './write-feedback.mjs';
import { feedbackHold } from './feedback-handoff.mjs';

test('numbered evidence removes embedded images; marker-only feedback is rejected and late delivery refreshes do not retrigger it', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'feedback-source-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const dir = path.join(root, 'make-it-work/DEMO'); await mkdir(dir, { recursive: true });
  const state = (await readFile('evals/implement/feedback-clean/fixture/fixture-artifacts/DEMO-state.md', 'utf8')).replace('status: In Progress', 'status: Complete').replace('phase: final-sync', 'phase: complete\nfeedback_evidence_version: 1').trimEnd() + '\n| 7 | 2026-01-01T10:06:00Z | final-sync | complete | Context synchronized |\n';
  const statePath = path.join(dir, 'DEMO-state.md'), htmlPath = path.join(dir, 'DEMO-status.html');
  await writeFile(statePath, state);
  const html = '<html>\n<style>body{overflow-wrap:anywhere}</style>\n<h1>Complete</h1>\n<img alt="Logo" src="data:image/png;base64,' + 'A'.repeat(20000) + '">\n</html>\n';
  await writeFile(htmlPath, html);
  const summary = await inspectFeedback(statePath), packet = await feedbackEvidence(statePath, summary);
  assert.ok(JSON.stringify(packet.dashboard).length < 1500);
  assert.equal(packet.dashboard.sections.markup.find(l => l.line === 4).text.includes('[inline image omitted]'), true);
  const session = { version: 2, status: 'pending', context: ['Conversation and saved sources reviewed'], findings: [], userInput: [], limitations: ['Rendering not observed'] };
  assert.equal((await checkFeedback(statePath, { sessionReview: session })).valid, false);
  session.evidence_review = { packet_hash: packet.packetHash, dashboard: { status: 'inspected', sections: [
    { id: 'markup', status: 'checked', observations: [{ line: 3, note: 'Headline Complete agrees with the saved terminal state' }] },
    { id: 'styles', status: 'checked', observations: [{ line: 2, note: 'Wrapping is declared; rendered layout is unverified' }] },
  ] }, process: [] };
  assert.equal((await checkFeedback(statePath, { sessionReview: session })).valid, true);
  const invalid = structuredClone(session.evidence_review); invalid.dashboard.sections[0].observations[0].line = 99;
  assert.throws(() => validateEvidenceReview(invalid, packet, value => value), /source line/);
  await writeFeedback(statePath, { sessionReview: session });
  const fields = { status: 'Complete', phase: 'complete', start_time: summary.runId };
  assert.equal((await feedbackHold({ hook_event_name: 'Stop' }, statePath, fields, [])).decision, 'block');
  const script = path.resolve('skills/implement/scripts/write-feedback.mjs');
  const output = spawnSync(process.execPath, [script, 'evidence', '--state', statePath], { encoding: 'utf8' });
  assert.equal(output.status, 0, output.stderr);
  const events = [{ type: 'assistant', timestamp: '2026-01-01T10:07:00Z', message: { content: [{ type: 'tool_use', id: 'packet', name: 'Bash', input: { command: `node "${script}" evidence --state "${statePath}"` } }] } },
    { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'packet', content: output.stdout }] } }];
  assert.equal(await feedbackHold({ hook_event_name: 'Stop' }, statePath, fields, events), null);
  await writeFile(htmlPath, html.replace('Complete</h1>', 'Complete; delivery declined</h1>'));
  assert.equal(await feedbackHold({ hook_event_name: 'Stop' }, statePath, fields, events), null);
  await rm(htmlPath);
  const absent = await inspectFeedback(statePath);
  session.evidence_review = { packet_hash: absent.evidence.packetHash, dashboard: { status: 'unavailable', reason: 'Dashboard source is missing', sections: ['markup', 'styles'].map(id => ({ id, status: 'not-applicable' })) }, process: [] };
  assert.equal((await checkFeedback(statePath, { sessionReview: session })).valid, true);
  await writeFeedback(statePath, { sessionReview: session });
  assert.equal(await readFile(statePath, 'utf8'), state);
  await assert.rejects(readFile(htmlPath), { code: 'ENOENT' });
});

test('stage diagnostics identify the exact process note and source location', () => {
  const packet = { packetHash: 'a'.repeat(64), dashboard: { status: 'missing', sections: { markup: [], styles: [] }, omitted: [] },
    sources: [{ label: 'Review', status: 'available', lines: [{ line: 3, text: 'Observed limit' }] }] };
  const input = { packet_hash: packet.packetHash, dashboard: { status: 'unavailable', reason: 'Source missing', sections: ['markup', 'styles'].map(id => ({ id, status: 'not-applicable' })) },
    process: [{ source: 'Review', line: 3, result: 'limitation', note: 'Local terminology needs paraphrasing' }] };
  assert.throws(() => validateEvidenceReview(input, packet, (_value, label) => { if (label.includes('process[')) throw new Error(label); }), /evidence_review\.process\[0\]\.note \(Review line 3\)/);
});
