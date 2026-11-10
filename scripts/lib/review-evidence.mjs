import { execFileSync, spawnSync } from 'node:child_process';
import { realpath } from 'node:fs/promises';
import path from 'node:path';
import { digest, fail, requireText } from './artifacts.mjs';

function git(root, args) {
  return execFileSync('git', ['-C', root, ...args], { maxBuffer: 100 * 1024 * 1024 });
}
function validPath(file) {
  if (typeof file !== 'string' || !file || path.isAbsolute(file) || file.split('/').includes('..') || /[\x00-\x1f]/.test(file)) fail('Invalid reviewed path.');
  return file;
}
export function pathDiffHash(root, base, file) {
  validPath(file);
  const literal = `:(literal)${file}`;
  const untracked = git(root, ['ls-files', '--others', '--exclude-standard', '-z', '--', literal]).length;
  if (!untracked) return digest(git(root, ['diff', '--binary', '--no-ext-diff', '--no-renames', base, '--', literal]));
  const diff = spawnSync('git', ['-C', root, 'diff', '--no-index', '--binary', '--no-ext-diff', '--', '/dev/null', file], { maxBuffer: 100 * 1024 * 1024 });
  if (diff.error) throw diff.error;
  if (![0, 1].includes(diff.status)) fail('Could not snapshot reviewed untracked path.');
  return digest(diff.stdout);
}
export function uiVerification(input) {
  if (input === undefined) return { status: 'pending', note: 'No browser verification was recorded.' };
  if (!input || !['passed', 'pending', 'not-applicable'].includes(input.status)) fail('Invalid UI verification status.');
  requireText(input.note, 'UI verification observation or reason');
  return { status: input.status, note: input.note };
}
export function validationNotes(input = []) {
  if (!Array.isArray(input)) fail('validation_notes must be an array.');
  return input.map(note => requireText(note, 'Validation qualification'));
}
export async function captureReviewEvidence(input, report) {
  const repos = [];
  const limitations = input.review_limitations ?? [];
  if (!Array.isArray(limitations)) fail('review_limitations must be an array.');
  for (const limitation of limitations) {
    if (!input.repo_roots || !Object.hasOwn(input.repo_roots, limitation.repo)) fail('Review limitation needs an approved repository.');
    if (!(input.review_scope ?? []).some(scope => scope.repo === limitation.repo)) fail('Review limitation needs a declared review scope.');
    if (!['skimmed', 'partial', 'not-reviewed'].includes(limitation.depth) || !Array.isArray(limitation.paths) || !limitation.paths.length) fail('Review limitation needs depth and affected paths.');
    limitation.paths.forEach(validPath); requireText(limitation.reason, 'Review limitation reason');
  }
  if (input.review_scope !== undefined && !Array.isArray(input.review_scope)) fail('review_scope must be an array.');
  if (input.review_scope?.length && input.working_tree !== true) fail('Recorded review scope currently requires working_tree: true.');
  for (const selected of input.review_scope ?? []) {
    if (!input.repo_roots || !Object.hasOwn(input.repo_roots, selected.repo)) fail('Review scope requires an explicit repo root.');
    if (!['branch', 'working-tree'].includes(selected.scope) || !Array.isArray(selected.paths)) fail('Invalid review scope.');
    const root = await realpath(input.repo_roots[selected.repo]);
    if (repos.some((repo) => repo.root === root)) fail('Duplicate reviewed repository.');
    requireText(selected.base, 'Review base');
    const head = git(root, ['rev-parse', 'HEAD']).toString().trim();
    const base = selected.scope === 'working-tree' ? head : git(root, ['merge-base', selected.base, head]).toString().trim();
    const paths = [...new Set(selected.paths.map(validPath))].sort();
    const repoLimitations = limitations.filter(item => item.repo === selected.repo);
    if (repoLimitations.some(item => item.paths.some(file => !paths.includes(file)))) fail('Review limitation paths must belong to the declared scope.');
    repos.push({ root, base, head, scope: selected.scope, paths: paths.map((file) => ({ path: file, diff_sha256: pathDiffHash(root, base, file) })),
      ...(repoLimitations.length ? { limitations: repoLimitations.map(({ depth, paths: limited, reason }) => ({ depth, paths: limited, reason })) } : {}) });
  }
  return { version: 1, ticket: input.ticket, report_sha256: digest(report), repos, ui_verification: uiVerification(input.ui_verification), validation_notes: validationNotes(input.validation_notes) };
}
export function compareReviewScope(evidence, repos) {
  return repos.map((repo) => {
    const reviewed = evidence?.repos?.find((item) => item.root === repo.path);
    const uncovered = repo.paths.filter((file) => {
      const saved = reviewed?.paths?.find((item) => item.path === file);
      return !saved || saved.diff_sha256 !== pathDiffHash(repo.path, repo.merge_base, file);
    });
    return { repo: repo.name, status: reviewed ? uncovered.length ? 'partial' : 'covered' : 'unknown', uncovered_paths: uncovered,
      ...(reviewed?.limitations?.length ? { limitations: reviewed.limitations } : {}) };
  });
}
export function reviewDisclosure(scope, ui, notes = []) {
  return ['Review applies to the recorded scope only.',
    ...scope.map((repo) => `Review scope — ${repo.repo}: ${repo.status}${repo.uncovered_paths.length ? `; delivered paths without matching review evidence: ${repo.uncovered_paths.join(', ')}` : ''}.`),
    ...scope.flatMap(repo => (repo.limitations ?? []).map(item => `Review qualification — ${repo.repo}: ${item.depth}; ${item.paths.join(', ')} — ${item.reason}`)),
    ...validationNotes(notes).map(note => `Validation qualification — ${note}`),
    `Browser verification: ${ui.status} — ${ui.note}`].join('\n');
}
