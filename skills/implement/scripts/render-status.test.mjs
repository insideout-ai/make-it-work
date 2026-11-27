import { artifactJoin } from '../../../scripts/lib/artifact-path.mjs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { generateDashboard, parseState, buildTimeline, groupFinalization, renderStatus } from './render-status.mjs';
import { checkpointDashboard, checkpointDecision, checkpointResult, lostReview, recordLostReview } from './dashboard-checkpoint.mjs';
import { lastWorkRow } from './workflow-decisions.mjs';
import { runRegression } from '../../../scripts/regression.mjs';
import { inspectState, writeFeedback } from './write-feedback.mjs';
import { initializePublication, updatePublication } from './ticket-publication.mjs';
import { feedbackHold, feedbackStateHash } from './feedback-handoff.mjs';
import { finalizeFeedback } from './feedback-finalization.mjs';
import { feedbackReadback } from './feedback-readback.mjs';
import { FEEDBACK_EMAIL_URL, FEEDBACK_SHARING_REMINDER } from '../../../scripts/lib/feedback-sharing.mjs';
import { noteCell } from './audit-notes.mjs';
import { createPendingInput } from './pending-input.mjs';

async function reportReadEvents(reportPath) {
  const timestamp = new Date(Date.now() + 1000).toISOString();
  return [
    { type: 'assistant', timestamp, message: { content: [{ type: 'tool_use', id: 'read-feedback', name: 'Read', input: { file_path: reportPath } }] } },
    { type: 'user', timestamp, message: { content: [{ type: 'tool_result', tool_use_id: 'read-feedback', content: await readFile(reportPath, 'utf8') }] } },
  ];
}

function withoutFeedbackNotes(markdown) {
  return markdown.replace(/^\| \d+ \| [^\n]*\[audit-note: (?:activity|result); id: feedback-(?:start|saved|unavailable):[a-f0-9]{64}\] \|\n/gm, '');
}

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
  const root = await mkdtemp(artifactJoin(os.tmpdir(), 'render-status-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = artifactJoin(root, 'make-it-work', 'DEMO');
  await mkdir(directory, { recursive: true });
  return directory;
}

async function renderFixture(t, state, plan = null) {
  const directory = await workspace(t);
  const statePath = artifactJoin(directory, 'DEMO-state.md');
  await writeFile(statePath, state);
  if (plan !== null) await writeFile(artifactJoin(directory, 'DEMO-plan.md'), plan);
  const outputPath = await generateDashboard(statePath);
  return { directory, outputPath, html: await readFile(outputPath, 'utf8') };
}

test('generated dashboard opens its spec and audit links in readable previews', async t => {
  const state = stateMarkdown({ fields: { spec: 'make-it-work/DEMO/DEMO-spec.md' }, rows: [['2026-01-01T10:00:00Z', 'context-check', 'context-check', 'Checking context']] });
  const f = await renderFixture(t, state);
  const spec = artifactJoin(f.directory, 'DEMO-spec.md');
  await writeFile(spec, '# Session payment details\n\n## Acceptance criteria\n\n```gherkin\nGiven a paid session\nThen show its payment date\n```\n');
  await generateDashboard(artifactJoin(f.directory, 'DEMO-state.md'));
  const html = await readFile(f.outputPath, 'utf8');
  assert.match(html, /href="DEMO-spec.md.preview.html"[^>]*target="_blank" rel="noopener noreferrer"/);
  const preview = await readFile(`${spec}.preview.html`, 'utf8');
  assert.match(preview, /<h1 id="session-payment-details">/);
  assert.match(preview, /<code class="language-gherkin">/);
  assert.match(preview, /href="DEMO-status.html">Back to dashboard/);
  assert.equal(await readFile(artifactJoin(f.directory, 'DEMO-state.md'), 'utf8'), state);
});

// Timing/history tests render a session whose feedback was already finalized.
async function renderSettledFixture(t, state, plan = null) {
  const f = await renderFixture(t, state, plan), statePath = artifactJoin(f.directory, 'DEMO-state.md');
  const parsed = parseState(state), runId = parsed.fields.start_time, stateHash = feedbackStateHash(parsed.fields, parsed.audit);
  const block = `<!-- run:${runId} -->\n### Session review\n<!-- feedback-state:${stateHash} -->\n<!-- /run:${runId} -->\n`;
  await writeFile(artifactJoin(f.directory, 'workflow-feedback.md'), block);
  await writeFile(artifactJoin(path.dirname(f.directory), 'implement-feedback.md'), block);
  const reportPath = artifactJoin(f.directory, 'workflow-feedback.md');
  const readback = feedbackReadback(await reportReadEvents(reportPath), { reportPath, report: block, modifiedAt: (await stat(reportPath)).mtimeMs, terminalTime: Date.parse(runId), root: f.directory });
  await finalizeFeedback(statePath, { runId, stateHash, status: 'saved', kind: 'fixture', readback }, { now: () => parsed.audit.findLast(row => row.to === 'complete' && row.from !== row.to)?.time ?? parsed.audit.at(-1).time });
  await generateDashboard(statePath);
  return { ...f, html: await readFile(f.outputPath, 'utf8') };
}

test('terminal dashboard collects session feedback then refreshes to saved with informational audit notes and unchanged approval artifacts', async t => {
  const state = stateMarkdown({ fields: { status: 'Complete', phase: 'complete' }, rows: [['2026-01-01T10:01:00Z', 'final-approval', 'complete', 'Completed']] });
  const f = await renderFixture(t, state);
  const statePath = artifactJoin(f.directory, 'DEMO-state.md');
  assert.match(f.html, /data-workflow-feedback-status="collecting"/);
  assert.match(f.html, /Session retrospective: Collecting feedback/);
  assert.match(f.html, /Finalizing session\./);
  assert.doesNotMatch(f.html, /<strong>Implementation complete\./);
  assert.match(f.html, /http-equiv="refresh"/);
  const approvalPath = artifactJoin(f.directory, 'DEMO-final-package.approval.json');
  await writeFile(approvalPath, 'Historical approval bytes');
  const result = await writeFeedback(statePath, { sessionReview: { version: 2, status: 'pending', context: ['Available conversation reviewed'], findings: [], userInput: [], limitations: ['Browser behavior unverified'] } });
  assert.equal(result.dashboardUpdated, true);
  const beforeReadback = await readFile(f.outputPath, 'utf8');
  assert.doesNotMatch(beforeReadback, /Email feedback|mailto:|Save this session’s feedback/);
  await feedbackHold({ hook_event_name: 'Stop' }, statePath, parseState(state).fields,
    await reportReadEvents(result.sessionOutputPath));
  const html = await readFile(f.outputPath, 'utf8');
  assert.match(html, /data-workflow-feedback-status="saved"/);
  assert.doesNotMatch(html, /class="feedback-progress"|Session retrospective: Feedback saved/);
  assert.equal((html.match(/Save this session’s feedback/g) ?? []).length, 1);
  assert.equal((html.match(/>Email feedback<\/a>/g) ?? []).length, 1);
  const encoded = html.match(/href="(mailto:[^"]+)"/)?.[1];
  assert.ok(encoded.includes('&amp;body='), 'The mailto query separator must be HTML-escaped.');
  const mailto = new URL(encoded.replaceAll('&amp;', '&'));
  assert.equal(mailto.pathname, 'insideoutaitech@gmail.com');
  assert.equal(mailto.searchParams.get('subject'), 'make-it-work workflow feedback');
  assert.equal(mailto.searchParams.get('body'), 'I would like to share my reviewed session feedback report.');
  assert.deepEqual([...mailto.searchParams.keys()], ['subject', 'body']);
  assert.equal(mailto.href, FEEDBACK_EMAIL_URL);
  assert.doesNotMatch(mailto.href, /DEMO|make-it-work\/|workflow-feedback\.md|file:|attachment/i);
  assert.ok(html.includes(FEEDBACK_SHARING_REMINDER));
  assert.doesNotMatch(html, /http-equiv="refresh"/);
  assert.equal(withoutFeedbackNotes(await readFile(statePath, 'utf8')), state);
  assert.equal(await readFile(approvalPath, 'utf8'), 'Historical approval bytes');
  await writeFile(result.sessionOutputPath, (await readFile(result.sessionOutputPath, 'utf8')) + '\nUpdated report body\n');
  await generateDashboard(statePath);
  assert.doesNotMatch(await readFile(f.outputPath, 'utf8'), /Email feedback|mailto:|Save this session’s feedback/);
  // A new run cannot inherit a saved badge from this run's report.
  await writeFile(statePath, state.replace('2026-01-01T10:00:00Z', '2026-01-01T09:59:00Z'));
  await generateDashboard(statePath);
  assert.match(await readFile(f.outputPath, 'utf8'), /data-workflow-feedback-status="collecting"/);
});

test('completion keeps assurance details in artifacts and links only the session export for sharing', async t => {
  const state = stateMarkdown({ fields: { status: 'Complete', phase: 'complete', final_package_version: '1' }, rows: [['2026-01-01T10:01:00Z', 'final-approval', 'complete', 'Completed']] });
  const f = await renderFixture(t, state);
  assert.doesNotMatch(f.html, /assurance-summary|Assurance:|Recorded verification limits/);
  assert.match(f.html, /href="DEMO-final-package\.md"/);
  const pkg = { version: 1, ticket: 'DEMO', repos: [{ name: 'app' }], review_scope: [{ repo: 'app', status: 'covered', limitations: [{ depth: 'skimmed', paths: ['old.js'], reason: 'Inherited work not fully assessed' }] }], ui_verification: { status: 'pending', note: 'No browser observations' }, validation: { mode: 'lightweight', result: 'No regression gate' }, open_nits: ['A nonblocking note'], known_regressions: [] };
  const packagePath = artifactJoin(f.directory, 'DEMO-final-package.json'), bytes = JSON.stringify(pkg);
  await writeFile(packagePath, bytes);
  await generateDashboard(artifactJoin(f.directory, 'DEMO-state.md'));
  const html = renderStatus({ state: parseState(state), template: '{{ASSURANCE_SUMMARY}} {{FEEDBACK_NOTE}}', logoBase64: '', feedback: { status: 'saved', shareReady: true }, assurance: { label: 'Limited', browser: 'pending', limitations: ['Inherited work not fully assessed'] } });
  assert.doesNotMatch(html, /Assurance:|Browser verification:|Inherited work not fully assessed|ASSURANCE_SUMMARY/);
  assert.match(html, /href="workflow-feedback.md"/);
  assert.match(html, /Share only this session export/);
  assert.equal(await readFile(packagePath, 'utf8'), bytes);
  assert.doesNotMatch(await readFile(f.outputPath, 'utf8'), /Assurance:|Inherited work not fully assessed/);
  assert.equal(await readFile(artifactJoin(f.directory, 'DEMO-state.md'), 'utf8'), state);
});

