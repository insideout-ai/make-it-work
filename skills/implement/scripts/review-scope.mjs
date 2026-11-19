#!/usr/bin/env node
import { artifactJoin } from '../../../scripts/lib/artifact-path.mjs';
// Freeze the delivery diff before independent review; recheck it before packaging.
import { readFile } from '../../../scripts/lib/artifact-io.mjs';
import { execFileSync } from 'node:child_process';
import { lstat, readFile as readPlain, readlink, realpath, writeFile as writePlain } from 'node:fs/promises';
import path from 'node:path';
import { args, atomicWrite, cli, digest, fail, jsonInput, within } from '../../../scripts/lib/artifacts.mjs';
import { SENSITIVE_PATH, snapshotDeliveryRepo } from '../../../scripts/lib/delivery-scope.mjs';
import { compareReviewScope } from '../../../scripts/lib/review-evidence.mjs';
import { parseState } from './render-status.mjs';
import { assertRunState, runArtifact } from './artifact-layout.mjs';
import { checkRepoImpact } from './repo-impact.mjs';
import { checkContextMaintenance } from './context-maintenance.mjs';
import { validateReviewChecks } from './review-checks.mjs';
import { testingPolicy } from './testing-policy.mjs';
import { reviewBaselineEvidence } from './review-baseline.mjs';
import { inspectScopeReconciliation, reconcileScopeDecisions, reconciliationSummary } from './review-reconciliation.mjs';

async function verificationContext(root, f) {
  const context = { ...(f.repo_impact_version === '1' ? { repository_impact: { path: f.repo_impact, sha256: f.repo_impact_hash, definition_hash: f.repo_impact_definition_hash } } : {}), mode: f.mode ?? 'legacy', retained_decisions: f.retained_verification ? JSON.parse(f.retained_verification) : null, policy: null, policy_source: null };
  // Lightweight can retain an explicitly accepted verification limitation even
  // without a plan. These decisions are context, never acceptance evidence.
  const source = f.testing_readiness && f.testing_readiness !== 'none' ? f.testing_readiness : f.mode !== 'lightweight' && f.plan !== 'none' ? f.plan : null;
  if (source) {
    const bytes = await readFile(await within(root, source));
    context.policy = testingPolicy(bytes.toString());
    context.policy_source = { path: source, sha256: digest(bytes) };
  }
  if (f.manual_verification_waiver && f.manual_verification_waiver !== 'none') context.manual_waiver = JSON.parse(f.manual_verification_waiver);
  return context;
}

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
const manifestRepos = (repos, f) => repos.map(({ diff, ...repo }) => ({ ...repo, diff_file: `${f.artifact_naming_version === '1' ? 'miw-' : ''}${f.ticket}-review-${f.review_cycle}-${repo.name}.diff` }));

export async function prepareReviewScope(root, statePath) {
  root = await realpath(root);
  const state = await readState(root, statePath), f = state.fields;
  if (f.phase !== 'review' || f.status !== 'In Progress') fail('Prepare review scope only in an active Review phase.');
  if (['1', '2'].includes(f.review_context_version)) {
    const entry = state.audit.findLast(row => row.to === 'review' && row.from !== 'review');
    if (!state.audit.some(row => row.number > (entry?.number ?? 0) && row.from === 'review' && row.to === 'review' &&
        row.outcome.startsWith(`Review context prepared for cycle ${f.review_cycle}.`) && row.outcome.includes('[workflow-event:'))) {
      fail('Prepare bounded documentation/test-map context before freezing review scope; checkpoint review-context with context_updated (or []).');
    }
  }
  await checkRepoImpact(root, f, { requireChecks: f.mode === 'lightweight' });
  await checkContextMaintenance(root, f);
  const repos = await deliverySnapshots(root, state);
  const reconciliation = await inspectScopeReconciliation(root, state, repos);
  const target = { version: 1, ticket: f.ticket, runId: f.start_time, planVersion: Number(f.plan_version), cycle: Number(f.review_cycle), repos: manifestRepos(repos, f), verification_context: await verificationContext(root, f) };
  if (reconciliation.enabled) target.scope_reconciliation = reconciliationContext(reconciliation);
  if (f.review_checks_version === '1') {
    const requirements = JSON.parse(f.review_requirements ?? '[]');
    if (requirements.length !== repos.length) fail('Checkpoint the required review skills and mapping scope before freezing review.');
    target.review_requirements = requirements;
  }
  const relative = runArtifact(f.ticket, targetName(f), f.artifact_naming_version);
  let targetBytes = `${JSON.stringify(target, null, 2)}\n`;
  try {
    const previousBytes = await readFile(artifactJoin(root, relative), 'utf8');
    const { scope_reconciliation: previousAdvisories, ...previousCore } = JSON.parse(previousBytes);
    const { scope_reconciliation: currentAdvisories, ...currentCore } = target;
    // Advisory refreshes must not force re-review of an identical delivery target.
    if (JSON.stringify(previousCore) === JSON.stringify(currentCore)) targetBytes = previousBytes;
  } catch { /* A missing/unreadable old target can be prepared from current evidence. */ }
  for (const [index, repo] of repos.entries()) await atomicWrite(artifactJoin(root, 'make-it-work', f.ticket, target.repos[index].diff_file), repo.diff);
  await atomicWrite(artifactJoin(root, relative), targetBytes);
  const preexisting = reconciliation.enabled ? { repos: [] } : await preexistingUntracked(root, state);
  return { ...(reconciliation.enabled ? { ready: true, reconciliation: reconciliationSummary(reconciliation) } : {}), review_target: relative, sha256: digest(await readFile(artifactJoin(root, relative))),
    repos: target.repos.map(({ name, path: repoRoot, base, merge_base, paths, diff_file }) => ({ name, root: repoRoot, base, merge_base, paths, diff_file })),
    ...(!reconciliation.enabled && preexisting.repos.length ? { preexisting_untracked: preexisting.repos } : {}) };
}

