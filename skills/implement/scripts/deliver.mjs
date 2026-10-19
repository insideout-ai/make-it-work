#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtemp, open, readFile, realpath, rename, rm, stat, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkFinalPackage } from './final-package.mjs';
import { generateDashboard, parseState } from './render-status.mjs';
import { assertRunState, runDirectory } from './artifact-layout.mjs';
import { deliveryPaths } from './delivery-progress.mjs';

const sha = (value) => createHash('sha256').update(value).digest('hex');
const fail = (message) => { throw new Error(message); };
const utf8 = (value) => value.toString('utf8').trim();

function command(bin, args, options = {}) {
  const result = spawnSync(bin, args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, ...options });
  if (result.error) throw result.error;
  if (result.status !== 0 && !options.allowFailure) fail(`${bin} ${args[0]} failed: ${result.stderr.trim() || result.stdout.trim()}`);
  return result;
}

function git(repo, args, options = {}) {
  return command('git', ['-C', repo, ...args], options);
}

async function atomicWrite(target, value) {
  const temporary = `${target}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporary, target);
}

async function loadProgress(context) {
  try {
    const progress = JSON.parse(await readFile(context.files.journal, 'utf8'));
    if (progress.version !== 1 || !progress.repos || typeof progress.repos !== 'object' || Array.isArray(progress.repos)
        || (progress.ticket && progress.ticket !== context.state.fields.ticket)) fail('Invalid delivery progress.');
    return progress;
  } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function refreshDashboard(context) {
  const dashboard = path.join(path.dirname(context.statePath), `${context.state.fields.ticket}-status.html`);
  try { await stat(dashboard); }
  catch (error) { if (error.code === 'ENOENT') return; throw error; }
  await generateDashboard(context.statePath);
}

async function saveProgress(context, progress) {
  progress.version = 1;
  progress.ticket = context.state.fields.ticket;
  progress.updated_at = new Date().toISOString();
  await atomicWrite(context.files.journal, progress);
  try { await refreshDashboard(context); }
  catch (error) { fail(`Delivery progress was saved, but dashboard refresh failed: ${error.message}`); }
}

async function lifecycle(context, action) {
  const prior = await loadProgress(context);
  if (action === 'offer' && prior) { await refreshDashboard(context); return prior; }
  if (prior && (!['offered', 'awaiting-approval', 'declined'].includes(prior.status) || Object.keys(prior.repos).length)) {
    fail('Delivery already started; inspect its progress instead of changing its offer.');
  }
  const progress = { version: 1, repos: {}, ...prior, status: action === 'offer' ? 'offered' : 'declined', activity: null, error: null };
  if (action === 'offer') progress.offered_at = new Date().toISOString();
  else progress.declined_at = new Date().toISOString();
  await saveProgress(context, progress);
  return progress;
}

async function recordFailure(context, error, onlyUnstarted = false) {
  const progress = await loadProgress(context) ?? { version: 1, repos: {} };
  if (onlyUnstarted && (!['offered', 'awaiting-approval', 'declined', undefined].includes(progress.status) || Object.keys(progress.repos).length)) return;
  const partial = Object.values(progress.repos).some((repo) => repo.commit || repo.pushed || repo.pr);
  progress.status = partial ? 'partial' : 'failed';
  progress.error = error.message;
  progress.activity = null;
  progress.stopped_at = new Date().toISOString();
  await saveProgress(context, progress);
}

export function parseRemote(remote) {
  const match = /^(?:git@|ssh:\/\/git@)(github\.com|bitbucket\.org)[:/]([^/]+)\/([^/]+?)(?:\.git)?\/?$/.exec(remote)
    || /^https:\/\/(github\.com|bitbucket\.org)\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/.exec(remote);
  if (!match) fail('Unsupported origin remote; use GitHub or Bitbucket Cloud without credentials embedded in the URL.');
  return { provider: match[1] === 'github.com' ? 'github' : 'bitbucket', owner: match[2], repo: match[3] };
}

function assertSafeRepo(repo) {
  if (repo.branch === repo.base || !repo.branch || !repo.base) fail(`Delivery requires a non-base branch in ${repo.name}.`);
  if (repo.paths.length === 0) fail(`No changed paths in ${repo.name}.`);
  for (const changed of repo.paths) {
    if (changed.startsWith('-') || changed.includes('\0') || changed === 'make-it-work' || changed.startsWith('make-it-work/')) fail(`Unsafe changed path: ${changed}`);
    if (/(^|\/)(\.env[^/]*|\.npmrc|[^/]*\.(?:pem|key)|[^/]*credentials[^/]*)$/i.test(changed)) {
      fail(`Sensitive path requires manual delivery: ${changed}`);
    }
  }
}

async function targetTree(repo) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'make-it-work-delivery-'));
  const index = path.join(directory, 'index');
  try {
    const env = { ...process.env, GIT_INDEX_FILE: index };
    git(repo.path, ['read-tree', repo.head], { env });
    git(repo.path, ['add', '-A', '--', ...repo.paths.map((item) => `:(literal)${item}`)], { env });
    return git(repo.path, ['write-tree'], { env }).stdout.trim();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function readContext(rootInput, stateInput) {
  const root = await realpath(rootInput);
  const statePath = await realpath(stateInput);
  const state = parseState(await readFile(statePath, 'utf8'), statePath);
  assertRunState(root, statePath, state.fields.ticket);
  if (state.fields.status !== 'Complete' || state.fields.phase !== 'complete' || state.fields.final_package_version !== '1') {
    fail('Delivery requires a completed package-enabled run.');
  }
  return { root, statePath, state, files: deliveryPaths(root, state.fields.ticket) };
}

function preview(plan) {
  const lines = [`# Optional delivery — ${plan.ticket}`, '', `Approved package SHA-256: \`${plan.package_sha256}\``, '',
    'This is a separate request to commit, push to origin, and create or update pull requests. It does not merge or post to Jira.', ''];
  for (const repo of plan.repos) {
    lines.push(`## ${repo.name}`, '', `Repository: \`${repo.path}\``, `Origin: \`${repo.remote}\``, `Push transport: \`${repo.push_url}\``,
      `Branch: \`${repo.branch}\` → base \`${repo.base}\``, `Provider: ${repo.provider}`, '',
      `Commit message: ${plan.draft.commit_message}`, `PR title: ${plan.draft.pr_title}`, '',
      plan.draft.pr_description, '', 'Paths:', '', ...repo.paths.map((item) => `- \`${item}\``), '');
  }
  lines.push('Approval is for this exact delivery plan. Hooks may run during commit; if they change the approved tree, delivery stops before push.', '');
  return lines.join('\n');
}

