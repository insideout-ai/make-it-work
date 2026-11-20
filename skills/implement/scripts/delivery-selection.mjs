// Optional whole-file delivery candidates. Source packages remain immutable.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const hash = value => createHash('sha256').update(value).digest('hex');
const fail = message => { throw new Error(message); };
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const keys = (value, allowed) => object(value) && Object.keys(value).every(key => allowed.includes(key));
function git(repo, args) {
  const result = spawnSync('git', ['-C', repo, ...args], { maxBuffer: 100 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) fail(`Cannot inspect delivery candidate: ${result.stderr.toString('utf8').trim()}`);
  return result.stdout;
}
const paths = bytes => bytes.toString('utf8').split('\0').filter(Boolean).sort();
const diffPaths = (repo, before, after) => paths(git(repo, ['diff', '--name-only', '--no-renames', '-z', before, after, '--']));
const diff = (repo, before, after) => git(repo, ['diff', '--binary', '--no-ext-diff', '--no-renames', before, after, '--']);

export const CANDIDATE_ASSURANCE = 'Review and test evidence belongs to the full source package. This selected candidate has not been separately reviewed or tested; passing source-tree checks do not establish that omitted dependencies are unnecessary. Existing correctness requirements still apply.';

export function parseSelection(input, pkg) {
  if (!keys(input, ['version', 'repos', 'draft']) || input.version !== 1 || !Array.isArray(input.repos) || !input.repos.length) {
    fail('Selection requires version: 1, a nonempty repos array and a scope-accurate draft.');
  }
  if (!keys(input.draft, ['commit_message', 'pr_title', 'pr_description'])
      || ['commit_message', 'pr_title', 'pr_description'].some(key => typeof input.draft[key] !== 'string' || !input.draft[key].trim())) {
    fail('Selection draft requires commit_message, pr_title and pr_description.');
  }
  const seen = new Set();
  const repos = input.repos.map(item => {
    if (!keys(item, ['name', 'paths']) || typeof item.name !== 'string' || seen.has(item.name)) fail('Selection repository names must be unique.');
    seen.add(item.name);
    const matches = pkg.repos.filter(repo => repo.name === item.name);
    if (matches.length !== 1) fail(`Selection must name an unambiguous package repository: ${item.name}`);
    if (!Array.isArray(item.paths) || !item.paths.length || new Set(item.paths).size !== item.paths.length
        || item.paths.some(file => typeof file !== 'string' || !matches[0].paths.includes(file))) {
      fail(`Select nonempty, unique, exact package file paths in ${item.name}; omit a repository to leave it out.`);
    }
    return { ...matches[0], paths: [...item.paths].sort() };
  });
  // Package order keeps operation order stable regardless of selection-file ordering.
  const order = new Map(pkg.repos.map((repo, index) => [repo.name, index]));
  repos.sort((a, b) => order.get(a.name) - order.get(b.name));
  return { repos, draft: input.draft, omitted_repos: pkg.repos.filter(repo => !seen.has(repo.name)).map(repo => repo.name) };
}

export function candidateScope(original, selectedPaths, tree) {
  if (typeof tree !== 'string' || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(tree)) fail('Candidate tree must be a Git object ID.');
  const repo = original.path;
  const commitDiff = diff(repo, original.head, tree);
  const branchDiff = diff(repo, original.merge_base, tree);
  const branchPaths = diffPaths(repo, original.merge_base, tree);
  const inherited = git(repo, ['rev-list', '--reverse', `${original.merge_base}..${original.head}`]).toString('utf8').trim();
  return {
    scope: {
      base_sha: original.base_sha, merge_base: original.merge_base,
      commit_paths: diffPaths(repo, original.head, tree),
      omitted_package_paths: original.paths.filter(file => !selectedPaths.includes(file)),
      branch_paths: branchPaths,
      outside_package_paths: branchPaths.filter(file => !original.paths.includes(file)),
      inherited_paths: diffPaths(repo, original.merge_base, original.head),
      inherited_commits: inherited ? inherited.split('\n') : [],
      commit_diff_sha256: hash(commitDiff), branch_diff_sha256: hash(branchDiff),
    }, branchDiff,
  };
}

export function omittedLocalPaths(original, selectedPaths) {
  const tracked = paths(git(original.path, ['diff', '--name-only', '--no-renames', '-z', original.head, '--', '.', ':(exclude)make-it-work']));
  const untracked = paths(git(original.path, ['ls-files', '--others', '--exclude-standard', '-z', '--', '.', ':(exclude)make-it-work']));
  return [...new Set([...tracked, ...untracked])].filter(file => !selectedPaths.includes(file)).sort();
}

const list = items => items.length ? items.map(item => `- ${JSON.stringify(item)}`) : ['- None'];
export function selectionDisclosure(repos, omittedRepos) {
  return ['## Selected delivery assurance', '', CANDIDATE_ASSURANCE, '',
    ...repos.map(repo => `${repo.name}: selected new-commit paths ${JSON.stringify(repo.selection.commit_paths)}; resulting branch-to-base paths ${JSON.stringify(repo.selection.branch_paths)}; inherited commits ${repo.selection.inherited_commits.length}.`), '',
    `Omitted repositories: ${JSON.stringify(omittedRepos)}.`, '',
    '## Full source-package review and browser verification', '', ''].join('\n');
}

export function selectionPreview(plan) {
  const lines = ['## Selected delivery scope', '', CANDIDATE_ASSURANCE, '',
    'Omitted repositories:', ...list(plan.selection.omitted_repos), '',
    'Whole files are selected for the new commit. Pushing publishes the branch history too; omitted committed work remains reachable. Removing history requires a separately approved branch/worktree operation.', ''];
  for (const repo of plan.repos) {
    const scope = repo.selection;
    lines.push(`### ${repo.name} — candidate`, '', `Candidate tree: \`${repo.target_tree}\``,
      `Comparison base: \`${scope.base_sha}\`; merge point: \`${scope.merge_base}\``, '',
      'Selected paths:', ...list(repo.paths), '',
      'Actual new-commit changes (renames shown as delete/add):', ...list(scope.commit_paths), '',
      'Omitted local changes — retained in the checkout:', ...list(scope.omitted_local_paths), '',
      'Omitted source-package paths — existing committed content may remain on the branch:', ...list(scope.omitted_package_paths), '',
      'Resulting branch-to-base paths:', ...list(scope.branch_paths), '',
      'Resulting paths outside the source package net diff:', ...list(scope.outside_package_paths), '',
      'Inherited branch paths:', ...list(scope.inherited_paths), '',
      'Inherited commits reachable from the branch:', ...list(scope.inherited_commits), '',
      `Exact candidate branch diff: [${scope.branch_diff_file}](${encodeURIComponent(scope.branch_diff_file)})`,
      `Diff SHA-256: \`${scope.branch_diff_sha256}\``, '');
  }
  return lines.join('\n');
}
