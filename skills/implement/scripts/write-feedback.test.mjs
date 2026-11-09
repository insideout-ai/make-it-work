import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { inspectFeedback, inspectState, renderBlock, upsertBlock, writeFeedback } from './write-feedback.mjs';
import { noteCell } from './audit-notes.mjs';
import { createHash } from 'node:crypto';

const EVAL_ROOT = path.resolve(import.meta.dirname, '../../../evals/implement');
const SCRIPT_PATH = path.join(import.meta.dirname, 'write-feedback.mjs');

async function fixture(name) {
  return readFile(path.join(EVAL_ROOT, name, 'fixture/fixture-artifacts/DEMO-state.md'), 'utf8');
}

function finish(markdown, time = '2026-01-03T10:06:00Z') {
  const next = markdown.replace('status: In Progress', 'status: Complete')
    .replace('phase: final-sync', 'phase: complete');
  const count = [...next.matchAll(/^\| \d+ \|/gm)].length;
  return `${next.trimEnd()}\n| ${count + 1} | ${time} | final-sync | complete | Final context sync complete |\n`;
}

function diagnosis(summary) {
  return {
    events: summary.events.map((event) => ({
      ...event,
      trigger: 'An acceptance path was missed during planning',
      rootCause: 'planning gap',
      explanation: 'The approved requirement was not mapped to a step and test',
      earliestStage: 'plan-the-work',
      preventability: 'likely',
      owner: 'plan-the-work',
      improvement: 'Map every acceptance path to a step, test, or explicit no-change decision',
      confidence: 'high',
    })),
    recommendations: ['Map every acceptance path to a step and test'],
    clarifications: [],
    openQuestions: [],
  };
}

function guardrailState(markdown, { resolved = true, afterComplete = false } = {}) {
  const stop = noteCell({ kind: 'result', id: 'guardrail-stop:sample', text: 'Guardrail stop. A private-example expectation requires clarification.', reference: 'private-source' });
  const resolution = noteCell({ kind: 'result', id: 'guardrail-resolve:sample', text: 'Guardrail resolved with user guidance via chat. Confirmed private-example behavior.', reference: 'private-source' });
  const lines = markdown.split('\n');
  const insertAt = afterComplete ? lines.length : lines.findIndex(line => /^\| \d+ \| .*\| execute \| review \|/.test(line));
  assert.ok(insertAt >= 0);
  const phase = afterComplete ? 'complete' : 'execute';
  lines.splice(insertAt, 0, `| 0 | 2026-01-01T10:03:10Z | ${phase} | ${phase} | ${stop} |`, ...(resolved ? [`| 0 | 2026-01-01T10:03:20Z | ${phase} | ${phase} | ${resolution} |`] : []));
  let number = 0;
  return lines.map(line => /^\| \d+ \|/.test(line) ? line.replace(/^\| \d+ \|/, `| ${++number} |`) : line).join('\n');
}

function guardrailAnalysis(summary) {
  return { ...diagnosis(summary), guardrails: summary.guardrails.map(item => ({ row: item.row, resolutionRow: item.resolutionRow,
    trigger: 'An expected outcome required clarification', resolution: item.resolutionRow ? 'The user clarified the intended outcome' : 'Resolution was not recorded',
    lesson: 'No workflow change recommended', confidence: 'high' })) };
}

async function workspace(t, state) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'implement-feedback-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = path.join(root, 'make-it-work');
  const runDirectory = path.join(directory, 'DEMO');
  await mkdir(runDirectory, { recursive: true });
  const statePath = path.join(runDirectory, 'DEMO-state.md');
  await writeFile(statePath, state);
  return { directory, statePath, feedbackPath: path.join(directory, 'implement-feedback.md') };
}

