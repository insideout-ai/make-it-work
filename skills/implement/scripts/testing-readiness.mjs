#!/usr/bin/env node
// Parent-owned completion barrier between testing readiness and planning.
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { args, atomicWrite, cli, digest, fail, section, table, within, withLock } from '../../../scripts/lib/artifacts.mjs';
import { parseState } from './render-status.mjs';
import { assertRunState, runArtifact } from './artifact-layout.mjs';
import { testingPolicy } from './testing-policy.mjs';
import { checkpointResult } from './dashboard-checkpoint.mjs';

export const readinessMutationCommand = (input) => input.tool_name === 'Bash' && /testing-readiness\.mjs["']?\s+(?:begin|complete)\b/.test(input.tool_input?.command ?? '');
const enabled = (f) => f.testing_readiness_version === '1';
export const readinessPaths = (f) => ({
  receipt: runArtifact(f.ticket, `${f.ticket}-readiness-v${f.plan_version}.json`),
  report: runArtifact(f.ticket, `${f.ticket}-testing-readiness${f.plan_version === '1' ? '' : `-v${f.plan_version}`}.md`),
});
function binding(f) {
  const selected = f.workspace_version === '1' ? JSON.parse(f.workspace_contract).repos : JSON.parse(f.workspace_snapshot);
  return { version: 1, ticket: f.ticket, start_time: f.start_time, plan_version: f.plan_version, spec_hash: f.spec_hash,
    scope: selected.map((repo) => ({ root: repo.root, id: repo.id ?? null, role: repo.role ?? 'product', branch: repo.branch, base: repo.base ?? f.base })).sort((a, b) => a.root.localeCompare(b.root)) };
}
const matches = (receipt, expected) => Object.keys(expected).every((key) => JSON.stringify(receipt[key]) === JSON.stringify(expected[key]));
async function readReceipt(root, f) {
  try { return JSON.parse(await readFile(await within(root, readinessPaths(f).receipt), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') fail('Testing readiness has not begun. Begin and complete readiness before planning.'); throw error; }
}
async function reportEvidence(root, state) {
  const f = state.fields, expected = binding(f), names = readinessPaths(f);
  if (f.spec === 'none' || digest(await readFile(await within(root, f.spec))) !== f.spec_hash) fail('Readiness requires the unchanged accepted spec.');
  const bytes = await readFile(await within(root, names.report));
  const report = bytes.toString('utf8'), policy = testingPolicy(report, { required: true });
  const results = table(section(report, 'Readiness results') ?? '', ['Repo', 'Status', 'Setup', 'Baseline', 'Evidence']);
  if (results.length !== policy.length || new Set(results.map((row) => row.Repo)).size !== results.length || results.some((row) => !policy.some((item) => item.Repo === row.Repo))) fail('Readiness results must cover every verification-policy repo exactly once.');
  if (f.workspace_version === '1') {
    if (expected.scope.filter((repo) => repo.role === 'product').some((repo) => !policy.some((row) => row.Repo === repo.id)) || policy.some((row) => !expected.scope.some((repo) => repo.id === row.Repo))) fail('Readiness must cover approved product repos and cannot add unapproved repos.');
  } else if (policy.length !== 1) fail('Single-repo readiness requires exactly one verification-policy repo.');
  for (const row of results) {
    const p = policy.find((item) => item.Repo === row.Repo);
    if (!row.Evidence.trim()) fail('Readiness needs actual evidence or a recorded baseline limitation.');
    if (p.Mode === 'manual') {
      if (row.Status !== 'manual' || row.Setup !== 'manual' || row.Baseline !== 'not-applicable') fail('Manual readiness needs its explicit policy and manual status.');
    } else {
      if (row.Status !== 'ready' || !['existing', 'established'].includes(row.Setup) || !['pass', 'fail', 'not-run'].includes(row.Baseline)) fail('Automated readiness is pending, blocked or incomplete.');
      if (row.Setup === 'established' && row.Baseline !== 'pass') fail('Newly established setup requires an actually passing behavior baseline.');
    }
  }
  return { report: names.report, report_sha256: digest(bytes), policy, results };
}
function normalizedPolicy(rows) { return [...rows].sort((a, b) => a.Repo.localeCompare(b.Repo)); }
export async function checkTestingReadiness(root, state, { plan = null } = {}) {
  const f = state.fields;
  if (!enabled(f)) return { required: false, ready: true };
  const receipt = await readReceipt(root, f);
  if (!matches(receipt, binding(f)) || receipt.status !== 'complete') fail('Testing readiness is pending or stale. Wait for delegates, reconcile their reports, and complete readiness before planning.');
  const evidence = await reportEvidence(root, state);
  if (receipt.report !== evidence.report || receipt.report_sha256 !== evidence.report_sha256 || JSON.stringify(receipt.policy) !== JSON.stringify(evidence.policy) || JSON.stringify(receipt.results) !== JSON.stringify(evidence.results) || f.testing_readiness !== evidence.report) fail('Testing readiness changed after completion; reconcile and complete it again before planning.');
  if (plan !== null && JSON.stringify(normalizedPolicy(testingPolicy(plan, { required: true }))) !== JSON.stringify(normalizedPolicy(evidence.policy))) fail('Plan verification policy differs from completed readiness.');
  return { required: true, ready: true, receipt: readinessPaths(f).receipt, ...evidence };
}
export async function testingReadiness(statePath, action, { restart = false } = {}) {
  const root = await realpath(path.dirname(path.dirname(path.dirname(statePath))));
  const resolved = await within(root, path.relative(root, statePath));
  const result = await withLock(resolved, async () => {
    const markdown = await readFile(resolved, 'utf8'), state = parseState(markdown, resolved), f = state.fields;
    assertRunState(root, resolved, f.ticket);
    if (!enabled(f)) return { required: false, ready: true };
    if (action === 'check') return checkTestingReadiness(root, state);
    if (!['begin', 'complete'].includes(action) || f.status !== 'In Progress' || !['plan', 'fix-plan'].includes(f.phase)) fail('Readiness changes require active Plan or fix planning.');
    const expected = binding(f), names = readinessPaths(f);
    if (f.spec === 'none' || digest(await readFile(await within(root, f.spec))) !== f.spec_hash) fail('Readiness requires the unchanged accepted spec.');
    if (action === 'begin') {
      let prior;
      try { prior = JSON.parse(await readFile(await within(root, names.receipt), 'utf8')); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (prior && matches(prior, expected) && !restart) {
        if (prior.status === 'complete') return { ...await checkTestingReadiness(root, state), reused: true };
        if (prior.status === 'pending') return { required: true, ready: false, report: names.report, receipt: names.receipt, reused: true };
        fail('Invalid readiness checkpoint status.');
      }
      await atomicWrite(path.join(root, names.receipt), JSON.stringify({ ...expected, status: 'pending' }, null, 2) + '\n');
      return { required: true, ready: false, report: names.report, receipt: names.receipt };
    }
    const prior = await readReceipt(root, f);
    if (!matches(prior, expected) || !['pending', 'complete'].includes(prior.status)) fail('Begin readiness for this run/spec/plan before completing it.');
    const evidence = await reportEvidence(root, state);
    const receipt = { ...expected, status: 'complete', ...evidence };
    await atomicWrite(path.join(root, names.receipt), JSON.stringify(receipt, null, 2) + '\n');
    // Only the existing readiness pointer changes; no phase, approval or counter is advanced.
    const updated = markdown.replace(/^testing_readiness:.*$/m, `testing_readiness: ${names.report}`);
    parseState(updated, resolved);
    if (updated !== markdown) await atomicWrite(resolved, updated);
    return { required: true, ready: true, receipt: names.receipt, ...evidence };
  });
  if (action === 'complete' && result.required) await checkpointResult(resolved, {
    id: `readiness:${digest(JSON.stringify(result))}`,
    text: `Testing readiness completed before planning. Baselines: ${result.results.map((row) => `${row.Repo}=${row.Baseline}`).join(', ')}.`,
    reference: `${result.receipt}; ${result.report}; sha256:${result.report_sha256}`,
  });
  return result;
}
cli(import.meta.url, async (argv) => {
  const o = args(argv, ['--state', '--restart']);
  if (!['begin', 'complete', 'check'].includes(o.command) || !o.state || (o.restart !== undefined && (o.restart !== '1' || o.command !== 'begin'))) fail('Usage: testing-readiness.mjs begin|complete|check --state STATE [begin --restart 1]');
  return testingReadiness(path.resolve(o.state), o.command, { restart: o.restart === '1' });
});
