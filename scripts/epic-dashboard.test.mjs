import assert from 'node:assert/strict';
import test from 'node:test';
import { renderEpicDashboard } from './epic-dashboard.mjs';
const state = (overrides = {}) => ({
  title: 'Customer exports', goal: 'Reconcile purchases', run: 'drive-customer-exports', autonomy: 'interactive',
  phase: 'shape', status: 'In Progress', revision: 1, created_at: '2026-01-01T10:00:00Z', updated_at: '2026-01-01T10:01:00Z',
  pending: null, stop_reason: null, epic: null, overview: null, slices: [], graph: null, parallel_groups: [],
  sources: [], open_items: [], decisions: [], history: [], publication: [], ...overrides,
});
const timeline = (html) => html.match(/<ol class="phase-timeline"[\s\S]*?<\/ol>/)[0];
test('dashboard refreshes active and paused runs but leaves completed and stopped results stable', () => {
  for (const status of ['In Progress', 'Paused', 'Stopped', 'Complete']) {
    const html = renderEpicDashboard(state({ status, phase: status === 'Complete' ? 'complete' : 'shape' }));
    assert.equal(html.includes('<meta http-equiv="refresh" content="15">'), ['In Progress', 'Paused'].includes(status));
  }
});
test('epic review presents the saved question and choices in a waiting banner without an active spinner', () => {
  const html = renderEpicDashboard(state({ status: 'Paused', phase: 'epic-review', pending: {
    question: 'Accept <this> epic?\nReview its requirements.', options: [{ label: 'Accept', description: 'Continue to slicing' }, 'Revise'],
  } }));
  assert.match(html, /Waiting for you/); assert.match(html, /Accept &lt;this&gt; epic\?\nReview/);
  assert.match(html, /Accept: Continue to slicing/); assert.match(html, /phase-dot current paused/);
  assert.doesNotMatch(timeline(html), /current spinning/); assert.doesNotMatch(html, /<div class="complete"/);
});
test('early autopilot timeline describes future review accurately and revising an epic resets later visual steps', () => {
  const html = renderEpicDashboard(state({ autonomy: 'autopilot', revision: 2 }));
  assert.match(timeline(html), /Automatic after shaping/); assert.doesNotMatch(timeline(html), /Automatic continuation/);
  assert.match(timeline(html), /Prepared<\/span>\s*<span class="phase-status ">Pending/);
  assert.match(timeline(html), /aria-current="step"/);
});
test('completion is preparation only, surfaces unresolved slices, and retains a separate future phase', () => {
  const slice = { id: 'S-1', title: 'Export', summary: 'Download own orders', preparation: 'Needs refinement', open_items: ['Timezone TBD'],
    parallel: { suitability: 'unassessed', reason: 'Awaiting code context' }, implementation: { status: 'Not started' } };
  const html = renderEpicDashboard(state({ phase: 'complete', status: 'Complete', slices: [slice] }));
  assert.match(html, /<div class="complete"[^>]*><strong>Preparation complete/);
  assert.match(html, /1 need refinement before implementation/); assert.match(html, /Implementation has not started/);
  assert.match(html, /Future phase/); assert.match(html, /1 open items or prerequisites/); assert.doesNotMatch(html, /current spinning/);
});
test('the audit shows actual transitions and timestamps with only the two primary artifacts', () => {
  const html = renderEpicDashboard(state({ history: [
    { at: '2026-01-01T10:00:00Z', event: 'intake', phase: 'shape', status: 'In Progress', detail: '' },
    { at: '2026-01-01T10:01:00Z', event: 'epic', phase: 'epic-review', status: 'Paused', detail: 'Review <draft>' },
  ] }));
  assert.match(html, /<td>Intake<\/td><td>Shape<\/td>/);
  assert.match(html, /<td>Shape<\/td><td>Epic review<\/td>/);
  assert.match(html, /data-ts="2026-01-01T10:01:00Z"/); assert.match(html, /Review &lt;draft&gt;/);
  assert.equal((html.match(/class="artifact-tile"/g) ?? []).length, 2);
  assert.doesNotMatch(html, /href="(?:decisions.jsonl|state.json)"/); assert.match(html, /alt="InsideOut AI"/);
});
test('artifacts are followed immediately by the combined audit and slicing details stay in Markdown', () => {
  const html = renderEpicDashboard(state({ slices: [{ id: 'S-1', preparation: 'Prepared', open_items: [], external: [] }] }));
  const headings = [...html.matchAll(/<h2>(.*?)<\/h2>/g)].map((m) => m[1]);
  assert.deepEqual(headings.slice(0, 2), ['Artifacts', 'Audit log']);
  assert.doesNotMatch(html, /<h2>Slices<|Dependencies and implementation order|Proposed parallel groups|class="slice-table"/);
});
test('decision points join their transition once with actual choice, source, scope, and reference', () => {
  const html = renderEpicDashboard(state({ history: [
    { id: 'choose-slicing', at: '2026-01-01T10:01:00Z', event: 'decision', phase: 'slice', status: 'In Progress', detail: 'Choose functional slicing' },
  ], decisions: [{ id: 'choose-slicing', at: '2026-01-01T10:01:00Z', phase: 'slice', text: 'Choose functional slicing', source: 'user', scope: ['S-1', 'S-2'], reference: 'User chose option 1' }] }));
  assert.equal((html.match(/Choose functional slicing/g) ?? []).length, 1);
  assert.match(html, /Source: user · Scope: S-1, S-2 · Reference: User chose option 1/);
  assert.equal((html.match(/class="audit-decision"/g) ?? []).length, 1);
});
test('legacy event ordering joins saved decisions and unlinked decisions keep their recorded chronology', () => {
  const html = renderEpicDashboard(state({ history: [
    { at: '2026-01-01T10:01:00Z', event: 'epic', phase: 'slice', status: 'In Progress', detail: '' },
  ], events: [{ id: 'saved-epic' }], decisions: [
    { id: 'old-choice', at: '2026-01-01T10:00:30Z', phase: 'shape', text: 'Retain source constraints', source: 'user', scope: 'epic', reference: 'Interview' },
    { id: 'saved-epic', at: '2026-01-01T10:01:00Z', phase: 'epic-review', text: 'Continue automatically; no user approval', source: 'automatic', scope: 'epic' },
  ] }));
  assert.equal((html.match(/class="audit-decision"/g) ?? []).length, 2);
  assert.ok(html.indexOf('Retain source constraints') > html.indexOf('Continue automatically'));
  assert.match(html, /Source: automatic/); assert.doesNotMatch(html, /Source: user[^<]*no user approval/);
});
test('audit displays latest first with descending stable row numbers and reverses tied timestamps by event order', () => {
  const html = renderEpicDashboard(state({ history: [
    { id: 'first', at: '2026-01-01T10:00:00Z', event: 'intake', phase: 'shape', status: 'In Progress', detail: 'Earliest entry' },
    { id: 'second', at: '2026-01-01T10:01:00Z', event: 'decision', phase: 'shape', status: 'In Progress', detail: 'Middle entry' },
    { id: 'third', at: '2026-01-01T10:01:00Z', event: 'epic', phase: 'epic-review', status: 'Paused', detail: 'Latest entry' },
  ] }));
  assert.ok(html.indexOf('Latest entry') < html.indexOf('Middle entry'));
  assert.ok(html.indexOf('Middle entry') < html.indexOf('Earliest entry'));
  const body = html.match(/<table class="audit-table">[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/)[1];
  assert.deepEqual([...body.matchAll(/<tr><td>(\d+)<\/td>/g)].map((m) => Number(m[1])), [3, 2, 1]);
});
test('all statuses remain fully visible without disclosure controls or paragraph-stacked banners', () => {
  for (const status of ['In Progress', 'Paused', 'Stopped', 'Complete']) {
    const html = renderEpicDashboard(state({ status, phase: status === 'Complete' ? 'complete' : 'shape' }));
    assert.doesNotMatch(html, /<details\b|<summary\b/);
    const banner = html.match(/<div class="(?:current-activity|next-action|complete)" role="status">([\s\S]*?)<\/div>/)[1];
    assert.doesNotMatch(banner, /<p\b/);
  }
});
