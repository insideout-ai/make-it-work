import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { generateDashboard, parseState } from './render-status.mjs';
import { checkpointDashboard, checkpointDecision } from './dashboard-checkpoint.mjs';
import { lastWorkRow } from './workflow-decisions.mjs';
import { inspectState } from './write-feedback.mjs';
import { initializePublication, updatePublication } from './ticket-publication.mjs';

const DEFAULT_FIELDS = {
  ticket: 'DEMO',
  status: 'In Progress',
  phase: 'context-check',
  autonomy: 'pending',
  start_time: '2026-01-01T10:00:00Z',
  execution_mode: 'none',
  inline_pause_mode: 'none',
  spec: 'none',
  spec_hash: 'none',
  plan: 'none',
  plan_version: '1',
  plan_hash: 'none',
  execution: 'not-started',
  review: 'not-started',
  review_cycle: '0',
  fix_cycle: '0',
  fix_plan_round_steps: 'none',
  fix_plan_dispatch: 'none',
  replans_used: '0',
  gate: 'none',
  pause_reason: 'none',
  branch: 'demo',
  base: 'main',
  head: 'abc123',
  worktree_fingerprint: 'fingerprint',
  execute_report: 'none',
  context_updated: 'none',
  current_activity: 'none',
  real_rows_from: '1',
};

function stateMarkdown({ fields = {}, rows = [], regressions = [], findings = [] } = {}) {
  const merged = { ...DEFAULT_FIELDS, ...fields };
  const fieldBlock = Object.entries(merged).map(([key, value]) => `${key}: ${value}`).join('\n');
  const auditRows = rows.map((row, index) =>
    `| ${index + 1} | ${row[0]} | ${row[1]} | ${row[2]} | ${row[3]} |`
  ).join('\n');
  const list = (items) => items.length ? items.map((item) => `- ${item}`).join('\n') : 'None';
  return `# Workflow state — ${merged.ticket}

\`\`\`
${fieldBlock}
\`\`\`

## Known regressions

${list(regressions)}

## Decided findings

${list(findings)}

## Context discoveries

None

## Audit log

| # | Time | From | To | Outcome / reason |
| --- | --- | --- | --- | --- |
${auditRows}
`;
}

function planMarkdown(mode = 'Inline', complete = 0, total = 1) {
  return `# Plan

## Execution Status

**Mode:** ${mode} — execute steps in this session.

**Progress:** Step ${complete} of ${total} complete.

## Steps

Details.
`;
}

async function workspace(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'render-status-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = path.join(root, 'make-it-work', 'DEMO');
  await mkdir(directory, { recursive: true });
  return directory;
}

async function renderFixture(t, state, plan = null) {
  const directory = await workspace(t);
  const statePath = path.join(directory, 'DEMO-state.md');
  await writeFile(statePath, state);
  if (plan !== null) await writeFile(path.join(directory, 'DEMO-plan.md'), plan);
  const outputPath = await generateDashboard(statePath);
  return { directory, outputPath, html: await readFile(outputPath, 'utf8') };
}

