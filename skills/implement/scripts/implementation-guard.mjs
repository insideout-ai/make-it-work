import { artifactJoin } from '../../../scripts/lib/artifact-path.mjs';
// Evidence for fresh-run stage enforcement; never changes the product worktree.
import { execFileSync } from 'node:child_process';
import { readFile } from '../../../scripts/lib/artifact-io.mjs';
import { lstat, readlink, realpath } from 'node:fs/promises';
import path from 'node:path';
import { declaredStub, declaredTest, dedicatedTestFile, draftPlanPath, fileImage, planningReceiptPath, STUB_MARKER, STUB_MAX_LINES } from './planning-tests.mjs';
import { parseSteps } from '../../../scripts/lib/plan.mjs';
import { digest, fail, within } from '../../../scripts/lib/artifacts.mjs';

const paths = ['.', ':!make-it-work', ':!.claude', ':!docs', ':(exclude,glob)**/*.md'];
const exact = (file) => `:(literal)${file}`;
const git = (root, args) => execFileSync('git', ['-C', root, ...args], { maxBuffer: 100 * 1024 * 1024 });
export async function implementationBaseline(roots) {
  return Promise.all(roots.map(async (directory) => {
    const root = await realpath(directory);
    const files = git(root, ['ls-files', '--others', '--exclude-standard', '-z', '--', ...paths]).toString().split('\0').filter(Boolean).sort();
    const untracked = [];
    for (const file of files) {
      const absolute = artifactJoin(root, file);
      const info = await lstat(absolute);
      untracked.push([file, info.mode & 0o777, digest(info.isSymbolicLink() ? await readlink(absolute) : await readFile(absolute))]);
    }
    const tracked = git(root, ['diff', '--name-only', '--no-renames', '-z', 'HEAD', '--', ...paths]).toString().split('\0').filter(Boolean);
    const changes = [];
    for (const file of tracked) {
      let image = null, directory = false;
      try {
        const info = await lstat(artifactJoin(root, file));
        directory = info.isDirectory();
        if (info.isFile() || info.isSymbolicLink()) image = { mode: info.mode & 0o111, sha256: digest(info.isSymbolicLink() ? await readlink(artifactJoin(root, file)) : await readFile(artifactJoin(root, file))) };
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
      changes.push({ file, image, signature: directory ? digest(git(root, ['diff', '--binary', '--no-ext-diff', '--no-renames', 'HEAD', '--', exact(file)])) : digest(JSON.stringify({ tracked: true, image })) });
    }
    for (const [file, mode, sha256] of untracked) changes.push({ file, image: { mode: mode & 0o111, sha256 }, signature: digest(JSON.stringify([file, mode, sha256])) });
    changes.sort((a, b) => a.file.localeCompare(b.file));
    return { root, changes, branch: git(root, ['symbolic-ref', '--short', 'HEAD']).toString().trim(), head: git(root, ['rev-parse', 'HEAD']).toString().trim(),
      fingerprint: digest(Buffer.concat([git(root, ['diff', '--binary', '--no-ext-diff', 'HEAD', '--', ...paths]), Buffer.from(JSON.stringify(untracked))])) };
  }));
}

// Only an exact, explicitly approved branch advance may replace the guard's
// commit baseline. Workspace acceptance alone never authorizes application edits.
export async function acceptBranchBaseline(fields, requested, roots, eventId) {
  if (!fields.implementation_baseline) fail('This legacy run has no saved branch baseline; start a new run rather than resetting its guard.');
  const saved = JSON.parse(fields.implementation_baseline);
  if (saved.version !== 1 || saved.runId !== fields.start_time || !Array.isArray(saved.repos)) fail('Invalid saved branch baseline.');
  if (!Array.isArray(requested) || requested.length !== saved.repos.length || roots.length !== saved.repos.length) fail('Approved branch baseline must name every saved repository exactly once.');
  requested = await Promise.all(requested.map(async item => ({ ...item, root: await realpath(item.root) })));
  const current = await implementationBaseline(roots);
  const named = new Set();
  for (const repo of current) {
    const prior = saved.repos.find(item => item.root === repo.root);
    const approval = requested.find(item => item.root === repo.root);
    if (!prior || !approval || named.has(approval.root) || approval.from_head !== prior.head || approval.to_head !== repo.head || approval.branch !== repo.branch) fail('Approved branch baseline differs from the saved or current repository target.');
    named.add(approval.root);
    if (JSON.stringify(repo.changes) !== JSON.stringify(prior.changes)) fail('Cannot accept a branch baseline with changed local application edits; preserve and reconcile them first.');
    try { git(repo.root, ['merge-base', '--is-ancestor', prior.head, repo.head]); }
    catch { fail('Approved branch baseline must be a fast-forward from the saved commit.'); }
  }
  if (named.size !== requested.length) fail('Approved branch baseline contains duplicate repositories.');
  return { ...saved, repos: saved.repos.map(prior => current.find(repo => repo.root === prior.root)), event_id: eventId };
}

async function originalImage(repo, file) {
  const changed = repo.changes.find((entry) => entry.file === file);
  if (changed) return changed.image;
  const record = git(repo.root, ['ls-tree', '-z', repo.head, '--', exact(file)]).toString().split('\0')[0];
  if (!record) return null;
  const mode = parseInt(record.split(' ')[0], 8) & 0o111;
  return { mode, git_blob: record.split(' ')[2].split('\t')[0] };
}
// Returns the receipt-authorized paths per repo, or null when no valid receipt applies.
async function authorizedPlanningPaths(initialized, state, baseline) {
  const f = state.fields;
  if (!initialized.state || (f.adaptive_version === '1' && f.mode !== 'tdd') || !(f.test_writing_version === '1' ? ['write-tests'] : ['plan', 'plan-approval']).includes(f.phase) || baseline.some((repo) => !Array.isArray(repo.changes))) return null;
  try {
    const info = await lstat(planningReceiptPath(initialized.state));
    if (!info.isFile()) return null;
    const receipt = JSON.parse(await readFile(planningReceiptPath(initialized.state), 'utf8'));
    if (receipt.version !== 1 || receipt.ticket !== f.ticket || receipt.start_time !== f.start_time || receipt.plan_version !== f.plan_version || receipt.spec_hash !== f.spec_hash || !Array.isArray(receipt.entries) || !receipt.entries.length) return null;
    const artifactRoot = path.dirname(path.dirname(path.dirname(initialized.state)));
    const plan = await within(artifactRoot, path.relative(artifactRoot, draftPlanPath(initialized.state, f)));
    if (digest(await readFile(await within(artifactRoot, f.spec))) !== f.spec_hash) return null;
    const steps = parseSteps(await readFile(plan, 'utf8'));
    const excluded = new Map(baseline.map((repo) => [repo.root, new Set()]));
    for (const entry of receipt.entries) {
      const repo = baseline.find((repo) => repo.root === entry.repo);
      if (!repo || !Number.isSafeInteger(entry.step) || entry.step < 1 || !entry.reason?.trim()) return null;
      if (entry.kind === 'stub' ? !declaredStub(steps, entry.step, entry.file) : !declaredTest(steps, entry.step, entry.file)) return null;
      const { image, bytes } = await fileImage(repo.root, entry.file);
      const original = await originalImage(repo, entry.file);
      const matchesBefore = original === null ? entry.before === null : entry.before && original.mode === entry.before.mode && (original.sha256 ? original.sha256 === entry.before.sha256 : original.git_blob === entry.before.git_blob);
      if (!matchesBefore) return null;
      if (!image) {
        // Authorized up front but not written yet: nothing changed at this path.
        if (entry.before !== null || !['test-file', 'stub'].includes(entry.kind)) return null;
        excluded.get(repo.root).add(entry.file);
        continue;
      }
      if (entry.before && image.mode !== entry.before.mode) return null;
      const region = () => {
        if (!entry.before || !entry.region || typeof entry.region.prefix !== 'string' || typeof entry.region.suffix !== 'string') return null;
        const prefix = Buffer.from(entry.region.prefix, 'base64'), suffix = Buffer.from(entry.region.suffix, 'base64');
        if (bytes.length < prefix.length + suffix.length || !bytes.subarray(0, prefix.length).equals(prefix) || !bytes.subarray(bytes.length - suffix.length).equals(suffix)) return null;
        return { prefix, suffix, body: bytes.subarray(prefix.length, bytes.length - suffix.length) };
      };
      if (entry.kind === 'embedded') {
        const bounded = region();
        if (!bounded || (!bounded.prefix.length && !bounded.suffix.length)) return null;
      } else if (entry.kind === 'stub') {
        // Only a marked, bounded placeholder; production bytes outside it stay unchanged.
        const body = entry.before ? region()?.body : bytes;
        if (!body || !body.toString('utf8').includes(STUB_MARKER) || body.toString('utf8').split('\n').length > STUB_MAX_LINES) return null;
      } else if (entry.kind !== 'test-file' || !await dedicatedTestFile(repo.root, entry.file, baseline.map((item) => item.root))) return null;
      excluded.get(repo.root).add(entry.file);
    }
    return excluded;
  } catch { return null; } // Missing, malformed or stale evidence never releases the guard.
}

// Paths whose state differs from the startup baseline, minus receipt-authorized ones.
function changedPaths(baseline, current, excluded) {
  const changed = [];
  for (const [index, repo] of current.entries()) {
    const prior = baseline[index];
    const skip = excluded?.get(repo.root) ?? new Set();
    if (repo.head !== prior.head) changed.push(`${repo.root}: new commit ${repo.head.slice(0, 12)}`);
    if (!Array.isArray(repo.changes) || !Array.isArray(prior.changes)) continue;
    const before = new Map(prior.changes.map((entry) => [entry.file, entry.signature]));
    const after = new Map(repo.changes.map((entry) => [entry.file, entry.signature]));
    for (const file of new Set([...before.keys(), ...after.keys()])) {
      if (!skip.has(file) && before.get(file) !== after.get(file)) changed.push(path.join(repo.root, file));
    }
  }
  return changed.sort();
}

const PRE_IMPLEMENTATION = new Set(['context-check', 'close-the-gaps', 'spec-approval', 'plan', 'plan-approval', 'write-tests']);
export async function prematureImplementation(initialized, state) {
  const fields = state.fields;
  if (state.audit.some((row) => ['execute', 'lightweight'].includes(row.to))) return null;
  if (!initialized.implementation_baseline || !PRE_IMPLEMENTATION.has(fields.phase)) return null;
  let baseline = initialized.implementation_baseline;
  if (fields.implementation_baseline) {
    try {
      const saved = JSON.parse(fields.implementation_baseline);
      const rootsMatch = Array.isArray(saved.repos) && saved.repos.length === baseline.length &&
        saved.repos.every((repo, index) => repo.root === baseline[index].root && /^[a-f0-9]{40,64}$/.test(repo.head) && Array.isArray(repo.changes));
      if (saved.version !== 1 || saved.runId !== fields.start_time || saved.origin_hash !== digest(JSON.stringify(baseline)) || !rootsMatch) return 'Application files changed or implementation baseline binding is invalid; inspect the saved run.';
      if (saved.event_id && state.audit.some(row => row.outcome?.includes(`[workflow-event: ${saved.event_id};`))) baseline = saved.repos;
    } catch { return 'Application files changed or implementation baseline is unreadable; inspect the saved run.'; }
  }
  const current = await implementationBaseline(baseline.map((repo) => repo.root));
  if (current.every((repo, i) => repo.head === baseline[i].head && repo.fingerprint === baseline[i].fingerprint)) return null;
  const authorized = await authorizedPlanningPaths(initialized, state, baseline);
  const changed = changedPaths(baseline, current, authorized);
  if (authorized && !changed.length) return null;
  const shown = changed.slice(0, 10).join(', ') + (changed.length > 10 ? `, and ${changed.length - 10} more` : '');
  return `Application files changed before an authorized implementation stage (saved phase: ${fields.phase})${changed.length ? `: ${shown}` : ''}. Preserve the local edits; do not commit, discard them, or claim completion. Continue the required refinement, risk assessment, approved implementation route and independent review. Recording Stopped because stages were bypassed does not complete recovery. If an external blocker prevents recovery, report the violation explicitly and ask the user how to proceed.`;
}
