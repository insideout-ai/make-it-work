// Evidence for fresh-run stage enforcement; never changes the product worktree.
import { execFileSync } from 'node:child_process';
import { lstat, readFile, readlink, realpath } from 'node:fs/promises';
import path from 'node:path';
import { declaredTest, dedicatedTestFile, draftPlanPath, fileImage, planningReceiptPath } from './planning-tests.mjs';
import { parseSteps } from '../../../scripts/lib/plan.mjs';
import { digest, within } from '../../../scripts/lib/artifacts.mjs';

const paths = ['.', ':!make-it-work', ':!.claude', ':!docs', ':(exclude,glob)**/*.md'];
const exact = (file) => `:(literal)${file}`;
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
    const tracked = git(root, ['diff', '--name-only', '--no-renames', '-z', 'HEAD', '--', ...paths]).toString().split('\0').filter(Boolean);
    const changes = [];
    for (const file of tracked) {
      let image = null, directory = false;
      try {
        const info = await lstat(path.join(root, file));
        directory = info.isDirectory();
        if (info.isFile() || info.isSymbolicLink()) image = { mode: info.mode & 0o111, sha256: digest(info.isSymbolicLink() ? await readlink(path.join(root, file)) : await readFile(path.join(root, file))) };
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
      changes.push({ file, image, signature: directory ? digest(git(root, ['diff', '--binary', '--no-ext-diff', '--no-renames', 'HEAD', '--', exact(file)])) : digest(JSON.stringify({ tracked: true, image })) });
    }
    for (const [file, mode, sha256] of untracked) changes.push({ file, image: { mode: mode & 0o111, sha256 }, signature: digest(JSON.stringify([file, mode, sha256])) });
    changes.sort((a, b) => a.file.localeCompare(b.file));
    return { root, changes, head: git(root, ['rev-parse', 'HEAD']).toString().trim(),
      fingerprint: digest(Buffer.concat([git(root, ['diff', '--binary', '--no-ext-diff', 'HEAD', '--', ...paths]), Buffer.from(JSON.stringify(untracked))])) };
  }));
}

async function originalImage(repo, file) {
  const changed = repo.changes.find((entry) => entry.file === file);
  if (changed) return changed.image;
  const record = git(repo.root, ['ls-tree', '-z', repo.head, '--', exact(file)]).toString().split('\0')[0];
  if (!record) return null;
  const mode = parseInt(record.split(' ')[0], 8) & 0o111;
  return { mode, git_blob: record.split(' ')[2].split('\t')[0] };
}
async function authorizedPlanningChanges(initialized, state, baseline, current) {
  const f = state.fields;
  if (!initialized.state || (f.adaptive_version === '1' && f.mode !== 'tdd') || !['plan', 'plan-approval'].includes(f.phase) || baseline.some((repo) => !Array.isArray(repo.changes))) return false;
  try {
    const info = await lstat(planningReceiptPath(initialized.state));
    if (!info.isFile()) return false;
    const receipt = JSON.parse(await readFile(planningReceiptPath(initialized.state), 'utf8'));
    if (receipt.version !== 1 || receipt.ticket !== f.ticket || receipt.start_time !== f.start_time || receipt.plan_version !== f.plan_version || receipt.spec_hash !== f.spec_hash || !Array.isArray(receipt.entries) || !receipt.entries.length) return false;
    const artifactRoot = path.dirname(path.dirname(path.dirname(initialized.state)));
    const plan = await within(artifactRoot, path.relative(artifactRoot, draftPlanPath(initialized.state, f)));
    if (digest(await readFile(await within(artifactRoot, f.spec))) !== f.spec_hash) return false;
    const steps = parseSteps(await readFile(plan, 'utf8'));
    const excluded = new Map(baseline.map((repo) => [repo.root, new Set()]));
    for (const entry of receipt.entries) {
      const repo = baseline.find((repo) => repo.root === entry.repo);
      if (!repo || !Number.isSafeInteger(entry.step) || entry.step < 1 || !entry.reason?.trim() || !declaredTest(steps, entry.step, entry.file)) return false;
      const { image, bytes } = await fileImage(repo.root, entry.file);
      const original = await originalImage(repo, entry.file);
      const matchesBefore = original === null ? entry.before === null : entry.before && original.mode === entry.before.mode && (original.sha256 ? original.sha256 === entry.before.sha256 : original.git_blob === entry.before.git_blob);
      if (!image || !matchesBefore) return false;
      if (entry.before && image.mode !== entry.before.mode) return false;
      if (entry.kind === 'embedded') {
        if (!entry.before || !entry.region || typeof entry.region.prefix !== 'string' || typeof entry.region.suffix !== 'string') return false;
        const prefix = Buffer.from(entry.region.prefix, 'base64'), suffix = Buffer.from(entry.region.suffix, 'base64');
        if ((!prefix.length && !suffix.length) || bytes.length < prefix.length + suffix.length || !bytes.subarray(0, prefix.length).equals(prefix) || !bytes.subarray(bytes.length - suffix.length).equals(suffix)) return false;
      } else if (entry.kind !== 'test-file' || !await dedicatedTestFile(repo.root, entry.file, baseline.map((item) => item.root))) return false;
      excluded.get(repo.root).add(entry.file);
    }
    return current.every((repo, index) => repo.head === baseline[index].head && JSON.stringify(repo.changes.filter((entry) => !excluded.get(repo.root).has(entry.file))) === JSON.stringify(baseline[index].changes.filter((entry) => !excluded.get(repo.root).has(entry.file))));
  } catch { return false; } // Missing, malformed or stale evidence never releases the guard.
}

const PRE_IMPLEMENTATION = new Set(['context-check', 'close-the-gaps', 'spec-approval', 'plan', 'plan-approval']);
export async function prematureImplementation(initialized, state) {
  const fields = state.fields;
  if (state.audit.some((row) => ['execute', 'lightweight'].includes(row.to))) return null;
  if (!initialized.implementation_baseline || !PRE_IMPLEMENTATION.has(fields.phase)) return null;
  const baseline = initialized.implementation_baseline;
  const current = await implementationBaseline(baseline.map((repo) => repo.root));
  if (current.every((repo, i) => repo.head === baseline[i].head && repo.fingerprint === baseline[i].fingerprint)) return null;
  if (await authorizedPlanningChanges(initialized, state, baseline, current)) return null;
  return `Application files changed before an authorized implementation stage (saved phase: ${fields.phase}). Preserve the local edits; do not commit, discard them, or claim completion. Continue the required refinement, risk assessment, approved implementation route and independent review. Recording Stopped because stages were bypassed does not complete recovery. If an external blocker prevents recovery, report the violation explicitly and ask the user how to proceed.`;
}
