import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { renderReview, writeReview } from './review-report.mjs';
import { decideNext } from '../skills/implement/scripts/handoff.mjs';
const finding = (severity = 'Major', route = 'fix') => ({ severity, route, region: 'src.js:save', claim: 'Save drops data', evidence: 'The empty-input path returns before persisting.', locations: [{ file: 'src.js', line: 1 }] });
const input = (findings = []) => ({ version: 1, ticket: 'DEMO', branch: 'feature', commit: 'working tree on abc123', working_tree: true, coverage: 'Compared working tree to main; requirements from the spec.', findings, implement: { handoff_version: 1, plan_version: 1, review_cycle: 1 } });
test('counts, verdict, Markdown and handoff derive from the same findings', () => {
  const result = renderReview(input([finding(), finding('Critical', 'replan')]));
  assert.equal(result.verdict, 'Request changes'); assert.equal(result.outcome, 'REPLAN_REQUIRED'); assert.equal(result.handoff.data.findings.length, 2);
  assert.match(result.markdown, /1 Critical, 1 Major/); assert.match(result.markdown, /Orchestrator outcome: REPLAN_REQUIRED/);
});
test('Minor fix routes enter the existing fix loop in every mode and respect its limit', () => {
  const result = renderReview(input([finding('Minor', 'fix')]));
  assert.equal(result.verdict, 'Request changes');
  assert.equal(result.outcome, 'FIX_REQUIRED');
  assert.deepEqual(result.handoff.data.findings.map(f => [f.id, f.route]), [['#1', 'fix']]);
  assert.match(result.markdown, /Route: fix/);
  for (const autonomy of ['guided', 'autonomous', 'autopilot']) {
    const fields = { ticket: 'DEMO', phase: 'review', autonomy, plan_version: '1', review_cycle: '1', fix_cycle: '0', replans_used: '0' };
    assert.equal(decideNext({ fields }, result.handoff).phase, 'fix-plan');
    const limited = decideNext({ fields: { ...fields, fix_cycle: '3' } }, result.handoff);
    assert.equal(limited.action, 'stop');
    assert.match(limited.reason, /Fix round limit/);
    const lightweight = { ...fields, adaptive_version: '1', mode: 'lightweight', escalations: '0' };
    assert.equal(decideNext({ fields: lightweight }, result.handoff).phase, 'lightweight');
    assert.equal(decideNext({ fields: { ...lightweight, fix_cycle: '3' } }, result.handoff).action, 'stop');
  }
});
test('advisory Minor findings stay visible and explicitly unfixed without being routed', () => {
  const result = renderReview(input([finding('Minor', 'advisory')]));
  assert.equal(result.verdict, 'Approve with nits');
  assert.equal(result.outcome, 'CLEAN');
  assert.equal(result.handoff.data.findings.length, 0);
  assert.equal(result.counts.Minor, 1);
  assert.match(result.markdown, /Route: advisory/);
  assert.match(result.markdown, /Status: Unfixed advisory/);
  assert.match(result.summary, /unfixed advisory/);
  assert.doesNotMatch(result.markdown, /Route: fix/);
});
test('explicit route and actionability cannot contradict each other or hide serious findings', () => {
  assert.throws(() => renderReview(input([{ ...finding('Minor', 'fix'), actionable: false }])), /route.*actionable|actionable.*route/i);
  assert.throws(() => renderReview(input([{ ...finding('Minor', 'advisory'), actionable: true }])), /route.*actionable|actionable.*route/i);
  for (const severity of ['Major', 'Critical']) {
    assert.throws(() => renderReview(input([finding(severity, 'advisory')])), /Minor/);
    assert.throws(() => renderReview(input([{ ...finding(severity), actionable: false }])), /cannot be hidden/);
  }
  assert.throws(() => renderReview(input([{ ...finding('Minor', 'fix'), actionable: 'false' }])), /boolean/);
  assert.equal(renderReview(input([finding('Minor', 'human')])).outcome, 'HUMAN_DECISION');
  assert.equal(renderReview(input([finding('Minor', 'replan')])).outcome, 'REPLAN_REQUIRED');
});
test('mixed reviews preserve routed finding IDs while excluding only advisory findings', () => {
  const result = renderReview(input([finding('Minor', 'advisory'), finding('Minor', 'fix'), finding('Major', 'human')]));
  assert.equal(result.outcome, 'HUMAN_DECISION');
  assert.deepEqual(result.handoff.data.findings.map(f => f.id), ['#2', '#3']);
  assert.equal(result.findings.length, 3);
  assert.equal(result.counts.Minor, 2);
});
test('standalone nits without routes retain advisory behavior and legacy implement routes are honored', () => {
  const nit = { ...finding('Minor'), route: undefined };
  const standalone = renderReview({ ...input([nit]), implement: null });
  assert.equal(standalone.verdict, 'Approve with nits');
  assert.match(standalone.summary, /unfixed advisory/);
  assert.equal(standalone.handoff, null);
  for (const [route, outcome] of [['fix', 'FIX_REQUIRED'], ['advisory', 'CLEAN']]) {
    const result = renderReview({ ...input([finding('Minor', route)]), implement: { plan_version: 1, review_cycle: 1 } });
    assert.equal(result.outcome, outcome);
    assert.equal(result.handoff, null);
    assert.match(result.markdown, new RegExp('Route: ' + route));
  }
});
test('source bounds are checked before saving and repeated reviews allocate fresh handoffs', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'review-render-')); t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, 'src.js'), 'save();\n');
  const value = { ...input([finding()]), repo_roots: { app: root } };
  const first = await writeReview(root, value); assert.match(first.handoff, /review-1.json$/);
  const saved = await readFile(first.report, 'utf8');
  const invalid = structuredClone(value); invalid.findings[0].locations[0].line = 99;
  await assert.rejects(writeReview(root, invalid), /outside/); assert.equal(await readFile(first.report, 'utf8'), saved);
  const second = await writeReview(root, value); assert.match(second.handoff, /review-2.json$/);
  assert.equal(JSON.parse(await readFile(second.handoff, 'utf8')).outcome, 'FIX_REQUIRED');
});
test('empty and standalone reviews do not invent findings or orchestrator handoffs', () => {
  const result = renderReview({ ...input(), implement: null }); assert.equal(result.verdict, 'Approve'); assert.equal(result.handoff, null); assert.doesNotMatch(result.markdown, /Orchestrator outcome:/);
});
test('legacy implement reviews retain routes and outcome lines without adding a handoff', () => {
  const result = renderReview({ ...input([finding()]), implement: { plan_version: 1, review_cycle: 1 } });
  assert.equal(result.handoff, null); assert.match(result.markdown, /Route: fix/); assert.match(result.summary, /Orchestrator outcome: FIX_REQUIRED/);
});


test('saved Minor fix findings reach the handoff, while saved advisory findings stay in the report', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'review-minor-routing-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, 'src.js'), 'save();\n');
  const result = await writeReview(root, { ...input([finding('Minor', 'fix'), finding('Minor', 'advisory')]), repo_roots: { app: root } });
  const handoff = JSON.parse(await readFile(result.handoff, 'utf8'));
  assert.equal(handoff.outcome, 'FIX_REQUIRED');
  assert.deepEqual(handoff.data.findings.map(f => f.id), ['#1']);
  const markdown = await readFile(result.report, 'utf8');
  assert.match(markdown, /Route: fix/);
  assert.match(markdown, /Route: advisory/);
  assert.match(markdown, /Status: Unfixed advisory/);
});
