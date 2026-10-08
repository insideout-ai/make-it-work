#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFile, realpath, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseState } from './render-status.mjs';
import { readVerification } from './verification.mjs';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const fail = (message) => { throw new Error(message); };

function git(repo, args, { acceptDiff = false } = {}) {
  const result = spawnSync('git', ['-C', repo, ...args], { encoding: null, maxBuffer: 100 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0 && !(acceptDiff && result.status === 1)) {
    fail(`git ${args[0]} failed in ${repo}: ${result.stderr.toString('utf8').trim()}`);
  }
  return result.stdout;
}

async function artifact(root, relative) {
  if (typeof relative !== 'string' || !relative || path.isAbsolute(relative)) fail(`Invalid artifact path: ${relative}`);
  const resolved = path.resolve(root, relative);
  if (!resolved.startsWith(`${root}${path.sep}make-it-work${path.sep}`)) fail(`Artifact must be in make-it-work/: ${relative}`);
  const actual = await realpath(resolved);
  if (!actual.startsWith(`${root}${path.sep}make-it-work${path.sep}`)) fail(`Artifact symlink escapes make-it-work/: ${relative}`);
  const bytes = await readFile(actual);
  return { path: relative, sha256: sha(bytes) };
}

function textFileName(ticket, name) { return `${ticket}-final-${name}`; }
function uniquePaths(changed, untracked) { return [...new Set([...changed, ...untracked])].sort(); }

async function snapshotRepo(repoPath, base, artifactRoot) {
  const repo = await realpath(repoPath);
  if (repo === artifactRoot && !base) fail('A base branch is required.');
  const name = path.basename(repo);
  const top = git(repo, ['rev-parse', '--show-toplevel']).toString('utf8').trim();
  if (await realpath(top) !== repo) fail(`Not a repository root: ${repoPath}`);
  const branch = git(repo, ['symbolic-ref', '--quiet', '--short', 'HEAD']).toString('utf8').trim();
  const head = git(repo, ['rev-parse', 'HEAD']).toString('utf8').trim();
  const baseSha = git(repo, ['rev-parse', '--verify', `${base}^{commit}`]).toString('utf8').trim();
  const mergeBase = git(repo, ['merge-base', baseSha, head]).toString('utf8').trim();
  const excludes = ['--', '.', ':(exclude)make-it-work'];
  const trackedDiff = git(repo, ['diff', '--binary', '--no-ext-diff', mergeBase, ...excludes]);
  const changed = git(repo, ['diff', '--name-only', mergeBase, ...excludes]).toString('utf8').split('\n').filter(Boolean);
  const untracked = git(repo, ['ls-files', '--others', '--exclude-standard', '-z', ...excludes]).toString('utf8').split('\0').filter(Boolean).sort();
  const pieces = [trackedDiff];
  for (const relative of untracked) {
    const absolute = path.resolve(repo, relative);
    if (!absolute.startsWith(`${repo}${path.sep}`)) fail(`Untracked path escapes repo: ${relative}`);
    pieces.push(git(repo, ['diff', '--no-index', '--binary', '--no-ext-diff', '--', '/dev/null', relative], { acceptDiff: true }));
  }
  const diff = Buffer.concat(pieces);
  return {
    name, path: repo, base, base_sha: baseSha, merge_base: mergeBase, branch, head,
    paths: uniquePaths(changed, untracked), diff_sha256: sha(diff), diff,
  };
}

function markdown(pkg) {
  const lines = [
    `# Final approval — ${pkg.ticket}`,
    '',
    `Review: ${pkg.review.status}. Validation: ${pkg.validation.mode} — ${pkg.validation.result}.`,
    '',
    '## Changes',
    '',
  ];
  for (const repo of pkg.repos) {
    lines.push(`### ${repo.name}`, '', `Branch: \`${repo.branch}\` · Base: \`${repo.base}\` (${repo.base_sha.slice(0, 12)})`, '');
    lines.push(`Diff: [${repo.diff_file}](${repo.diff_file})`, '');
    lines.push(repo.paths.length ? repo.paths.map((p) => `- \`${p}\``).join('\n') : '- No changed paths', '');
  }
  lines.push('## Evidence', '');
  for (const [name, item] of Object.entries(pkg.evidence)) lines.push(`- ${name}: [${item.path}](${path.basename(item.path)})`);
  lines.push(`- Known unrelated regressions: ${pkg.known_regressions.length ? pkg.known_regressions.join('; ') : 'none'}`);
  lines.push(`- Open review nits: ${pkg.open_nits.length ? pkg.open_nits.join('; ') : 'none'}`);
  lines.push(`- Decided findings: ${pkg.decided_findings.length ? pkg.decided_findings.join('; ') : 'none'}`, '');
  if (pkg.acceptance) {
    lines.push('## Acceptance verification', '', '| Criterion | Scenario | Status | Evidence |', '| --- | --- | --- | --- |');
    for (const item of pkg.acceptance) {
      const cell = (value) => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
      lines.push(`| ${cell(item.criterion)} | ${cell(item.scenario)} | ${item.status} | ${cell(item.note)} |`);
    }
    lines.push('');
  }
  lines.push('## Draft delivery text', '', `Commit: ${pkg.draft.commit_message}`, '', `PR title: ${pkg.draft.pr_title}`, '', pkg.draft.pr_description, '');
  lines.push('Approval covers the exact working tree, evidence, and draft text shown here. Changes require a new package and approval.', '');
  return lines.join('\n');
}

async function atomicWrite(target, bytes) {
  const temporary = `${target}.${process.pid}.tmp`;
  await writeFile(temporary, bytes);
  await rename(temporary, target);
}

function names(root, ticket) {
  const dir = path.join(root, 'make-it-work');
  return {
    json: path.join(dir, textFileName(ticket, 'package.json')),
    md: path.join(dir, textFileName(ticket, 'package.md')),
    approval: path.join(dir, textFileName(ticket, 'approval.json')),
  };
}

function assertDraft(draft) {
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) fail('Draft must be a JSON object.');
  for (const key of ['commit_message', 'pr_title', 'pr_description']) {
    if (typeof draft[key] !== 'string' || !draft[key].trim()) fail(`Draft is missing ${key}.`);
  }
  if (Object.keys(draft).some((key) => !['commit_message', 'pr_title', 'pr_description'].includes(key))) fail('Draft has an unknown field.');
  return draft;
}

