// Relevance hints never establish authorship or permission to drop delivery paths.
import { execFileSync } from 'node:child_process';
import { lstat, readFile as readPlain, readlink } from 'node:fs/promises';
import path from 'node:path';
import { readFile } from '../../../scripts/lib/artifact-io.mjs';
import { atomicWrite, digest, fail, requireText, section, withLock, within } from '../../../scripts/lib/artifacts.mjs';
import { planHash } from '../../../scripts/lib/plan.mjs';
import { readReviewBaseline } from './review-baseline.mjs';
import { runArtifact } from './artifact-layout.mjs';
import { readScope } from './workspace-scope.mjs';
import { SENSITIVE_PATH } from '../../../scripts/lib/delivery-scope.mjs';

const git = (root, args) => execFileSync('git', ['-C', root, ...args], { maxBuffer: 100 * 1024 * 1024 });
const list = (root, args) => git(root, args).toString('utf8').split('\0').filter(Boolean);
const receiptPath = f => runArtifact(f.ticket, `${f.ticket}-scope-decisions.json`, f.artifact_naming_version);
const candidate = facts => ({ id: digest(JSON.stringify(facts)), facts });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const literal = file => file && !path.isAbsolute(file) && !file.split('/').includes('..') && !/[\x00-\x1f]/.test(file) && !file.endsWith('/');

async function image(root, file) {
  try {
    const absolute = path.join(root, file), info = await lstat(absolute);
    if (!info.isFile() && !info.isSymbolicLink()) return null;
    return { type: info.isSymbolicLink() ? 'symlink' : 'file', mode: info.mode & 0o111,
      sha256: digest(info.isSymbolicLink() ? await readlink(absolute) : await readPlain(absolute)) };
  } catch (error) { if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null; throw error; }
}

async function decisions(root, f) {
  try {
    const saved = JSON.parse(await readFile(await within(root, receiptPath(f)), 'utf8'));
    if (saved.version !== 1 || saved.ticket !== f.ticket || saved.runId !== f.start_time || !Array.isArray(saved.entries)) fail('Scope decision journal belongs to another run or is malformed.');
    for (const entry of saved.entries) {
      if (!entry.facts || entry.id !== digest(JSON.stringify(entry.facts)) || !['include', 'revoke'].includes(entry.action) || entry.source !== 'user' || !['chat', 'question'].includes(entry.via) || !Number.isFinite(Date.parse(entry.time))) fail('Invalid scope inclusion decision.');
      requireText(entry.reason, 'Scope reason'); requireText(entry.reference, 'Scope decision reference');
    }
    return saved;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return { version: 1, ticket: f.ticket, runId: f.start_time, entries: [] };
  }
}

function repoTokens(values, repo, repos) {
  const found = new Set();
  for (let value of values) {
    if (typeof value !== 'string') continue;
    if (path.isAbsolute(value)) {
      if (!value.startsWith(repo.path + path.sep)) continue;
      value = path.relative(repo.path, value).split(path.sep).join('/');
      if (literal(value)) found.add(value);
      continue;
    }
    const prefix = repos.find(other => [other.id, other.name].filter(Boolean).some(alias => value.startsWith(alias + '/') || value.startsWith(alias + ':')));
    if (prefix) {
      if (prefix.path !== repo.path) continue;
      const alias = [prefix.id, prefix.name].find(alias => alias && (value.startsWith(alias + '/') || value.startsWith(alias + ':')));
      value = value.slice(alias.length + 1);
    } else if (repos.length > 1) continue;
    if (literal(value)) found.add(value);
  }
  return found;
}

