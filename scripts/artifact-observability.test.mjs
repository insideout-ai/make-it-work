import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { artifactJoin } from './lib/artifact-path.mjs';
import { ensureArtifactIgnored, assertNoOutgoingArtifacts } from './lib/artifact-git.mjs';
import { collectUsage, bindUsage, captureUsage, readUsage, usageReading } from './usage.mjs';
import { summarizeIntervals } from './lib/activity-timing.mjs';
import { initEpicRun, updateEpicRun, inspectEpicRun } from './epic-workflow.mjs';
const git = (root, ...args) => { const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' }); assert.equal(result.status, 0, result.stderr); return result.stdout.trim(); };
async function fixture(t, repository = false) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'miw-observability-')); t.after(() => rm(root, { recursive: true, force: true }));
  if (repository) { git(root, 'init', '-b', 'main'); git(root, 'config', 'user.name', 'Test'); git(root, 'config', 'user.email', 'test@example.invalid'); }
  return root;
}
test('new epic files have literal miw prefixes and saved version survives checkpoints', async t => {
  const root = await fixture(t), run = await initEpicRun({ root, input: { title: 'Sample', goal: 'Sample outcome', sources: [] } });
  assert.deepEqual((await readdir(run.directory)).sort(), ['miw-dashboard.html', 'miw-run.json', 'miw-state.json']);
  const version = JSON.parse(await readFile(new URL('../.claude-plugin/plugin.json', import.meta.url), 'utf8')).version;
  assert.equal(run.state.plugin_version, version);
  await updateEpicRun({ root, run: run.run, event: { id: 'intake', type: 'intake' } });
  assert.equal((await inspectEpicRun({ root, run: run.run })).state.plugin_version, version);
  const html = await readFile(path.join(run.directory, 'miw-dashboard.html'), 'utf8'); assert.ok(html.includes(`Plugin v${version}`));
});
test('legacy artifact paths remain unchanged while marked nested handoffs are prefixed once', async t => {
  const root = await fixture(t), old = path.join(root, 'make-it-work', 'OLD'), fresh = path.join(root, 'make-it-work', 'NEW');
  await mkdir(old, { recursive: true }); await mkdir(fresh); await writeFile(path.join(old, 'OLD-state.md'), 'legacy');
  await writeFile(path.join(fresh, 'miw-run.json'), '{"artifact_naming_version":1}');
  assert.equal(artifactJoin(old, 'report.md'), path.join(old, 'report.md'));
  assert.equal(artifactJoin(fresh, 'NEW-handoffs', 'review-1.json'), path.join(fresh, 'NEW-handoffs', 'miw-review-1.json'));
  assert.equal(artifactJoin(fresh, 'miw-report.md'), path.join(fresh, 'miw-report.md'));
});
test('ignore setup preserves CRLF, repairs negations and is idempotent', async t => {
  const root = await fixture(t, true), ignore = path.join(root, '.gitignore'), directory = path.join(root, 'make-it-work');
  await writeFile(ignore, '# Keep me\r\n/make-it-work/\r\n!/make-it-work/\r\n');
  await ensureArtifactIgnored(directory); const first = await readFile(ignore, 'utf8');
  assert.ok(first.startsWith('# Keep me\r\n')); assert.ok(first.endsWith('/make-it-work/\r\n'));
  await ensureArtifactIgnored(directory); assert.equal(await readFile(ignore, 'utf8'), first);
  git(root, 'check-ignore', 'make-it-work/nested/report.md');
});
test('tracked artifacts block without modifying index or local files', async t => {
  const root = await fixture(t, true), directory = path.join(root, 'make-it-work'); await mkdir(directory);
  await writeFile(path.join(directory, 'private.md'), 'private'); git(root, 'add', 'make-it-work/private.md');
  const before = git(root, 'ls-files', '--stage'); await assert.rejects(ensureArtifactIgnored(directory), /already staged or tracked/);
  assert.equal(git(root, 'ls-files', '--stage'), before); assert.equal(await readFile(path.join(directory, 'private.md'), 'utf8'), 'private');
});
test('outgoing history detects artifacts added then deleted, and requires remote refs', async t => {
  const root = await fixture(t, true); await writeFile(path.join(root, 'app.txt'), 'app'); git(root, 'add', '.'); git(root, 'commit', '-m', 'base');
  assert.throws(() => assertNoOutgoingArtifacts(root), /origin remote refs/); git(root, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  await mkdir(path.join(root, 'make-it-work')); await writeFile(path.join(root, 'make-it-work', 'private.txt'), 'secret'); git(root, 'add', '.'); git(root, 'commit', '-m', 'artifact');
  git(root, 'rm', '-r', 'make-it-work'); git(root, 'commit', '-m', 'remove artifact');
  assert.throws(() => assertNoOutgoingArtifacts(root), /contains workflow artifacts/);
});
test('usage is isolated by explicit session binding and updates only on capture', async t => {
  const root = await fixture(t), run = await initEpicRun({ root, input: { title: 'Usage', goal: 'Usage', sources: [] } });
  const input = (id, percent, cost) => ({ session_id: id, workspace: { project_dir: root }, context_window: { used_percentage: percent, context_window_size: 200000 }, cost: { total_cost_usd: cost } });
  await collectUsage(root, input('a', 0, 0)); await collectUsage(root, input('b', 90, 12));
  assert.equal(await readUsage(run.directory), null); await bindUsage(root, run.directory, 'a'); await captureUsage(run.directory);
  assert.equal((await readUsage(run.directory)).context_percent, 0);
  await collectUsage(root, input('a', 50, 1.23)); assert.equal((await readUsage(run.directory)).context_percent, 0);
  await captureUsage(run.directory); assert.equal((await readUsage(run.directory)).estimated_cost_usd, 1.23);
  await bindUsage(root, run.directory, 'b'); await captureUsage(run.directory); assert.equal((await readUsage(run.directory)).estimated_cost_usd, 12);
  await assert.rejects(collectUsage(root, { ...input('x', 1, 1), workspace: { project_dir: os.tmpdir() } }), /does not match/);
  assert.equal(usageReading(input('c', -1, 'bad')).context_percent, null); assert.equal(usageReading(input('c', -1, 'bad')).estimated_cost_usd, null);
});
test('category intervals account for elapsed time once, including waits and unknown work', () => {
  const events = [{ at: '2026-01-01T10:00:00Z', category: 'coding' }, { at: '2026-01-01T10:03:00Z', category: 'tests/verification' }, { at: '2026-01-01T10:05:00Z', category: 'waiting for input' }, { at: '2026-01-01T10:06:00Z', category: 'unclassified' }];
  const result = summarizeIntervals(events, '2026-01-01T10:07:00Z'); assert.equal(result.total_ms, 420000); assert.equal(result.totals.coding, 180000); assert.equal(result.totals['waiting for input'], 60000);
  assert.throws(() => summarizeIntervals(events.reverse(), '2026-01-01T10:07:00Z'), /out-of-order/);
});

test('post-coding summary preserves evidence, records pauses, and separates later passes', async t => {
  const { recordActivityTiming, closeActivityTiming } = await import('../skills/implement/scripts/activity-timing.mjs');
  const root = await fixture(t), directory = path.join(root, 'make-it-work', 'TIMING'); await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'miw-run.json'), '{"artifact_naming_version":1}');
  const statePath = path.join(directory, 'miw-TIMING-state.md');
  const state = { fields: { phase: 'execute', status: 'In Progress', activity_timing_version: '1' }, audit: [{ number: 1, from: 'plan', to: 'execute', time: '2026-01-01T10:00:00Z' }] };
  const markdown = '# State\n\n## Audit log\n\n| # | Time | From | To | Outcome / reason |\n| --- | --- | --- | --- | --- |\n| 1 | 2026-01-01T10:00:00Z | plan | execute | Started |\n';
  await recordActivityTiming(statePath, state, 'coding', '2026-01-01T10:01:00Z');
  await closeActivityTiming(statePath, state, markdown, 'execute', 'Paused', '2026-01-01T10:03:00Z');
  await closeActivityTiming(statePath, { ...state, fields: { ...state.fields, status: 'Paused' } }, markdown, 'execute', 'In Progress', '2026-01-01T10:04:00Z', { resumed: true });
  await recordActivityTiming(statePath, state, 'tests/verification', '2026-01-01T10:04:00Z');
  const output = await closeActivityTiming(statePath, state, markdown, 'review', 'In Progress', '2026-01-01T10:06:00Z');
  assert.match(output, /Execute time breakdown \(elapsed estimate\): 6m 0s total/);
  assert.match(output, /coding 2m 0s/); assert.match(output, /waiting for input 1m 0s/);
  const detail = JSON.parse(await readFile(path.join(directory, 'miw-time-breakdown-execute-1.json'), 'utf8'));
  assert.equal(detail.total_ms, 360000); assert.equal(detail.totals['tests/verification'], 120000);
  assert.equal(await closeActivityTiming(statePath, state, markdown, 'review', 'In Progress', '2026-01-01T10:06:00Z'), output);
  const next = { fields: state.fields, audit: [...state.audit, { number: 4, from: 'plan', to: 'execute', time: '2026-01-01T11:00:00Z' }] };
  await recordActivityTiming(statePath, next, 'coding', '2026-01-01T11:00:00Z');
  await closeActivityTiming(statePath, next, markdown, 'review', 'In Progress', '2026-01-01T11:01:00Z');
  assert.ok((await readdir(directory)).includes('miw-time-breakdown-execute-4.json'));
  assert.deepEqual(JSON.parse(await readFile(path.join(directory, 'miw-time-breakdown-execute-1.json'), 'utf8')), detail);
});
test('resume does not label an unsupported interruption as coding time', async t => {
  const { recordActivityTiming, closeActivityTiming } = await import('../skills/implement/scripts/activity-timing.mjs');
  const root = await fixture(t), directory = path.join(root, 'make-it-work', 'GAP'); await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'miw-run.json'), '{"artifact_naming_version":1}');
  const statePath = path.join(directory, 'miw-GAP-state.md');
  const state = { fields: { phase: 'lightweight', status: 'In Progress', activity_timing_version: '1' }, audit: [{ number: 1, from: 'close-the-gaps', to: 'lightweight', time: '2026-01-01T10:00:00Z' }] };
  await recordActivityTiming(statePath, state, 'coding', '2026-01-01T10:00:00Z');
  await closeActivityTiming(statePath, state, '', 'lightweight', 'In Progress', '2026-01-01T12:00:00Z', { resumed: true });
  const journal = JSON.parse(await readFile(path.join(directory, 'miw-activity-timing.json'), 'utf8'));
  assert.equal(journal.events.at(-1).category, 'unclassified');
});

