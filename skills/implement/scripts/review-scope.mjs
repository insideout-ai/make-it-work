#!/usr/bin/env node
// Freeze the delivery diff before independent review; recheck it before packaging.
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { args, atomicWrite, cli, digest, fail, within } from '../../../scripts/lib/artifacts.mjs';
import { snapshotDeliveryRepo } from '../../../scripts/lib/delivery-scope.mjs';
import { compareReviewScope } from '../../../scripts/lib/review-evidence.mjs';
import { parseState } from './render-status.mjs';
import { assertRunState, runArtifact } from './artifact-layout.mjs';

const targetName = (f) => `${f.ticket}-review-target-${f.review_cycle}.json`;
async function readState(root, statePath) {
  root = await realpath(root);
  const resolved = await within(root, statePath);
  const state = parseState(await readFile(resolved, 'utf8'), resolved);
  assertRunState(root, resolved, state.fields.ticket);
  if (state.fields.review_scope_version !== '1') fail('This saved run is not enabled for delivery-aligned review.');
  return state;
}
export async function deliverySnapshots(root, state) {
  const f = state.fields;
  const selected = f.workspace_version === '1' ? JSON.parse(f.workspace_contract).repos
    : (f.workspace_snapshot ? JSON.parse(f.workspace_snapshot) : [{ root, branch: f.branch }]).map((repo) => ({ ...repo, base: f.base }));
  const repos = [];
  for (const repo of selected) {
    const snapshot = await snapshotDeliveryRepo(repo.root, repo.base);
    if (snapshot.branch !== repo.branch) fail('Review branch differs from the saved delivery branch.');
    if (repos.some((item) => item.name === snapshot.name)) fail(`Duplicate delivery repo name: ${snapshot.name}`);
    repos.push(snapshot);
  }
  return repos.sort((a, b) => a.name.localeCompare(b.name));
}
const manifestRepos = (repos, f) => repos.map(({ diff, ...repo }) => ({ ...repo, diff_file: `${f.ticket}-review-${f.review_cycle}-${repo.name}.diff` }));

export async function prepareReviewScope(root, statePath) {
  root = await realpath(root);
  const state = await readState(root, statePath), f = state.fields;
  if (f.phase !== 'review' || f.status !== 'In Progress') fail('Prepare review scope only in an active Review phase.');
  const repos = await deliverySnapshots(root, state);
  const target = { version: 1, ticket: f.ticket, runId: f.start_time, planVersion: Number(f.plan_version), cycle: Number(f.review_cycle), repos: manifestRepos(repos, f) };
  const relative = runArtifact(f.ticket, targetName(f));
  for (const [index, repo] of repos.entries()) await atomicWrite(path.join(root, 'make-it-work', f.ticket, target.repos[index].diff_file), repo.diff);
  await atomicWrite(path.join(root, relative), `${JSON.stringify(target, null, 2)}\n`);
  return { review_target: relative, sha256: digest(await readFile(path.join(root, relative))),
    repos: target.repos.map(({ name, path: repoRoot, base, merge_base, paths, diff_file }) => ({ name, root: repoRoot, base, merge_base, paths, diff_file })) };
}

async function readTarget(root, state, relative) {
  const f = state.fields;
  if (relative !== runArtifact(f.ticket, targetName(f))) fail('Review target must match the current run and review cycle.');
  const bytes = await readFile(await within(root, relative));
  const target = JSON.parse(bytes);
  if (target.version !== 1 || target.ticket !== f.ticket || target.runId !== f.start_time || target.planVersion !== Number(f.plan_version) || target.cycle !== Number(f.review_cycle) || !Array.isArray(target.repos)) fail('Review target binding is stale. Prepare the current delivery scope again.');
  for (const repo of target.repos) {
    const diff = await readFile(await within(root, runArtifact(f.ticket, repo.diff_file)));
    if (digest(diff) !== repo.diff_sha256) fail('Review target diff changed. Prepare the current delivery scope again.');
  }
  return { target, sha256: digest(bytes) };
}