test('minimal run is counted from Audit log and written without analysis', async (t) => {
  const state = finish(await fixture('feedback-clean'), '2026-01-01T10:06:00Z');
  const { statePath, feedbackPath } = await workspace(t, state);
  const summary = inspectState(state);
  assert.deepEqual([summary.minimal, summary.fixRounds, summary.replans, summary.reviewCycles], [true, 0, 0, 1]);
  await writeFeedback(statePath);
  const feedback = await readFile(feedbackPath, 'utf8');
  assert.match(feedback, /Reporter: Anonymous/);
  assert.match(feedback, /Plugin version: 4\.6\.0/);
  assert.match(feedback, /- Minimal path: Yes/);
  assert.match(feedback, /- Review cycles: 1/);
  assert.doesNotMatch(feedback, /Extra-round analysis|DEMO/);
});

test('a resolved guardrail receives neutral analysis while preserving a minimal execution path and zero extra rounds', async (t) => {
  const state = guardrailState(finish(await fixture('feedback-clean')));
  const summary = inspectState(state);
  assert.equal(summary.minimal, true);
  assert.equal(summary.analysisRequired, true);
  assert.equal(summary.fixRounds, 0); assert.equal(summary.replans, 0);
  assert.deepEqual(summary.events, []);
  assert.equal(summary.guardrails.length, 1);
  assert.equal(summary.guardrails[0].source, 'user'); assert.equal(summary.guardrails[0].via, 'chat');
  assert.throws(() => renderBlock(summary), /Analysis must be a JSON object/);
  const f = await workspace(t, state);
  const analysis = guardrailAnalysis(summary);
  const first = await writeFeedback(f.statePath, { analysis });
  const original = await readFile(f.feedbackPath, 'utf8');
  await writeFeedback(f.statePath, { analysis });
  assert.equal(await readFile(f.feedbackPath, 'utf8'), original);
  assert.match(original, /Minimal path: Yes/);
  assert.match(original, /Guardrail interventions: 1/);
  assert.match(original, /Decision source: user via chat/);
  assert.match(original, /No workflow change recommended/);
  assert.doesNotMatch(original, /Extra-round analysis|private-example|private-source/);
  assert.equal(await readFile(first.sessionOutputPath, 'utf8'), original);
  assert.equal(await readFile(f.statePath, 'utf8'), state);
});

test('guardrail analysis matches actual stop/resolution rows and enforces share-safe paraphrases', async () => {
  const summary = inspectState(guardrailState(finish(await fixture('feedback-clean'))));
  const analysis = guardrailAnalysis(summary);
  assert.throws(() => renderBlock(summary, { ...analysis, guardrails: [] }), /each recorded guardrail/);
  const wrong = structuredClone(analysis); wrong.guardrails[0].resolutionRow += 1;
  assert.throws(() => renderBlock(summary, wrong), /audit rows/);
  const raw = structuredClone(analysis); raw.guardrails[0].trigger = 'The private-example requirement needed clarification';
  assert.throws(() => renderBlock(summary, raw), /project terminology/);
  const unresolved = inspectState(guardrailState(finish(await fixture('feedback-clean')), { resolved: false }));
  assert.equal(unresolved.guardrails[0].resolutionRow, null);
  assert.equal(unresolved.guardrails[0].source, 'unavailable');
  assert.match(renderBlock(unresolved, guardrailAnalysis(unresolved)), /Resolution was not recorded/);
});

test('guardrails coexist with extra rounds without becoming fixes, and post-completion notes are excluded', async () => {
  const extra = inspectState(guardrailState(finish(await fixture('feedback-nonminimal'))));
  const original = inspectState(finish(await fixture('feedback-nonminimal')));
  assert.equal(extra.fixRounds, original.fixRounds); assert.equal(extra.replans, original.replans);
  assert.equal(extra.events.length, original.events.length);
  assert.equal(extra.guardrails.length, 1);
  assert.match(renderBlock(extra, guardrailAnalysis(extra)), /Extra-round analysis/);
  const late = inspectState(guardrailState(finish(await fixture('feedback-clean')), { afterComplete: true }));
  assert.deepEqual(late.guardrails, []);
  assert.equal(late.analysisRequired, false);
});