const reconciliationContext = report => ({ advisory: true, available: report.available, warnings: report.warnings, assumption: report.assumption, unresolved: report.unresolved, fingerprint: report.fingerprint,
  decisions_sha256: digest(JSON.stringify(report.candidates.map(({ id, resolution }) => ({ id, resolution })))),
  files: report.files, inclusions: reconciliationSummary(report).candidates });
export async function inspectReviewScope(root, statePath) {
  root = await realpath(root);
  const state = await readState(root, statePath);
  return reconciliationSummary(await inspectScopeReconciliation(root, state, await deliverySnapshots(root, state)));
}
export async function reconcileReviewScope(root, statePath, input) {
  root = await realpath(root);
  const state = await readState(root, statePath);
  return reconciliationSummary(await reconcileScopeDecisions(root, state, await deliverySnapshots(root, state), input));
}

// Unchanged untracked starting content, offered for explicit scope treatment.
// New runs use review provenance; old runs retain their narrower baseline.
export async function preexistingUntracked(root, state) {
  const f = state.fields;
  const evidence = reviewBaselineEvidence(f), review = evidence.baseline;
  if (evidence.warning) return { available: false, repos: [], warnings: [evidence.warning] };
  if (!review && (!f.implementation_baseline || f.implementation_baseline === 'none')) return { available: false, repos: [] };
  let saved = review;
  if (!saved) {
    try { saved = JSON.parse(f.implementation_baseline); } catch { return { available: false, repos: [] }; }
  }
  if (!Array.isArray(saved.repos)) return { available: false, repos: [] };
  const selected = f.workspace_version === '1' ? JSON.parse(f.workspace_contract).repos : f.workspace_snapshot ? JSON.parse(f.workspace_snapshot) : [{ root }];
  if (review && selected.some(repo => !review.repos.some(prior => prior.root === repo.root))) return { available: false, repos: [], warnings: ['Review baseline is missing a selected repository; starting provenance is unknown.'] };
  const repos = [];
  for (const prior of saved.repos) {
    if (review && !selected.some(repo => repo.root === prior.root)) continue;
    if (!Array.isArray(prior.changes)) continue;
    const images = new Map(prior.changes.filter((entry) => entry.image && (!review || entry.tracked === false)).map((entry) => [entry.file, entry.image]));
    const untracked = execFileSync('git', ['-C', prior.root, 'ls-files', '--others', '--exclude-standard', '-z', '--', '.', ':(exclude)make-it-work'], { maxBuffer: 100 * 1024 * 1024 }).toString().split('\0').filter(Boolean).sort();
    const paths = [];
    for (const file of untracked) {
      const before = images.get(file);
      if (!before) continue;
      const absolute = artifactJoin(prior.root, file);
      const info = await lstat(absolute);
      if (review && before.type !== (info.isSymbolicLink() ? 'symlink' : info.isFile() ? 'file' : 'other')) continue;
      const bytes = info.isSymbolicLink() ? await readlink(absolute) : await readPlain(absolute);
      if ((info.mode & 0o111) === before.mode && digest(bytes) === before.sha256) paths.push(file);
    }
    if (paths.length) repos.push({ root: prior.root, paths, sensitive: paths.filter((file) => SENSITIVE_PATH.test(file) || /(^|\/)\.[^/]+$/.test(file)) });
  }
  return { available: true, repos };
}

