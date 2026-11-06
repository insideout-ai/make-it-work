#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { lstat, mkdir, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { args, atomicWrite, cli, digest, fail, jsonInput, requireText, withLock, within } from '../../../scripts/lib/artifacts.mjs';
import { snapshot } from '../../../scripts/lib/repo-state.mjs';
import { resolveWorkspace } from '../../../scripts/workspace.mjs';
import { runArtifact, runDirectory } from './artifact-layout.mjs';
import { renderScopePreview } from './workspace-view.mjs';

const git = (root, argv) => execFileSync('git', ['-C', root, ...argv], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const hasRef = (root, ref) => { try { git(root, ['rev-parse', '--verify', '--quiet', ref]); return true; } catch { return false; } };
const filename = (root, ticket) => path.join(runDirectory(root, ticket), `${ticket}-workspace.json`);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const user = (input) => { if (input.source !== 'user' || !['chat', 'question'].includes(input.via)) fail('Repository and branch approval requires an explicit user decision.'); };

export async function readScope(root, ticket) {
  const file = await within(root, runArtifact(ticket, `${ticket}-workspace.json`));
  const journal = JSON.parse(await readFile(file, 'utf8'));
  if (journal.version !== 1 || journal.plan.ticket !== ticket || journal.plan.artifact_root !== await realpath(root)
      || journal.hash !== digest(JSON.stringify(journal.plan))) fail('Invalid workspace selection journal.');
  return journal;
}
async function save(root, journal) {
  await atomicWrite(filename(root, journal.plan.ticket), JSON.stringify(journal, null, 2) + '\n');
  // An active workflow owns its dashboard; preflight must not overwrite it.
  const state = path.join(runDirectory(root, journal.plan.ticket), `${journal.plan.ticket}-state.md`);
  let active = true;
  try { await lstat(state); } catch (error) { if (error.code !== 'ENOENT') throw error; active = false; }
  if (active) {
    // Render only an existing dashboard, preserving the legacy no-backfill rule.
    try { await lstat(path.join(runDirectory(root, journal.plan.ticket), `${journal.plan.ticket}-status.html`)); }
    catch (error) { if (error.code === 'ENOENT') return { file: filename(root, journal.plan.ticket), hash: journal.hash, status: journal.status, plan: journal.plan }; throw error; }
    await (await import('./render-status.mjs')).generateDashboard(state);
  } else {
    await atomicWrite(path.join(runDirectory(root, journal.plan.ticket), `${journal.plan.ticket}-status.html`), renderScopePreview(journal));
  }
  return { file: filename(root, journal.plan.ticket), hash: journal.hash, status: journal.status,
    dashboard: path.join(runDirectory(root, journal.plan.ticket), `${journal.plan.ticket}-status.html`), plan: journal.plan, progress: journal.progress };
}

export async function prepareScope(root, input) {
  root = await realpath(root);
  const ticket = input.ticket;
  const directory = runDirectory(root, ticket);
  const artifacts = path.join(root, 'make-it-work');
  await mkdir(artifacts, { recursive: true });
  if (!(await lstat(artifacts)).isDirectory()) fail('Artifact root must not be a symlink.');
  await mkdir(directory, { recursive: true });
  if (!(await lstat(directory)).isDirectory()) fail('Run directory must not be a symlink.');
  await within(root, runArtifact(ticket, `${ticket}-workspace.json`), { existing: false });
  return withLock(filename(root, ticket), async () => {
    let activeContract = null;
    try {
      const state = (await import('./render-status.mjs')).parseState(await readFile(path.join(directory, `${ticket}-state.md`), 'utf8'));
      if (state.fields.workspace_version !== '1' || state.fields.status !== 'Paused' || state.pendingInputs.some((record) => record.blocking)) fail('Pause the active workspace run and resolve pending inputs before revising repository scope.');
      activeContract = JSON.parse(state.fields.workspace_contract);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    let previous;
    try { previous = await readScope(root, ticket); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (previous?.status === 'partial') fail('Reconcile the partially applied selection before preparing another plan.');
    const workspace = await resolveWorkspace(root);
    if (workspace.layout !== 'workspace') fail('Workspace selection is for workspace runs; retain the single-repo branch guard.');
    if (!Array.isArray(input.repos) || !input.repos.length) fail('Select at least one repository from find-the-repos.');
    const reportPath = requireText(input.report, 'find-the-repos report');
    if (!reportPath.startsWith(`make-it-work/${ticket}/`)) fail('Assessment must belong to this ticket.');
    const report = { path: reportPath, sha256: digest(await readFile(await within(directory, reportPath.slice(`make-it-work/${ticket}/`.length)))) };
    const selected = [], seen = new Set();
    for (const selection of input.repos) {
      const repo = workspace.repositories.find((candidate) => candidate.id === selection.id && !candidate.unavailable);
      if (!repo || seen.has(repo.id)) fail('Unknown, unavailable or duplicate selected repository.');
      seen.add(repo.id);
      const baseline = (await snapshot([repo.root]))[0]; // Detached HEAD is an explicit stop.
      let base = selection.base;
      if (!base) { try { base = git(repo.root, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']).replace(/^origin\//, ''); } catch { base = 'main'; } }
      requireText(base, 'Base branch');
      if (git(repo.root, ['check-ref-format', '--branch', base]) !== base) fail('Use a literal base branch name.');
      const base_sha = git(repo.root, ['rev-parse', '--verify', `${base}^{commit}`]);
      let target = selection.target_branch;
      if (!target) {
        target = baseline.branch;
        if (target === base) {
          target = ticket;
          for (let n = 2; hasRef(repo.root, `refs/heads/${target}`); n++) target = `${ticket}-${n}`;
        }
      }
      if (git(repo.root, ['check-ref-format', '--branch', target]) !== target) fail('Use a literal target branch name.');
      const action = target === baseline.branch ? 'keep' : hasRef(repo.root, `refs/heads/${target}`) ? 'switch' : 'create';
      if (target === base && selection.proceed_on_base !== true) fail(`Explicit proceed_on_base is required for ${repo.id}.`);
      if (!['product', 'test', 'support'].includes(selection.role ?? 'product')) fail('Invalid repository role.');
      selected.push({ id: repo.id, root: repo.root, role: selection.role ?? 'product', reason: requireText(selection.reason, 'Selection evidence'),
        base, base_sha, branch: target, action, target_head: action === 'switch' ? git(repo.root, ['rev-parse', `refs/heads/${target}`]) : null, baseline });
    }
    for (const removed of (activeContract?.repos ?? (previous?.status === 'applied' ? previous.plan.repos : [])).filter((repo) => !seen.has(repo.id))) {
      const paths = ['--', '.', ':(exclude)make-it-work'];
      if (git(removed.root, ['diff', '--name-only', removed.base, ...paths]) || git(removed.root, ['ls-files', '--others', '--exclude-standard', ...paths])) fail(`Cannot remove changed repository ${removed.id}; reconcile its changes before revising scope.`);
    }
    selected.sort((a, b) => a.id.localeCompare(b.id));
    const plan = { ticket, artifact_root: root, layout: 'workspace', report, repos: selected };
    const history = [...(previous?.history ?? []), ...(previous ? [{ hash: previous.hash, status: previous.status, approval: previous.approval, repos: previous.plan.repos.map(({ id, branch, base }) => ({ id, branch, base })), time: new Date().toISOString() }] : [])];
    return save(root, { version: 1, plan, hash: digest(JSON.stringify(plan)), status: 'awaiting-approval', approval: null, progress: {}, history });
  });
}

async function validatePlan(root, journal) {
  const report = journal.plan.report;
  if (digest(await readFile(await within(root, report.path))) !== report.sha256) fail('Repository assessment changed; prepare and approve the revised selection.');
  for (const repo of journal.plan.repos) {
    const current = (await snapshot([repo.root]))[0];
    if (!same(current, journal.progress[repo.id]?.snapshot ?? repo.baseline)) fail(`Repository changed since selection: ${repo.id}. Prepare and approve again.`);
    if (git(repo.root, ['rev-parse', '--verify', `${repo.base}^{commit}`]) !== repo.base_sha) fail(`Base changed in ${repo.id}; prepare and approve again.`);
    if (journal.progress[repo.id]) continue;
    if (repo.action === 'create' && hasRef(repo.root, `refs/heads/${repo.branch}`)) fail(`Target branch now exists in ${repo.id}.`);
    if (repo.action === 'switch' && git(repo.root, ['rev-parse', `refs/heads/${repo.branch}`]) !== repo.target_head) fail(`Target branch changed in ${repo.id}.`);
  }
}
export async function approveScope(root, ticket, hash, input) {
  user(input);
  return withLock(filename(root, ticket), async () => {
    const journal = await readScope(root, ticket);
    if (hash !== journal.hash || journal.status !== 'awaiting-approval') fail('Approve the exact pending repository and branch plan.');
    await validatePlan(root, journal);
    journal.approval = { hash, source: input.source, via: input.via, time: new Date().toISOString() };
    journal.status = 'approved'; return save(root, journal);
  });
}
export async function runScope(root, ticket, hash) {
  return withLock(filename(root, ticket), async () => {
    const journal = await readScope(root, ticket);
    if (hash !== journal.hash || journal.approval?.hash !== hash || !['approved', 'partial', 'applied'].includes(journal.status)) fail('Explicit approval of this exact repository and branch selection is required.');
    await validatePlan(root, journal); // Inspect all repositories before the first mutation.
    for (const repo of journal.plan.repos) {
      if (journal.progress[repo.id]) continue;
      try {
        if (repo.action !== 'keep') git(repo.root, repo.action === 'create' ? ['switch', '-c', repo.branch] : ['switch', repo.branch]);
        journal.progress[repo.id] = { status: 'applied', snapshot: (await snapshot([repo.root]))[0] };
        await save(root, journal);
      } catch (error) {
        journal.status = 'partial'; journal.error = `${repo.id}: ${error.message}`;
        await save(root, journal); throw error;
      }
    }
    journal.status = 'applied'; delete journal.error;
    return save(root, journal);
  });
}
export async function approvedScope(root, ticket, roots) {
  const journal = await readScope(root, ticket);
  if (journal.status !== 'applied' || journal.approval?.hash !== journal.hash || journal.approval.source !== 'user') fail('Apply an explicitly approved repository and branch selection first.');
  const expected = journal.plan.repos.map((repo) => repo.root).sort();
  const actual = (await Promise.all(roots.map((repo) => realpath(repo)))).sort();
  if (!same(expected, actual)) fail('Repository set differs from the approved selection.');
  const current = await snapshot(actual);
  if (!same(current, Object.values(journal.progress).map((entry) => entry.snapshot).sort((a, b) => a.root.localeCompare(b.root)))) fail('Workspace changed after branch selection.');
  return { version: 1, layout: 'workspace', artifact_root: await realpath(root), approval_hash: journal.hash,
    repos: journal.plan.repos.map(({ id, root, role, base, branch, reason }) => ({ id, root, role, base, branch, reason })) };
}

cli(import.meta.url, async (argv) => {
  const o = args(argv, ['--root', '--ticket', '--input', '--hash']);
  if (!o.root) fail('--root is required.');
  if (o.command === 'prepare') return prepareScope(o.root, await jsonInput(o.input));
  if (!o.ticket) fail('--ticket is required.');
  if (o.command === 'inspect') return readScope(o.root, o.ticket);
  if (o.command === 'approve') return approveScope(o.root, o.ticket, o.hash, await jsonInput(o.input));
  if (o.command === 'run') return runScope(o.root, o.ticket, o.hash);
  fail('Usage: workspace-scope.mjs prepare|inspect|approve|run --root ROOT [--ticket TICKET] [--input JSON] [--hash HASH]');
});