async function packageFromState(root, statePath, repoInputs, baseInputs, draftPath) {
  const state = parseState(await readFile(statePath, 'utf8'), statePath);
  const f = state.fields;
  if (f.final_package_version !== '1') fail('This run is not enabled for final packages.');
  if (!['final-approval', 'complete'].includes(f.phase) || f.review !== 'clean') fail('Final package requires completed context sync and clean review.');
  if (!repoInputs.length) fail('At least one affected repo is required.');
  if (baseInputs.length && baseInputs.length !== repoInputs.length) fail('Pass one --base for each --repo.');
  const draftArtifact = await artifact(root, path.relative(root, await realpath(draftPath)));
  const draft = assertDraft(JSON.parse(await readFile(path.resolve(root, draftArtifact.path), 'utf8')));
  const evidence = {
    spec: await artifact(root, f.spec),
    plan: await artifact(root, f.plan),
    execute: await artifact(root, f.execute_report),
    review: await artifact(root, `make-it-work/${f.ticket}-review.md`),
  };
  let verification = null;
  if (f.verification_version === '1') {
    if (!['passed', 'gate-no-result'].includes(f.execution)) fail('Final package requires completed execution or an accepted manual gate.');
    const relative = `make-it-work/${f.ticket}-verification-v${f.plan_version}.json`;
    verification = await readVerification(root, relative, {
      ticket: f.ticket, planVersion: Number(f.plan_version), plan: await readFile(path.resolve(root, f.plan), 'utf8'),
      outcome: f.execution === 'passed' ? 'PASSED' : 'GATE_NO_RESULT', requireComplete: true,
    });
    if (f.execution === 'gate-no-result' && verification.gate.result !== 'manual-accepted') fail('The no-result gate requires an explicit manual acceptance.');
    if (verification.gate.mode !== f.gate) fail('Verification gate mode disagrees with state.');
    evidence.verification = await artifact(root, relative);
  } else if (f.execution !== 'passed') fail('Final package requires passed execution.');
  const reviewReport = await readFile(path.resolve(root, evidence.review.path), 'utf8');
  const openNits = [...reviewReport.matchAll(/^\d+\.\s+\*\*\[Minor\]\*\*\s+(.+)$/gm)].map((match) => match[1].trim());
  const repos = [];
  const seen = new Set();
  for (let i = 0; i < repoInputs.length; i += 1) {
    const snap = await snapshotRepo(repoInputs[i], baseInputs[i] ?? f.base, root);
    if (seen.has(snap.name)) fail(`Duplicate repo name: ${snap.name}`);
    seen.add(snap.name);
    snap.diff_file = textFileName(f.ticket, `${snap.name}.diff`);
    repos.push(snap);
  }
  repos.sort((a, b) => a.name.localeCompare(b.name));
  const pkg = {
    version: 1, ticket: f.ticket, draft_path: draftArtifact.path, draft_sha256: draftArtifact.sha256,
    draft, evidence, validation: { mode: f.gate, result: verification ? verification.gate.result : f.gate === 'none' ? 'automated gate skipped; see execution report for manual verification' : 'PASS' },
    ...(verification ? { acceptance: verification.acceptance } : {}),
    review: { status: f.review, cycle: state.reviewCycle }, open_nits: openNits,
    known_regressions: state.knownRegressions, decided_findings: state.decidedFindings,
    repos: repos.map(({ diff, ...data }) => data),
  };
  const md = markdown(pkg);
  return { pkg, md, repos };
}

