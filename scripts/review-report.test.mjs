import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { renderReview, writeReview } from './review-report.mjs';
const finding = (severity = 'Major', route = 'fix') => ({ severity, route, region: 'src.js:save', claim: 'Save drops data', evidence: 'The empty-input path returns before persisting.', locations: [{ file: 'src.js', line: 1 }] });
const input = (findings = []) => ({ version: 1, ticket: 'DEMO', branch: 'feature', commit: 'working tree on abc123', working_tree: true, coverage: 'Compared working tree to main; requirements from the spec.', findings, implement: { handoff_version: 1, plan_version: 1, review_cycle: 1 } });
test('counts, verdict, Markdown and handoff derive from the same findings', () => {
  const result = renderReview(input([finding(), finding('Critical', 'replan')]));
  assert.equal(result.verdict, 'Request changes'); assert.equal(result.outcome, 'REPLAN_REQUIRED'); assert.equal(result.handoff.data.findings.length, 2);
  assert.match(result.markdown, /1 Critical, 1 Major/); assert.match(result.markdown, /Orchestrator outcome: REPLAN_REQUIRED/);
});
test('Minor-only nits stay clean; serious findings cannot be hidden as non-actionable', () => {
  const result = renderReview(input([finding('Minor')])); assert.equal(result.verdict, 'Approve with nits'); assert.equal(result.handoff.data.findings.length, 0); assert.equal(result.outcome, 'CLEAN');
  assert.throws(() => renderReview(input([{ ...finding(), actionable: false }])), /cannot be hidden/);
  assert.equal(renderReview(input([finding('Major', 'human')])).outcome, 'HUMAN_DECISION');
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
