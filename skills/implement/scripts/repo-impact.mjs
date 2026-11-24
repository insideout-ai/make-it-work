// Shared impact/verification scope. Semantic dependency assessment is parent work;
// this helper binds it to real repository changes and retained evidence.
import path from 'node:path';
import { realpath } from 'node:fs/promises';
import { readFile } from '../../../scripts/lib/artifact-io.mjs';
import { args, cli, digest, fail, section, within } from '../../../scripts/lib/artifacts.mjs';
import { artifactResolve } from '../../../scripts/lib/artifact-path.mjs';
import { snapshotDeliveryRepo } from '../../../scripts/lib/delivery-scope.mjs';

const text = (value, label) => { if (typeof value !== 'string' || !value.trim() || /[\r\n]/.test(value)) fail(`${label} must be a nonempty line.`); };
const commandKey = c => c === null ? null : JSON.stringify([c?.bin, c?.args]);
const unique = values => new Set(values).size === values.length;
const relative = value => typeof value === 'string' && value && !path.isAbsolute(value) && !value.includes('\\') && !value.split('/').some(p => ['..', '.git', 'make-it-work'].includes(p));
export const impactEnabled = f => f.repo_impact_version === '1';
export const impactDefinition = value => ({ version: value.version, repos: value.repos, checks: value.checks });

// Opt-in amendment updates retain the full saved definition/hash. Only additive
// paths in already-changing repos may avoid the ordinary replan route.
export function isImpactPathExtension(before, after) {
  const stripped = value => ({ ...impactDefinition(value), repos: value.repos.map(row => {
    const { planned_paths, ...rest } = row;
    return rest;
  }) });
  return JSON.stringify(stripped(before)) === JSON.stringify(stripped(after))
    && before.repos.every((row, i) => {
      const next = after.repos[i];
      return row.planned_paths.every(file => next.planned_paths.includes(file))
        && (row.classification === 'change' || JSON.stringify(row.planned_paths) === JSON.stringify(next.planned_paths));
    });
}

export function validateImpactDefinition(value) {
  if (value?.version !== 1 || !Array.isArray(value.repos) || !value.repos.length || !Array.isArray(value.checks)) fail('Repository impact requires version 1, repos and checks.');
  const ids = value.repos.map(r => r.repo);
  if (!unique(ids)) fail('Repository impact has duplicate repositories.');
  for (const r of value.repos) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(r.repo ?? '') || !['product', 'test', 'support'].includes(r.role) || !['change', 'verify', 'context'].includes(r.classification)) fail('Invalid repository impact identity, role or classification.');
    text(r.reason, 'Impact rationale');
    if (!Array.isArray(r.planned_paths) || !unique(r.planned_paths) || r.planned_paths.some(p => !relative(p))) fail('Impact planned_paths must be unique repository-relative paths.');
    if (r.classification !== 'change' && r.planned_paths.length) fail('Only change repositories may have planned edits.');
    if (!Array.isArray(r.evidence) || !r.evidence.length) fail('Every impact classification requires evidence.');
    for (const e of r.evidence) {
      if (!ids.includes(e.repo) || !relative(e.path)) fail('Impact evidence must name an approved repo and relative file.');
    }
  }
  if (!unique(value.checks.filter(c => c.scope !== 'manual' && c.command !== null).map(c => JSON.stringify([c.run_repo, c.scope, commandKey(c.command)])))) fail('Deduplicate shared verification commands into one check covering all owners.');
  if (!unique(value.checks.map(c => c.id))) fail('Duplicate impact check IDs; deduplicate shared suites.');
  for (const c of value.checks) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(c.id ?? '') || !['full', 'scoped', 'manual'].includes(c.scope)) fail('Invalid required check identity/scope.');
    if (!Array.isArray(c.repos) || !c.repos.length || !unique(c.repos) || c.repos.some(id => !ids.includes(id))) fail('Required checks must cover approved repositories.');
    if (!ids.includes(c.run_repo) || !['configured', 'user', 'project-policy'].includes(c.source)) fail('Check execution repo/source is invalid.');
    for (const k of ['scenario', 'expected', 'prerequisites', 'reason']) text(c[k], `Check ${k}`);
    if (c.availability !== undefined && !['available', 'unavailable'].includes(c.availability)) fail('Invalid required-check availability.');
    if (c.availability === 'unavailable') text(c.blocker, 'Unavailable check blocker');
    if (c.scope === 'manual') {
      if (c.command !== null || !['user', 'project-policy'].includes(c.source)) fail('Manual impact checks require explicit user/project policy and no command.');
    } else if (!(c.availability === 'unavailable' && c.command === null)) {
      if (!c.command || typeof c.command.bin !== 'string' || !c.command.bin.trim() || !Array.isArray(c.command.args) || c.command.args.some(a => typeof a !== 'string' || /[\0\r\n]/.test(a))) fail('Required automated checks use structured command argv.');
    }
    for (const id of [...c.repos, c.run_repo]) if (value.repos.find(r => r.repo === id).classification === 'context') fail('Context-only repositories cannot own or execute required checks.');
  }
  for (const r of value.repos) if (r.classification === 'verify' && !value.checks.some(c => c.run_repo === r.repo || c.repos.includes(r.repo))) fail('Verification-only repositories need an actual required check.');
  return value;
}

