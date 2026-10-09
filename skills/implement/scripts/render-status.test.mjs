import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { generateDashboard, parseState } from './render-status.mjs';
import { checkpointDashboard } from './dashboard-checkpoint.mjs';

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
  const directory = await mkdtemp(path.join(os.tmpdir(), 'render-status-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
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
  assert.match(html, /phase-activity">Checking project context\.<\/div>/);
  assert.doesNotMatch(html, /class="session-timing"/);
  assert.match(html, /\(first real timestamp\)/);
  assert.doesNotMatch(html, /Waiting on you:/);
});

test('dashboard checkpoint updates activity and its rendered snapshot together', async (t) => {
  const directory = await workspace(t);
  const statePath = path.join(directory, 'DEMO-state.md');
  await writeFile(statePath, stateMarkdown({
    fields: { current_activity: 'none' },
    rows: [['2026-01-01T10:00:00Z', 'start', 'context-check', 'New run created']],
  }));

  const outputPath = await checkpointDashboard(statePath, { activity: 'Inspecting project context.' });
  const [state, html] = await Promise.all([readFile(statePath, 'utf8'), readFile(outputPath, 'utf8')]);
  assert.match(state, /^current_activity: Inspecting project context\.$/m);
  assert.match(html, /phase-activity">Inspecting project context\.<\/div>/);
});

test('dashboard checkpoint restores activity when rendering fails', async (t) => {
  const directory = await workspace(t);
  const statePath = path.join(directory, 'DEMO-state.md');
  await writeFile(statePath, stateMarkdown({
    fields: { phase: 'execute', plan: 'make-it-work/DEMO-plan.md', current_activity: 'none' },
    rows: [['2026-01-01T10:00:00Z', 'start', 'execute', 'Execution started']],
  }));

  await assert.rejects(checkpointDashboard(statePath, { activity: 'Running a step.' }), /Could not read the plan required for timeline progress/);
  assert.match(await readFile(statePath, 'utf8'), /^current_activity: none$/m);
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

test('renders completion, approval annotations, fix history, and repeated review', async (t) => {
  const rows = [
    ['2026-01-01T10:00:00Z', 'start', 'context-check', 'New run created'],
    ['2026-01-01T10:01:00Z', 'context-check', 'close-the-gaps', 'Context ready'],
    ['2026-01-01T10:02:00Z', 'close-the-gaps', 'spec-approval', 'Spec ready'],
    ['2026-01-01T10:03:00Z', 'spec-approval', 'plan', 'Approved as-is'],
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
      spec: 'make-it-work/DEMO-spec.md', plan: 'make-it-work/DEMO-plan.md',
      execute_report: 'make-it-work/DEMO-execute.md', review: 'clean',
      execution: 'passed', review_cycle: '2', fix_cycle: '1',
      fix_plan_round_steps: '2', pause_reason: 'none',
    },
    rows,
  });
  const { html } = await renderFixture(t, state, planMarkdown('Subagent-Driven', 4, 4));

  assert.equal((html.match(/class="phase-step"/g) ?? []).length, 9);
  assert.equal((html.match(/Review \(review-the-pr\)/g) ?? []).length, 2);
  assert.match(html, /phase-mode">Approved as-is<\/div>/);
  assert.match(html, /phase-mode">Subagent-Driven · Step 2 of 2 complete<\/div>/);
  assert.match(html, /class="complete"><strong>Run complete\.<\/strong> Real-timestamped portion of this run: 12m\./);
  assert.match(html, /Session timing: rows 1→13 above span 12m/);
  assert.match(html, /href="DEMO-review\.md">make-it-work\/DEMO-review\.md<\/a>/);
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
  assert.match(html, /phase-activity">&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;<\/div>/);
  assert.match(html, /Contains \| pipe &amp; &lt;tag&gt;/);
  assert.match(html, /Unsafe &lt;b&gt;markup&lt;\/b&gt;/);
  assert.match(html, /A &amp; B/);
  assert.match(html, /everything before row 2 happened before any real timestamp was captured/);
});

test('rejects unsafe artifact paths', async (t) => {
  const markdown = stateMarkdown({
    fields: { spec: 'make-it-work/../secret.md' },
    rows: [['2026-01-01T10:00:00Z', 'start', 'context-check', 'New run created']],
  });
  const directory = await workspace(t);
  const statePath = path.join(directory, 'DEMO-state.md');
  await writeFile(statePath, markdown);
  await assert.rejects(generateDashboard(statePath), /direct child of make-it-work/);
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
    fields: { phase: 'execute', plan: 'make-it-work/DEMO-plan.md' },
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