test('content-only ignore rules with exceptions are upgraded to exclude the directory', async t => {
  const root = await fixture(t, true), directory = path.join(root, 'make-it-work');
  await writeFile(path.join(root, '.gitignore'), 'make-it-work/*\n!make-it-work/private.md\n');
  await ensureArtifactIgnored(directory);
  assert.ok((await readFile(path.join(root, '.gitignore'), 'utf8')).endsWith('/make-it-work/\n'));
  git(root, 'check-ignore', 'make-it-work/private.md');
});
test('existing unprefixed standalone logs stay on their established paths', async t => {
  const { updateLog } = await import('./decision-log.mjs');
  const root = await fixture(t), directory = path.join(root, 'make-it-work', 'OLD'); await mkdir(directory, { recursive: true });
  const file = path.join(directory, 'execute-autopilot-log.jsonl'); await writeFile(file, '');
  await updateLog({ root, ticket: 'OLD', skill: 'execute', command: 'init' });
  assert.deepEqual(await readdir(directory), ['execute-autopilot-log.jsonl']);
});
test('page-load elapsed hydration updates the display without a timer or changing HTML evidence', async () => {
  const { WORKFLOW_TIMESTAMPS } = await import('./lib/workflow-dashboard.mjs');
  const { runInNewContext } = await import('node:vm');
  const element = { textContent: '2m', getAttribute: key => key === 'data-elapsed-start' ? '0' : '120000' };
  runInNewContext(WORKFLOW_TIMESTAMPS.replace(/^<script>\n|<\/script>$/g, ''), {
    Date: { now: () => 300000 },
    document: { querySelector: () => null, querySelectorAll: selector => selector === '[data-elapsed-start]' ? [element] : [] },
    setInterval: () => { throw new Error('No elapsed timer should be installed'); },
  });
  assert.equal(element.textContent, '5m');
});