function sameTarget(target, repos, f) {
  return JSON.stringify(target.repos) === JSON.stringify(manifestRepos(repos, f));
}
function fullCoverage(evidence, repos) {
  const coverage = compareReviewScope(evidence, repos);
  const matching = evidence?.repos?.length === repos.length && evidence.repos.every((repo) => repo.scope === 'branch' &&
    repos.some((item) => item.path === repo.root && item.merge_base === repo.base && item.head === repo.head));
  return { coverage, covered: matching && coverage.every((repo) => repo.status === 'covered') };
}
export async function validateReviewScopeInput(root, input, evidence) {
  if (!input.implement) return;
  root = await realpath(root);
  const statePath = path.join(root, 'make-it-work', input.ticket, `${input.ticket}-state.md`);
  let state;
  try {
    const text = await readFile(statePath, 'utf8');
    if (!/^review_scope_version: 1$/m.test(text) && input.implement.review_scope_version !== 1) return;
    state = parseState(text, statePath);
  }
  catch (error) { if (error.code === 'ENOENT' && input.implement.review_scope_version !== 1) return; throw error; }
  if (state.fields.review_scope_version !== '1') fail('Review scope policy does not match the saved run.');
  if (state.fields.phase !== 'review' || state.fields.status !== 'In Progress' || input.implement.review_cycle !== Number(state.fields.review_cycle) || input.implement.plan_version !== Number(state.fields.plan_version)) fail('Review input does not match the active review cycle.');
  assertRunState(root, statePath, input.ticket);
  const { target, sha256 } = await readTarget(root, state, input.review_target);
  if (input.review_target_sha256 !== sha256) fail('Review target hash differs from the dispatched snapshot. Review the current target before writing the report.');
  const repos = await deliverySnapshots(root, state);
  if (!sameTarget(target, repos, state.fields)) fail('Delivery diff changed during review. Prepare the current delivery scope again and review it.');
  if (!fullCoverage(evidence, repos).covered) {
    fail('Review must cover the full delivery diff from each saved base, including earlier branch commits and all changed paths. A HEAD-only or partial review cannot satisfy this target.');
  }
  evidence.delivery_target = { path: input.review_target, sha256 };
}

export async function checkReviewScope(root, statePath, { requireCurrent = true } = {}) {
  const state = await readState(root, statePath), f = state.fields;
  const evidence = JSON.parse(await readFile(await within(root, runArtifact(f.ticket, `${f.ticket}-review-evidence.json`)), 'utf8'));
  const report = await readFile(await within(root, runArtifact(f.ticket, `${f.ticket}-review.md`)));
  if (evidence.version !== 1 || evidence.ticket !== f.ticket || evidence.report_sha256 !== digest(report) || !evidence.delivery_target) fail('Clean review needs delivery-bound scope evidence; rerun the independent review.');
  const { target, sha256 } = await readTarget(root, state, evidence.delivery_target.path);
  if (sha256 !== evidence.delivery_target.sha256) fail('Review target changed after review. Prepare and review the current delivery scope again.');
  const repos = await deliverySnapshots(root, state);
  const result = fullCoverage(evidence, repos);
  result.covered = result.covered && sameTarget(target, repos, f);
  if (requireCurrent && !result.covered) fail('Delivery scope is not fully reviewed. Prepare and independently review the full current branch-to-base diff before final packaging.');
  return { ...result, target: evidence.delivery_target, target_diffs: target.repos.map((repo) => runArtifact(f.ticket, repo.diff_file)), repos: repos.map(({ diff, ...repo }) => repo) };
}

cli(import.meta.url, async (argv) => {
  const o = args(argv, ['--root', '--state']);
  if (!o.root || !o.state || !['prepare', 'check'].includes(o.command)) fail('Usage: review-scope.mjs prepare|check --root ROOT --state STATE');
  return o.command === 'prepare' ? prepareReviewScope(o.root, o.state) : checkReviewScope(o.root, o.state);
});