async function relevance(root, f, repos) {
  const expected = new Map(repos.map(repo => [repo.path, new Set()]));
  const sources = [];
  if (f.plan && f.plan !== 'none') {
    const plan = await readFile(await within(root, f.plan), 'utf8');
    if (planHash(plan) !== f.plan_hash) fail('Accepted plan changed; reconcile it before review scope.');
    sources.push({ kind: 'plan', path: f.plan, hash: planHash(plan) });
    const body = section(plan, 'Affected Code') ?? '';
    const headings = [...body.matchAll(/^### `([^`]+)`[^\n]*$/gm)];
    for (const [i, heading] of headings.entries()) {
      const repo = repos.find(repo => [repo.id, repo.name].includes(heading[1])) ?? (repos.length === 1 && headings.length === 1 ? repos[0] : null);
      if (!repo) continue;
      const block = body.slice(heading.index + heading[0].length, headings[i + 1]?.index);
      for (const match of block.matchAll(/^\|\s*`([^`]+)`\s*\|/gm)) {
        const file = match[1]; // Affected Code tables are repo-relative, never globs.
        if (literal(file)) expected.get(repo.path).add(file);
      }
    }
  } else if (f.mode === 'lightweight' && f.scope_implementation_paths) {
    const saved = JSON.parse(f.scope_implementation_paths);
    if (saved.spec_hash === f.spec_hash && saved.plan_version === f.plan_version && saved.report === f.implementation_report &&
        digest(await readFile(await within(root, saved.report))) === saved.report_sha256 && Array.isArray(saved.paths)) {
      sources.push({ kind: 'implementation-report', path: saved.report, hash: saved.report_sha256 });
      for (const repo of repos) for (const file of repoTokens(saved.paths, repo, repos)) expected.get(repo.path).add(file);
    }
  }
  const context = !f.context_updated || f.context_updated === 'none' ? [] : f.context_updated.split(', ');
  for (const repo of repos) for (const file of repoTokens(context, repo, repos)) expected.get(repo.path).add(file);
  sources.push({ kind: 'workflow-context', paths: context });
  return { expected, sources };
}

async function approvedStartCommits(root, f, repo, prior) {
  if (f.workspace_version !== '1') return new Set();
  const contract = JSON.parse(f.workspace_contract);
  let saved;
  try { saved = await readScope(root, f.ticket); } catch (error) { if (error.code === 'ENOENT') return new Set(); throw error; }
  const selected = saved.plan.repos.find(item => item.root === repo.path);
  if (saved.status !== 'applied' || saved.hash !== contract.approval_hash || saved.approval?.hash !== saved.hash || saved.approval?.source !== 'user' || !['chat', 'question'].includes(saved.approval.via) ||
      !selected?.start_point || selected.branch !== repo.branch || selected.base !== repo.base || selected.start_point.sha !== prior.head) return new Set();
  return new Set(git(repo.path, ['rev-list', prior.head, '--not', selected.base_sha]).toString().trim().split('\n').filter(Boolean));
}

export async function inspectScopeReconciliation(root, state, snapshots) {
  try { return await analyzeScopeReconciliation(root, state, snapshots); }
  catch (error) {
    return advisoryReport(state.fields, { enabled: true, available: false, files: [], candidates: [], unresolved: [],
      warnings: [`Scope analysis unavailable: ${error.message} Review the full delivery scope; starting provenance is unknown.`] });
  }
}

function advisoryReport(fields, report) {
  const captureWarnings = [fields.review_baseline_warning, fields.scope_analysis_warning].filter(Boolean).map(value => {
    try { return JSON.parse(value); } catch { return String(value); }
  });
  if (captureWarnings.length) report.warnings = [...(report.warnings ?? []), ...captureWarnings];
  const attention = report.unresolved.length > 0 || report.available === false || Boolean(report.warnings?.length);
  return { ...report, ready: true, advisory: true,
    consultation: { recommended: attention && fields.autonomy !== 'autopilot', blocking: false,
      options: ['continue-with-full-scope', 'adjust-scope'] },
    ...(attention ? { assumption: 'Retain the full delivery scope under existing authorization; disclose unresolved provenance and scope assumptions.' } : {}) };
}

async function analyzeScopeReconciliation(root, state, snapshots) {
  const f = state.fields, enabled = f.review_reconciliation_version === '1';
  if (f.review_reconciliation_version !== undefined && !enabled) fail('Unsupported review reconciliation version.');
  const baseline = readReviewBaseline(f);
  if (!enabled) return { enabled: false, ready: true, limitation: 'Saved review contract retained; starting-scope reconciliation was not enabled.' };
  if (!baseline) fail('Review reconciliation requires the original review baseline.');
  const selected = f.workspace_version === '1' ? JSON.parse(f.workspace_contract).repos : [];
  const repos = snapshots.map(repo => ({ ...repo, id: selected.find(item => item.root === repo.path)?.id ?? repo.name }));
  const { expected, sources } = await relevance(root, f, repos), saved = await decisions(root, f);
  const candidates = [], files = [];
  for (const repo of repos) {
    const prior = baseline.repos.find(item => item.root === repo.path);
    if (!prior) fail('Original review provenance is missing a selected repository.');
    const starting = new Map(prior.changes.map(entry => [entry.file, entry]));
    let ancestor = true;
    try { git(repo.path, ['merge-base', '--is-ancestor', prior.head, repo.head]); } catch { ancestor = false; }
    const approved = await approvedStartCommits(root, f, repo, prior);
    if (repo.paths.length && !ancestor) candidates.push(candidate({ kind: 'history-diverged', repo: repo.path, start: prior.head, head: repo.head, base: repo.base_sha }));
    if (repo.paths.length && ancestor) {
      for (const commit of git(repo.path, ['rev-list', prior.head, '--not', repo.base_sha]).toString().trim().split('\n').filter(Boolean).sort()) {
        const item = candidate({ kind: 'inherited-commit', repo: repo.path, commit });
        if (approved.has(commit)) item.resolution = { source: 'approved-start-point', reference: JSON.parse(f.workspace_contract).approval_hash };
        candidates.push(item);
      }
    }
    for (const file of repo.paths) {
      const before = starting.get(file), current = await image(repo.path, file);
      const planned = expected.get(repo.path).has(file);
      const startPatch = before ? null : git(repo.path, ['diff', '--binary', '--no-ext-diff', '--no-renames', prior.head, '--', `:(literal)${file}`]);
      const presentAtStart = before ? false : list(repo.path, ['ls-tree', '--name-only', '-z', prior.head, '--', `:(literal)${file}`]).length > 0;
      const provenance = before ? same(before.image, current) ? 'pre-existing-unchanged' : 'changed-since-capture'
        : presentAtStart ? startPatch.length ? 'changed-since-start-commit' : 'unchanged-from-start-commit' : 'not-recorded-at-capture';
      files.push({ repo: repo.path, path: file, provenance, expected: planned, sensitive: SENSITIVE_PATH.test(file) });
      let kind;
      if (before) kind = before.tracked ? same(before.image, current) ? 'pre-existing-tracked' : 'mixed-tracked' : same(before.image, current) ? 'pre-existing-untracked' : 'changed-starting-untracked';
      else if (!planned && !(ancestor && presentAtStart && startPatch.length === 0)) kind = 'outside-expected-paths';
      if (kind) {
        const patch = git(repo.path, ['diff', '--binary', '--no-ext-diff', '--no-renames', repo.merge_base, '--', `:(literal)${file}`]);
        candidates.push(candidate({ kind, repo: repo.path, path: file, base: repo.merge_base, before: before ?? null, current, patch_sha256: digest(patch) }));
      }
    }
  }
  candidates.sort((a, b) => a.id.localeCompare(b.id));
  for (const item of candidates) {
    const accepted = saved.entries.findLast(entry => entry.id === item.id);
    if (accepted?.action === 'include') item.resolution = { source: 'explicit-include', reference: accepted.reference, reason: accepted.reason, via: accepted.via };
    else if (accepted?.action === 'revoke') delete item.resolution;
  }
  const facts = { ticket: f.ticket, runId: f.start_time, baseline_sha256: digest(JSON.stringify(baseline)), sources,
    repos: repos.map(({ path: root, base_sha, head, diff_sha256 }) => ({ root, base_sha, head, diff_sha256 })), files, candidates: candidates.map(({ id, facts }) => ({ id, facts })) };
  return advisoryReport(f, { enabled: true, available: true, fingerprint: digest(JSON.stringify(facts)), files, candidates,
    unresolved: candidates.filter(item => !item.resolution).map(item => item.id) });
}

// Keep opaque file-image hashes in the local receipt, not repeated in model logs.
export function reconciliationSummary(report) {
  if (!report.enabled) return report;
  return { ...report, candidates: report.candidates.map(({ id, facts, resolution }) => ({ id, kind: facts.kind, repo: facts.repo,
    ...(facts.path ? { path: facts.path } : {}), ...(facts.commit ? { commit: facts.commit } : {}), ...(resolution ? { resolution } : {}) })) };
}

export async function reconcileScopeDecisions(root, state, snapshots, input) {
  const f = state.fields;
  if (f.phase !== 'review' || f.status !== 'In Progress') fail('Reconcile scope in the existing active Review preparation.');
  if (input.source !== 'user' || !['chat', 'question'].includes(input.via)) fail('Ambiguous scope inclusion requires an explicit user decision.');
  const relative = receiptPath(f), file = await within(root, relative, { existing: false });
  return withLock(file, async () => {
    const report = await inspectScopeReconciliation(root, state, snapshots);
    if (!report.enabled || !report.available || input.fingerprint !== report.fingerprint) fail('Scope preview changed or is unavailable; inspect the current scope to record an optional decision.');
    if (!Array.isArray(input.decisions) || !input.decisions.length) fail('Supply specific scope inclusion decisions.');
    const entries = [], seen = new Set();
    for (const item of input.decisions) {
      const found = report.candidates.find(candidate => candidate.id === item.id);
      if (!found || seen.has(item.id) || !['include', 'revoke'].includes(item.action)) fail('Only listed scope items can be included or have inclusion revoked; reconcile exclusions in the checkout.');
      requireText(item.reason, 'Scope reason'); requireText(item.reference, 'Scope decision reference'); seen.add(item.id);
      entries.push({ ...found, resolution: undefined, action: item.action, source: input.source, via: input.via, reason: item.reason, reference: item.reference, time: new Date().toISOString() });
    }
    const saved = await decisions(root, f);
    for (const entry of entries) if (saved.entries.findLast(prior => prior.id === entry.id)?.action !== entry.action) saved.entries.push(entry);
    await atomicWrite(file, JSON.stringify(saved, null, 2) + '\n');
    return inspectScopeReconciliation(root, state, snapshots);
  });
}