async function prepare(context) {
  const { root, statePath, state, files } = context;
  const prior = await loadProgress(context);
  if (prior && (!['offered', 'awaiting-approval', 'declined'].includes(prior.status) || Object.keys(prior.repos).length)) {
    fail('Delivery already started; use status or run to resume.');
  }
  const check = await checkFinalPackage(root, statePath, state.fields.autonomy === 'guided');
  const pkg = JSON.parse(await readFile(path.join(runDirectory(root, state.fields.ticket), `${state.fields.ticket}-final-package.json`), 'utf8'));
  const repos = [];
  for (const original of pkg.repos) {
    const repo = { ...original };
    assertSafeRepo(repo);
    if (utf8(git(repo.path, ['rev-parse', 'HEAD']).stdout) !== repo.head) fail(`HEAD changed in ${repo.name}.`);
    if (utf8(git(repo.path, ['symbolic-ref', '--quiet', '--short', 'HEAD']).stdout) !== repo.branch) fail(`Branch changed in ${repo.name}.`);
    if (git(repo.path, ['diff', '--cached', '--quiet'], { allowFailure: true }).status !== 0) fail(`Index already has staged changes in ${repo.name}.`);
    const remote = utf8(git(repo.path, ['config', '--get', 'remote.origin.url']).stdout);
    const host = parseRemote(remote);
    const pushUrls = git(repo.path, ['remote', 'get-url', '--push', '--all', 'origin']).stdout.trim().split('\n').filter(Boolean);
    if (pushUrls.length !== 1) fail(`Expected exactly one origin push URL in ${repo.name}.`);
    if (/^https?:\/\/[^/@]+@/.test(pushUrls[0])) fail(`Origin push URL embeds credentials in ${repo.name}; use a credential helper instead.`);
    repos.push({ name: repo.name, path: repo.path, branch: repo.branch, base: repo.base,
      head: repo.head, paths: repo.paths, target_tree: await targetTree(repo), remote, push_url: pushUrls[0], ...host });
  }
  const plan = { version: 1, ticket: pkg.ticket, package_sha256: check.sha256, draft: pkg.draft, repos };
  const hash = sha(JSON.stringify(plan));
  await writeFile(files.preview, preview(plan));
  await atomicWrite(files.plan, plan);
  await saveProgress(context, { version: 1, ticket: state.fields.ticket, plan_sha256: hash,
    expected_repos: repos.map((repo) => repo.name), repos: {}, status: 'awaiting-approval',
    ...(prior?.offered_at ? { offered_at: prior.offered_at } : {}), prepared_at: new Date().toISOString(), activity: null, error: null });
  return { plan: files.preview, sha256: hash, repos: repos.map(({ name, branch, base, remote }) => ({ name, branch, base, remote })) };
}