test('feedback belongs to finalization and optional delivery appears only after collection settles', () => {
  const state = parseState(stateMarkdown({ fields: { status: 'Complete', phase: 'complete', final_package_version: '1' }, rows: [['2026-01-01T10:01:00Z', 'final-approval', 'complete', 'Completed']] }));
  const options = { state, template: '{{STATUS_BANNER}} {{PHASE_TIMELINE}} {{FEEDBACK_PROGRESS}} {{FEEDBACK_NOTE}}', logoBase64: '' };
  const pending = renderStatus({ ...options, feedback: { status: 'collecting' } });
  assert.match(pending, /Finalizing session\./);
  assert.match(pending, /phase-dot current spinning/);
  assert.match(pending, /phase-mode">Collecting session feedback<\/div>/);
  assert.doesNotMatch(pending, /Optional delivery:/);
  assert.doesNotMatch(pending, /Email feedback|mailto:|Save this session’s feedback/);
  const unread = renderStatus({ ...options, feedback: { status: 'saved' } });
  assert.doesNotMatch(unread, /Email feedback|mailto:|Save this session’s feedback/);
  const saved = renderStatus({ ...options, feedback: { status: 'saved', shareReady: true } });
  assert.match(saved, /Implementation complete\./);
  assert.match(saved, /Optional delivery:/);
  assert.doesNotMatch(saved, /class="feedback-progress"/);
  assert.match(saved, /Save this session’s feedback/);
  assert.match(saved, /phase-mode">Session feedback saved<\/div>/);
  const unavailable = renderStatus({ ...options, feedback: { status: 'unavailable' } });
  assert.match(unavailable, /phase-mode">Session feedback unavailable<\/div>/);
  assert.match(unavailable, /data-workflow-feedback-status="unavailable"/);
  assert.doesNotMatch(unavailable, /class="feedback-progress"|href="workflow-feedback.md"|Email feedback|mailto:/);
  assert.doesNotMatch(unavailable, /phase-dot current spinning/);
});

test('automatic and standalone completion guidance use the same generic email link as the dashboard', async () => {
  const state = parseState(stateMarkdown({ fields: { status: 'Complete', phase: 'complete', artifact_naming_version: '1' }, rows: [['2026-01-01T10:01:00Z', 'final-approval', 'complete', 'Completed']] }));
  const html = renderStatus({ state, template: '{{FEEDBACK_NOTE}}', logoBase64: '', feedback: { status: 'saved', shareReady: true } });
  assert.match(html, /href="miw-workflow-feedback\.md"/);
  assert.ok(html.includes(`href="${FEEDBACK_EMAIL_URL.replaceAll('&', '&amp;')}"`), 'Artifact naming must not rewrite the mailto URL.');
  for (const relative of ['../references/feedback.md', '../../feedback-on-session/SKILL.md']) {
    const guidance = await readFile(new URL(relative, import.meta.url), 'utf8');
    const links = [...guidance.matchAll(/\[Email feedback\]\((mailto:[^)]+)\)/g)].map(match => match[1]);
    assert.deepEqual(links, [FEEDBACK_EMAIL_URL]);
    assert.ok(guidance.includes(FEEDBACK_SHARING_REMINDER));
  }
});

test('assessment badges appear only in final approval/completion after a recorded result, in both modes', () => {
  const report = { audit_id: 'change-assessment:fixture', complexity: 'Low', risk: 'Medium', completeness: 'partial', rationale: 'Missing analyzer; inspected "scope" <boundary>' };
  const rows = [
    ['2026-01-01T10:00:00Z', 'start', 'context-check', 'Started'],
    ['2026-01-01T10:01:00Z', 'final-approval', 'final-approval', noteCell({ kind: 'result', id: report.audit_id, text: 'Change assessment — Code complexity: Low; Production risk: Medium; completeness: partial', reference: 'DEMO-complexity.md' })],
  ];
  for (const mode of ['lightweight', 'tdd']) for (const phase of ['close-the-gaps', 'spec-approval', 'plan', 'plan-approval', 'execute', 'review', 'fix-plan', 'final-sync', 'final-approval', 'complete']) {
    const fields = { phase, status: phase === 'complete' ? 'Complete' : 'In Progress', final_package_version: '1', change_assessment_version: '1', adaptive_version: '1', mode, risk: 'low', mode_source: 'assessed', risk_rationale: 'Initial risk', escalations: '0', implementation_report: 'none' };
    const options = { state: parseState(stateMarkdown({ fields, rows })), template: '{{WORKFLOW_HEADER}} {{CHANGE_ASSESSMENT}}', logoBase64: '', planStatus: { mode: 'Inline', complete: 0, total: 1 }, assessment: report };
    const html = renderStatus(options);
    assert.doesNotMatch(html, /CHANGE_ASSESSMENT|<section|<h2>Change assessment/);
    if (['final-approval', 'complete'].includes(phase)) {
      assert.match(html, /class="pill assessment-low"[^>]*>Code complexity: Low/);
      assert.match(html, /class="pill assessment-medium"[^>]*>Production risk: Medium/);
      assert.match(html, /title="Completeness: partial\. Missing analyzer; inspected &quot;scope&quot; &lt;boundary&gt;"/);
      const row = html.indexOf('<span class="assessment-badge-row"');
      assert.ok(row > html.indexOf('Mode: '), 'Assessment badges must follow the primary settings in their own row.');
      assert.ok(html.indexOf('>Code complexity: Low') > row);
      assert.ok(html.indexOf('>Production risk: Medium') > row);
      const audit = renderStatus({ ...options, template: '{{AUDIT_ROWS}}' });
      assert.match(audit, /rationale: Missing analyzer; inspected &quot;scope&quot; &lt;boundary&gt;.*View assessment report/);
      assert.doesNotMatch(audit, /<boundary>/);
      assert.doesNotMatch(renderStatus({ ...options, template: '{{AUDIT_ROWS}}', assessment: { ...report, audit_id: 'another-assessment' } }), /rationale:/);
      assert.doesNotMatch(renderStatus({ ...options, assessment: { ...report, audit_id: 'not-recorded' } }), /Code complexity:|Production risk:|Assessment:/);
      delete fields.change_assessment_version;
      assert.doesNotMatch(renderStatus({ ...options, state: parseState(stateMarkdown({ fields, rows })) }), /Code complexity:|Production risk:|Assessment:/);
    } else assert.doesNotMatch(html, /Code complexity:|Production risk:|Assessment:|assessment-low|assessment-medium|assessment-badge-row/);
  }
});

test('partial unknown overall ratings use a neutral badge without borrowing individual repo ratings', () => {
  const id = 'change-assessment:partial';
  const state = parseState(stateMarkdown({ fields: { phase: 'final-approval', final_package_version: '1', change_assessment_version: '1' }, rows: [['2026-01-01T10:00:00Z', 'final-approval', 'final-approval', noteCell({ kind: 'result', id, text: 'Partial assessment', reference: 'DEMO-complexity.md' })]] }));
  const html = renderStatus({ state, template: '{{WORKFLOW_HEADER}} {{CHANGE_ASSESSMENT}}', logoBase64: '', assessment: { audit_id: id, complexity: null, risk: null, completeness: 'partial', rationale: 'One repository could not be assessed', repos: [{ complexity: 'Low', risk: 'Low' }] } });
  assert.match(html, /class="pill assessment-neutral"[^>]*>Assessment: Unavailable/);
  assert.match(html, /Completeness: partial\. One repository could not be assessed/);
  assert.doesNotMatch(html, /Code complexity:|Production risk:|CHANGE_ASSESSMENT/);
});

test('completion without an AC ledger never acquires a verified acceptance label', async (t) => {
  const rows = [['2026-01-01T10:01:00Z', 'final-approval', 'complete', 'Completed']];
  const current = await renderFixture(t, stateMarkdown({ fields: { status: 'Complete', phase: 'complete', verification_version: '1' }, rows }));
  assert.match(current.html, /Acceptance checks:<\/strong> Not recorded/);
  assert.doesNotMatch(current.html, /of \d+ verified|View verification report/);
  const legacy = await renderFixture(t, stateMarkdown({ fields: { status: 'Complete', phase: 'complete' }, rows }));
  assert.doesNotMatch(legacy.html, /class="acceptance-summary"/);
});

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
  assert.equal(await readFile(artifactJoin(directory, 'DEMO-state.md'), 'utf8'), state);
  assert.ok(parseState(state).audit[1].outcome.includes(marker));
});

