import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { inspectState, renderBlock, upsertBlock, writeFeedback } from './write-feedback.mjs';

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

async function workspace(t, state) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'implement-feedback-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const statePath = path.join(directory, 'DEMO-state.md');
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
  assert.match(feedback, /- Minimal path: Yes/);
  assert.match(feedback, /- Review cycles: 1/);
  assert.doesNotMatch(feedback, /Extra-round analysis|DEMO/);
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
  assert.deepEqual(await readdir(directory), ['DEMO-state.md']);
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
  analysis.events[0].trigger = 'See make-it-work/DEMO-spec.md';
  await assert.rejects(writeFeedback(statePath, { analysis }), /share-safe/);
  assert.equal(await readFile(feedbackPath, 'utf8'), 'User-owned text\n');
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
  assert.deepEqual(await readdir(directory), ['DEMO-state.md']);
  const write = spawnSync(process.execPath, [SCRIPT_PATH, 'write', '--state', statePath], { encoding: 'utf8' });
  assert.equal(write.status, 0, write.stderr);
  assert.equal(JSON.parse(write.stdout).outputPath, feedbackPath);
  assert.match(await readFile(feedbackPath, 'utf8'), /Minimal path: Yes/);
});
