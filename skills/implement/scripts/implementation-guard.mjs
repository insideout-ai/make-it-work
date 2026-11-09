// Evidence for fresh-run stage enforcement; never changes the product worktree.
import { execFileSync } from 'node:child_process';
import { lstat, readFile, readlink, realpath } from 'node:fs/promises';
import path from 'node:path';
import { digest } from '../../../scripts/lib/artifacts.mjs';

const paths = ['.', ':!make-it-work', ':!.claude', ':!docs', ':(exclude,glob)**/*.md'];
const git = (root, args) => execFileSync('git', ['-C', root, ...args], { maxBuffer: 100 * 1024 * 1024 });
export async function implementationBaseline(roots) {
  return Promise.all(roots.map(async (directory) => {
    const root = await realpath(directory);
    const files = git(root, ['ls-files', '--others', '--exclude-standard', '-z', '--', ...paths]).toString().split('\0').filter(Boolean).sort();
    const untracked = [];
    for (const file of files) {
      const absolute = path.join(root, file);
      const info = await lstat(absolute);
      untracked.push([file, info.mode & 0o777, digest(info.isSymbolicLink() ? await readlink(absolute) : await readFile(absolute))]);
    }
    return { root, head: git(root, ['rev-parse', 'HEAD']).toString().trim(),
      fingerprint: digest(Buffer.concat([git(root, ['diff', '--binary', '--no-ext-diff', 'HEAD', '--', ...paths]), Buffer.from(JSON.stringify(untracked))])) };
  }));
}

const PRE_IMPLEMENTATION = new Set(['context-check', 'close-the-gaps', 'spec-approval', 'plan', 'plan-approval']);
export async function prematureImplementation(initialized, state) {
  const fields = state.fields;
  if (state.audit.some((row) => ['execute', 'lightweight'].includes(row.to))) return null;
  if (!initialized.implementation_baseline || !PRE_IMPLEMENTATION.has(fields.phase)) return null;
  const baseline = initialized.implementation_baseline;
  const current = await implementationBaseline(baseline.map((repo) => repo.root));
  if (JSON.stringify(current) === JSON.stringify(baseline)) return null;
  return `Application files changed before an authorized implementation stage (saved phase: ${fields.phase}). Preserve the local edits; do not commit, discard them, or claim completion. Continue the required refinement, risk assessment, approved implementation route and independent review. Recording Stopped because stages were bypassed does not complete recovery. If an external blocker prevents recovery, report the violation explicitly and ask the user how to proceed.`;
}