test('non-minimal run counts reset cycles from history and formats structured diagnosis', async (t) => {
  const state = finish(await fixture('feedback-nonminimal'), '2026-01-02T10:13:00Z');
  const { statePath, feedbackPath } = await workspace(t, state);
  const summary = inspectState(state);
  assert.deepEqual([summary.minimal, summary.fixRounds, summary.replans, summary.reviewCycles], [false, 1, 1, 3]);
  assert.deepEqual(summary.events, [{ kind: 'Fix', row: 6 }, { kind: 'Replan', row: 10 }]);
  await writeFeedback(statePath, { analysis: diagnosis(summary) });
  const feedback = await readFile(feedbackPath, 'utf8');
  assert.match(feedback, /#### Event 1 — Fix/);
  assert.match(feedback, /#### Event 2 — Replan/);
  assert.match(feedback, /- Root cause: planning gap/);
  assert.match(feedback, /### Open questions\n\n- None/);
});

test('feedback preserves the plugin version captured by the run', () => {
  const state = inspectState(finish('```\nticket: DEMO\nstatus: In Progress\nphase: final-sync\nstart_time: 2026-01-01T10:00:00Z\nplugin_version: 4.6.0\npause_reason: none\n```\n\n## Audit log\n\n| # | Time | From | To | Outcome / reason |\n| --- | --- | --- | --- | --- |\n| 1 | 2026-01-01T10:00:00Z | start | final-sync | Started |'));
  assert.equal(state.pluginVersion, '4.6.0');
  assert.match(renderBlock(state), /Plugin version: 4\.6\.0/);
  assert.throws(() => inspectState(finish('```\nticket: DEMO\nstatus: In Progress\nphase: final-sync\nstart_time: 2026-01-01T10:00:00Z\nplugin_version: latest\npause_reason: none\n```\n\n## Audit log\n\n| # | Time | From | To | Outcome / reason |\n| --- | --- | --- | --- | --- |\n| 1 | 2026-01-01T10:00:00Z | start | final-sync | Started |')), /plugin_version/);
});

test('same run replaces only its block and preserves user text and other runs', async (t) => {
  const state = finish(await fixture('feedback-idempotent'));
  const { statePath, feedbackPath } = await workspace(t, state);
  const original = await readFile(path.join(EVAL_ROOT, 'feedback-idempotent/fixture/fixture-artifacts/implement-feedback.md'), 'utf8');
  await writeFile(feedbackPath, original);
  await writeFeedback(statePath);
  const once = await readFile(feedbackPath, 'utf8');
  await writeFeedback(statePath);
  assert.equal(await readFile(feedbackPath, 'utf8'), once);
  assert.match(once, /User note: keep this sentence/);
  assert.match(once, /<!-- run:2025-12-01T09:00:00Z -->/);
  assert.doesNotMatch(once, /stale placeholder/);
  assert.equal((once.match(/<!-- run:2026-01-03T10:00:00Z -->/g) ?? []).length, 1);
});

test('session export contains only current run and refreshes after clarification', async (t) => {
  const state = finish(await fixture('feedback-nonminimal'), '2026-01-02T10:13:00Z');
  const { statePath, feedbackPath } = await workspace(t, state);
  const older = await readFile(path.join(EVAL_ROOT, 'feedback-idempotent/fixture/fixture-artifacts/implement-feedback.md'), 'utf8');
  await writeFile(feedbackPath, older);
  const analysis = diagnosis(inspectState(state));
  const result = await writeFeedback(statePath, { analysis });
  assert.equal(result.sessionOutputPath, path.join(path.dirname(statePath), 'workflow-feedback.md'));
  const exported = await readFile(result.sessionOutputPath, 'utf8');
  assert.match(exported, /Reporter: Anonymous/);
  assert.match(exported, /Map every acceptance path/);
  assert.doesNotMatch(exported, /2025-12-01|User note|DEMO/);
  assert.equal((exported.match(/<!-- run:/g) ?? []).length, 1);
  analysis.clarifications.push({ question: 'Was the requirement available?', answer: 'It was available before planning' });
  await writeFeedback(statePath, { analysis });
  assert.match(await readFile(result.sessionOutputPath, 'utf8'), /It was available before planning/);
  assert.match(await readFile(feedbackPath, 'utf8'), /User note: keep this sentence/);
  assert.equal(await readFile(statePath, 'utf8'), state);
  assert.equal((await readdir(path.dirname(statePath))).some((name) => name.endsWith('.tmp')), false);
});

test('session export refuses a symlink without changing its target or cumulative feedback', async (t) => {
  const { statePath, feedbackPath } = await workspace(t, finish(await fixture('feedback-clean')));
  const target = path.join(path.dirname(feedbackPath), 'private-note.md');
  await writeFile(target, 'Keep this private');
  await writeFile(feedbackPath, 'Existing feedback');
  await symlink(target, path.join(path.dirname(statePath), 'workflow-feedback.md'));
  await assert.rejects(writeFeedback(statePath), /Session feedback path must be a regular file/);
  assert.equal(await readFile(target, 'utf8'), 'Keep this private');
  assert.equal(await readFile(feedbackPath, 'utf8'), 'Existing feedback');
});

test('malformed markers are preserved and reported while appending a new block', async () => {
  const state = inspectState(finish(await fixture('feedback-clean'), '2026-01-01T10:06:00Z'));
  const original = `User note\n\n<!-- run:${state.runId} -->\nold text\n`;
  const result = upsertBlock(original, state, renderBlock(state));
  assert.match(result.warning, /Malformed/);
  assert.ok(result.text.startsWith(original));
  assert.equal((result.text.match(new RegExp(`<!-- run:${state.runId} -->`, 'g')) ?? []).length, 2);
  const rerun = upsertBlock(result.text, state, renderBlock(state));
  assert.equal(rerun.text, result.text);
  assert.match(rerun.warning, /Preserved malformed/);
});

test('ineligible stop and missing run ID cannot write', async (t) => {
  const complete = finish(await fixture('feedback-clean'), '2026-01-01T10:06:00Z');
  const stopped = complete.replace('status: Complete', 'status: Stopped')
    .replace('phase: complete', 'phase: review')
    .replace('| final-sync | complete | Final context sync complete |', '| review | review | User stopped |');
  const { directory, statePath } = await workspace(t, stopped);
  await assert.rejects(writeFeedback(statePath), /explicitly confirmed/);
  await assert.rejects(writeFeedback(statePath, { limitStop: true }), /limit\/cap\/exhausted evidence/);
  await writeFile(statePath, complete.replace('start_time: 2026-01-01T10:00:00Z', 'start_time: none'));
  await assert.rejects(writeFeedback(statePath), /start_time/);
  assert.deepEqual(await readdir(directory), ['DEMO']);
});

test('analysis mismatch and unsafe text fail without touching existing feedback', async (t) => {
  const state = finish(await fixture('feedback-nonminimal'), '2026-01-02T10:13:00Z');
  const { statePath, feedbackPath } = await workspace(t, state);
  await writeFile(feedbackPath, 'User-owned text\n');
  const summary = inspectState(state);
  const analysis = diagnosis(summary);
  analysis.events[0].row = 7;
  await assert.rejects(writeFeedback(statePath, { analysis }), /must match/);
  analysis.events[0].row = 6;
  analysis.events[0].trigger = 'See make-it-work/DEMO/DEMO-spec.md';
  await assert.rejects(writeFeedback(statePath, { analysis }), /share-safe/);
  assert.equal(await readFile(feedbackPath, 'utf8'), 'User-owned text\n');
});

test('source-specific Audit terms must be paraphrased before feedback is written', async (t) => {
  const state = finish(await fixture('feedback-nonminimal'), '2026-01-02T10:13:00Z');
  const { statePath, feedbackPath } = await workspace(t, state);
  const summary = inspectState(state);
  assert.ok(summary.sourceCompounds.includes('denied-role'));
  const analysis = diagnosis(summary);
  analysis.events[0].trigger = 'The denied-role outcome was omitted from the plan';
  await assert.rejects(writeFeedback(statePath, { analysis }), /paraphrase.*share-safe/);
  await assert.rejects(readFile(feedbackPath, 'utf8'), { code: 'ENOENT' });

  analysis.events[0].trigger = 'A required rejection outcome was omitted from the plan';
  await writeFeedback(statePath, { analysis });
  const feedback = await readFile(feedbackPath, 'utf8');
  assert.match(feedback, /required rejection outcome/);
  assert.doesNotMatch(feedback, /denied-role/);
});

test('workflow skill names in Audit prose remain valid feedback terms', async (t) => {
  const state = finish(await fixture('feedback-nonminimal'), '2026-01-02T10:13:00Z')
    .replace('Initial execution and gate passed', 'Initial run-regression gate passed');
  const { statePath, feedbackPath } = await workspace(t, state);
  const summary = inspectState(state);
  assert.ok(!summary.sourceCompounds.includes('run-regression'));
  const analysis = diagnosis(summary);
  analysis.recommendations = ['Have run-regression verify coverage after the plan is approved'];
  await writeFeedback(statePath, { analysis });
  assert.match(await readFile(feedbackPath, 'utf8'), /run-regression verify coverage/);
});

test('explicit limit stop is accepted with matching terminal evidence', async (t) => {
  let state = finish(await fixture('feedback-clean'), '2026-01-01T10:06:00Z');
  state = state.replace('status: Complete', 'status: Stopped').replace('phase: complete', 'phase: review')
    .replace('pause_reason: none', 'pause_reason: review limit exhausted')
    .replace('| final-sync | complete | Final context sync complete |', '| review | review | Review limit reached |');
  const { statePath, feedbackPath } = await workspace(t, state);
  await writeFeedback(statePath, { limitStop: true });
  assert.match(await readFile(feedbackPath, 'utf8'), /Outcome: Stopped — loop limit/);
});

test('CLI inspect is read-only and CLI write emits the summary', async (t) => {
  const state = finish(await fixture('feedback-clean'), '2026-01-01T10:06:00Z');
  const { directory, statePath, feedbackPath } = await workspace(t, state);
  const inspect = spawnSync(process.execPath, [SCRIPT_PATH, 'inspect', '--state', statePath], { encoding: 'utf8' });
  assert.equal(inspect.status, 0, inspect.stderr);
  assert.equal(JSON.parse(inspect.stdout).minimal, true);
  assert.deepEqual(await readdir(directory), ['DEMO']);
  const write = spawnSync(process.execPath, [SCRIPT_PATH, 'write', '--state', statePath], { encoding: 'utf8' });
  assert.equal(write.status, 0, write.stderr);
  assert.equal(JSON.parse(write.stdout).outputPath, feedbackPath);
  assert.match(await readFile(feedbackPath, 'utf8'), /Minimal path: Yes/);
});

function adaptiveState(rows, { status = 'Complete', phase = 'complete', mode = 'lightweight', risk = 'low', source = 'assessed', escalations = 0, pause = 'none' } = {}) {
  const fields = `ticket: DEMO\nstatus: ${status}\nphase: ${phase}\nstart_time: 2026-02-01T10:00:00Z\nplugin_version: 4.19.0\npause_reason: ${pause}\n` +
    `adaptive_version: 1\nrisk: ${risk}\nmode: ${mode}\nmode_source: ${source}\nrisk_rationale: Small isolated change\nescalations: ${escalations}\nimplementation_report: none`;
  const table = rows.map(([from, to, outcome], index) =>
    `| ${index + 1} | 2026-02-01T10:${String(index).padStart(2, '0')}:00Z | ${from} | ${to} | ${outcome} |`).join('\n');
  return `\`\`\`\n${fields}\n\`\`\`\n\n## Audit log\n\n| # | Time | From | To | Outcome / reason |\n| --- | --- | --- | --- | --- |\n${table}\n`;
}

test('adaptive Lightweight run adds Mode and Escalations lines and stays minimal when clean', () => {
  const summary = inspectState(adaptiveState([
    ['start', 'close-the-gaps', 'Started'], ['close-the-gaps', 'lightweight', 'Spec saved; low risk'],
    ['lightweight', 'review', 'Implemented'], ['review', 'final-sync', 'Review cycle 1 clean'],
    ['final-sync', 'complete', 'Final context sync complete'],
  ]));
  assert.deepEqual([summary.minimal, summary.fixRounds, summary.replans, summary.reviewCycles], [true, 0, 0, 1]);
  const block = renderBlock(summary);
  assert.match(block, /- Plugin version: 4\.19\.0\n- Mode: lightweight \(low risk, assessed\)\n- Escalations: 0\n- Stages skipped: plan, execute, regression gate\n- Elapsed: \d+h \d+m\n- Outcome: Complete\n/);
});

test('review to lightweight counts as Fix and an Escalation row is its own event, not a Replan', () => {
  const summary = inspectState(adaptiveState([
    ['start', 'close-the-gaps', 'Started'], ['close-the-gaps', 'lightweight', 'Spec saved; low risk'],
    ['lightweight', 'review', 'Implemented'], ['review', 'lightweight', 'Review cycle 1 fix required'],
    ['lightweight', 'review', 'Fixed'], ['review', 'plan', 'Escalation: repeat offender finding after fix'],
    ['plan', 'execute', 'Plan approved'], ['execute', 'review', 'Gate passed'], ['review', 'plan', 'Review cycle 1 replan required'],
    ['plan', 'execute', 'Replanned'], ['execute', 'review', 'Gate passed'], ['review', 'final-sync', 'Review cycle 2 clean'],
    ['final-sync', 'complete', 'Final context sync complete'],
  ], { mode: 'tdd', risk: 'medium', source: 'user', escalations: 1 }));
  assert.deepEqual(summary.events, [{ kind: 'Fix', row: 4 }, { kind: 'Escalation', row: 6 }, { kind: 'Replan', row: 9 }]);
  assert.deepEqual([summary.minimal, summary.fixRounds, summary.replans], [false, 1, 1]);
  const analysis = diagnosis(summary);
  analysis.events[1].owner = 'implement';
  const block = renderBlock(summary, analysis);
  assert.match(block, /- Mode: tdd \(medium risk, user\)\n- Escalations: 1\n- Stages skipped: none\n/);
  assert.match(block, /#### Event 2 — Escalation/);
});

test('limit stop is accepted in the lightweight phase', () => {
  const summary = inspectState(adaptiveState([
    ['start', 'close-the-gaps', 'Started'], ['close-the-gaps', 'lightweight', 'Spec saved'],
    ['lightweight', 'lightweight', 'Fix limit exhausted'],
  ], { status: 'Stopped', phase: 'lightweight', pause: 'fix limit exhausted' }), { limitStop: true });
  assert.equal(summary.outcome, 'Stopped — loop limit');
  assert.ok(!summary.sourceCompounds.includes('lightweight'));
});

test('old runs emit no adaptive lines', async () => {
  const summary = inspectState(finish(await fixture('feedback-clean'), '2026-01-01T10:06:00Z'));
  assert.equal(summary.adaptive, undefined);
  assert.doesNotMatch(renderBlock(summary), /- Mode:|- Escalations:/);
});

const hookHash = (text) => createHash('sha256').update(text).digest('hex');
function hookObservation(id, kind = 'active-stage', at = '2026-01-01T10:03:00Z') {
  return { version: 1, eventId: hookHash(id), runId: '2026-01-01T10:00:00Z', at, hook: 'Stop', phase: 'execute', kind, subject: hookHash(kind) };
}
function hookDiagnosis(summary) {
  return { ...diagnosis(summary), hooks: summary.hookAnalysis.map((item) => ({ id: item.id,
    trigger: 'The workflow required another continuation',
    resolution: item.resolvedAt ? 'The hook subsequently permitted continuation' : 'No release was observed',
    lesson: 'Inspect repeated interruptions separately from implementation retries', confidence: 'high' })) };
}

test('hook-only failures require analysis despite zero fix rounds, and resolved repetitions survive the export', async (t) => {
  const state = finish(await fixture('feedback-clean'), '2026-01-01T10:06:00Z');
  const w = await workspace(t, state);
  const events = [hookObservation('blocked'), hookObservation('blocked'), hookObservation('again'),
    hookObservation('release', 'clear', '2026-01-01T10:04:00Z')];
  await writeFile(path.join(path.dirname(w.statePath), 'hook-events.jsonl'), events.map(JSON.stringify).join('\n') + '\n');
  const summary = await inspectFeedback(w.statePath);
  assert.equal(summary.minimal, true); assert.equal(summary.fixRounds, 0); assert.equal(summary.replans, 0);
  assert.equal(summary.analysisRequired, true); assert.equal(summary.hookInterventions.length, 1);
  assert.equal(summary.hookInterventions[0].occurrences, 2); assert.ok(summary.hookInterventions[0].resolvedAt);
  await assert.rejects(writeFeedback(w.statePath), /Analysis must be a JSON object/);
  const bad = hookDiagnosis(summary); bad.hooks[0].id = hookHash('invented');
  assert.throws(() => renderBlock(summary, bad), /Hook analysis must match/);
  const result = await writeFeedback(w.statePath, { analysis: hookDiagnosis(summary) });
  const output = await readFile(result.sessionOutputPath, 'utf8');
  assert.match(output, /Hook interventions: 2 \(1 episodes\)/); assert.match(output, /Resolution observed: Yes/);
  assert.match(output, /Fix rounds: 0/); assert.doesNotMatch(output, /Extra-round analysis|DEMO|eventId|subject/);
  await writeFeedback(w.statePath, { analysis: hookDiagnosis(summary) });
  assert.equal(await readFile(result.sessionOutputPath, 'utf8'), output);
  assert.equal(await readFile(w.statePath, 'utf8'), state);
});

test('single legitimate waits are informational; repeated waits require their own diagnosis', async () => {
  const state = finish(await fixture('feedback-clean'), '2026-01-01T10:06:00Z');
  const single = inspectState(state, { hookEvents: [hookObservation('one', 'agent-wait')] });
  assert.equal(single.analysisRequired, false); assert.match(renderBlock(single), /Agent wait observations: 1/);
  const repeated = inspectState(state, { hookEvents: [hookObservation('one', 'agent-wait'), hookObservation('two', 'agent-wait')] });
  assert.equal(repeated.analysisRequired, true); assert.equal(repeated.fixRounds, 0);
  assert.throws(() => renderBlock(repeated, diagnosis(repeated)), /each hook intervention or repeated agent wait/);
  assert.match(renderBlock(repeated, hookDiagnosis(repeated)), /Resolution observed: No/);
});

test('CLI inspect includes the journal and a corrupt journal cannot silently produce clean feedback', async (t) => {
  const w = await workspace(t, finish(await fixture('feedback-clean'), '2026-01-01T10:06:00Z'));
  const journal = path.join(path.dirname(w.statePath), 'hook-events.jsonl');
  await writeFile(journal, JSON.stringify(hookObservation('blocked')) + '\n');
  const child = spawnSync(process.execPath, [SCRIPT_PATH, 'inspect', '--state', w.statePath], { encoding: 'utf8' });
  assert.equal(child.status, 0); assert.equal(JSON.parse(child.stdout).analysisRequired, true);
  await writeFile(journal, '{broken');
  await assert.rejects(writeFeedback(w.statePath));
  await assert.rejects(readFile(w.feedbackPath), { code: 'ENOENT' });
});
