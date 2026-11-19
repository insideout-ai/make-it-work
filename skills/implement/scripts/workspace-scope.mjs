#!/usr/bin/env node
import { artifactOutputJoin } from '../../../scripts/lib/artifact-path.mjs';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile } from '../../../scripts/lib/artifact-io.mjs';
import { lstat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { args, atomicWrite, cli, digest, fail, jsonInput, requireText, withLock, within } from '../../../scripts/lib/artifacts.mjs';
import { snapshot } from '../../../scripts/lib/repo-state.mjs';
import { resolveWorkspace } from '../../../scripts/workspace.mjs';
import { runArtifact, runDirectory } from './artifact-layout.mjs';
import { renderScopePreview } from './workspace-view.mjs';
import { readSessionWorkspace, checkSessionRepositories, SESSION_MARKER } from '../../../scripts/lib/session-workspace.mjs';

const git = (root, argv) => execFileSync('git', ['-C', root, ...argv], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const hasRef = (root, ref) => { try { git(root, ['rev-parse', '--verify', '--quiet', ref]); return true; } catch { return false; } };
const distance = (root, base, head) => {
  const [behind, ahead] = git(root, ['rev-list', '--left-right', '--count', `${base}...${head}`]).split(/\s+/).map(Number);
  return { ahead, behind };
};
function remoteBase(root, base, baseSha) {
  try {
    const ref = `refs/remotes/origin/${base}`;
    if (!hasRef(root, ref)) return null;
    const sha = git(root, ['rev-parse', '--verify', `${ref}^{commit}`]);
    return { ref: `origin/${base}`, sha, ...distance(root, sha, baseSha) };
  } catch { return null; } // Remote freshness is advisory, never operation identity.
}
const filename = (root, ticket) => artifactOutputJoin(runDirectory(root, ticket), `${ticket}-workspace.json`);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function sourceOverview(root) {
  let branch;
  try { branch = git(root, ['symbolic-ref', '--quiet', '--short', 'HEAD']); } catch { branch = '(detached HEAD)'; }
  return { root, branch, head: git(root, ['rev-parse', 'HEAD']) };
}
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
  const state = artifactOutputJoin(runDirectory(root, journal.plan.ticket), `${journal.plan.ticket}-state.md`);
  let active = true;
  try { await lstat(state); } catch (error) { if (error.code !== 'ENOENT') throw error; active = false; }
  if (active) {
    // Render only an existing dashboard, preserving the legacy no-backfill rule.
    try { await lstat(artifactOutputJoin(runDirectory(root, journal.plan.ticket), `${journal.plan.ticket}-status.html`)); }
    catch (error) { if (error.code === 'ENOENT') return { file: filename(root, journal.plan.ticket), hash: journal.hash, status: journal.status, plan: journal.plan, ...(journal.warnings?.length ? { warnings: journal.warnings } : {}) }; throw error; }
    await (await import('./render-status.mjs')).generateDashboard(state);
  } else {
    await atomicWrite(artifactOutputJoin(runDirectory(root, journal.plan.ticket), `${journal.plan.ticket}-status.html`), renderScopePreview(journal));
  }
  return { file: filename(root, journal.plan.ticket), hash: journal.hash, status: journal.status,
    dashboard: artifactOutputJoin(runDirectory(root, journal.plan.ticket), `${journal.plan.ticket}-status.html`), plan: journal.plan, progress: journal.progress, ...(journal.warnings?.length ? { warnings: journal.warnings } : {}) };
}

export async function prepareScope(root, input) {
  root = await realpath(root);
  const ticket = input.ticket;
  const directory = runDirectory(root, ticket);
  const artifacts = artifactOutputJoin(root, 'make-it-work');
  await mkdir(artifacts, { recursive: true });
  if (!(await lstat(artifacts)).isDirectory()) fail('Artifact root must not be a symlink.');
  await mkdir(directory, { recursive: true });
  if (!(await lstat(directory)).isDirectory()) fail('Run directory must not be a symlink.');
  await within(root, runArtifact(ticket, `${ticket}-workspace.json`), { existing: false });
  return withLock(filename(root, ticket), async () => {
    let activeContract = null;
    try {
      const state = (await import('./render-status.mjs')).parseState(await readFile(artifactOutputJoin(directory, `${ticket}-state.md`), 'utf8'));
      if (state.fields.workspace_version !== '1' || state.fields.status !== 'Paused' || state.pendingInputs.some((record) => record.blocking)) fail('Pause the active workspace run and resolve pending inputs before revising repository scope.');
      activeContract = JSON.parse(state.fields.workspace_contract);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    let previous;
    try { previous = await readScope(root, ticket); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (previous?.status === 'partial') fail('Reconcile the partially applied selection before preparing another plan.');
    const session = await readSessionWorkspace(root);
    const workspace = await resolveWorkspace(session?.source_root ?? root, session ? { workspaceRoot: session.source_root } : {});
    if (workspace.layout !== 'workspace' && !session) fail('Workspace selection is for workspace runs; retain the single-repo branch guard.');
    if (!Array.isArray(input.repos) || !input.repos.length) fail('Select at least one repository from find-the-repos.');
    const reportPath = requireText(input.report, 'find-the-repos report');
    if (!reportPath.startsWith(`make-it-work/${ticket}/`)) fail('Assessment must belong to this ticket.');
    const report = { path: reportPath, sha256: digest(await readFile(await within(directory, reportPath.slice(`make-it-work/${ticket}/`.length)))) };
    const selected = [], seen = new Set();
    for (const selection of input.repos) {
      const repo = workspace.repositories.find((candidate) => candidate.id === selection.id && !candidate.unavailable);
      if (!repo || seen.has(repo.id)) fail('Unknown, unavailable or duplicate selected repository.');
      seen.add(repo.id);
      let destination = session?.repositories.find(item => item.id === repo.id && item.source_root === repo.root)?.root;
      if (session && !destination) {
        if (session.version === 2) fail('Single-repo session source binding changed; preserve the saved checkout.');
        if (session.repositories.some(item => item.id === repo.id) || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(repo.id)) fail('Session source repository binding changed.');
        destination = path.join(root, 'repos', repo.id);
        session.repositories.push({ id: repo.id, source_root: repo.root, root: destination });
        await atomicWrite(path.join(root, SESSION_MARKER), JSON.stringify(session, null, 2) + '\n');
      }
      const retained = session && (activeContract?.repos ?? (previous?.status === 'applied' ? previous.plan.repos : [])).find(item => item.id === repo.id);
      const checkoutRoot = retained?.root ?? repo.root;
      const baseline = session && !retained ? sourceOverview(repo.root) : (await snapshot([checkoutRoot]))[0];
      let base = selection.base;
      if (!base) { try { base = retained?.base ?? git(repo.root, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']).replace(/^origin\//, ''); } catch { base = 'main'; } }
      requireText(base, 'Base branch');
      if (git(repo.root, ['check-ref-format', '--branch', base]) !== base) fail('Use a literal base branch name.');
      const base_sha = git(repo.root, ['rev-parse', '--verify', `${base}^{commit}`]);
      let target = selection.target_branch;
      if (session && !retained) {
        if (!target) {
          target = path.basename(root);
          for (let n = 2; hasRef(repo.root, `refs/heads/${target}`); n++) target = `${path.basename(root)}-${n}`;
        }
        if (git(repo.root, ['check-ref-format', '--branch', target]) !== target || hasRef(repo.root, `refs/heads/${target}`)) fail('Use a new branch name for this worktree; existing checkouts remain available.');
        let start = base_sha;
        if (selection.start_ref) {
          requireText(selection.start_ref, 'Starting ref');
          start = git(repo.root, ['rev-parse', '--verify', '--end-of-options', `${selection.start_ref}^{commit}`]);
        }
        try { await lstat(destination); fail('Session destination already exists; choose a fresh session rather than overwriting it.'); }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
        if (!['product', 'test', 'support'].includes(selection.role ?? 'product')) fail('Invalid repository role.');
        selected.push({ id: repo.id, root: destination, source_root: repo.root,
          git_common_dir: git(repo.root, ['rev-parse', '--path-format=absolute', '--git-common-dir']),
          role: selection.role ?? 'product', reason: requireText(selection.reason, 'Selection evidence'), base, base_sha,
          branch: target, action: 'worktree', target_head: null, baseline,
          start_point: { sha: start, ...distance(repo.root, base_sha, start) }, remote_base: remoteBase(repo.root, base, base_sha) });
        continue;
      }
      if (!target) {
        target = baseline.branch;
        if (target === base) {
          target = ticket;
          for (let n = 2; hasRef(repo.root, `refs/heads/${target}`); n++) target = `${ticket}-${n}`;
        }
      }
      if (git(repo.root, ['check-ref-format', '--branch', target]) !== target) fail('Use a literal target branch name.');
      const action = target === baseline.branch ? 'keep' : hasRef(repo.root, `refs/heads/${target}`) ? 'switch' : 'create';
      const target_head = action === 'switch' ? git(repo.root, ['rev-parse', `refs/heads/${target}`]) : null;
      const start = target_head ?? baseline.head;
      if (target === base && selection.proceed_on_base !== true) fail(`Explicit proceed_on_base is required for ${repo.id}.`);
      if (!['product', 'test', 'support'].includes(selection.role ?? 'product')) fail('Invalid repository role.');
      selected.push({ id: repo.id, root: checkoutRoot, ...(session ? { source_root: repo.root, git_common_dir: git(checkoutRoot, ['rev-parse', '--path-format=absolute', '--git-common-dir']) } : {}), role: selection.role ?? 'product', reason: requireText(selection.reason, 'Selection evidence'),
        base, base_sha, branch: target, action, target_head, baseline,
        start_point: { sha: start, ...distance(repo.root, base_sha, start) }, remote_base: remoteBase(repo.root, base, base_sha) });
    }
    for (const removed of (activeContract?.repos ?? (previous?.status === 'applied' ? previous.plan.repos : [])).filter((repo) => !seen.has(repo.id))) {
      const paths = ['--', '.', ':(exclude)make-it-work'];
      if (git(removed.root, ['diff', '--name-only', removed.base, ...paths]) || git(removed.root, ['ls-files', '--others', '--exclude-standard', ...paths])) fail(`Cannot remove changed repository ${removed.id}; reconcile its changes before revising scope.`);
    }
    selected.sort((a, b) => a.id.localeCompare(b.id));
    const plan = { ticket, artifact_root: root, layout: 'workspace', report, repos: selected,
      ...(session ? { checkout: 'worktree', source_root: session.source_root } : {}) };
    const history = [...(previous?.history ?? []), ...(previous ? [{ hash: previous.hash, status: previous.status, approval: previous.approval, repos: previous.plan.repos.map(({ id, branch, base }) => ({ id, branch, base })), time: new Date().toISOString() }] : [])];
    return save(root, { version: 1, plan, hash: digest(JSON.stringify(plan)), status: 'awaiting-approval', approval: null, progress: {}, history });
  });
}

async function validatePlan(root, journal) {
  const warnings = [];
  const report = journal.plan.report;
  if (digest(await readFile(await within(root, report.path))) !== report.sha256) fail('Repository assessment changed; prepare and approve the revised selection.');
  for (const repo of journal.plan.repos) {
    if (repo.action === 'worktree') {
      if (await realpath(path.dirname(repo.root)) !== path.dirname(repo.root)) fail(`Session destination parent changed: ${repo.id}. Preserve the occupied path and choose a valid private destination.`);
      const sourceCommon = git(repo.source_root, ['rev-parse', '--path-format=absolute', '--git-common-dir']);
      if (sourceCommon !== repo.git_common_dir) fail(`Source repository identity changed: ${repo.id}.`);
      if (journal.progress[repo.id]?.status === 'applied') {
        if (!same((await snapshot([repo.root]))[0], journal.progress[repo.id].snapshot)) fail(`Session worktree changed since selection: ${repo.id}.`);
        continue;
      }
      if (journal.progress[repo.id]?.status === 'creating' && await recoverWorktree(repo)) continue;
      try { await lstat(repo.root); fail(`Session destination is occupied: ${repo.id}.`); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (hasRef(repo.source_root, `refs/heads/${repo.branch}`) && !(journal.progress[repo.id]?.status === 'creating' && recoverableBranch(repo))) fail(`Target branch now exists in ${repo.id}; preserve it and revise the selection.`);
      git(repo.source_root, ['cat-file', '-e', `${repo.start_point.sha}^{commit}`]);
      if (git(repo.source_root, ['rev-parse', '--verify', `${repo.base}^{commit}`]) !== repo.base_sha) warnings.push(`Base moved in ${repo.id}; worktree creation retains the approved starting commit.`);
      continue;
    }
    const current = (await snapshot([repo.root]))[0];
    if (!same(current, journal.progress[repo.id]?.snapshot ?? repo.baseline)) fail(`Repository changed since selection: ${repo.id}. Prepare and approve again.`);
    if (git(repo.root, ['rev-parse', '--verify', `${repo.base}^{commit}`]) !== repo.base_sha) fail(`Base changed in ${repo.id}; prepare and approve again.`);
    // Old saved selections retain their original approval contract.
    if (Object.hasOwn(repo, 'remote_base') && !same(remoteBase(repo.root, repo.base, repo.base_sha), repo.remote_base)) warnings.push(`Remote-tracking base changed in ${repo.id}; the approved local branch operation is unchanged. No reapproval is needed.`);
    if (journal.progress[repo.id]) continue;
    if (repo.action === 'create' && hasRef(repo.root, `refs/heads/${repo.branch}`)) fail(`Target branch now exists in ${repo.id}.`);
    if (repo.action === 'switch' && git(repo.root, ['rev-parse', `refs/heads/${repo.branch}`]) !== repo.target_head) fail(`Target branch changed in ${repo.id}.`);
  }
  journal.warnings = warnings;
}

async function recoverWorktree(repo) {
  try { await lstat(repo.root); } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
  if (await realpath(repo.root) !== repo.root ||
      git(repo.root, ['rev-parse', '--path-format=absolute', '--git-common-dir']) !== repo.git_common_dir ||
      git(repo.root, ['rev-parse', '--show-toplevel']) !== repo.root ||
      git(repo.root, ['symbolic-ref', '--short', 'HEAD']) !== repo.branch || git(repo.root, ['rev-parse', 'HEAD']) !== repo.start_point.sha ||
      git(repo.root, ['status', '--porcelain'])) fail(`Interrupted worktree differs from the approved creation: ${repo.id}. Preserve it and reconcile before retrying.`);
  return true;
}

function recoverableBranch(repo) {
  return git(repo.source_root, ['rev-parse', `refs/heads/${repo.branch}`]) === repo.start_point.sha &&
    !git(repo.source_root, ['worktree', 'list', '--porcelain']).split('\n').includes(`branch refs/heads/${repo.branch}`);
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
      if (journal.progress[repo.id]?.status === 'applied') continue;
      try {
        if (repo.action === 'worktree') {
          const recovering = journal.progress[repo.id]?.status === 'creating';
          journal.progress[repo.id] = { status: 'creating' };
          await save(root, journal); // Durable intent permits only exact interrupted-create recovery.
          if (!recovering || !await recoverWorktree(repo)) {
            if (recovering && hasRef(repo.source_root, `refs/heads/${repo.branch}`) && recoverableBranch(repo)) git(repo.source_root, ['worktree', 'add', repo.root, repo.branch]);
            else git(repo.source_root, ['worktree', 'add', '-b', repo.branch, repo.root, repo.start_point.sha]);
          }
        } else if (repo.action !== 'keep') git(repo.root, repo.action === 'create' ? ['switch', '-c', repo.branch] : ['switch', repo.branch]);
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
  const contract = { version: 1, layout: 'workspace', artifact_root: await realpath(root), approval_hash: journal.hash,
    ...(journal.plan.checkout ? { checkout: journal.plan.checkout, source_root: journal.plan.source_root } : {}),
    repos: journal.plan.repos.map(({ id, root, role, base, branch, reason, source_root, git_common_dir }) => ({ id, root, role, base, branch, reason,
      ...(source_root ? { source_root, git_common_dir } : {}) })) };
  await checkSessionRepositories(contract);
  return contract;
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