test('manual prose writers resolve new, legacy, and established standalone output paths before writing', async t => {
  const { resolveArtifactOutput } = await import('./artifact-output.mjs');
  const root = await fixture(t, true), directory = 'make-it-work/MANUAL';
  const fresh = await resolveArtifactOutput({ root, directory, name: 'MANUAL-plan.md' });
  assert.equal(fresh.name, 'miw-MANUAL-plan.md');
  assert.equal(fresh.relative, 'make-it-work/MANUAL/miw-MANUAL-plan.md');
  assert.equal(fresh.gitProtection.applicable, true);
  await assert.rejects(readFile(fresh.file), { code: 'ENOENT' });
  const old = path.join(root, 'make-it-work', 'LEGACY'); await mkdir(old);
  await writeFile(path.join(old, 'LEGACY-state.md'), 'Existing state');
  const continued = await resolveArtifactOutput({ root, directory: 'make-it-work/LEGACY', name: 'LEGACY-review.md' });
  assert.equal(continued.name, 'LEGACY-review.md');
  await assert.rejects(resolveArtifactOutput({ root, directory: 'source', name: 'code.md' }), /under make-it-work/);
});

test('audited regression records a verification boundary without creating a legacy dashboard', async t => {
  const { runRegression } = await import('./regression.mjs');
  const root = await fixture(t), directory = path.join(root, 'make-it-work', 'DEMO'); await mkdir(directory, { recursive: true });
  const statePath = path.join(directory, 'DEMO-state.md');
  const state = (await readFile('evals/implement/feedback-clean/fixture/fixture-artifacts/DEMO-state.md', 'utf8'))
    .replace('ticket: DEMO', 'ticket: DEMO\nactivity_timing_version: 1').replace('phase: final-sync', 'phase: execute').trimEnd() + '\n| 7 | 2026-01-01T10:06:00Z | review | execute | Resume execution |\n';
  await writeFile(statePath, state);
  await runRegression({ version: 1, mode: 'full', runs: [{ repo: 'app', cwd: root, scope: 'full', command: { bin: process.execPath, args: ['-e', 'process.exit(0)'] } }] }, { statePath, auditId: 'timed-check' });
  const journal = JSON.parse(await readFile(path.join(directory, 'activity-timing.json'), 'utf8'));
  assert.equal(journal.events.at(-1).category, 'tests/verification');
  await assert.rejects(readFile(path.join(directory, 'DEMO-status.html')), { code: 'ENOENT' });
});