test('package build audit links the package without displaying its approval fingerprint', async (t) => {
  const hash = createHash('sha256').update('final package').digest('hex');
  const reference = `make-it-work/DEMO/DEMO-final-package.md; sha256:${hash}`;
  const state = stateMarkdown({
    fields: { phase: 'final-approval', final_package_version: '1' },
    rows: [
      ['2026-01-01T10:00:00Z', 'review', 'final-approval', 'Review clean'],
      ['2026-01-01T10:01:00Z', 'final-approval', 'final-approval', `Result: Final approval package built.; evidence: ${reference}`],
      ['2026-01-01T10:02:00Z', 'final-approval', 'final-approval', `Result: Final approval package built.; evidence: ${reference} [audit-note: result; id: final-package:${hash}]`],
    ],
  });
  const { directory, html } = await renderFixture(t, state);
  assert.match(html, /Final approval package built\. <a href="DEMO-final-package\.md"[^>]*>View package<\/a>/);
  assert.doesNotMatch(html, new RegExp(hash));
  assert.match(html, /\(\+1m\)/);
  const saved = await readFile(artifactJoin(directory, 'DEMO-state.md'), 'utf8');
  assert.equal(saved, state);
  assert.ok(parseState(saved).audit[1].outcome.includes(reference));
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
  const statePath = artifactJoin(directory, 'DEMO-state.md');
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
  assert.equal(parseState(state).audit.at(-1).outcome, 'Activity: Inspecting project context.');
  assert.equal(lastWorkRow(parseState(state).audit).number, 1);

  await checkpointDashboard(statePath, { activity: 'Inspecting project context.' });
  assert.equal(await readFile(statePath, 'utf8'), state);

  await checkpointDashboard(statePath);
  assert.equal(await readFile(statePath, 'utf8'), state);
  assert.equal(await readFile(outputPath, 'utf8'), html);

  await checkpointDashboard(statePath, { activity: 'none' });
  assert.equal(parseState(await readFile(statePath, 'utf8')).fields.current_activity_updated_at, 'none');
  const cleared = await readFile(outputPath, 'utf8');
  assert.match(cleared, /No activity details have been reported yet/);
  assert.match(cleared, /Activity: Inspecting project context/);
  assert.doesNotMatch(cleared, /Last updated:|audit-note:/);
});

test('retains a delegated-work description through refresh and decisions until the parent reports its result', async (t) => {
  const { directory, outputPath } = await renderFixture(t, stateMarkdown({
    fields: { phase: 'plan' },
    rows: [['2026-01-01T10:00:00Z', 'start', 'plan', 'Planning started']],
  }));
  const statePath = artifactJoin(directory, 'DEMO-state.md');
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
  assert.ok(!finished.includes(`<p class="phase-activity">${activity}</p>`));
  assert.ok(finished.includes(`Activity: ${activity}`));
});

test('activity audit survives a render failure and identical retry repairs without a duplicate', async (t) => {
  const directory = await workspace(t);
  const statePath = artifactJoin(directory, 'DEMO-state.md');
  await writeFile(statePath, stateMarkdown({
    fields: { phase: 'execute', plan: 'make-it-work/DEMO/DEMO-plan.md', current_activity: 'Earlier activity.', current_activity_updated_at: '2026-01-01T10:00:00Z' },
    rows: [['2026-01-01T10:00:00Z', 'start', 'execute', 'Execution started']],
  }));

  await assert.rejects(checkpointDashboard(statePath, { activity: 'Running a step.' }), /Could not read the plan required for timeline progress/);
  const saved = await readFile(statePath, 'utf8');
  assert.equal(parseState(saved).audit.at(-1).outcome, 'Activity: Running a step.');
  await writeFile(artifactJoin(directory, 'DEMO-plan.md'), planMarkdown());
  await checkpointDashboard(statePath, { activity: 'Running a step.' });
  assert.equal(await readFile(statePath, 'utf8'), saved);
});

test('informational results are idempotent, escape text, and never replace resume or approval evidence', async (t) => {
  const { directory, outputPath } = await renderFixture(t, stateMarkdown({
    fields: { phase: 'final-approval', final_package_version: '1' },
    rows: [['2026-01-01T10:00:00Z', 'final-sync', 'final-approval', 'Context synced']],
  }));
  const statePath = artifactJoin(directory, 'DEMO-state.md');
  const before = parseState(await readFile(statePath, 'utf8'));
  const input = { id: 'package-1', text: 'Built <package> | ready', reference: 'file.md \\ & evidence' };
  await checkpointResult(statePath, input);
  const saved = await readFile(statePath, 'utf8');
  await checkpointResult(statePath, input);
  assert.equal(await readFile(statePath, 'utf8'), saved);
  await assert.rejects(checkpointResult(statePath, { ...input, text: 'Different result' }), /different result/);
  await assert.rejects(checkpointResult(statePath, { ...input, reference: undefined }), /evidence reference/);
  const state = parseState(saved);
  assert.deepEqual(state.fields, before.fields);
  assert.equal(lastWorkRow(state.audit).number, 1);
  assert.equal(state.audit.at(-1).outcome, 'Result: Built <package> | ready; evidence: file.md \\ & evidence');
  const html = await readFile(outputPath, 'utf8');
  assert.match(html, /Result: Built &lt;package&gt; \| ready/);
  assert.doesNotMatch(html, /audit-note:|package-1/);
});

test('audit results hide evidence hashes while retaining results, references and the original state', async (t) => {
  const { outputPath, directory } = await renderFixture(t, stateMarkdown({
    fields: { phase: 'final-approval', final_package_version: '1' },
    rows: [['2026-01-01T10:00:00Z', 'final-sync', 'final-approval', 'Context synced']],
  }));
  const statePath = artifactJoin(directory, 'DEMO-state.md');
  const hash = createHash('sha256').update('evidence digest').digest('hex');
  for (const [id, text, reference] of [
    ['readiness', 'Testing readiness complete. Baseline: pass.', `readiness.json; sha256:${hash}`],
    ['gate', 'Completion gate: PASS. 1 run; 2 unmapped.', `gate-1; manifest sha256:${hash}; result sha256:${hash}`],
    ['ledger', 'Verification ledger validated. Acceptance: 20 of 21 verified.', `verification.json; SHA-256: ${hash}`],
  ]) await checkpointResult(statePath, { id, text, reference });
  const before = await readFile(statePath, 'utf8');
  await generateDashboard(statePath);
  assert.equal(await readFile(statePath, 'utf8'), before);
  assert.ok(before.includes(hash));
  const html = await readFile(outputPath, 'utf8');
  assert.match(html, /Completion gate: PASS\. 1 run; 2 unmapped/);
  assert.match(html, /Acceptance: 20 of 21 verified/);
  assert.match(html, /readiness\.json|verification\.json/);
  assert.doesNotMatch(html, new RegExp(hash));
  assert.doesNotMatch(html, /manifest sha256|result sha256|SHA-256:/);
});

test('readiness results summarize the baseline and open reports without changing saved audit evidence', async t => {
  for (const prefix of ['', 'miw-']) {
    const report = `make-it-work/DEMO/${prefix}DEMO-testing-readiness.md`;
    const receipt = `make-it-work/DEMO/${prefix}DEMO-readiness-v1.json`;
    const hash = createHash('sha256').update('readiness evidence').digest('hex');
    const outcome = `Result: Testing readiness completed before planning. Baselines: app=pass.; evidence: ${receipt}; ${report}; sha256:${hash}`;
    const state = stateMarkdown({ fields: { phase: 'plan' }, rows: [
      ['2026-01-01T10:00:00Z', 'close-the-gaps', 'plan', 'Planning started'],
      ['2026-01-01T10:00:30Z', 'plan', 'plan', outcome],
    ] });
    const f = await renderFixture(t, state);
    await writeFile(artifactJoin(f.directory, `${prefix}DEMO-testing-readiness.md`), '# Testing readiness\n\nBaseline passed.\n');
    await generateDashboard(artifactJoin(f.directory, 'DEMO-state.md'));
    const html = await readFile(f.outputPath, 'utf8');
    assert.match(html, /<strong>Testing readiness passed<\/strong>/);
    assert.match(html, /Baseline tests passed for app\./);
    assert.match(html, /Ready to create the implementation plan\./);
    assert.ok(html.includes(`href="${prefix}DEMO-testing-readiness.md.preview.html"`));
    assert.match(html, /<td colspan="2" title="Phase unchanged">Plan<\/td>/);
    assert.match(html, /<td>close-the-gaps<\/td><td>plan<\/td>/);
    const details = html.match(/<details><summary>Technical details<\/summary>([\s\S]*?)<\/details>/)[1];
    assert.ok(details.includes(`href="${prefix}DEMO-readiness-v1.json"`));
    assert.ok(details.includes(hash));
    const visible = html.replace(/<details>[\s\S]*?<\/details>/g, '');
    assert.doesNotMatch(visible, /Baselines:|; evidence:|make-it-work\/DEMO\/|readiness-v1\.json|sha256:/);
    assert.equal(await readFile(artifactJoin(f.directory, 'DEMO-state.md'), 'utf8'), state);
  }
});

test('readiness summaries retain each repo failure, unrun baseline and manual policy in historical results', () => {
  const hash = 'a'.repeat(64);
  for (const baselines of ['api=pass, web=fail, jobs=not-run, docs=not-applicable', 'docs=not-applicable']) {
    const outcome = `Result: Testing readiness completed before planning. Baselines: ${baselines}.; evidence: make-it-work/DEMO/DEMO-readiness-v2.json; make-it-work/DEMO/DEMO-testing-readiness-v2.md; sha256:${hash}`;
    const state = parseState(stateMarkdown({ fields: { phase: 'plan', plan_version: '3' }, rows: [
      ['2026-01-01T10:00:00Z', 'plan', 'plan', outcome],
    ] }));
    const html = renderStatus({ state, template: '{{AUDIT_ROWS}}', logoBase64: '' });
    assert.match(html, /href="DEMO-testing-readiness-v2.md">View readiness report/);
    assert.match(html, /Manual verification selected for docs; no automated baseline was run\./);
    assert.doesNotMatch(html, /<strong>Testing readiness passed<\/strong>/);
    if (baselines.includes('fail')) {
      assert.match(html, /<li>Baseline tests passed for api\.<\/li>/);
      assert.match(html, /<li>Baseline tests failed for web\.<\/li>/);
      assert.match(html, /<li>Baseline tests were not run for jobs\.<\/li>/);
      assert.match(html, /Review baseline limitations before planning\./);
      assert.doesNotMatch(html, /Ready to create the implementation plan\./);
    }
  }
});