const ignorePattern = (file) => `/${file.replace(/[\\*?[]/g, (char) => `\\${char}`).replace(/ $/, '\\ ')}`;
// Keep chosen pre-existing files out of review, package and delivery through the
// repository's local-only exclude file. Never committed; the block can be removed.
export async function excludePreexisting(root, statePath, input = {}) {
  root = await realpath(root);
  const state = await readState(root, statePath), f = state.fields;
  const found = await preexistingUntracked(root, state);
  const warnings = [];
  if (!found.available) fail('This run has no startup baseline, so pre-existing untracked files cannot be identified.');
  if (input.paths !== undefined && !Array.isArray(input.paths)) fail('Only pre-existing, unchanged untracked files can be excluded.');
  if (f.review_reconciliation_version !== undefined) {
    const report = await inspectScopeReconciliation(root, state, await deliverySnapshots(root, state));
    if (!report.available) {
      warnings.push(...(report.warnings ?? []));
      if (input.paths === undefined) warnings.push('Default exclusions were not applied because prior inclusion decisions could not be checked; explicit eligible paths can still be selected.');
    }
    // A later explicit path choice supersedes inclusion without a separate revoke.
    // Defaults still preserve the user's earlier inclusions, or all files if unknown.
    if (input.paths === undefined) for (const repo of found.repos) repo.paths = report.available ? repo.paths.filter(file => !report.candidates.some(item => item.facts.repo === repo.root && item.facts.path === file && item.resolution)) : [];
  }
  if (input.paths !== undefined && (!Array.isArray(input.paths) || input.paths.some(file => typeof file !== 'string' || !found.repos.some(repo => repo.paths.includes(file))))) fail('Only pre-existing, unchanged untracked files can be excluded.');
  const results = [];
  for (const repo of found.repos) {
    const requested = input.paths ? input.paths.filter((file) => repo.paths.includes(file)) : repo.paths;
    if (!requested.length) continue;
    const exclude = path.resolve(repo.root, execFileSync('git', ['-C', repo.root, 'rev-parse', '--git-path', 'info/exclude']).toString().trim());
    let text = '';
    try { text = await readPlain(exclude, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const begin = `# make-it-work ${f.ticket}: pre-existing untracked files kept out of review and delivery`, end = `# end make-it-work ${f.ticket}`;
    const earlier = text.includes(begin) ? text.slice(text.indexOf(begin), text.indexOf(end, text.indexOf(begin)) + end.length).split('\n').slice(1, -1) : [];
    text = text.includes(begin) ? text.slice(0, text.indexOf(begin)) + text.slice(text.indexOf(end, text.indexOf(begin)) + end.length).replace(/^\n/, '') : text;
    const lines = [...new Set([...earlier, ...requested.map(ignorePattern)])];
    text = `${text}${text && !text.endsWith('\n') ? '\n' : ''}${begin}\n${lines.join('\n')}\n${end}\n`;
    await writePlain(exclude, text);
    results.push({ root: repo.root, excluded: requested, exclude_file: exclude });
  }
  return { repos: results, ...(warnings.length ? { warnings } : {}) };
}

async function readTarget(root, state, relative) {
  const f = state.fields;
  if (relative !== runArtifact(f.ticket, targetName(f), f.artifact_naming_version)) fail('Review target must match the current run and review cycle.');
  const bytes = await readFile(await within(root, relative));
  const target = JSON.parse(bytes);
  if (target.version !== 1 || target.ticket !== f.ticket || target.runId !== f.start_time || target.planVersion !== Number(f.plan_version) || target.cycle !== Number(f.review_cycle) || !Array.isArray(target.repos)) fail('Review target binding is stale. Prepare the current delivery scope again.');
  if (target.verification_context && JSON.stringify(target.verification_context) !== JSON.stringify(await verificationContext(root, f))) fail('Verification context changed; prepare the review target and independently review the current context again.');
  for (const repo of target.repos) {
    const diff = await readFile(await within(root, runArtifact(f.ticket, repo.diff_file, f.artifact_naming_version)));
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
  const statePath = artifactJoin(root, 'make-it-work', input.ticket, `${input.ticket}-state.md`);
  let state;
  try {
    const text = await readFile(statePath, 'utf8');
    if (!/^review_scope_version: 1$/m.test(text) && input.implement.review_scope_version !== 1) return;
    state = parseState(text, statePath);
  }
  catch (error) { if (error.code === 'ENOENT' && input.implement.review_scope_version !== 1) return; throw error; }
  if (state.fields.review_scope_version !== '1') fail('Review scope policy does not match the saved run.');
  if (state.fields.review_context_version === '2' && !Array.isArray(input.review_limitations)) fail('Explicitly record review_limitations (or []) for this run; snapshot coverage does not establish review depth.');
  if (state.fields.phase !== 'review' || state.fields.status !== 'In Progress' || input.implement.review_cycle !== Number(state.fields.review_cycle) || input.implement.plan_version !== Number(state.fields.plan_version)) fail('Review input does not match the active review cycle.');
  assertRunState(root, statePath, input.ticket);
  const { target, sha256 } = await readTarget(root, state, input.review_target);
  if (input.review_target_sha256 !== sha256) fail('Review target hash differs from the dispatched snapshot. Review the current target before writing the report.');
  if (state.fields.review_checks_version === '1') {
    validateReviewChecks(input.review_checks, target.review_requirements ?? []);
    for (const item of target.review_requirements) for (const skill of item.skills) {
      if (digest(await readFile(artifactJoin(item.repo, skill.path))) !== skill.sha256) fail('Required review context changed; prepare the current target again.');
    }
    for (const check of input.review_checks) for (const skill of check.skills) for (const rule of skill.rules) {
      if (rule.result === 'finding' && !input.findings[Number(rule.finding_id?.slice(1)) - 1]) fail('An applied-rule finding needs its actual finding_id in this review.');
    }
    evidence.review_checks = input.review_checks;
  }
  const repos = await deliverySnapshots(root, state);
  if (!sameTarget(target, repos, state.fields)) fail('Delivery diff changed during review. Prepare the current delivery scope again and review it.');
  if (!fullCoverage(evidence, repos).covered) {
    fail('Review must cover the full delivery diff from each saved base, including earlier branch commits and all changed paths. A HEAD-only or partial review cannot satisfy this target.');
  }
  evidence.delivery_target = { path: input.review_target, sha256 };
}

export async function checkReviewScope(root, statePath, { requireCurrent = true } = {}) {
  const state = await readState(root, statePath), f = state.fields;
  const evidence = JSON.parse(await readFile(await within(root, runArtifact(f.ticket, `${f.ticket}-review-evidence.json`, f.artifact_naming_version)), 'utf8'));
  const report = await readFile(await within(root, runArtifact(f.ticket, `${f.ticket}-review.md`, f.artifact_naming_version)));
  if (evidence.version !== 1 || evidence.ticket !== f.ticket || evidence.report_sha256 !== digest(report) || !evidence.delivery_target) fail('Clean review needs delivery-bound scope evidence; rerun the independent review.');
  const { target, sha256 } = await readTarget(root, state, evidence.delivery_target.path);
  if (f.review_checks_version === '1') validateReviewChecks(evidence.review_checks, target.review_requirements ?? []);
  if (sha256 !== evidence.delivery_target.sha256) fail('Review target changed after review. Prepare and review the current delivery scope again.');
  const repos = await deliverySnapshots(root, state);
  const result = fullCoverage(evidence, repos);
  result.covered = result.covered && sameTarget(target, repos, f);
  if (requireCurrent && !result.covered) fail('Delivery scope is not fully reviewed. Prepare and independently review the full current branch-to-base diff before final packaging.');
  const reconciliation = await inspectScopeReconciliation(root, state, repos);
  return { ...result, ...(reconciliation.enabled ? { reconciliation: reconciliationSummary(reconciliation) } : {}), target: evidence.delivery_target, target_diffs: target.repos.map((repo) => runArtifact(f.ticket, repo.diff_file, f.artifact_naming_version)), repos: repos.map(({ diff, ...repo }) => repo) };
}

cli(import.meta.url, async (argv) => {
  const o = args(argv, ['--root', '--state', '--input']);
  if (!o.root || !o.state || !['prepare', 'check', 'inspect', 'reconcile', 'preexisting', 'exclude-preexisting'].includes(o.command)) fail('Usage: review-scope.mjs prepare|check|inspect|reconcile|preexisting|exclude-preexisting --root ROOT --state STATE [--input JSON]');
  if (o.command === 'inspect') return inspectReviewScope(o.root, o.state);
  if (o.command === 'reconcile') return reconcileReviewScope(o.root, o.state, await jsonInput(o.input));
  if (o.command === 'preexisting') { const root = await realpath(o.root); return preexistingUntracked(root, await readState(root, o.state)); }
  if (o.command === 'exclude-preexisting') return excludePreexisting(o.root, o.state, o.input ? await jsonInput(o.input) : {});
  return o.command === 'prepare' ? prepareReviewScope(o.root, o.state) : checkReviewScope(o.root, o.state);
});