async function verifyEvidence(context, plan) {
  const pkgPath = path.join(runDirectory(context.root, plan.ticket), `${plan.ticket}-final-package.json`);
  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
  if (sha(JSON.stringify(pkg)) !== plan.package_sha256) fail('Approved final package changed.');
  const evidenceDirectory = runDirectory(context.root, plan.ticket);
  for (const item of [...Object.values(pkg.evidence), { path: pkg.draft_path, sha256: pkg.draft_sha256 }]) {
    const file = path.resolve(context.root, item.path);
    if (!file.startsWith(`${evidenceDirectory}${path.sep}`)) fail(`Approved evidence path escaped: ${item.path}`);
    const actual = await realpath(file);
    if (!actual.startsWith(`${evidenceDirectory}${path.sep}`) || sha(await readFile(actual)) !== item.sha256) fail(`Approved evidence changed: ${item.path}`);
  }
  if (context.state.fields.autonomy === 'guided') {
    const stamp = JSON.parse(await readFile(path.join(runDirectory(context.root, plan.ticket), `${plan.ticket}-final-approval.json`), 'utf8'));
    if (stamp.package_sha256 !== plan.package_sha256) fail('Final package approval changed.');
  }
}

function token() {
  const raw = process.env.MAKE_IT_WORK_BITBUCKET_TOKEN_JSON;
  if (!raw) fail('Bitbucket token missing; set MAKE_IT_WORK_BITBUCKET_TOKEN_JSON for delivery.');
  const parsed = JSON.parse(raw);
  if (!parsed.token || !['basic', 'bearer'].includes(parsed.auth) || (parsed.auth === 'basic' && !parsed.user)) fail('Invalid Bitbucket token JSON.');
  return parsed;
}