test('readiness rendering escapes repo names and leaves unknown or unsafe evidence as plain text', () => {
  const hash = 'a'.repeat(64);
  const outcome = (baseline, report = 'make-it-work/DEMO/DEMO-testing-readiness.md') =>
    `Result: Testing readiness completed before planning. Baselines: ${baseline}.; evidence: make-it-work/DEMO/DEMO-readiness-v1.json; ${report}; sha256:${hash}`;
  const outcomes = [outcome('<img src=x>=pass'), outcome('app=unknown'),
    outcome('app=pass', 'https://example.com/report.md'),
    outcome('app=pass', 'make-it-work/DEMO/../OTHER/report.md'),
    outcome('app=pass', 'make-it-work/DEMO/DEMO-testing-readiness-v2.md')];
  const state = parseState(stateMarkdown({ fields: { phase: 'plan' }, rows: outcomes.map((text, i) =>
    [`2026-01-01T10:0${i}:00Z`, 'plan', 'plan', text]) }));
  const html = renderStatus({ state, template: '{{AUDIT_ROWS}}', logoBase64: '' });
  assert.match(html, /Baseline tests passed for &lt;img src=x&gt;\./);
  assert.doesNotMatch(html, /<img|href="https:|href="[^\"]*\.\.\//);
  assert.equal((html.match(/View readiness report/g) ?? []).length, 1);
  assert.match(html, /app=unknown/);
});

test('regression audits actual pass, failure and no-result without advancing the workflow', async (t) => {
  const { directory } = await renderFixture(t, stateMarkdown({
    fields: { phase: 'execute', plan: 'make-it-work/DEMO/DEMO-plan.md' },
    rows: [['2026-01-01T10:00:00Z', 'plan', 'execute', 'Execution started']],
  }), planMarkdown());
  const statePath = artifactJoin(directory, 'DEMO-state.md');
  const originalFields = parseState(await readFile(statePath, 'utf8')).fields;
  for (const [id, code, expected] of [['pass', '', 'PASS'], ['fail', 'process.exit(2)', 'FAIL'], ['missing', null, 'NO RESULT']]) {
    await runRegression({ version: 1, mode: 'tokens', runs: [{ repo: 'app', cwd: directory, scope: 'full', command: code === null ? null : { bin: process.execPath, args: ['-e', code] } }] }, { statePath, auditId: id });
    const state = parseState(await readFile(statePath, 'utf8'));
    assert.ok(state.audit.at(-1).outcome.startsWith(`Result: Completion gate: ${expected}.`));
    assert.deepEqual(state.fields, originalFields);
    assert.equal(lastWorkRow(state.audit).number, 1);
  }
});

test('result history survives render failure and retry repairs it without another event', async (t) => {
  const directory = await workspace(t);
  const statePath = artifactJoin(directory, 'DEMO-state.md');
  const dashboardPath = artifactJoin(directory, 'DEMO-status.html');
  await writeFile(statePath, stateMarkdown({ fields: { phase: 'execute', plan: 'make-it-work/DEMO/DEMO-plan.md' },
    rows: [['2026-01-01T10:00:00Z', 'plan', 'execute', 'Execution started']] }));
  await writeFile(dashboardPath, 'Previous dashboard');
  const result = { id: 'gate-1', text: 'Completion gate: FAIL.', reference: 'gate evidence' };
  await assert.rejects(checkpointResult(statePath, result), /Could not read the plan/);
  const saved = await readFile(statePath, 'utf8');
  assert.equal(parseState(saved).audit.at(-1).note.kind, 'result');
  assert.equal(await readFile(dashboardPath, 'utf8'), 'Previous dashboard');
  await writeFile(artifactJoin(directory, 'DEMO-plan.md'), planMarkdown());
  await checkpointResult(statePath, result);
  assert.equal(await readFile(statePath, 'utf8'), saved);
  assert.match(await readFile(dashboardPath, 'utf8'), /Result: Completion gate: FAIL/);
});

test('regression CLI retains observed evidence when audit rendering fails, without rerunning for repair', async (t) => {
  const directory = await workspace(t);
  const statePath = artifactJoin(directory, 'DEMO-state.md');
  await writeFile(statePath, stateMarkdown({ fields: { phase: 'execute', plan: 'make-it-work/DEMO/DEMO-plan.md' },
    rows: [['2026-01-01T10:00:00Z', 'plan', 'execute', 'Execution started']] }));
  await writeFile(artifactJoin(directory, 'DEMO-status.html'), 'Previous dashboard');
  const manifest = artifactJoin(directory, 'gate.json');
  await writeFile(manifest, JSON.stringify({ version: 1, mode: 'full', runs: [{ repo: 'app', cwd: directory, scope: 'full',
    command: { bin: process.execPath, args: ['-e', 'require("node:fs").appendFileSync("gate-ran", "once\\n")'] } }] }));
  assert.throws(() => execFileSync(process.execPath, [path.resolve('scripts/regression.mjs'), 'run', '--input', manifest,
    '--state', statePath, '--audit-id', 'gate-v1'], { stdio: 'pipe' }), (error) => {
    assert.equal(JSON.parse(error.stdout.toString()).overall, 'pass');
    assert.match(error.stderr.toString(), /Could not read the plan/);
    return true;
  });
  const saved = await readFile(statePath, 'utf8');
  assert.equal(parseState(saved).audit.at(-1).note.id, 'regression:gate-v1');
  await writeFile(artifactJoin(directory, 'DEMO-plan.md'), planMarkdown());
  await checkpointDashboard(statePath);
  assert.equal(await readFile(artifactJoin(directory, 'gate-ran'), 'utf8'), 'once\n');
  assert.equal(await readFile(statePath, 'utf8'), saved);
});

test('result notes neither create a legacy dashboard nor inflate feedback review counts', async (t) => {
  const directory = await workspace(t);
  const statePath = artifactJoin(directory, 'DEMO-state.md');
  await writeFile(statePath, stateMarkdown({ fields: { status: 'Complete', phase: 'complete' },
    rows: [['2026-01-01T10:00:00Z', 'final-sync', 'complete', 'Review cycle 1 complete']] }));
  const before = inspectState(await readFile(statePath, 'utf8'));
  const result = await checkpointResult(statePath, { id: 'late-check', text: 'Review cycle 99 evidence checked.', reference: 'file.md' });
  assert.equal(result.dashboard, null);
  const after = inspectState(await readFile(statePath, 'utf8'));
  assert.equal(after.reviewCycles, before.reviewCycles);
  assert.deepEqual(after.events, before.events);
});

test('accepts and describes fully autonomous autopilot runs', async (t) => {
  const state = stateMarkdown({
    fields: { autonomy: 'autopilot' },
    rows: [['2026-01-01T10:00:00Z', 'start', 'context-check', 'New autopilot run created']],
  });
  const { html } = await renderFixture(t, state);

  assert.match(html, /Control: Autopilot/);
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
  const statePath = artifactJoin(directory, 'DEMO-state.md');
  let journal = initializePublication({ ticket: 'DEMO', workflow_start: DEFAULT_FIELDS.start_time }, {
    target: { tracker: 'ado', site: 'https://tracker.example.test', issue: 'DEMO <script>alert(1)</script>', url: 'https://tracker.example.test/DEMO' },
    original_description: 'PRIVATE ORIGINAL DESCRIPTION', mode: 'comments', allowed: ['comment'], artifact_comments: true,
    decision: { source: 'user', text: 'Autopilot + update ticket: publish the plan and summaries as comments.' },
  });
  const filename = `DEMO-ticket-publication-${journal.run_id}.json`;
  const journalPath = artifactJoin(directory, filename);
  const rows = [['2026-01-01T10:00:00Z', 'start', 'context-check', 'New run created']];
  const fields = { ticket_publication: `make-it-work/DEMO/${filename}` };
  await writeFile(journalPath, JSON.stringify(journal));
  for (const autonomy of ['autopilot', 'guided']) {
    await writeFile(statePath, stateMarkdown({ fields: { ...fields, autonomy }, rows }));
    const html = await readFile(await generateDashboard(statePath), 'utf8');
    assert.ok(html.includes(`Control: ${autonomy[0].toUpperCase() + autonomy.slice(1)}</span>`));
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
  assert.match(revoked, /Control: Guided<\/span>/);
});

test('unverifiable referenced permission shows Unknown without preventing dashboard rendering', async (t) => {
  const directory = await workspace(t);
  const statePath = artifactJoin(directory, 'DEMO-state.md');
  const filename = 'DEMO-ticket-publication-fixture.json';
  const journalPath = artifactJoin(directory, filename);
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
  const outside = artifactJoin(path.dirname(directory), 'outside.json');
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

test('groups finalization for both legacy and package-enabled runs', async (t) => {
  const rows = [['2026-01-01T10:00:00Z', 'start', 'context-check', 'New run created']];
  const legacy = await renderFixture(t, stateMarkdown({ rows }));
  assert.doesNotMatch(legacy.html, /class="phase-label[^"]*">Final Approval/);
  const current = await renderFixture(t, stateMarkdown({ fields: { final_package_version: '1' }, rows }));
  assert.match(current.html, /class="phase-label[^"]*">Finalizing/);
  assert.equal((current.html.match(/phase-dot not-reached/g) ?? []).length, 5);
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

  assert.equal((html.match(/phase-dot not-reached/g) ?? []).length, 6);
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
  const { html } = await renderSettledFixture(t, state, planMarkdown('Subagent-Driven', 4, 4));

  assert.equal((html.match(/class="phase-step(?: optional-step)?"/g) ?? []).length, 9);
  assert.equal((html.match(/Review<span class="phase-skill">\(review-the-code\)<\/span>/g) ?? []).length, 2);
  const completedStages = html.slice(html.indexOf('<div class="phase-timeline">'), html.indexOf('<div class="phase-step optional-step">'));
  assert.match(completedStages, /phase-mode">Session feedback saved/);
  assert.doesNotMatch(completedStages, /Spec approved by user|Approved as-is|Step 2 of 2 complete/);
  assert.ok(html.includes(approval));
  assert.match(html, /Decision: Fix round 1: added 2 steps covering 1 finding/);
  assert.match(completedStages, /phase-duration">2m<\/div>/);
  assert.match(html, /class="complete"><strong>Implementation complete\.<\/strong> Elapsed time \(includes waits and pauses\): 12m\./);
  assert.match(html, /class="phase-step optional-step"[\s\S]*class="phase-dot optional"[^>]+Optional delivery:/);
  assert.match(html, /class="phase-label">Deliver<\/div>[\s\S]*class="phase-mode">Optional<\/div>/);
  assert.doesNotMatch(html, /Optional next step:/);
  assert.match(html, /class="feedback-note"/);
  assert.match(html, /make-it-work\/implement-feedback\.md/);
  assert.match(html, /href="DEMO-final-package\.md" title="make-it-work\/DEMO\/DEMO-final-package\.md">DEMO-final-package\.md<\/a>/);
  assert.doesNotMatch(html, /spec\/plan\/execute\/review\/final package\/state\/dashboard/);
  assert.match(html, /Session timing: from row 1 through feedback finalization spans 12m/);
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
  const statePath = artifactJoin(directory, 'DEMO-state.md');
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
  const statePath = artifactJoin(directory, 'DEMO-state.md');
  const outputPath = artifactJoin(directory, 'DEMO-status.html');
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
  await writeFile(artifactJoin(rendered.directory, 'DEMO-delivery-plan.json'), JSON.stringify(plan));
  await writeFile(artifactJoin(rendered.directory, 'DEMO-delivery-progress.json'), JSON.stringify(progress));
  const statePath = artifactJoin(rendered.directory, 'DEMO-state.md');
  // Delivery follows the already-saved terminal feedback in these fixtures.
  await writeFeedback(statePath, { sessionReview: { version: 2, status: 'pending', context: ['Available conversation reviewed'], findings: [], userInput: [], limitations: ['Browser behavior unverified'] } });
  const receiptPath = artifactJoin(rendered.directory, 'feedback-finalized.json');
  const receipt = JSON.parse(await readFile(receiptPath, 'utf8'));
  receipt.finalizedAt = '2026-01-01T10:01:00Z';
  await writeFile(receiptPath, JSON.stringify(receipt));
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
  assert.equal(withoutFeedbackNotes(await readFile(running.statePath, 'utf8')), completedState());
});

test('delivered dashboard shows commit and PR links, stops polling and preserves implementation timing', async (t) => {
  const { html, statePath } = await deliveryFixture(t, { status: 'delivered', repos: { api: deliveredRepo() } });
  assert.match(html, /phase-dot passed[^>]+Optional delivery: Delivered/);
  assert.match(html, /Changes committed and pushed; pull requests opened or updated/);
  assert.match(html, /href="https:\/\/github.com\/example\/api\/commit\/a{40}"/);
  assert.match(html, /href="https:\/\/github.com\/example\/api\/pull\/1"/);
  assert.match(html, /Elapsed time \(includes waits and pauses\): 1m\./);
  assert.match(html, /phase-mode">Delivered<\/div>[\s\S]*phase-duration">2m/);
  assert.doesNotMatch(html, /http-equiv="refresh"|Changes remain local and uncommitted/);
  assert.equal(withoutFeedbackNotes(await readFile(statePath, 'utf8')), completedState());
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
  const statePath = artifactJoin(directory, 'DEMO-state.md');
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
  assert.ok(html.includes('Review before sending'));
  assert.ok(html.includes(input.scope));
  assert.doesNotMatch(html, /source: user|via: question|reference: publication journal/);
});

test('delivery audit rows hide full and shortened reference hashes while preserving exact approval scope in state', async (t) => {
  const original = stateMarkdown({ fields: { phase: 'complete', status: 'Complete', autonomy: 'autopilot' },
    rows: [['2026-01-01T10:00:00Z', 'final-sync', 'complete', 'Implementation complete.']] });
  const { directory, outputPath } = await renderFixture(t, original);
  const statePath = artifactJoin(directory, 'DEMO-state.md');
  const hash = createHash('sha256').update('approved delivery plan').digest('hex');
  const preparation = { id: 'delivery-prepare', topic: 'Delivery preparation', choice: 'Prepare delivery', source: 'user', via: 'question',
    scope: 'DEMO completed run, preparation only; exact-plan approval still required', reference: `final package sha256 ${hash.slice(0, 8)}`, resume: 'transparent' };
  const approval = { id: 'delivery-approve', topic: 'Delivery exact-plan approval', choice: 'Deliver this exact plan', source: 'user', via: 'question',
    scope: 'app: commit, push premium-badge-dashboard to origin; create/update PR against main', reference: `delivery plan sha256 ${hash}`, resume: 'transparent' };
  await checkpointDecision(statePath, preparation); await checkpointDecision(statePath, approval);
  const saved = await readFile(statePath, 'utf8');
  const html = await readFile(outputPath, 'utf8');
  assert.ok(html.includes(`Delivery preparation requested — ${preparation.scope}`));
  assert.ok(html.includes(`Delivery approved — ${approval.scope}`));
  assert.doesNotMatch(html, /source:|via:|reference:|sha-?256|decision-id:/i);
  assert.ok(!html.includes(hash)); assert.ok(!html.includes(hash.slice(0, 8)));
  const state = parseState(saved);
  assert.ok(state.audit[1].outcome.includes(preparation.reference));
  assert.ok(state.audit[2].outcome.includes(approval.reference));
  assert.ok(state.audit[2].outcome.includes('source: user; via: question'));
  const rerendered = await generateDashboard(statePath);
  assert.equal(rerendered, outputPath); assert.equal(await readFile(statePath, 'utf8'), saved);
});

test('readable automatic decisions retain their attribution, restrictions and reason', async (t) => {
  const { directory, outputPath } = await renderFixture(t, stateMarkdown({ rows: [['2026-01-01T10:00:00Z', 'start', 'context-check', 'Run created']] }));
  const statePath = artifactJoin(directory, 'DEMO-state.md');
  for (const source of ['autopilot', 'policy']) await checkpointDecision(statePath, {
    id: `mode-${source}`, topic: 'Execution mode', choice: 'Sequential', source, via: 'policy',
    scope: 'DEMO; implementation only; delivery approval required separately', reason: 'Dependent steps must stay ordered',
  });
  const html = await readFile(outputPath, 'utf8');
  assert.match(html, /Sequential \(Autopilot default\)/); assert.match(html, /Sequential \(Policy default\)/);
  assert.ok(html.includes('DEMO; implementation only; delivery approval required separately'));
  assert.ok(html.includes('Dependent steps must stay ordered'));
  assert.doesNotMatch(html, /source:|via:|scope:|reference:|reason:/);
});

test('decision IDs make retries idempotent and changed decisions append history', async (t) => {
  const { directory } = await renderFixture(t, stateMarkdown({ rows: [['2026-01-01T10:00:00Z', 'start', 'context-check', 'New run']] }));
  const statePath = artifactJoin(directory, 'DEMO-state.md');
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
  const statePath = artifactJoin(directory, 'DEMO-state.md');
  const notes = '\n## Additional notes\n\nUser-authored text.\n';
  await writeFile(statePath, stateMarkdown({ rows: [['2026-01-01T10:00:00Z', 'start', 'context-check', 'New run']] }) + notes);
  const result = await checkpointDecision(statePath, USER_DECISION);
  assert.equal(result.dashboard, null);
  assert.ok((await readFile(statePath, 'utf8')).endsWith(notes));
  assert.equal(parseState(await readFile(statePath, 'utf8')).audit.length, 2);
  await assert.rejects(readFile(artifactJoin(directory, 'DEMO-status.html')), { code: 'ENOENT' });
});

test('render failure preserves decision evidence and retry repairs the dashboard once', async (t) => {
  const directory = await workspace(t);
  const statePath = artifactJoin(directory, 'DEMO-state.md');
  const outputPath = artifactJoin(directory, 'DEMO-status.html');
  await writeFile(statePath, stateMarkdown({ fields: { phase: 'execute', plan: 'make-it-work/DEMO/DEMO-plan.md' }, rows: [['2026-01-01T10:00:00Z', 'plan', 'execute', 'Plan accepted']] }));
  await writeFile(outputPath, 'Existing dashboard');
  await assert.rejects(checkpointDecision(statePath, USER_DECISION), /Could not read the plan required for timeline progress/);
  assert.equal(parseState(await readFile(statePath, 'utf8')).audit.length, 2);
  assert.equal(await readFile(outputPath, 'utf8'), 'Existing dashboard');
  await writeFile(artifactJoin(directory, 'DEMO-plan.md'), planMarkdown());
  await checkpointDecision(statePath, USER_DECISION);
  assert.equal(parseState(await readFile(statePath, 'utf8')).audit.length, 2);
  assert.ok((await readFile(outputPath, 'utf8')).includes('Comments and attachments only'));
});

test('resume distinguishes transparent decisions from interrupted in-phase choices and transitions', async (t) => {
  const { directory } = await renderFixture(t, stateMarkdown({ fields: { phase: 'plan' }, rows: [['2026-01-01T10:00:00Z', 'context-check', 'plan', 'Ready to plan']] }));
  const statePath = artifactJoin(directory, 'DEMO-state.md');
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
  const { directory, html: before } = await renderSettledFixture(t, original);
  const statePath = artifactJoin(directory, 'DEMO-state.md');
  await checkpointDecision(statePath, { ...USER_DECISION, id: 'delivery-plan-abc', topic: 'Delivery approval', choice: 'Deliver this exact plan after Review cycle 7', reference: 'delivery plan hash abc' });
  const after = await readFile(artifactJoin(directory, 'DEMO-status.html'), 'utf8');
  assert.equal(after.match(/<p class="session-timing">.*?<\/p>/)[0], before.match(/<p class="session-timing">.*?<\/p>/)[0]);
  assert.ok(after.includes('Elapsed time (includes waits and pauses): 10m.'));
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
  const statePath = artifactJoin(directory, 'DEMO-state.md');
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
  const statePath = artifactJoin(directory, 'DEMO-state.md');
  const inputPath = artifactJoin(directory, 'decision input.json');
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
  await checkpointDecision(artifactJoin(directory, 'DEMO-state.md'), USER_DECISION);
  const after = await readFile(artifactJoin(directory, 'DEMO-status.html'), 'utf8');
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
  assert.deepEqual(timelineLabels(html), ['Context Check', 'Refinement', 'Plan', 'Execute', 'Implement (Lightweight)', 'Review', 'Fix (Lightweight)', 'Finalizing']);
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
  assert.deepEqual(timelineLabels(html), ['Context Check', 'Refinement', 'Plan', 'Execute', 'Implement (Lightweight)', 'Review', 'Plan', 'Execute', 'Review', 'Finalizing']);
  assert.equal((timeline.match(/phase-dot skipped/g) ?? []).length, 2);
  assert.match(timeline, /phase-dot passed" title="plan: Escalated: review found &lt;auth&gt; changes — [^"]+">✓[\s\S]*?Escalated to TDD/);
  assert.doesNotMatch(html, /workflow-event:|sha256:/);
  const durations = [...timeline.matchAll(/phase-duration">([^<]+)</g)].map((match) => match[1]);
  assert.deepEqual(durations, ['1m', '1m', '2m', '1m', '3m', '4m']);
  assert.match(timeline, /phase-dot current spinning[^>]+review:/);
  assert.match(html, /Approach: TDD<\/span>.*Initial risk: Low/);
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
  assert.deepEqual(timelineLabels(html), ['Context Check', 'Refinement', 'Plan', 'Execute', 'Implement (Lightweight)', 'Plan', 'Review', 'Finalizing']);
  assert.match(timelineHtml(html), /phase-dot current spinning" title="plan: Escalated: implementation touched shared schema/);
});

test('mode pill appears only for adaptive runs and cycle counters stay out of the dashboard', async (t) => {
  const rows = [['2026-01-01T10:00:00Z', 'start', 'context-check', 'New run created']];
  const legacy = await renderFixture(t, stateMarkdown({ rows }));
  assert.doesNotMatch(legacy.html, /mode-pill|Approach: |Escalations|phase-dot skipped|Lightweight report/);
  assert.match(legacy.html, /<div class="label">Plan<\/div><span class="none">Not yet created<\/span>/);
  assert.match(legacy.html, /<div class="label">Execute<\/div><span class="none">Not yet created<\/span>/);
  assert.deepEqual(timelineLabels(legacy.html), ['Context Check', 'Refinement', 'Plan', 'Execute', 'Review', 'Finalizing']);

  const pending = await renderFixture(t, stateMarkdown({ fields: { ...ADAPTIVE_FIELDS, risk: 'none', mode: 'none', mode_source: 'none', risk_rationale: 'none' }, rows }));
  assert.match(pending.html, /Approach: Not yet assessed/);
  assert.doesNotMatch(pending.html, /phase-dot skipped/);

  const lightweight = await renderFixture(t, stateMarkdown({ fields: ADAPTIVE_FIELDS, rows }));
  assert.match(lightweight.html, /class="pill mode-pill mode-lightweight" title="[^"]+">Approach: Lightweight<\/span>/);

  const forced = await renderFixture(t, stateMarkdown({ fields: { ...ADAPTIVE_FIELDS, risk: 'high', mode: 'tdd', mode_source: 'user' }, rows }));
  assert.match(forced.html, />Approach: TDD<\/span>.*Initial risk: High<\/span>/);
  assert.match(forced.html, /Selected by you/);
  assert.match(lightweight.html, /class="pill risk-pill" title="Single-file &lt;copy&gt; change">Initial risk: Low/);
  assert.doesNotMatch(forced.html, /phase-dot skipped|Skipped \(Lightweight\)/);
  for (const fixture of [legacy, pending, lightweight, forced]) {
    assert.doesNotMatch(fixture.html, /Cycle counters|Review cycles:|Fix cycles:|Replans used:|Escalations:/);
    const saved = parseState(await readFile(artifactJoin(fixture.directory, 'DEMO-state.md'), 'utf8'));
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

test('finalization shows active details, pending approval, pause and stop states', async (t) => {
  for (const [phase, detail] of [['final-sync', 'Updating project docs'], ['final-approval', 'Preparing final review']]) {
    for (const status of ['In Progress', 'Paused', 'Stopped']) {
      const { html } = await renderFixture(t, stateMarkdown({
        fields: { phase, status, final_package_version: '1' },
        rows: [['2026-01-01T10:00:00Z', 'review', phase, 'Ready']],
      }));
      assert.equal(timelineLabels(html).filter((label) => label === 'Finalizing').length, 1);
      assert.match(timelineHtml(html), new RegExp(detail));
      assert.match(timelineHtml(html), new RegExp(status === 'Stopped' ? 'phase-dot failed' : status === 'Paused' ? 'phase-dot current"' : 'phase-dot current spinning'));
      if (status === 'In Progress') assert.match(html, /Finalizing in progress/);
    }
  }
  const state = parseState(stateMarkdown({
    fields: { phase: 'final-approval', status: 'Paused', final_package_version: '1' },
    rows: [['2026-01-01T10:00:00Z', 'final-sync', 'final-approval', 'Ready']],
  }));
  state.pendingInputs = [{ kind: 'approval', phase: 'final-approval', choices: [], blocking: true, question: 'Approve?', requested_at: '2026-01-01T10:00:00Z' }];
  const html = renderStatus({ state, template: '{{PHASE_TIMELINE}}', logoBase64: '' });
  assert.match(html, /Awaiting final approval/);
});

test('completed finalization times the whole attempt and ignores later delivery rows', async (t) => {
  for (const version of [undefined, '1']) {
    const fields = { phase: 'complete', status: 'Complete', ...(version ? { final_package_version: version } : {}) };
    const rows = [
      ['2026-01-01T10:00:00Z', 'review', 'final-sync', 'Clean'],
      ...(version ? [['2026-01-01T10:01:22Z', 'final-sync', 'final-approval', 'Docs updated']] : []),
      ['2026-01-01T10:01:39Z', version ? 'final-approval' : 'final-sync', 'complete', 'Complete'],
      ['2026-01-01T10:05:00Z', 'complete', 'complete', 'Delivery prepared'],
    ];
    const { html } = await renderSettledFixture(t, stateMarkdown({ fields, rows }));
    const timeline = timelineHtml(html);
    assert.equal(timelineLabels(html).filter((label) => label === 'Complete').length, 1);
    assert.match(timeline, /phase-duration">1m 39s/);
    assert.doesNotMatch(timeline, /phase-status status-complete|Final Sync|Final Approval/);
    const state = parseState(stateMarkdown({ fields, rows }));
    const legacy = renderStatus({ state: { ...state, realRowsFrom: 2 }, template: '{{PHASE_TIMELINE}}', logoBase64: '' });
    assert.match(legacy, /phase-duration">—/);
    const invalid = renderStatus({ state, invalidTimestampFrom: 2, template: '{{PHASE_TIMELINE}}', logoBase64: '' });
    assert.match(invalid, /phase-duration">—/);
  }
});

test('final approval feedback retains separate finalization attempts', async (t) => {
  const rows = [
    ['2026-01-01T09:59:00Z', 'start', 'review', 'Review started'],
    ['2026-01-01T10:00:00Z', 'review', 'final-sync', 'Clean'],
    ['2026-01-01T10:01:00Z', 'final-sync', 'final-approval', 'Ready'],
    ['2026-01-01T10:02:00Z', 'final-approval', 'fix-plan', 'Changes requested'],
    ['2026-01-01T10:03:00Z', 'fix-plan', 'execute', 'Fix ready'],
    ['2026-01-01T10:04:00Z', 'execute', 'review', 'Fixed'],
    ['2026-01-01T10:05:00Z', 'review', 'final-sync', 'Clean again'],
    ['2026-01-01T10:06:00Z', 'final-sync', 'final-approval', 'Ready again'],
    ['2026-01-01T10:07:00Z', 'final-approval', 'complete', 'Complete'],
  ];
  const stateText = stateMarkdown({ fields: { phase: 'complete', status: 'Complete', final_package_version: '1' }, rows });
  const state = parseState(stateText);
  const raw = buildTimeline(state);
  const before = JSON.stringify(raw);
  const grouped = groupFinalization(raw);
  assert.equal(JSON.stringify(raw), before);
  assert.equal(grouped.slots.filter((slot) => slot.finalizing).length, 2);
  const { html } = await renderSettledFixture(t, stateText);
  assert.equal(timelineLabels(html).filter((label) => label === 'Finalizing').length, 1);
  assert.equal(timelineLabels(html).filter((label) => label === 'Complete').length, 1);
  const finalSteps = timelineHtml(html).split('<div class="phase-step">').filter((step) => /phase-label">(?:Finalizing|Complete)</.test(step));
  assert.equal(finalSteps.length, 2);
  for (const step of finalSteps) assert.match(step, /phase-duration">2m/);
});

test('missing-strategy completion note is escaped inside the green banner before delivery guidance', () => {
  const fields = { status: 'Complete', phase: 'complete', testing_summary: JSON.stringify([{ repo: '<api>', strategy: 'missing', verification: 'manual' }]) };
  const state = parseState(stateMarkdown({ fields, rows: [['2026-01-01T10:01:00Z', 'final-approval', 'complete', 'Completed']] }));
  const html = renderStatus({ state, template: '{{STATUS_BANNER}} {{FEEDBACK_PROGRESS}} {{FEEDBACK_NOTE}}', logoBase64: '', feedback: { status: 'saved', shareReady: true } });
  assert.match(html, /class="complete"[\s\S]*<strong>Testing:<\/strong> Strategy missing for &lt;api&gt;; used manual verification\.[\s\S]*Delivery status reflects/);
  assert.doesNotMatch(html, /class="feedback-progress"|Strategy missing for <api>/);
  assert.equal((html.match(/Save this session’s feedback/g) ?? []).length, 1);
  const unavailable = renderStatus({ state, template: '{{FEEDBACK_PROGRESS}} {{FEEDBACK_NOTE}}', logoBase64: '', feedback: { status: 'unavailable', reason: 'Could not save <report>' } });
  assert.match(unavailable, /Could not save &lt;report&gt;/);
  assert.doesNotMatch(unavailable, /href=|class="feedback-progress"/);
});

test('a dispatched review with no handoff is reported as lost once and shown as interrupted', async (t) => {
  const directory = await workspace(t);
  const statePath = artifactJoin(directory, 'DEMO-state.md');
  await writeFile(statePath, stateMarkdown({
    fields: { phase: 'review', review_scope_version: '1', review_cycle: '1', current_activity: 'An independent agent is reviewing the change', current_activity_updated_at: '2026-01-01T10:07:00Z' },
    rows: [
      ['2026-01-01T10:00:00Z', 'start', 'context-check', 'Started'],
      ['2026-01-01T10:06:00Z', 'execute', 'review', 'Execution passed'],
      ['2026-01-01T10:07:00Z', 'review', 'review', 'Activity: An independent agent is reviewing the change [audit-note: activity; id: a1]'],
    ],
  }));
  assert.equal(await lostReview(statePath, parseState(await readFile(statePath, 'utf8'))), null, 'nothing was dispatched yet');
  const stillRunning = await readFile(await generateDashboard(statePath), 'utf8');
  assert.match(stillRunning, /Review in progress/);
  assert.match(stillRunning, /data-stale-since="2026-01-01T10:07:00Z" data-stale-after-hours="3" hidden/);

  await writeFile(artifactJoin(directory, 'DEMO-review-target-1.json'), '{}');
  const lost = await lostReview(statePath, parseState(await readFile(statePath, 'utf8')));
  assert.equal(lost.stage, 'review');
  assert.equal(lost.cycle, 1);
  await recordLostReview(statePath, lost);
  await recordLostReview(statePath, lost);
  const state = parseState(await readFile(statePath, 'utf8'));
  assert.equal(state.audit.filter((row) => row.note?.kind === 'interruption').length, 1);
  assert.equal(state.audit.at(-1).outcome.startsWith('Interrupted: The review agent for cycle 1'), true);
  assert.equal(lastWorkRow(state.audit).number, 2, 'an interruption note is not a closing work row');
  const html = await readFile(await generateDashboard(statePath), 'utf8');
  assert.match(html, /Review interrupted/);
  assert.doesNotMatch(html, /Review in progress/);

  await mkdir(artifactJoin(directory, 'DEMO-handoffs'));
  await writeFile(artifactJoin(directory, 'DEMO-handoffs', 'review-1.json'), JSON.stringify({ stage: 'review', plan_version: 1, review_cycle: 1, status: 'done' }));
  assert.equal(await lostReview(statePath, parseState(await readFile(statePath, 'utf8'))), null, 'a returned handoff means the review was not lost');
});

test('version and optional usage appear in header without changing refresh behavior', () => {
  const state = parseState(stateMarkdown({ fields: { plugin_version: '5.9.0-rc.1' }, rows: [['2026-01-01T10:00:00Z', 'start', 'context-check', 'Start']] }));
  const html = renderStatus({ state, template: '{{WORKFLOW_HEADER}}', logoBase64: '', usageSnapshot: { context_percent: 0, context_capacity: 200000, estimated_cost_usd: 0, captured_at: '2026-01-01T10:00:00Z' } });
  assert.match(html, /Plugin v5.9.0-rc.1/); assert.match(html, /Context: 0% of 200K/); assert.match(html, /~\$0.00/);
  const legacy = renderStatus({ state: parseState(stateMarkdown({ rows: [['2026-01-01T10:00:00Z', 'start', 'context-check', 'Start']] })), template: '{{WORKFLOW_HEADER}}', logoBase64: '' });
  assert.match(legacy, /Plugin version: Unknown/);
  assert.doesNotMatch(legacy, /Context:|Estimated session cost:|Captured at| · /);
  for (const { usage, expected } of [
    { usage: { context_percent: null, estimated_cost_usd: null }, expected: '' },
    { usage: { context_percent: null, context_capacity: 200000, estimated_cost_usd: 1.23 }, expected: ' · Estimated session cost: ~$1.23 · Captured at 2026-01-01T10:00:00Z' },
    { usage: { context_percent: 25, context_capacity: 200000, estimated_cost_usd: null }, expected: ' · Context: 25% of 200K · Captured at 2026-01-01T10:00:00Z' },
    { usage: { context_percent: 25, context_capacity: null, estimated_cost_usd: null }, expected: ' · Context: 25% · Captured at 2026-01-01T10:00:00Z' },
  ]) {
    const partial = renderStatus({ state, template: '{{WORKFLOW_HEADER}}', logoBase64: '', usageSnapshot: { ...usage, captured_at: '2026-01-01T10:00:00Z' } });
    const metadata = partial.match(/<p class="workflow-metadata">(.*?)<\/p>/s)?.[1];
    assert.equal(metadata, `<span class="plugin-version">Plugin v5.9.0-rc.1</span>${expected}`);
  }
});
test('finalizing and session time include assessment and feedback, freeze at its endpoint, and exclude delivery', () => {
  const state = parseState(stateMarkdown({ fields: { phase: 'complete', status: 'Complete', final_package_version: '1', change_assessment_version: '1' }, rows: [
    ['2026-01-01T10:00:00Z', 'start', 'context-check', 'Start'],
    ['2026-01-01T10:05:00Z', 'review', 'final-sync', 'Sync'],
    ['2026-01-01T10:07:00Z', 'final-sync', 'final-approval', 'Approval'],
    ['2026-01-01T10:07:10Z', 'final-approval', 'final-approval', noteCell({ kind: 'activity', id: 'assessment-start', text: 'Assessing code complexity and production risk' })],
    ['2026-01-01T10:07:50Z', 'final-approval', 'final-approval', noteCell({ kind: 'result', id: 'change-assessment:timing', text: 'Change assessment — Code complexity: Low; Production risk: Low; completeness: complete; rationale: Local change', reference: 'DEMO-complexity.md' })],
    ['2026-01-01T10:08:00Z', 'final-approval', 'complete', 'Done'],
    ['2026-01-01T11:00:00Z', 'complete', 'complete', 'Delivery'],
  ] }));
  const template = '{{PHASE_TIMELINE}} {{SESSION_TIMING}}';
  const collecting = renderStatus({ state, template, logoBase64: '', feedback: { status: 'collecting' }, now: Date.parse('2026-01-01T10:10:00Z') });
  assert.match(collecting, /phase-duration">5m/); assert.match(collecting, /10m of elapsed/);
  assert.match(collecting, /assesses code complexity and production risk/);
  assert.match(collecting, /Its elapsed time includes the assessment/);
  for (const status of ['saved', 'unavailable']) {
    const html = renderStatus({ state, template, logoBase64: '', feedback: { status, finalizedAt: '2026-01-01T10:12:00Z' }, now: Date.parse('2026-01-02T10:00:00Z') });
    assert.match(html, /phase-duration">7m/); assert.match(html, /12m of elapsed/);
  }
});

test('both modes name active assessment inside Finalizing without adding a stage', () => {
  for (const mode of ['lightweight', 'tdd']) {
    const fields = { phase: 'final-approval', final_package_version: '1', change_assessment_version: '1', current_activity: 'Assessing code complexity and production risk', adaptive_version: '1', mode, risk: 'low', mode_source: 'assessed', risk_rationale: 'Initial risk', escalations: '0', implementation_report: 'none' };
    const state = parseState(stateMarkdown({ fields, rows: [
      ['2026-01-01T10:00:00Z', 'review', 'final-sync', 'Review clean'],
      ['2026-01-01T10:01:00Z', 'final-sync', 'final-approval', 'Final sync done'],
      ['2026-01-01T10:01:10Z', 'final-approval', 'final-approval', noteCell({ kind: 'activity', id: 'assessment-start', text: fields.current_activity })],
    ] }));
    const html = renderStatus({ state, template: '<div class="phase-timeline">{{PHASE_TIMELINE}}</div><p class="timeline-scroll-hint"></p>{{CURRENT_ACTIVITY}}', logoBase64: '' });
    assert.equal(timelineLabels(html).filter(label => label === 'Finalizing').length, 1);
    assert.match(html, /phase-mode">Assessing code complexity and production risk<\/div>/);
    assert.match(html, /phase-activity">Assessing code complexity and production risk<\/p>/);
    assert.doesNotMatch(html, /phase-label[^>]*>(?:Code complexity|Production risk|Assessment)</);
    delete state.fields.change_assessment_version;
    const legacy = renderStatus({ state, template: '{{PHASE_TIMELINE}}', logoBase64: '' });
    assert.match(legacy, /Preparing final review/);
    assert.doesNotMatch(legacy, /assesses code complexity|Its elapsed time includes the assessment/);
  }
});

test('Write Tests keeps timing and audit evidence with its report in artifacts', () => {
  const fields = { test_writing_version: '1', test_preparation: 'make-it-work/DEMO/DEMO-plan-tests-1.json', test_preparation_report: 'make-it-work/DEMO/DEMO-plan-tests-1.md', plan_hash: 'revision', phase: 'write-tests', autonomy: 'guided' };
  const rows = [
    ['2026-01-01T10:00:00Z', 'start', 'plan', 'Draft coverage'],
    ['2026-01-01T10:01:00Z', 'plan', 'plan-approval', 'Awaiting approval'],
    ['2026-01-01T10:02:00Z', 'plan-approval', 'write-tests', 'Approved; dispatching fresh test worker'],
  ];
  rows.push(['2026-01-01T10:02:30Z', 'write-tests', 'write-tests', `Test preparation ready: ${fields.test_preparation_report}`]);
  const template = '{{PHASE_TIMELINE}} {{TEST_PREPARATION}} {{PREPARATION_TILE}} {{AUDIT_ROWS}}';
  const state = parseState(stateMarkdown({ fields, rows }));
  const html = renderStatus({ state, template, logoBase64: '' });
  assert.match(html, /Write Tests/);
  assert.match(html, /write-the-tests/);
  assert.match(html, /implementation has not advanced/);
  assert.match(html, /Test preparation ready · <a href="DEMO-plan-tests-1.md">View preparation report<\/a>/);
  assert.equal((html.match(/class="artifact-tile"/g) ?? []).length, 1);
  assert.doesNotMatch(html, /class="test-preparation"|Preparation pending|Expected red confirms/);
  assert.doesNotMatch(html, /Step 0 of|phase-dot failed/);
  assert.match(html, /DEMO-plan-tests-1.md/);
  for (const [preparation, note] of [
    [{ plan_hash: 'old', status: 'ready' }, 'Superseded'],
    [{ plan_hash: 'unavailable', status: 'unavailable' }, 'Preparation evidence unavailable'],
  ]) {
    const changed = renderStatus({ state, preparation, template, logoBase64: '' });
    assert.match(changed, new RegExp(`class="artifact-note">${note}`));
    assert.doesNotMatch(changed, /class="test-preparation"/);
  }
  const approval = renderStatus({ state: parseState(stateMarkdown({ fields: { ...fields, phase: 'plan-approval' }, rows: rows.slice(0, 2) })), template, logoBase64: '' });
  assert.match(approval, /Awaiting plan approval/);
  const legacy = renderStatus({ state: parseState(stateMarkdown({ fields: { phase: 'plan' }, rows: rows.slice(0, 1) })), template, logoBase64: '' });
  assert.doesNotMatch(legacy, /Write Tests|Test Preparation/);
});

test('preparation audit links preserve historical reports and leave unsafe references as text', () => {
  const outcomes = [
    'Test preparation blocked: make-it-work/DEMO/DEMO-plan-tests-1.md',
    'Test preparation not-applicable; make-it-work/DEMO/miw-DEMO-plan-tests-2.md. Implementation remains unverified.',
    'Test preparation ready: https://example.com/DEMO-plan-tests-1.md',
    'Test preparation ready: make-it-work/DEMO/../OTHER-plan-tests-1.md',
    'Test preparation ready: <invalid>',
    'Test preparation ready: make-it-work/DEMO/DEMO-plan-tests-3.md; Test coverage: 5 progression / 1 regression scenarios planned',
    'Test preparation blocked: make-it-work/DEMO/DEMO-plan-tests-4.md; Test coverage: unavailable',
  ];
  const state = parseState(stateMarkdown({ fields: { test_writing_version: '1', test_preparation: 'none', test_preparation_report: 'none', phase: 'write-tests' }, rows: outcomes.map((outcome, index) =>
    [`2026-01-01T10:0${index}:00Z`, 'write-tests', 'write-tests', outcome]) }));
  const html = renderStatus({ state, template: '{{AUDIT_ROWS}}', logoBase64: '' });
  assert.equal((html.match(/View preparation report/g) ?? []).length, 4);
  assert.match(html, /Test coverage: 5 progression \/ 1 regression scenarios planned · <a href="DEMO-plan-tests-3.md"/);
  assert.match(html, /Test coverage: unavailable · <a href="DEMO-plan-tests-4.md"/);
  assert.match(html, /href="DEMO-plan-tests-1.md"/);
  assert.match(html, /href="miw-DEMO-plan-tests-2.md"[^>]*>View preparation report<\/a>\. Implementation remains unverified\./);
  assert.doesNotMatch(html, /href="https:|href="[^"]*\.\.\//);
  assert.match(html, /&lt;invalid&gt;/);
});

test('preparation reentries remain separate from fix execution and manual exemption is explicit', () => {
  const rows = [
    ['2026-01-01T10:00:00Z', 'start', 'plan', 'Plan'],
    ['2026-01-01T10:01:00Z', 'plan', 'write-tests', 'Prepare tests'],
    ['2026-01-01T10:02:00Z', 'write-tests', 'execute', 'Test preparation ready'],
    ['2026-01-01T10:03:00Z', 'execute', 'review', 'Implemented'],
    ['2026-01-01T10:04:00Z', 'review', 'fix-plan', 'Amend coverage'],
    ['2026-01-01T10:05:00Z', 'fix-plan', 'write-tests', 'Prepare fix coverage'],
    ['2026-01-01T10:06:00Z', 'write-tests', 'execute', 'Test preparation not-applicable'],
  ];
  const fields = { phase: 'execute', test_writing_version: '1', test_preparation: 'none', test_preparation_report: 'none' };
  const state = parseState(stateMarkdown({ fields, rows }));
  const html = renderStatus({ state, template: '{{PHASE_TIMELINE}}', logoBase64: '', planStatus: { mode: 'Inline', complete: 1, total: 2 } });
  assert.equal((html.match(/class="phase-skill">\(write-the-tests\)/g) ?? []).length, 2);
  assert.match(html, /Not applicable/);
  assert.match(html, /Step 1 of 2 complete/);
});

test('compact approval banners show only the waiting status and review action', () => {
  const hash = 'a'.repeat(64);
  for (const [phase, binding, label, filename] of [
    ['spec-approval', { kind: 'artifact', path: 'make-it-work/DEMO/DEMO-spec.md', sha256: hash, strict: true }, 'Review specification', 'DEMO-spec.md'],
    ['plan-approval', { kind: 'artifact', path: 'make-it-work/DEMO/DEMO-plan.md', sha256: hash, strict: true }, 'Review plan', 'DEMO-plan.md'],
    ['final-approval', { kind: 'package', sha256: hash, strict: true }, 'Review final package', 'DEMO-final-package.md'],
  ]) {
    const pending = createPendingInput({ id: 'approval', kind: 'approval', question: 'Approve this document?', choices: [{ id: 'approve', label: 'Approve' }, { id: 'redo', label: 'Request changes' }, { id: 'stop', label: 'Stop' }], binding }, phase, '2026-01-01T10:00:00Z');
    const state = parseState(stateMarkdown({ fields: { phase, status: 'Paused', final_package_version: '1', pending_inputs: JSON.stringify([pending]) }, rows: [['2026-01-01T10:00:00Z', 'start', phase, 'Awaiting approval']] }));
    const html = renderStatus({ state, template: '{{STATUS_BANNER}}', logoBase64: '' });
    assert.ok(html.includes(`href="${filename}">${label}</a>`));
    assert.match(html, /<strong class="pending-title">Implementation is waiting for your input<\/strong>/);
    assert.doesNotMatch(html, /Workflow paused|Approve this document|<li>|data-wait-since|<details/);
    assert.doesNotMatch(html, /SHA-256|Pending since|make-it-work\//);
    assert.ok(!html.includes(hash));
    assert.equal(state.pendingInputs[0].binding.sha256, hash);
  }
});

test('coverage details stay out of the dashboard artifact grid', async () => {
  const state = parseState(stateMarkdown({ fields: { test_writing_version: '1', test_preparation: 'none', test_preparation_report: 'none' }, rows: [['2026-01-01T10:00:00Z', 'start', 'context-check', 'Started']] }));
  const options = { state, template: '{{PREPARATION_TILE}}', logoBase64: '', planStatus: { coverage: { progression: 1, regression: 1, scenarios: [{ scenario: '<Cards>', purpose: 'Regression', baseline: 'Pending — no matching pre-change baseline recorded' }] } } };
  const html = renderStatus(options);
  assert.match(html, /Test Preparation/);
  assert.doesNotMatch(html, /test-coverage|progression|regression|Cards|pre-change baseline/);
  const stale = renderStatus({ ...options, preparation: { plan_hash: 'old', current_plan_hash: 'new', entries: [{ scenario: '<Cards>', kind: 'regression', result: 'pass' }] } });
  assert.match(stale, /Superseded/);
  assert.doesNotMatch(stale, /regression: pass/);
});

test('activity CLI diagnoses malformed arguments before touching workflow state', async t => {
  const directory = await workspace(t);
  const statePath = artifactJoin(directory, 'DEMO-state.md');
  await writeFile(statePath, 'deliberately invalid state: parser must reject arguments first\n');
  const before = await readFile(statePath, 'utf8');
  const script = fileURLToPath(new URL('./dashboard-checkpoint.mjs', import.meta.url));
  const prefix = ['activity', '--state', statePath, '--activity', 'Working'];
  for (const [args, message] of [
    [['activity', '--category', 'unclassified', '--state', statePath, '--activity', 'Working'], /expected --state.*--category/],
    [['activity', '--state'], /Missing value for --state/],
    [['activity', '--state', statePath], /expected --activity/],
    [['activity', '--state', statePath, '--activity'], /Missing value for --activity/],
    [[...prefix, '--category'], /Missing value for --category/],
    [[...prefix, '--category', '--planning-activity', 'discovery'], /Missing value for --category/],
    [[...prefix, '--state', statePath], /Duplicate activity option: --state/],
    [[...prefix, '--category', 'unclassified', '--category', 'review'], /Duplicate activity option: --category/],
    [[...prefix, '--unknown', 'value'], /Unknown activity option.*--unknown/],
  ]) {
    assert.throws(() => execFileSync(process.execPath, [script, ...args], { encoding: 'utf8', stdio: 'pipe' }), error => message.test(error.stderr) && /Usage:/.test(error.stderr));
    assert.equal(await readFile(statePath, 'utf8'), before);
  }
});