export function planImpact(plan) {
  if (!/^\*\*Repository impact contract:\*\* 1\s*$/m.test(plan)) return null;
  const source = section(plan, 'Repository Impact')?.match(/^```json\s*\n([\s\S]*?)^```/m)?.[1];
  if (!source) fail('Impact-enabled plan needs the Repository Impact JSON definition.');
  const impact = validateImpactDefinition(JSON.parse(source));
  validateImpactEdits(plan, impact);
  return impact;
}

export function validateImpactEdits(plan, impact) {
  let repo = null;
  for (const line of (section(plan, 'Affected Code') ?? '').split('\n')) {
    const heading = line.match(/^### `([^`]+)`/);
    if (heading) repo = impact.repos.find(r => r.repo === heading[1]);
    const file = line.match(/^\|\s*`([^`]+)`\s*\|\s*(?:New|Modify|Delete)\s*\|/);
    if (file && (!repo || repo.classification !== 'change' || !repo.planned_paths.includes(file[1]))) fail('Planned edits require a change repo and a declared impact path; reassess before editing.');
  }
}

export function requireAvailableImpactChecks(impact) {
  const unavailable = impact.checks.filter(c => c.availability === 'unavailable');
  if (unavailable.length) fail(`Required verification unavailable: ${unavailable.map(c => `${c.id}: ${c.blocker}`).join('; ')}. Readiness remains pending; do not substitute partial coverage.`);
}

export function validateImpactPolicy(impact, policy) {
  validateImpactDefinition(impact);
  requireAvailableImpactChecks(impact);
  const expected = impact.repos.filter(r => r.role === 'product' && r.classification !== 'context').map(r => r.repo).sort();
  if (JSON.stringify(policy.map(p => p.Repo).sort()) !== JSON.stringify(expected)) fail('Verification policy must cover exactly the changed and verification-only product repos.');
  for (const p of policy) {
    const r = impact.repos.find(r => r.repo === p.Repo), checks = impact.checks.filter(c => c.repos.includes(p.Repo));
    if (!checks.length || checks.some(c => (c.scope === 'manual') !== (p.Mode === 'manual'))) fail(`Required checks disagree with verification policy for ${p.Repo}.`);
    if (p.Mode === 'automated' && r.classification === 'change' && !checks.some(c => c.scope === 'full')) fail(`Changed automated product repo ${p.Repo} retains its full-suite gate.`);
    if (p.Mode === 'manual' && r.classification === 'verify' && !['user', 'project-policy'].includes(p.Decision)) fail('Verification-only repos cannot silently fall back to manual.');
  }
}

const selected = f => JSON.parse(f.workspace_contract).repos;
const binding = f => ({ ticket: f.ticket, run: f.start_time, plan_version: f.plan_version, spec_hash: f.spec_hash, scope_hash: digest(f.workspace_contract) });
export async function inspectRepoImpact(fields) {
  if (!impactEnabled(fields)) return null;
  const rows = [];
  for (const repo of selected(fields)) {
    const s = await snapshotDeliveryRepo(repo.root, repo.base);
    if (s.branch !== repo.branch) fail(`Impact branch changed: ${repo.id}.`);
    rows.push({ repo: repo.id, root: repo.root, base: s.base_sha, branch: s.branch, paths: s.paths, diff_sha256: s.diff_sha256 });
  }
  return rows;
}

export async function assessRepoImpact(root, fields, input) {
  if (!impactEnabled(fields) || fields.workspace_version !== '1') fail('This run is not enabled for repository impact.');
  validateImpactDefinition(input);
  const scope = selected(fields);
  if (input.repos.length !== scope.length || input.repos.some(r => !scope.some(s => s.id === r.repo && s.role === r.role))) fail('Impact must cover every approved repository with its saved role.');
  if (fields.spec === 'none' || digest(await readFile(await within(root, fields.spec))) !== fields.spec_hash) fail('Impact assessment requires the unchanged accepted spec.');
  const observations = await inspectRepoImpact(fields);
  for (const row of input.repos) {
    if (row.classification === 'change' && !row.planned_paths.length && !observations.find(o => o.repo === row.repo).paths.length) fail('A change classification needs planned edits or actual changes.');
    if (row.classification !== 'change' && observations.find(o => o.repo === row.repo).paths.length) fail(`Repository ${row.repo} has actual changes; it cannot be verify/context-only.`);
  }
  const evidence = [];
  for (const row of input.repos) for (const item of row.evidence) {
    const repo = scope.find(r => r.id === item.repo);
    const file = await within(repo.root, item.path);
    evidence.push({ repo: item.repo, path: item.path, sha256: digest(await readFile(file)) });
  }
  return { ...impactDefinition(input), binding: binding(fields), observations, evidence };
}

async function readImpact(root, fields) {
  if (!impactEnabled(fields)) return null;
  if (!fields.repo_impact || fields.repo_impact === 'none') fail('Repository impact assessment is required before readiness/implementation.');
  const file = await within(root, fields.repo_impact);
  const bytes = await readFile(file);
  if (digest(bytes) !== fields.repo_impact_hash) fail('Repository impact artifact changed; reassess it.');
  const value = JSON.parse(bytes);
  validateImpactDefinition(value);
  if (JSON.stringify(value.binding) !== JSON.stringify(binding(fields))) fail('Repository impact is stale for the current spec, plan version or approved scope.');
  if (digest(await readFile(await within(root, fields.spec))) !== fields.spec_hash) fail('Impact accepted spec changed.');
  return value;
}

async function checkImpactObservations(fields, value) {
  const current = await inspectRepoImpact(fields);
  // Edits are expected in change repos. A skipped repo must remain byte-identical;
  // evidence below separately binds dependency facts, including those in changed repos.
  for (const row of value.repos) {
    const before = value.observations.find(o => o.repo === row.repo), now = current.find(o => o.repo === row.repo);
    if (!before || before.base !== now.base || row.classification !== 'change' && (now.paths.length || before.diff_sha256 !== now.diff_sha256)) fail(`Repository impact drift in ${row.repo}; reassess before dependent work.`);
  }
  return current;
}

export async function checkImpactUpdate(root, fields, assessed, update) {
  const saved = await readImpact(root, fields);
  if (!saved) fail('Impact updates require an existing saved assessment.');
  await checkImpactObservations(fields, saved);
  const same = JSON.stringify(impactDefinition(saved)) === JSON.stringify(impactDefinition(assessed));
  if (update === 'refresh-evidence' ? !same : !isImpactPathExtension(saved, assessed)) fail('Impact update changes more than permitted paths/evidence; use normal reassessment and replanning.');
  for (const item of saved.evidence) {
    const repo = selected(fields).find(row => row.id === item.repo);
    if (digest(await readFile(await within(repo.root, item.path))) !== item.sha256) {
      const row = saved.repos.find(row => row.repo === item.repo);
      if (row.classification !== 'change' || !row.planned_paths.includes(item.path)) fail('Changed impact evidence is not an existing planned edit; reconcile it before refreshing.');
    }
  }
  return saved;
}

export async function checkRepoImpact(root, fields, { plan = null, requireChecks = false } = {}) {
  const value = await readImpact(root, fields);
  if (!value) return null;
  const current = await checkImpactObservations(fields, value);
  for (const item of value.evidence) {
    const repo = selected(fields).find(r => r.id === item.repo);
    if (!repo || digest(await readFile(await within(repo.root, item.path))) !== item.sha256) fail('Repository impact dependency evidence changed; reassess it.');
  }
  if (value.verification) {
    validateImpactGate(value, value.verification, { passing: true });
    if (current.some(now => value.observations.find(o => o.repo === now.repo)?.diff_sha256 !== now.diff_sha256)) fail('Repository impact verification is stale for the current tree.');
  }
  if (requireChecks && value.checks.length && !value.verification) fail('Required impact verification has not been recorded.');
  if (plan !== null && JSON.stringify(planImpact(plan)) !== JSON.stringify(impactDefinition(value))) fail('Plan repository impact differs from the saved assessment.');
  return value;
}

export const impactCommandText = command => command === null ? null : [command.bin, ...command.args].map(a => /^[A-Za-z0-9_./:=@+-]+$/.test(a) ? a : JSON.stringify(a)).join(' ');

export function validateImpactGate(impact, gate, { passing = false } = {}) {
  if (passing) requireAvailableImpactChecks(impact);
  if (passing && !['pass', 'manual-accepted'].includes(gate.result)) fail('Required impact verification needs a passing overall result.');
  if (gate.result === 'manual-accepted' && impact.checks.some(c => c.scope !== 'manual')) fail('Manual acceptance cannot replace required automated impact checks.');
  const records = gate.checks ?? [];
  if (!Array.isArray(records) || !unique(records.map(r => r.id)) || records.length !== impact.checks.length) fail('Gate evidence must cover every required impact check exactly once.');
  for (const c of impact.checks) {
    const r = records.find(r => r.id === c.id);
    if (!r || r.run_repo !== c.run_repo || r.scope !== c.scope || commandKey(r.command) !== commandKey(c.command) || !['pass', 'fail', 'not-run'].includes(r.result)) fail(`Gate evidence does not match required check ${c.id}.`);
    text(r.note, 'Required check observation');
    if (passing && r.result !== 'pass') fail(`Required impact check ${c.id} did not pass.`);
    if (r.result === 'fail' && gate.result !== 'fail') fail('A failing required check needs a failed gate.');
  }
  const full = gate.full_suites ?? [];
  for (const suite of full) if (!impact.checks.some(c => c.scope === 'full' && c.repos.includes(suite.repo) && impactCommandText(c.command) === suite.command)) fail('Scoped verification cannot claim a full-suite result.');
}

export function impactRegressionManifest(impact, fields) {
  requireAvailableImpactChecks(impact);
  const scope = selected(fields);
  return { version: 1, mode: 'tokens', workspace: true, runs: impact.checks.filter(c => c.scope !== 'manual').map(c => ({
    impact_check: c.id, repo: c.run_repo, cwd: scope.find(r => r.id === c.run_repo).root,
    command: c.command, scope: c.scope, adapter: 'exact', selectors: [], prerequisites: {},
  })), not_run: [], unmapped: [] };
}

export function validateImpactRuns(impact, runs) {
  requireAvailableImpactChecks(impact);
  const expected = impact.checks.filter(c => c.scope !== 'manual');
  if (runs.length !== expected.length || !unique(runs.map(r => r.impact_check))) fail('Regression manifest must contain each required automated check exactly once.');
  for (const run of runs) {
    const c = expected.find(c => c.id === run.impact_check);
    if (!c || run.repo !== c.run_repo || run.scope !== c.scope || commandKey(run.command) !== commandKey(c.command) || run.adapter !== 'exact' || (run.selectors ?? []).length) fail('Regression run differs from its assessed required check.');
  }
}

export const impactSummary = (value, gate = value.verification) => value.repos.map(r => ({ repo: r.repo, classification: r.classification, reason: r.reason,
  checks: value.checks.filter(c => c.repos.includes(r.repo) || c.run_repo === r.repo).map(c => ({ id: c.id, scope: c.scope, run_repo: c.run_repo, result: gate?.checks?.find(r => r.id === c.id)?.result ?? 'pending' })) }));

cli(import.meta.url, async argv => {
  const o = args(argv, ['--state', '--plan']);
  if (!['inspect', 'check', 'manifest'].includes(o.command) || !o.state) fail('Usage: repo-impact.mjs inspect|check --state STATE [--plan PLAN]');
  const { parseState } = await import('./render-status.mjs');
  const statePath = artifactResolve(o.state), root = await realpath(path.dirname(path.dirname(path.dirname(statePath))));
  const state = parseState(await readFile(statePath, 'utf8'), statePath);
  if (o.command === 'inspect') return inspectRepoImpact(state.fields);
  const impact = await checkRepoImpact(root, state.fields, { plan: o.plan ? await readFile(o.plan, 'utf8') : null });
  return o.command === 'manifest' && impact ? impactRegressionManifest(impact, state.fields) : impact;
});