async function bitbucketRequest(method, url, body) {
  const credential = token();
  const authorization = credential.auth === 'basic'
    ? `Basic ${Buffer.from(`${credential.user}:${credential.token}`).toString('base64')}`
    : `Bearer ${credential.token}`;
  const response = await fetch(url, { method, headers: { Authorization: authorization, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined });
  if (!response.ok) fail(`Bitbucket ${method} failed: HTTP ${response.status}.`);
  return response.json();
}

export async function pullRequest(repo, draft) {
  if (repo.provider === 'github') {
    const slug = `${repo.owner}/${repo.repo}`;
    const found = JSON.parse(command('gh', ['pr', 'list', '--repo', slug, '--head', repo.branch, '--base', repo.base, '--state', 'open', '--json', 'number,url']).stdout);
    if (found.length > 1) fail(`Multiple open PRs match ${repo.name}.`);
    if (found.length === 1) {
      command('gh', ['pr', 'edit', String(found[0].number), '--repo', slug, '--title', draft.pr_title, '--body', draft.pr_description]);
      return { id: found[0].number, url: found[0].url, action: 'updated' };
    }
    const url = command('gh', ['pr', 'create', '--repo', slug, '--base', repo.base, '--head', repo.branch,
      '--title', draft.pr_title, '--body', draft.pr_description]).stdout.trim();
    return { id: null, url, action: 'created' };
  }
  const api = (process.env.MAKE_IT_WORK_BITBUCKET_API_BASE || 'https://api.bitbucket.org/2.0').replace(/\/$/, '');
  const root = `${api}/repositories/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/pullrequests`;
  const query = encodeURIComponent(`source.branch.name="${repo.branch}" AND state="OPEN"`);
  const found = await bitbucketRequest('GET', `${root}?q=${query}`);
  if (!Array.isArray(found.values)) fail('Bitbucket PR search returned an invalid response.');
  if (found.values.length > 1) fail(`Multiple open PRs match ${repo.name}.`);
  const body = { title: draft.pr_title, description: draft.pr_description,
    source: { branch: { name: repo.branch } }, destination: { branch: { name: repo.base } } };
  const existing = found.values[0];
  const result = existing
    ? await bitbucketRequest('PUT', `${root}/${existing.id}`, body)
    : await bitbucketRequest('POST', root, body);
  return { id: result.id, url: result.links?.html?.href || null, action: existing ? 'updated' : 'created' };
}

async function run(context, expectedHash) {
  const { files } = context;
  let plan;
  try {
    plan = JSON.parse(await readFile(files.plan, 'utf8'));
    if (sha(JSON.stringify(plan)) !== expectedHash || plan.ticket !== context.state.fields.ticket) fail('Delivery plan hash or ticket mismatch.');
    if (await readFile(files.preview, 'utf8') !== preview(plan)) fail('Delivery preview changed. Prepare a new plan.');
    await verifyEvidence(context, plan);
  } catch (error) {
    await recordFailure(context, error, true).catch((checkpointError) => { error.message += `; could not refresh delivery status: ${checkpointError.message}`; });
    throw error;
  }
  const lock = await open(files.lock, 'wx').catch((error) => {
    if (error.code === 'EEXIST') fail(`Delivery already running or interrupted; inspect ${files.lock} before retrying.`);
    throw error;
  });
  try {
    let progress = await loadProgress(context);
    const hadActions = progress && Object.keys(progress.repos).length > 0;
    if (progress?.plan_sha256 && progress.plan_sha256 !== expectedHash) fail('Delivery progress belongs to a different plan.');
    if (!hadActions) {
      await checkFinalPackage(context.root, context.statePath, context.state.fields.autonomy === 'guided');
    }
    progress ??= { version: 1, repos: {} };
    progress.plan_sha256 = expectedHash;
    progress.expected_repos = plan.repos.map((repo) => repo.name);
    progress.status = 'running';
    progress.activity = 'Checking delivery prerequisites.';
    progress.error = null;
    progress.approved_at ??= new Date().toISOString();
    if (!hadActions) progress.started_at ??= new Date().toISOString();
    delete progress.completed_at;
    delete progress.stopped_at;
    await saveProgress(context, progress);
    if (!hadActions) {
      for (const repo of plan.repos) {
        if (repo.provider === 'github') {
          command('gh', ['--version']);
          command('gh', ['auth', 'status']);
        } else token();
      }
    }
    for (const repo of plan.repos) {
      const item = progress.repos[repo.name] ?? {};
      progress.activity = `Checking ${repo.name}.`;
      await saveProgress(context, progress);
      if (utf8(git(repo.path, ['symbolic-ref', '--quiet', '--short', 'HEAD']).stdout) !== repo.branch) fail(`Branch changed in ${repo.name}.`);
      if (utf8(git(repo.path, ['config', '--get', 'remote.origin.url']).stdout) !== repo.remote) fail(`Origin changed in ${repo.name}.`);
      if (utf8(git(repo.path, ['remote', 'get-url', '--push', '--all', 'origin']).stdout) !== repo.push_url) fail(`Origin push transport changed in ${repo.name}.`);
      let head = utf8(git(repo.path, ['rev-parse', 'HEAD']).stdout);
      if (!item.commit) {
        if (head === repo.head) {
          if (git(repo.path, ['diff', '--cached', '--quiet'], { allowFailure: true }).status !== 0) fail(`Index already has staged changes in ${repo.name}.`);
          if (await targetTree(repo) !== repo.target_tree) fail(`Working tree changed in ${repo.name}.`);
          git(repo.path, ['add', '-A', '--', ...repo.paths.map((name) => `:(literal)${name}`)]);
          if (utf8(git(repo.path, ['write-tree']).stdout) !== repo.target_tree) fail(`Staged tree differs from approved tree in ${repo.name}.`);
          if (utf8(git(repo.path, ['diff', '--cached', '--name-only', '-z']).stdout).split('\0').filter(Boolean).some((name) => !repo.paths.includes(name))) {
            fail(`Staged paths exceed approved paths in ${repo.name}.`);
          }
          if (git(repo.path, ['diff', '--cached', '--quiet'], { allowFailure: true }).status !== 0) {
            progress.activity = `Committing ${repo.name}.`;
            await saveProgress(context, progress);
            git(repo.path, ['commit', '-m', plan.draft.commit_message]);
            head = utf8(git(repo.path, ['rev-parse', 'HEAD']).stdout);
            item.commit = head;
            progress.repos[repo.name] = item;
            progress.activity = `Validating the commit in ${repo.name}.`;
            await saveProgress(context, progress);
          }
        }
        if (utf8(git(repo.path, ['rev-parse', 'HEAD^{tree}']).stdout) !== repo.target_tree) fail(`Commit or hook changed approved tree in ${repo.name}; nothing was pushed for this repo.`);
        if (head === repo.head) fail(`No new commit to deliver in ${repo.name}.`);
        if (utf8(git(repo.path, ['rev-parse', 'HEAD^']).stdout) !== repo.head
          || utf8(git(repo.path, ['log', '-1', '--format=%B']).stdout) !== plan.draft.commit_message.trim()) {
          fail(`Unrecognized commit in ${repo.name}; inspect it before retrying.`);
        }
        item.commit = head;
        progress.repos[repo.name] = item;
        await saveProgress(context, progress);
      } else if (head !== item.commit || utf8(git(repo.path, ['rev-parse', 'HEAD^{tree}']).stdout) !== repo.target_tree) {
        fail(`Committed content changed in ${repo.name}.`);
      }
      if (utf8(git(repo.path, ['rev-parse', 'HEAD^']).stdout) !== repo.head
          || utf8(git(repo.path, ['log', '-1', '--format=%B']).stdout) !== plan.draft.commit_message.trim()) {
        fail(`Unrecognized commit in ${repo.name}; inspect it before retrying.`);
      }
      const remoteHead = utf8(git(repo.path, ['ls-remote', '--heads', 'origin', `refs/heads/${repo.branch}`]).stdout).split(/\s+/)[0];
      if (!item.pushed) {
        progress.activity = `Pushing ${repo.name}.`;
        await saveProgress(context, progress);
        if (remoteHead !== item.commit) git(repo.path, ['push', 'origin', `refs/heads/${repo.branch}:refs/heads/${repo.branch}`]);
        item.pushed = item.commit;
        await saveProgress(context, progress);
      } else if (remoteHead !== item.pushed) fail(`Remote branch changed in ${repo.name}.`);
      if (!item.pr) {
        progress.activity = `Opening or updating the pull request for ${repo.name}.`;
        await saveProgress(context, progress);
        item.pr = await pullRequest(repo, plan.draft);
        await saveProgress(context, progress);
      }
    }
    progress.status = 'delivered';
    progress.activity = null;
    progress.completed_at = new Date().toISOString();
    await saveProgress(context, progress);
    return { delivered: true, progress: files.journal, repos: progress.repos };
  } catch (error) {
    await recordFailure(context, error).catch((checkpointError) => { error.message += `; could not refresh delivery status: ${checkpointError.message}`; });
    throw error;
  } finally {
    await lock.close();
    await unlink(files.lock);
  }
}

async function main(args) {
  const action = args.shift();
  const options = {};
  while (args.length) {
    const flag = args.shift();
    if (!['--root', '--state', '--hash'].includes(flag) || !args.length) fail(`Invalid option: ${flag}`);
    options[flag.slice(2)] = args.shift();
  }
  if (!['offer', 'decline', 'prepare', 'run', 'status'].includes(action) || !options.root || !options.state) {
    fail('Usage: deliver.mjs offer|decline|prepare|run|status --root ROOT --state STATE [--hash PLAN_SHA256]');
  }
  const context = await readContext(options.root, options.state);
  if (action === 'offer' || action === 'decline') return lifecycle(context, action);
  if (action === 'prepare') {
    try { return await prepare(context); }
    catch (error) {
      await recordFailure(context, error, true).catch((checkpointError) => { error.message += `; could not refresh delivery status: ${checkpointError.message}`; });
      throw error;
    }
  }
  if (action === 'status') {
    try { return JSON.parse(await readFile(context.files.journal, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return { started: false }; throw error; }
  }
  if (!/^[a-f0-9]{64}$/.test(options.hash || '')) fail('run requires --hash PLAN_SHA256.');
  return run(context, options.hash);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((result) => console.log(JSON.stringify(result))).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