test('renders a fresh run with active Context Check and no timing paragraph', async (t) => {
  const state = stateMarkdown({
    fields: { current_activity: 'Checking project context.' },
    rows: [['2026-01-01T10:00:00Z', 'start', 'context-check', 'New run created']],
  });
  const { html } = await renderFixture(t, state);

  assert.match(html, /phase-dot current spinning[^>]+context-check:/);
  assert.match(html, /phase-activity">Checking project context\.<\/p>/);
  assert.match(html, /<meta http-equiv="refresh" content="15">/);
  assert.doesNotMatch(html, /class="session-timing"/);
  assert.match(html, /\(first real timestamp\)/);
  assert.match(html, /future relative to this device/);
  assert.doesNotMatch(html, /Waiting on you:/);
  assert.match(html, /ticket-updates-off[^>]*>Ticket updates: Off<\/span>/);
  assert.doesNotMatch(html, /Known regressions|Decided findings|Unrelated test failures|Review decisions|<p>None<\/p>/);
});

test('hides controller retry markers while preserving outcome text and saved audit evidence', async (t) => {
  const hash = createHash('sha256').update('workflow event').digest('hex');
  const marker = `[workflow-event: review-1; sha256: ${hash}]`;
  const state = stateMarkdown({
    fields: { phase: 'final-sync' },
    rows: [
      ['2026-01-01T10:00:00Z', 'start', 'review', `Artifact checksum sha256: ${hash} [kept for review].`],
      ['2026-01-01T10:01:00Z', 'review', 'final-sync', `Review is <clean>. ${marker} Follow-up preserved.`],
    ],
  });
  const { directory, html } = await renderFixture(t, state);
  assert.doesNotMatch(html, /workflow-event:/);
  assert.match(html, /Review is &lt;clean&gt;\. Follow-up preserved\./);
  assert.ok(html.includes(`Artifact checksum sha256: ${hash} [kept for review].`));
  assert.match(html, /\(\+1m\)/);
  assert.equal(await readFile(path.join(directory, 'DEMO-state.md'), 'utf8'), state);
  assert.ok(parseState(state).audit[1].outcome.includes(marker));
});

test('keeps refinement activity outside the connected timeline and above artifacts', async (t) => {
  const activity = ('Starting refinement — exploring the dashboard income-limit code, then resolving open questions. ' + 'Additional context. '.repeat(20)).trim();
  const { html } = await renderFixture(t, stateMarkdown({
    fields: { phase: 'close-the-gaps', autonomy: 'guided', current_activity: activity },
    rows: [
      ['2026-01-01T10:00:00Z', 'start', 'context-check', 'New run created'],
      ['2026-01-01T10:00:18Z', 'context-check', 'close-the-gaps', 'Context ready'],
    ],
  }));
  const timeline = html.slice(html.indexOf('<div class="phase-timeline">'), html.indexOf('<p class="timeline-scroll-hint">'));
  assert.doesNotMatch(timeline, /Starting refinement|phase-activity/);
  assert.match(timeline, /phase-dot passed[^>]+>✓<\/div>/);
  assert.match(timeline, /class="line line-green"/);
  assert.match(timeline, /phase-dot current spinning[^>]+close-the-gaps:/);
  assert.match(timeline, /phase-duration">18s<\/div>/);
  assert.match(html, /<section class="current-activity" aria-label="Current activity">\s*<strong>Refinement in progress<\/strong>/);
  assert.ok(html.indexOf('<section class="current-activity"') > html.indexOf('<p class="timeline-scroll-hint">'));
  assert.ok(html.indexOf('<section class="current-activity"') < html.indexOf('<h2>Artifacts</h2>'));
  assert.ok(html.includes(`<p class="phase-activity">${activity}</p>`));
  assert.equal(html.split(activity).length - 1, 1);
  assert.doesNotMatch(html, /activity-details|Activity details/);
  assert.match(html, /alt="InsideOut AI"/);
});

test('shows an honest fallback for active phases without a reported activity', async (t) => {
  for (const phase of ['context-check', 'close-the-gaps', 'plan', 'review', 'final-sync']) {
    const { html } = await renderFixture(t, stateMarkdown({
      fields: { phase, current_activity: 'none', current_activity_updated_at: '2026-01-01T10:00:00Z' },
      rows: [['2026-01-01T10:00:00Z', 'start', phase, 'Checkpoint']],
    }));
    assert.match(html, /<section class="current-activity"/);
    assert.match(html, /is in progress\. No activity details have been reported yet\./);
    assert.doesNotMatch(html, /Last updated:/);
  }
});

test('omits the activity row when paused, stopped, or complete', async (t) => {
  for (const status of ['Paused', 'Stopped', 'Complete']) {
    const phase = status === 'Complete' ? 'complete' : 'context-check';
    const { html } = await renderFixture(t, stateMarkdown({
      fields: { status, phase, current_activity: 'Stale activity.', current_activity_updated_at: '2026-01-01T10:00:00Z' },
      rows: [['2026-01-01T10:00:00Z', 'start', phase, 'Checkpoint']],
    }));
    assert.doesNotMatch(html, /<section class="current-activity"/);
    assert.doesNotMatch(html, /Stale activity\./);
    assert.doesNotMatch(html, /Last updated:/);
  }
});

test('activity timestamps are optional for legacy states and validated when present', async (t) => {
  const { html } = await renderFixture(t, stateMarkdown({
    fields: { current_activity: 'Drafting the plan.' },
    rows: [['2026-01-01T10:00:00Z', 'start', 'context-check', 'Started']],
  }));
  assert.match(html, /Last updated: unavailable/);
  for (const timestamp of ['', 'yesterday', '2026-02-30T10:00:00Z', '<script>alert(1)</script>']) {
    assert.throws(() => parseState(stateMarkdown({ fields: { current_activity_updated_at: timestamp } })), /current_activity_updated_at/);
  }
});

test('dashboard checkpoint updates activity and its rendered snapshot together', async (t) => {
  const directory = await workspace(t);
  const statePath = path.join(directory, 'DEMO-state.md');
  await writeFile(statePath, stateMarkdown({
    fields: { current_activity: 'none' },
    rows: [['2026-01-01T10:00:00Z', 'start', 'context-check', 'New run created']],
  }));

  const before = Date.now();
  const outputPath = await checkpointDashboard(statePath, { activity: 'Inspecting project context.' });
  const after = Date.now();
  const [state, html] = await Promise.all([readFile(statePath, 'utf8'), readFile(outputPath, 'utf8')]);
  assert.match(state, /^current_activity: Inspecting project context\.$/m);
  const timestamp = parseState(state).fields.current_activity_updated_at;
  assert.ok(Date.parse(timestamp) >= before && Date.parse(timestamp) <= after);
  assert.match(html, /phase-activity">Inspecting project context\.<\/p>/);
  assert.ok(html.includes(`Last updated: <time class="ts" datetime="${timestamp}" data-ts="${timestamp}">${timestamp}</time>`));

  await checkpointDashboard(statePath);
  assert.equal(await readFile(statePath, 'utf8'), state);
  assert.equal(await readFile(outputPath, 'utf8'), html);

  await checkpointDashboard(statePath, { activity: 'none' });
  assert.equal(parseState(await readFile(statePath, 'utf8')).fields.current_activity_updated_at, 'none');
  const cleared = await readFile(outputPath, 'utf8');
  assert.match(cleared, /No activity details have been reported yet/);
  assert.doesNotMatch(cleared, /Inspecting project context|Last updated:/);
});

test('retains a delegated-work description through refresh and decisions until the parent reports its result', async (t) => {
  const { directory, outputPath } = await renderFixture(t, stateMarkdown({
    fields: { phase: 'plan' },
    rows: [['2026-01-01T10:00:00Z', 'start', 'plan', 'Planning started']],
  }));
  const statePath = path.join(directory, 'DEMO-state.md');
  const activity = 'Refreshing the test strategy and test map in a background agent.';
  await checkpointDashboard(statePath, { activity });
  const timestamp = parseState(await readFile(statePath, 'utf8')).fields.current_activity_updated_at;
  await checkpointDecision(statePath, { id: 'waiting-mode', topic: 'Autonomy', choice: 'Keep autopilot', source: 'user', via: 'chat', scope: 'DEMO', resume: 'transparent' });
  await checkpointDashboard(statePath);
  const waiting = await readFile(outputPath, 'utf8');
  assert.ok(waiting.includes(activity));
  assert.ok(waiting.includes(`data-ts="${timestamp}"`));
  assert.equal(parseState(await readFile(statePath, 'utf8')).fields.current_activity_updated_at, timestamp);
  await checkpointDashboard(statePath, { activity: 'The test strategy is ready; drafting the implementation plan.' });
  const finished = await readFile(outputPath, 'utf8');
  assert.match(finished, /The test strategy is ready; drafting the implementation plan\./);
  assert.ok(!finished.includes(activity));
});

test('dashboard checkpoint restores activity when rendering fails', async (t) => {
  const directory = await workspace(t);
  const statePath = path.join(directory, 'DEMO-state.md');
  await writeFile(statePath, stateMarkdown({
    fields: { phase: 'execute', plan: 'make-it-work/DEMO/DEMO-plan.md', current_activity: 'Earlier activity.', current_activity_updated_at: '2026-01-01T10:00:00Z' },
    rows: [['2026-01-01T10:00:00Z', 'start', 'execute', 'Execution started']],
  }));

  const original = await readFile(statePath, 'utf8');
  await assert.rejects(checkpointDashboard(statePath, { activity: 'Running a step.' }), /Could not read the plan required for timeline progress/);
  assert.equal(await readFile(statePath, 'utf8'), original);
});

test('accepts and describes fully autonomous autopilot runs', async (t) => {
  const state = stateMarkdown({
    fields: { autonomy: 'autopilot' },
    rows: [['2026-01-01T10:00:00Z', 'start', 'context-check', 'New autopilot run created']],
  });
  const { html } = await renderFixture(t, state);

  assert.match(html, /Autonomy: autopilot/);
  assert.match(html, /resolves every documented safe default without prompting/);
});
test('queued autonomy is optional for older runs and rejects invalid or completed-run queues', () => {
  const rows = [['2026-01-01T10:00:00Z', 'start', 'context-check', 'Run created']];
  assert.equal(parseState(stateMarkdown({ rows })).fields.queued_autonomy, undefined);
  const fields = { autonomy: 'guided', queued_autonomy: 'autopilot' };
  assert.equal(parseState(stateMarkdown({ rows, fields })).fields.queued_autonomy, 'autopilot');
  assert.throws(() => parseState(stateMarkdown({ rows, fields: { ...fields, queued_autonomy: 'unknown' } })), /Unsupported queued autonomy/);
  assert.throws(() => parseState(stateMarkdown({ rows, fields: { ...fields, phase: 'complete', status: 'Complete' } })), /cannot retain queued autonomy/);
});

test('ticket permission badge is independent of autonomy and shows scoped consent without private payloads', async (t) => {
  const directory = await workspace(t);
  const statePath = path.join(directory, 'DEMO-state.md');
  let journal = initializePublication({ ticket: 'DEMO', workflow_start: DEFAULT_FIELDS.start_time }, {
    target: { tracker: 'ado', site: 'https://tracker.example.test', issue: 'DEMO <script>alert(1)</script>', url: 'https://tracker.example.test/DEMO' },
    original_description: 'PRIVATE ORIGINAL DESCRIPTION', mode: 'comments', allowed: ['comment'], artifact_comments: true,
    decision: { source: 'user', text: 'Autopilot + update ticket: publish the plan and summaries as comments.' },
  });
  const filename = `DEMO-ticket-publication-${journal.run_id}.json`;
  const journalPath = path.join(directory, filename);
  const rows = [['2026-01-01T10:00:00Z', 'start', 'context-check', 'New run created']];
  const fields = { ticket_publication: `make-it-work/DEMO/${filename}` };
  await writeFile(journalPath, JSON.stringify(journal));
  for (const autonomy of ['autopilot', 'guided']) {
    await writeFile(statePath, stateMarkdown({ fields: { ...fields, autonomy }, rows }));
    const html = await readFile(await generateDashboard(statePath), 'utf8');
    assert.ok(html.includes(`Autonomy: ${autonomy}</span>`));
    assert.match(html, /ticket-updates-allowed[^>]*>Ticket updates: Allowed<\/span>/);
    assert.match(html, /at https:\/\/tracker.example.test: comments\./);
    assert.match(html, /Artifact comments are allowed/);
    assert.match(html, /DEMO &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.doesNotMatch(html, /PRIVATE ORIGINAL DESCRIPTION|<script>alert\(1\)<\/script>/);
  }
  journal = updatePublication(journal, 'consent', { mode: 'local', decision: { source: 'user', text: 'Keep all further updates local' } }).journal;
  await writeFile(journalPath, JSON.stringify(journal));
  const revoked = await readFile(await generateDashboard(statePath), 'utf8');
  assert.match(revoked, /ticket-updates-off[^>]*>Ticket updates: Off<\/span>/);
  assert.match(revoked, /Autonomy: guided<\/span>/);
});

test('unverifiable referenced permission shows Unknown without preventing dashboard rendering', async (t) => {
  const directory = await workspace(t);
  const statePath = path.join(directory, 'DEMO-state.md');
  const filename = 'DEMO-ticket-publication-fixture.json';
  const journalPath = path.join(directory, filename);
  await writeFile(statePath, stateMarkdown({
    fields: { ticket_publication: `make-it-work/DEMO/${filename}` },
    rows: [['2026-01-01T10:00:00Z', 'start', 'context-check', 'New run created']],
  }));
  const assertUnknown = async () => {
    const html = await readFile(await generateDashboard(statePath), 'utf8');
    assert.match(html, /ticket-updates-unknown[^>]*>Ticket updates: Unknown<\/span>/);
    assert.doesNotMatch(html, />Ticket updates: Allowed</);
  };
  await assertUnknown(); // Missing journal.
  await writeFile(journalPath, '{invalid JSON');
  await assertUnknown();
  const anotherRun = initializePublication({ ticket: 'DEMO', workflow_start: '2026-01-02T10:00:00Z' }, {
    target: { tracker: 'jira', site: 'https://tracker.example.test', issue: 'DEMO', url: 'https://tracker.example.test/DEMO' },
    original_description: null, mode: 'updates', decision: { source: 'user', text: 'Allow updates for another run' },
  });
  anotherRun.run_id = 'fixture';
  await writeFile(journalPath, JSON.stringify(anotherRun));
  await assertUnknown();
  const outside = path.join(path.dirname(directory), 'outside.json');
  await writeFile(outside, JSON.stringify({ ...anotherRun, workflow_start: DEFAULT_FIELDS.start_time }));
  await rm(journalPath);
  await symlink(outside, journalPath);
  await assertUnknown();
});

test('accepts new handoff-enabled runs and legacy runs without the field', () => {
  const rows = [['2026-01-01T10:00:00Z', 'start', 'context-check', 'New run created']];
  assert.equal(parseState(stateMarkdown({ rows })).fields.handoff_version, undefined);
  assert.equal(parseState(stateMarkdown({ fields: { handoff_version: '1' }, rows })).fields.handoff_version, '1');
  assert.throws(() => parseState(stateMarkdown({ fields: { handoff_version: '2' }, rows })), /Unsupported handoff_version/);
  assert.equal(parseState(stateMarkdown({ fields: { verification_version: '1' }, rows })).fields.verification_version, '1');
  assert.throws(() => parseState(stateMarkdown({ fields: { verification_version: '2' }, rows })), /Unsupported verification_version/);
  assert.equal(parseState(stateMarkdown({ fields: { plugin_version: '4.6.0' }, rows })).fields.plugin_version, '4.6.0');
  assert.throws(() => parseState(stateMarkdown({ fields: { plugin_version: 'latest' }, rows })), /Unsupported plugin_version/);
});

test('shows final approval only for package-enabled runs', async (t) => {
  const rows = [['2026-01-01T10:00:00Z', 'start', 'context-check', 'New run created']];
  const legacy = await renderFixture(t, stateMarkdown({ rows }));
  assert.doesNotMatch(legacy.html, /class="phase-label[^"]*">Final Approval/);
  const current = await renderFixture(t, stateMarkdown({ fields: { final_package_version: '1' }, rows }));
  assert.match(current.html, /class="phase-label[^"]*">Final Approval/);
  assert.equal((current.html.match(/phase-dot not-reached/g) ?? []).length, 7);
  assert.doesNotMatch(current.html, /phase-step optional-step/);
  assert.throws(() => parseState(stateMarkdown({ fields: { phase: 'final-approval' }, rows })), /requires final_package_version/);
});

test('renders pending offline refinement without activating a timeline dot', async (t) => {
  const state = stateMarkdown({
    fields: {
      status: 'Paused',
      phase: 'close-the-gaps',
      pause_reason: 'offline refinement pending',
    },
  });
  const { html } = await renderFixture(t, state);

  assert.equal((html.match(/phase-dot not-reached/g) ?? []).length, 7);
  assert.doesNotMatch(html, /phase-dot current/);
  assert.doesNotMatch(html, /<meta http-equiv="refresh"/);
  assert.match(html, /Waiting on you:<\/strong> offline refinement pending/);
});

test('renders a stopped active phase as failed and static', async (t) => {
  const state = stateMarkdown({
    fields: {
      status: 'Stopped',
      pause_reason: 'context is incomplete',
    },
    rows: [['2026-01-01T10:00:00Z', 'start', 'context-check', 'Context check stopped']],
  });
  const { html } = await renderFixture(t, state);

  assert.match(html, /phase-dot failed[^>]+context-check:[^>]*>✗<\/div>/);
  assert.doesNotMatch(html, /phase-dot current/);
  assert.match(html, /Waiting on you:<\/strong> context is incomplete/);
  assert.match(html, /status-stopped">Stopped<\/div>/);
});

test('keeps completed stages minimal and retains approval details and fix history in the audit log', async (t) => {
  const approval = 'Spec approved by user (hash ef7df1c); description published to DEMO (spec key, receipt 402444)';
  const rows = [
    ['2026-01-01T10:00:00Z', 'start', 'context-check', 'New run created'],
    ['2026-01-01T10:01:00Z', 'context-check', 'close-the-gaps', 'Context ready'],
    ['2026-01-01T10:02:00Z', 'close-the-gaps', 'spec-approval', 'Spec ready'],
    ['2026-01-01T10:03:00Z', 'spec-approval', 'plan', approval],
    ['2026-01-01T10:04:00Z', 'plan', 'plan-approval', 'Plan ready'],
    ['2026-01-01T10:05:00Z', 'plan-approval', 'execute', 'Approved as-is'],
    ['2026-01-01T10:06:00Z', 'execute', 'review', 'Execution passed'],
    ['2026-01-01T10:07:00Z', 'review', 'fix-plan', 'Review requested fixes'],
    ['2026-01-01T10:08:00Z', 'fix-plan', 'fix-plan', 'Decision: Fix round 1: added 2 steps covering 1 finding'],
    ['2026-01-01T10:09:00Z', 'fix-plan', 'execute', 'Fix steps ready'],
    ['2026-01-01T10:10:00Z', 'execute', 'review', 'Fix execution passed'],
    ['2026-01-01T10:11:00Z', 'review', 'final-sync', 'Review clean'],
    ['2026-01-01T10:12:00Z', 'final-sync', 'complete', 'Run complete'],
  ];
  const state = stateMarkdown({
    fields: {
      status: 'Complete', phase: 'complete', autonomy: 'guided',
      final_package_version: '1',
      spec: 'make-it-work/DEMO/DEMO-spec.md', plan: 'make-it-work/DEMO/DEMO-plan.md',
      execute_report: 'make-it-work/DEMO/DEMO-execute.md', review: 'clean',
      execution: 'passed', review_cycle: '2', fix_cycle: '1',
      fix_plan_round_steps: '2', pause_reason: 'none',
    },
    rows,
  });
  const { html } = await renderFixture(t, state, planMarkdown('Subagent-Driven', 4, 4));

  assert.equal((html.match(/class="phase-step(?: optional-step)?"/g) ?? []).length, 11);
  assert.equal((html.match(/Review<span class="phase-skill">\(review-the-pr\)<\/span>/g) ?? []).length, 2);
  const completedStages = html.slice(html.indexOf('<div class="phase-timeline">'), html.indexOf('<div class="phase-step optional-step">'));
  assert.doesNotMatch(completedStages, /phase-mode|Spec approved by user|Approved as-is|Step 2 of 2 complete/);
  assert.ok(html.includes(approval));
  assert.match(html, /Decision: Fix round 1: added 2 steps covering 1 finding/);
  assert.match(completedStages, /phase-duration">2m<\/div>/);
  assert.match(html, /class="complete"><strong>Implementation complete\.<\/strong> Real-timestamped portion of this run: 12m\./);
  assert.match(html, /class="phase-step optional-step"[\s\S]*class="phase-dot optional"[^>]+Optional delivery:/);
  assert.match(html, /class="phase-label">Deliver<\/div>[\s\S]*class="phase-mode">Optional<\/div>/);
  assert.doesNotMatch(html, /Optional next step:/);
  assert.match(html, /class="feedback-note"/);
  assert.match(html, /make-it-work\/implement-feedback\.md/);
  assert.match(html, /href="DEMO-final-package\.md" title="make-it-work\/DEMO\/DEMO-final-package\.md">DEMO-final-package\.md<\/a>/);
  assert.doesNotMatch(html, /spec\/plan\/execute\/review\/final package\/state\/dashboard/);
  assert.match(html, /Session timing: rows 1→13 above span 12m/);
  assert.match(html, /href="DEMO-review\.md" title="make-it-work\/DEMO\/DEMO-review\.md">DEMO-review\.md<\/a>/);
  assert.match(html, /phase-dot passed[^>]+complete:/);
  assert.doesNotMatch(html, /phase-dot current/);
});

test('marks legacy phase durations unavailable and escapes state-derived HTML', async (t) => {
  const state = stateMarkdown({
    fields: {
      phase: 'close-the-gaps', autonomy: 'guided', real_rows_from: '2',
      current_activity: '<script>alert("x")</script>',
    },
    regressions: ['Unsafe <b>markup</b>'],
    findings: ['A & B'],
    rows: [
      ['2026-01-01T10:00:00Z', 'start', 'context-check', 'Legacy row'],
      ['2026-01-01T10:01:30Z', 'context-check', 'close-the-gaps', 'Contains \\| pipe & <tag>'],
    ],
  });
  const { html } = await renderFixture(t, state);

  assert.match(html, /phase-duration">—<\/div>/);
  assert.match(html, /phase-activity">&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;<\/p>/);
  assert.match(html, /Contains \| pipe &amp; &lt;tag&gt;/);
  assert.match(html, /Unsafe &lt;b&gt;markup&lt;\/b&gt;/);
  assert.match(html, /A &amp; B/);
  assert.match(html, /<h2>Unrelated test failures<\/h2>\s*<ul>/);
  assert.match(html, /<h2>Review decisions<\/h2>\s*<ul>/);
  assert.doesNotMatch(html, /<h2>Known regressions<\/h2>|<h2>Decided findings<\/h2>/);
  assert.match(html, /everything before row 2 happened before any real timestamp was captured/);
});

test('withholds durations when audit timestamps are later than the state checkpoint', async (t) => {
  const state = stateMarkdown({
    fields: { phase: 'review' },
    rows: [
      ['2026-01-01T10:00:00Z', 'start', 'context-check', 'Started'],
      ['2026-01-01T10:01:00Z', 'context-check', 'execute', 'Execution started'],
      ['2099-01-01T10:00:00Z', 'execute', 'review', 'Execution done'],
    ],
  });
  const { html } = await renderFixture(t, state);

  assert.match(html, /Timing unavailable: audit row 3 is later than the state file/);
  assert.match(html, /timestamp later than state checkpoint/);
  assert.match(html, /phase-duration">—<\/div>/);
  assert.doesNotMatch(html, /Session timing: rows/);
});

test('rejects unsafe artifact paths', async (t) => {
  const markdown = stateMarkdown({
    fields: { spec: 'make-it-work/../secret.md' },
    rows: [['2026-01-01T10:00:00Z', 'start', 'context-check', 'New run created']],
  });
  const directory = await workspace(t);
  const statePath = path.join(directory, 'DEMO-state.md');
  await writeFile(statePath, markdown);
  await assert.rejects(generateDashboard(statePath), /must be under make-it-work\/DEMO\//);
});

test('rejects malformed timestamps and ticket filename mismatches', () => {
  const invalidTime = stateMarkdown({
    rows: [['not-a-time', 'start', 'context-check', 'New run created']],
  });
  assert.throws(() => parseState(invalidTime, '/tmp/DEMO-state.md'), /invalid ISO 8601 UTC timestamp/);

  const valid = stateMarkdown({
    rows: [['2026-01-01T10:00:00Z', 'start', 'context-check', 'New run created']],
  });
  assert.throws(() => parseState(valid, '/tmp/OTHER-state.md'), /filename must match its ticket field/);
});

test('renderer failure preserves an existing dashboard', async (t) => {
  const directory = await workspace(t);
  const statePath = path.join(directory, 'DEMO-state.md');
  const outputPath = path.join(directory, 'DEMO-status.html');
  const state = stateMarkdown({
    fields: { phase: 'execute', plan: 'make-it-work/DEMO/DEMO-plan.md' },
    rows: [
      ['2026-01-01T10:00:00Z', 'start', 'context-check', 'New run created'],
      ['2026-01-01T10:01:00Z', 'context-check', 'execute', 'Reuse plan'],
    ],
  });
  await writeFile(statePath, state);
  await writeFile(outputPath, 'sentinel');

  await assert.rejects(generateDashboard(statePath), /Could not read the plan required/);
  assert.equal(await readFile(outputPath, 'utf8'), 'sentinel');
});

test('accepts and renders the scoped+full gate', async (t) => {
  const state = stateMarkdown({ fields: { gate: 'scoped+full' }, rows: [['2026-01-01T10:00:00Z', 'start', 'context-check', 'New run created']] });
  assert.equal(parseState(state).fields.gate, 'scoped+full');
  const { html } = await renderFixture(t, state);
  assert.match(html, /DEMO/);
});

function completedState() {
  return stateMarkdown({
    fields: { status: 'Complete', phase: 'complete', autonomy: 'guided', final_package_version: '1', review: 'clean', execution: 'passed' },
    rows: [
      ['2026-01-01T10:00:00Z', 'start', 'final-sync', 'Syncing'],
      ['2026-01-01T10:01:00Z', 'final-sync', 'complete', 'Implementation complete'],
    ],
  });
}

async function deliveryFixture(t, { status, repos = {}, names = ['api'], legacy = false, error = null } = {}) {
  const rendered = await renderFixture(t, completedState());
  const plan = { version: 1, ticket: 'DEMO', repos: names.map((name) => ({ name, provider: 'github', owner: 'example', repo: name })) };
  const progress = { version: 1, plan_sha256: createHash('sha256').update(JSON.stringify(plan)).digest('hex'), repos,
    ...(!legacy ? { status, error, started_at: '2026-01-01T10:02:00Z', updated_at: '2026-01-01T10:04:00Z',
      ...(['delivered', 'failed', 'partial'].includes(status) ? { completed_at: '2026-01-01T10:04:00Z' } : {}) } : {}) };
  await writeFile(path.join(rendered.directory, 'DEMO-delivery-plan.json'), JSON.stringify(plan));
  await writeFile(path.join(rendered.directory, 'DEMO-delivery-progress.json'), JSON.stringify(progress));
  const statePath = path.join(rendered.directory, 'DEMO-state.md');
  await generateDashboard(statePath);
  return { ...rendered, statePath, html: await readFile(rendered.outputPath, 'utf8') };
}

const deliveredRepo = (name = 'api') => ({ commit: 'a'.repeat(40), pushed: 'a'.repeat(40), pr: { url: `https://github.com/example/${name}/pull/1`, action: 'created' } });

test('completion keeps polling through delivery choice and approval without reopening implementation', async (t) => {
  const initial = await renderFixture(t, completedState());
  assert.match(initial.html, /<meta http-equiv="refresh"/);
  const awaiting = await deliveryFixture(t, { status: 'awaiting-approval' });
  assert.match(awaiting.html, /phase-mode">Awaiting approval/);
  assert.match(awaiting.html, /<meta http-equiv="refresh"/);
  assert.match(awaiting.html, /phase-dot passed[^>]+complete:/);
  const running = await deliveryFixture(t, { status: 'running', repos: { api: { commit: 'a'.repeat(40) } } });
  assert.match(running.html, /phase-dot current spinning[^>]+Optional delivery: Running/);
  assert.match(running.html, /Not pushed/);
  assert.doesNotMatch(running.html, /Changes remain local and uncommitted/);
  assert.equal(await readFile(running.statePath, 'utf8'), completedState());
});

test('delivered dashboard shows commit and PR links, stops polling and preserves implementation timing', async (t) => {
  const { html, statePath } = await deliveryFixture(t, { status: 'delivered', repos: { api: deliveredRepo() } });
  assert.match(html, /phase-dot passed[^>]+Optional delivery: Delivered/);
  assert.match(html, /Changes committed and pushed; pull requests opened or updated/);
  assert.match(html, /href="https:\/\/github.com\/example\/api\/commit\/a{40}"/);
  assert.match(html, /href="https:\/\/github.com\/example\/api\/pull\/1"/);
  assert.match(html, /Real-timestamped portion of this run: 1m\./);
  assert.match(html, /phase-mode">Delivered<\/div>[\s\S]*phase-duration">2m/);
  assert.doesNotMatch(html, /http-equiv="refresh"|Changes remain local and uncommitted/);
  assert.equal(await readFile(statePath, 'utf8'), completedState());
});

test('partial multi-repo delivery retains completed results and the failed repo instead of a false complete', async (t) => {
  const { html } = await deliveryFixture(t, { status: 'partial', names: ['api', 'ui'],
    repos: { api: deliveredRepo(), ui: { commit: 'b'.repeat(40), pushed: 'b'.repeat(40) } }, error: 'PR creation failed for ui' });
  assert.match(html, /phase-mode">Partially delivered/);
  assert.match(html, /PR creation failed for ui/);
  assert.match(html, /<td>ui<\/td>[\s\S]*<td>Pushed<\/td><td>Not created/);
  assert.match(html, /href="https:\/\/github.com\/example\/api\/pull\/1"/);
  assert.doesNotMatch(html, /http-equiv="refresh"|Changes remain local and uncommitted/);
  const failed = await deliveryFixture(t, { status: 'failed', error: 'Missing delivery credentials' });
  assert.match(failed.html, /Delivery failed/);
  assert.match(failed.html, /phase-mode">Failed/);
});

test('legacy journals are inferred using every planned repo and invalid records never claim delivery', async (t) => {
  const complete = await deliveryFixture(t, { legacy: true, repos: { api: deliveredRepo() } });
  assert.match(complete.html, /phase-mode">Delivered/);
  const partial = await deliveryFixture(t, { legacy: true, names: ['api', 'ui'], repos: { api: deliveredRepo() } });
  assert.match(partial.html, /phase-mode">Partially delivered/);
  const invalid = await deliveryFixture(t, { status: 'delivered', repos: {} });
  assert.match(invalid.html, /Status unavailable/);
  assert.doesNotMatch(invalid.html, /Changes committed and pushed/);
});

test('declining delivery stops refresh; delivery strings and external links are escaped', async (t) => {
  const declined = await deliveryFixture(t, { status: 'declined' });
  assert.match(declined.html, /phase-mode">Not requested/);
  assert.doesNotMatch(declined.html, /http-equiv="refresh"/);
  const escaped = await deliveryFixture(t, { status: 'partial', names: ['<script>'],
    repos: { '<script>': { commit: 'c'.repeat(40), pr: { id: 3, url: 'javascript:alert(1)' } } }, error: '<img src=x onerror=alert(1)>' });
  assert.match(escaped.html, /&lt;script&gt;/);
  assert.match(escaped.html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(escaped.html, /Created \(link unavailable\)/);
  assert.doesNotMatch(escaped.html, /href="javascript:|<img src=x/);
});

const USER_DECISION = {
  id: 'publication-consent-2', topic: 'Ticket publication', source: 'user', via: 'question',
  choice: 'Comments and attachments only', scope: 'DEMO at example.atlassian.net, current run; description excluded',
  reference: 'publication journal, consent revision 2', resume: 'transparent',
};

test('decision checkpoints retain fields, capture host time, and render safely', async (t) => {
  const original = stateMarkdown({ rows: [['2026-01-01T10:00:00Z', 'start', 'context-check', 'New run']] });
  const { directory, outputPath } = await renderFixture(t, original);
  const statePath = path.join(directory, 'DEMO-state.md');
  const input = { ...USER_DECISION, choice: 'Use <script> | C:\\drafts & &#124;', reason: 'Review before sending' };
  const before = Date.now();
  const result = await checkpointDecision(statePath, input);
  const state = parseState(await readFile(statePath, 'utf8'));
  const last = state.audit.at(-1);
  assert.deepEqual(state.fields, parseState(original).fields);
  assert.equal(last.from, 'context-check');
  assert.equal(last.to, 'context-check');
  assert.equal(last.decision.id, input.id);
  assert.ok(last.epoch >= before && last.epoch <= Date.now());
  assert.ok(last.outcome.includes(input.choice));
  assert.ok(last.outcome.includes(input.scope));
  assert.ok(last.outcome.includes('source: user; via: question'));
  assert.equal(result.dashboard, outputPath);
  const html = await readFile(outputPath, 'utf8');
  assert.ok(html.includes('Use &lt;script&gt; | C:\\drafts &amp; &amp;#124;'));
  assert.doesNotMatch(html, /<script> \||decision-id:/);
});

test('decision IDs make retries idempotent and changed decisions append history', async (t) => {
  const { directory } = await renderFixture(t, stateMarkdown({ rows: [['2026-01-01T10:00:00Z', 'start', 'context-check', 'New run']] }));
  const statePath = path.join(directory, 'DEMO-state.md');
  await checkpointDecision(statePath, USER_DECISION);
  const saved = await readFile(statePath, 'utf8');
  await checkpointDecision(statePath, USER_DECISION);
  assert.equal(await readFile(statePath, 'utf8'), saved);
  await assert.rejects(checkpointDecision(statePath, { ...USER_DECISION, choice: 'Allow description edits' }), /already records a different decision/);
  assert.equal(await readFile(statePath, 'utf8'), saved);
  await checkpointDecision(statePath, { ...USER_DECISION, id: 'publication-consent-3', choice: 'Keep everything local', scope: 'DEMO, current run; no tracker writes', via: 'chat' });
  const state = parseState(await readFile(statePath, 'utf8'));
  assert.equal(state.audit.length, 3);
  assert.ok(state.audit[1].outcome.includes('Comments and attachments only'));
  assert.ok(state.audit[2].outcome.includes('Keep everything local'));
});

test('decision checkpoints do not backfill a missing dashboard or overwrite following sections', async (t) => {
  const directory = await workspace(t);
  const statePath = path.join(directory, 'DEMO-state.md');
  const notes = '\n## Additional notes\n\nUser-authored text.\n';
  await writeFile(statePath, stateMarkdown({ rows: [['2026-01-01T10:00:00Z', 'start', 'context-check', 'New run']] }) + notes);
  const result = await checkpointDecision(statePath, USER_DECISION);
  assert.equal(result.dashboard, null);
  assert.ok((await readFile(statePath, 'utf8')).endsWith(notes));
  assert.equal(parseState(await readFile(statePath, 'utf8')).audit.length, 2);
  await assert.rejects(readFile(path.join(directory, 'DEMO-status.html')), { code: 'ENOENT' });
});

test('render failure preserves decision evidence and retry repairs the dashboard once', async (t) => {
  const directory = await workspace(t);
  const statePath = path.join(directory, 'DEMO-state.md');
  const outputPath = path.join(directory, 'DEMO-status.html');
  await writeFile(statePath, stateMarkdown({ fields: { phase: 'execute', plan: 'make-it-work/DEMO/DEMO-plan.md' }, rows: [['2026-01-01T10:00:00Z', 'plan', 'execute', 'Plan accepted']] }));
  await writeFile(outputPath, 'Existing dashboard');
  await assert.rejects(checkpointDecision(statePath, USER_DECISION), /Could not read the plan required for timeline progress/);
  assert.equal(parseState(await readFile(statePath, 'utf8')).audit.length, 2);
  assert.equal(await readFile(outputPath, 'utf8'), 'Existing dashboard');
  await writeFile(path.join(directory, 'DEMO-plan.md'), planMarkdown());
  await checkpointDecision(statePath, USER_DECISION);
  assert.equal(parseState(await readFile(statePath, 'utf8')).audit.length, 2);
  assert.ok((await readFile(outputPath, 'utf8')).includes('Comments and attachments only'));
});

test('resume distinguishes transparent decisions from interrupted in-phase choices and transitions', async (t) => {
  const { directory } = await renderFixture(t, stateMarkdown({ fields: { phase: 'plan' }, rows: [['2026-01-01T10:00:00Z', 'context-check', 'plan', 'Ready to plan']] }));
  const statePath = path.join(directory, 'DEMO-state.md');
  await checkpointDecision(statePath, USER_DECISION);
  let state = parseState(await readFile(statePath, 'utf8'));
  assert.equal(lastWorkRow(state.audit).number, 1);
  await checkpointDecision(statePath, { id: 'test-policy-1', topic: 'Verification', source: 'user', via: 'chat', choice: 'Manual', scope: 'DEMO, repo A' });
  await checkpointDecision(statePath, { ...USER_DECISION, id: 'publication-consent-3', choice: 'Keep local' });
  state = parseState(await readFile(statePath, 'utf8'));
  assert.equal(lastWorkRow(state.audit).number, 3);
  assert.equal(lastWorkRow(state.audit).decision.resume, 'in-phase');
  const transition = { from: 'plan', to: 'execute', outcome: 'Decision: Plan approved' };
  const legacy = { from: 'execute', to: 'execute', outcome: 'Decision: Autonomy changed autopilot -> guided' };
  const publication = { ...legacy, outcome: 'Decision: Ticket publication permission revoked' };
  assert.equal(lastWorkRow([transition, legacy, publication]), transition);
  const executionMode = { ...legacy, outcome: 'Decision: Execution mode Inline' };
  assert.equal(lastWorkRow([transition, executionMode, publication]), executionMode);
  assert.equal(lastWorkRow([]), null);
});

test('post-completion delivery decisions preserve implementation timing and feedback counts', async (t) => {
  const original = stateMarkdown({ fields: { status: 'Complete', phase: 'complete' }, rows: [
    ['2026-01-01T10:00:00Z', 'start', 'context-check', 'New run'],
    ['2026-01-01T10:05:00Z', 'execute', 'review', 'Review cycle 1'],
    ['2026-01-01T10:10:00Z', 'final-sync', 'complete', 'Complete'],
  ] });
  const { directory, html: before } = await renderFixture(t, original);
  const statePath = path.join(directory, 'DEMO-state.md');
  await checkpointDecision(statePath, { ...USER_DECISION, id: 'delivery-plan-abc', topic: 'Delivery approval', choice: 'Deliver this exact plan after Review cycle 7', reference: 'delivery plan hash abc' });
  const after = await readFile(path.join(directory, 'DEMO-status.html'), 'utf8');
  assert.equal(after.match(/<p class="session-timing">.*?<\/p>/)[0], before.match(/<p class="session-timing">.*?<\/p>/)[0]);
  assert.ok(after.includes('Real-timestamped portion of this run: 10m.'));
  assert.ok(after.includes('Deliver this exact plan after Review cycle 7'));
  const markdown = await readFile(statePath, 'utf8');
  const state = parseState(markdown);
  assert.deepEqual(state.fields, parseState(original).fields);
  const feedback = inspectState(markdown);
  assert.equal(feedback.reviewCycles, 1);
  assert.equal(feedback.fixRounds, 0);
  assert.equal(feedback.replans, 0);
  assert.equal(lastWorkRow(state.audit).to, 'complete');
});

test('invalid decision inputs cannot alter state or imply a user approval', async (t) => {
  const original = stateMarkdown({ rows: [['2026-01-01T10:00:00Z', 'start', 'context-check', 'New run']] });
  const directory = await workspace(t);
  const statePath = path.join(directory, 'DEMO-state.md');
  await writeFile(statePath, original);
  for (const changes of [{ id: '../other' }, { source: 'user', via: 'policy' }, { source: 'autopilot', via: 'question' }, { choice: 'yes\n| forged row |' }, { source: 'default' }, { resume: 'skip' }, { scope: '' }, { time: '2020-01-01' }]) {
    await assert.rejects(checkpointDecision(statePath, { ...USER_DECISION, ...changes }));
    assert.equal(await readFile(statePath, 'utf8'), original);
  }
  await checkpointDecision(statePath, { ...USER_DECISION, source: 'autopilot', via: 'policy', choice: 'Keep local by default' });
  const state = parseState(await readFile(statePath, 'utf8'));
  assert.ok(state.audit.at(-1).outcome.includes('source: autopilot; via: policy'));
});

test('decision and resume CLI commands handle JSON input files and preserve read-only resume', async (t) => {
  const directory = await workspace(t);
  const statePath = path.join(directory, 'DEMO-state.md');
  const inputPath = path.join(directory, 'decision input.json');
  await writeFile(statePath, stateMarkdown({ rows: [['2026-01-01T10:00:00Z', 'start', 'context-check', 'New run']] }));
  await writeFile(inputPath, JSON.stringify(USER_DECISION));
  const script = fileURLToPath(new URL('./dashboard-checkpoint.mjs', import.meta.url));
  const run = (...args) => JSON.parse(execFileSync(process.execPath, [script, ...args], { encoding: 'utf8' }));
  assert.deepEqual(run('decision', '--state', statePath, '--input', inputPath), { row: 2, dashboard: null });
  const saved = await readFile(statePath, 'utf8');
  assert.equal(run('resume', '--state', statePath).last_work_row.number, 1);
  assert.equal(await readFile(statePath, 'utf8'), saved);
  assert.deepEqual(run('decision', '--state', statePath, '--input', inputPath), { row: 2, dashboard: null });
  assert.equal(await readFile(statePath, 'utf8'), saved);
});

test('post-completion decisions cannot create implementation timing for a legacy run', async (t) => {
  const { directory, html: before } = await renderFixture(t, stateMarkdown({
    fields: { status: 'Complete', phase: 'complete', start_time: 'none', real_rows_from: '3' },
    rows: [
      ['2026-01-01T10:00:00Z', 'start', 'context-check', 'Legacy start'],
      ['2026-01-01T10:00:00Z', 'final-sync', 'complete', 'Legacy complete'],
    ],
  }));
  await checkpointDecision(path.join(directory, 'DEMO-state.md'), USER_DECISION);
  const after = await readFile(path.join(directory, 'DEMO-status.html'), 'utf8');
  assert.ok(before.includes('Elapsed: unknown'));
  assert.ok(after.includes('Elapsed: unknown'));
  assert.doesNotMatch(after, /Session timing: rows/);
});

const ADAPTIVE_FIELDS = {
  adaptive_version: '1', risk: 'low', mode: 'lightweight', mode_source: 'assessed',
  risk_rationale: 'Single-file <copy> change', escalations: '0', implementation_report: 'none',
};

function timelineHtml(html) {
  return html.slice(html.indexOf('<div class="phase-timeline">'), html.indexOf('<p class="timeline-scroll-hint">'));
}

function timelineLabels(html) {
  return [...timelineHtml(html).matchAll(/class="phase-label[^"]*">([^<]+)/g)].map((match) => match[1]);
}

test('lightweight run skips Plan and Execute and adds Fix (Lightweight) re-entries', async (t) => {
  const { html } = await renderFixture(t, stateMarkdown({
    fields: {
      ...ADAPTIVE_FIELDS, phase: 'lightweight', autonomy: 'autonomous', spec: 'make-it-work/DEMO/DEMO-spec.md',
      implementation_report: 'make-it-work/DEMO/DEMO-lightweight.md', review: 'fix-required', review_cycle: '1', fix_cycle: '1',
      current_activity: 'Fixing review findings.',
    },
    rows: [
      ['2026-01-01T10:00:00Z', 'start', 'context-check', 'New run created'],
      ['2026-01-01T10:01:00Z', 'context-check', 'close-the-gaps', 'Context ready'],
      ['2026-01-01T10:02:00Z', 'close-the-gaps', 'lightweight', 'Spec saved; Low risk → Lightweight'],
      ['2026-01-01T10:05:00Z', 'lightweight', 'review', 'Implemented'],
      ['2026-01-01T10:06:00Z', 'review', 'lightweight', 'Review requested fixes'],
    ],
  }));
  const timeline = timelineHtml(html);
  assert.deepEqual(timelineLabels(html), ['Context Check', 'Refinement', 'Plan', 'Execute', 'Implement (Lightweight)', 'Review', 'Fix (Lightweight)', 'Final Sync', 'Complete']);
  assert.equal((timeline.match(/phase-dot skipped" title="[a-z]+: Skipped \(Lightweight\)/g) ?? []).length, 2);
  assert.match(timeline, /phase-dot passed[^>]+lightweight: a fresh subagent implements the approved spec/);
  assert.match(timeline, /phase-dot current spinning[^>]+lightweight: a fresh subagent fixes the review findings/);
  assert.match(timeline, /phase-duration">3m<\/div>[\s\S]*phase-duration">1m<\/div>/);
  assert.match(html, /<strong>Fix \(Lightweight\) in progress<\/strong>/);
  const artifacts = html.slice(html.indexOf('<div class="artifact-grid">'), html.indexOf('<h2>Audit log</h2>'));
  assert.deepEqual([...artifacts.matchAll(/<div class="label">([^<]+)<\/div>/g)].map((match) => match[1]),
    ['Spec', 'Lightweight report', 'Review', 'Final package']);
  assert.doesNotMatch(artifacts, /Skipped/);
  assert.match(html, /Lightweight report<\/div><a href="DEMO-lightweight\.md"/);
});

test('escalation from review inserts Plan and Execute after the active slot in order', async (t) => {
  const { html } = await renderFixture(t, stateMarkdown({
    fields: {
      ...ADAPTIVE_FIELDS, mode: 'tdd', escalations: '1', phase: 'review', autonomy: 'autonomous',
      plan: 'make-it-work/DEMO/DEMO-plan.md', implementation_report: 'make-it-work/DEMO/DEMO-lightweight.md',
      execute_report: 'make-it-work/DEMO/DEMO-execute.md', execution: 'passed', review_cycle: '1',
    },
    rows: [
      ['2026-01-01T10:00:00Z', 'start', 'context-check', 'New run created'],
      ['2026-01-01T10:01:00Z', 'context-check', 'close-the-gaps', 'Context ready'],
      ['2026-01-01T10:02:00Z', 'close-the-gaps', 'lightweight', 'Low risk → Lightweight'],
      ['2026-01-01T10:04:00Z', 'lightweight', 'review', 'Implemented'],
      ['2026-01-01T10:05:00Z', 'review', 'plan', `Escalation: review found <auth> changes [workflow-event: escalate-1; sha256: ${'a'.repeat(64)}]`],
      ['2026-01-01T10:07:00Z', 'plan', 'plan-approval', 'Plan ready'],
      ['2026-01-01T10:08:00Z', 'plan-approval', 'execute', 'Plan approved'],
      ['2026-01-01T10:12:00Z', 'execute', 'review', 'Execution passed'],
    ],
  }));
  const timeline = timelineHtml(html);
  assert.deepEqual(timelineLabels(html), ['Context Check', 'Refinement', 'Plan', 'Execute', 'Implement (Lightweight)', 'Review', 'Plan', 'Execute', 'Review', 'Final Sync', 'Complete']);
  assert.equal((timeline.match(/phase-dot skipped/g) ?? []).length, 2);
  assert.match(timeline, /phase-dot passed" title="plan: Escalated: review found &lt;auth&gt; changes — [^"]+">✓[\s\S]*?Escalated to TDD/);
  assert.doesNotMatch(html, /workflow-event:|sha256:/);
  const durations = [...timeline.matchAll(/phase-duration">([^<]+)</g)].map((match) => match[1]);
  assert.deepEqual(durations, ['1m', '1m', '2m', '1m', '3m', '4m']);
  assert.match(timeline, /phase-dot current spinning[^>]+review:/);
  assert.match(html, /Mode: TDD · Low risk/);
  assert.doesNotMatch(html, /Cycle counters|Review cycles:|Fix cycles:|Replans used:|Escalations:/);
  assert.match(html, /Lightweight report<\/div><a href="DEMO-lightweight\.md"/);
  assert.match(html, /<div class="label">Plan<\/div><a href="DEMO-plan\.md"/);
  assert.match(html, /<div class="label">Execute<\/div><a href="DEMO-execute\.md"/);
});

test('escalation from a stopped lightweight phase keeps baseline Review after the new slots', async (t) => {
  const { html } = await renderFixture(t, stateMarkdown({
    fields: { ...ADAPTIVE_FIELDS, mode: 'tdd', escalations: '1', phase: 'plan', autonomy: 'autonomous' },
    rows: [
      ['2026-01-01T10:00:00Z', 'start', 'close-the-gaps', 'Started'],
      ['2026-01-01T10:02:00Z', 'close-the-gaps', 'lightweight', 'Low risk → Lightweight'],
      ['2026-01-01T10:04:00Z', 'lightweight', 'plan', 'Escalation: implementation touched shared schema'],
    ],
  }));
  assert.deepEqual(timelineLabels(html), ['Context Check', 'Refinement', 'Plan', 'Execute', 'Implement (Lightweight)', 'Plan', 'Review', 'Final Sync', 'Complete']);
  assert.match(timelineHtml(html), /phase-dot current spinning" title="plan: Escalated: implementation touched shared schema/);
});

test('mode pill appears only for adaptive runs and cycle counters stay out of the dashboard', async (t) => {
  const rows = [['2026-01-01T10:00:00Z', 'start', 'context-check', 'New run created']];
  const legacy = await renderFixture(t, stateMarkdown({ rows }));
  assert.doesNotMatch(legacy.html, /mode-pill|Mode: |Escalations|phase-dot skipped|Lightweight report/);
  assert.match(legacy.html, /<div class="label">Plan<\/div><span class="none">Not yet created<\/span>/);
  assert.match(legacy.html, /<div class="label">Execute<\/div><span class="none">Not yet created<\/span>/);
  assert.deepEqual(timelineLabels(legacy.html), ['Context Check', 'Refinement', 'Plan', 'Execute', 'Review', 'Final Sync', 'Complete']);

  const pending = await renderFixture(t, stateMarkdown({ fields: { ...ADAPTIVE_FIELDS, risk: 'none', mode: 'none', mode_source: 'none', risk_rationale: 'none' }, rows }));
  assert.match(pending.html, /Mode: Not yet assessed/);
  assert.doesNotMatch(pending.html, /phase-dot skipped/);

  const lightweight = await renderFixture(t, stateMarkdown({ fields: ADAPTIVE_FIELDS, rows }));
  assert.match(lightweight.html, /class="pill mode-pill mode-lightweight" title="Single-file &lt;copy&gt; change">Mode: Lightweight · Low risk<\/span>/);

  const forced = await renderFixture(t, stateMarkdown({ fields: { ...ADAPTIVE_FIELDS, risk: 'high', mode: 'tdd', mode_source: 'user' }, rows }));
  assert.match(forced.html, />Mode: TDD \(user\) · High risk<\/span>/);
  assert.doesNotMatch(forced.html, /phase-dot skipped|Skipped \(Lightweight\)/);
  for (const fixture of [legacy, pending, lightweight, forced]) {
    assert.doesNotMatch(fixture.html, /Cycle counters|Review cycles:|Fix cycles:|Replans used:|Escalations:/);
    const saved = parseState(await readFile(path.join(fixture.directory, 'DEMO-state.md'), 'utf8'));
    assert.equal(saved.fields.review_cycle, '0');
    assert.equal(saved.fields.fix_cycle, '0');
    assert.equal(saved.fields.replans_used, '0');
  }
});

test('phase lightweight renders without plan progress', async (t) => {
  const { html } = await renderFixture(t, stateMarkdown({
    fields: { ...ADAPTIVE_FIELDS, phase: 'lightweight', plan: 'none' },
    rows: [
      ['2026-01-01T10:00:00Z', 'start', 'close-the-gaps', 'Started'],
      ['2026-01-01T10:01:00Z', 'close-the-gaps', 'lightweight', 'Low risk → Lightweight'],
    ],
  }));
  assert.match(timelineHtml(html), /phase-dot current spinning[^>]+lightweight:/);
  assert.doesNotMatch(timelineHtml(html), /Step \d+ of/);
});

test('rejects invalid adaptive fields', () => {
  const rows = [['2026-01-01T10:00:00Z', 'start', 'context-check', 'New run created']];
  assert.equal(parseState(stateMarkdown({ fields: ADAPTIVE_FIELDS, rows })).fields.mode, 'lightweight');
  assert.throws(() => parseState(stateMarkdown({ fields: { ...ADAPTIVE_FIELDS, mode: 'fast' }, rows })), /Unsupported mode: fast/);
  assert.throws(() => parseState(stateMarkdown({ fields: { phase: 'lightweight' }, rows })), /Phase lightweight requires adaptive_version: 1/);
  assert.throws(() => parseState(stateMarkdown({ fields: { ...ADAPTIVE_FIELDS, escalations: '2' }, rows })), /"escalations" exceeds its limit of 1/);
  assert.throws(() => parseState(stateMarkdown({ fields: { ...ADAPTIVE_FIELDS, mode: 'tdd', phase: 'lightweight' }, rows })), /Phase lightweight requires mode: lightweight/);
});