async function build(root, statePath, repos, bases, draftPath) {
  const state = parseState(await readFile(statePath, 'utf8'), statePath);
  if (state.fields.phase !== 'final-approval') fail('Build is only allowed at final approval.');
  const result = await packageFromState(root, statePath, repos, bases, draftPath);
  const target = names(root, result.pkg.ticket);
  for (const repo of result.repos) await atomicWrite(path.join(root, 'make-it-work', repo.diff_file), repo.diff);
  await atomicWrite(target.md, result.md);
  await atomicWrite(target.json, `${JSON.stringify(result.pkg, null, 2)}\n`);
  return { package: target.md, json: target.json, sha256: sha(JSON.stringify(result.pkg)) };
}

export async function checkFinalPackage(root, statePath, requireApproval = false) {
  const state = parseState(await readFile(statePath, 'utf8'), statePath);
  const target = names(root, state.fields.ticket);
  const saved = JSON.parse(await readFile(target.json, 'utf8'));
  if (saved.version !== 1 || saved.ticket !== state.fields.ticket) fail('Final package version or ticket does not match state.');
  const result = await packageFromState(root, statePath, saved.repos.map((r) => r.path), saved.repos.map((r) => r.base), path.resolve(root, saved.draft_path));
  if (JSON.stringify(result.pkg) !== JSON.stringify(saved)) fail('Final package is stale; rebuild it and seek approval again.');
  if (await readFile(target.md, 'utf8') !== result.md) fail('Final package Markdown changed; rebuild it.');
  for (const repo of result.repos) {
    const disk = await readFile(path.join(root, 'make-it-work', repo.diff_file));
    if (sha(disk) !== repo.diff_sha256) fail(`Final diff changed: ${repo.name}.`);
  }
  const hash = sha(JSON.stringify(saved));
  let approved = false;
  try {
    const stamp = JSON.parse(await readFile(target.approval, 'utf8'));
    approved = stamp.version === 1 && stamp.ticket === saved.ticket && stamp.package_sha256 === hash;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (requireApproval && !approved) fail('Final package has no current approval.');
  return { current: true, approved, sha256: hash, package: target.md };
}

async function approve(root, statePath, expectedHash) {
  const state = parseState(await readFile(statePath, 'utf8'), statePath);
  if (state.fields.phase !== 'final-approval') fail('Approve is only allowed at final approval.');
  const result = await checkFinalPackage(root, statePath);
  if (result.sha256 !== expectedHash) fail('Approval hash does not match the current package.');
  await atomicWrite(names(root, state.fields.ticket).approval, `${JSON.stringify({ version: 1, ticket: state.fields.ticket, package_sha256: expectedHash, approved_at: new Date().toISOString() }, null, 2)}\n`);
  return { approved: true, sha256: expectedHash };
}

async function main(args) {
  const command = args.shift();
  const options = { repo: [], base: [] };
  while (args.length) {
    const flag = args.shift();
    if (!flag?.startsWith('--')) fail(`Invalid argument: ${flag}`);
    if (flag === '--require-approval') { options.requireApproval = true; continue; }
    if (!args.length) fail(`Missing value for ${flag}.`);
    const value = args.shift();
    if (flag === '--repo') options.repo.push(value);
    else if (flag === '--base') options.base.push(value);
    else if (['--root', '--state', '--draft', '--hash'].includes(flag)) options[flag.slice(2)] = value;
    else fail(`Unknown option: ${flag}.`);
  }
  if (!['build', 'check', 'approve'].includes(command) || !options.root || !options.state) {
    fail('Usage: final-package.mjs build|check|approve --root ROOT --state STATE [--repo REPO ...] [--base BASE ...] [--draft DRAFT] [--hash SHA256] [--require-approval]');
  }
  const root = await realpath(options.root);
  const state = await realpath(options.state);
  if (path.dirname(state) !== path.join(root, 'make-it-work')) fail('State must be in ROOT/make-it-work/.');
  if (command === 'build') {
    if (!options.draft) fail('build requires --draft.');
    return build(root, state, options.repo, options.base, path.resolve(options.draft));
  }
  if (command === 'check') return checkFinalPackage(root, state, options.requireApproval);
  if (!options.hash || !/^[a-f0-9]{64}$/.test(options.hash)) fail('approve requires --hash SHA256.');
  return approve(root, state, options.hash);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((result) => console.log(JSON.stringify(result))).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
