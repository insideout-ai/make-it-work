import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { digest } from '../../../scripts/lib/artifacts.mjs';
import { writeReview } from '../../../scripts/review-report.mjs';
import { prepareReviewScope, checkReviewScope, deliverySnapshots } from './review-scope.mjs';
import { applyWorkflow, transition } from './workflow.mjs';
import { parseState } from './render-status.mjs';

const git = (root, ...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
async function fixture(t) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'delivery-review-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  git(root, 'init', '-qb', 'main'); git(root, 'config', 'user.name', 'Test'); git(root, 'config', 'user.email', 'test@example.invalid');
  await mkdir(path.join(root, 'src')); await writeFile(path.join(root, 'src/code.js'), 'export const count = 0;\n');
  await writeFile(path.join(root, '.gitignore'), 'make-it-work/\n'); git(root, 'add', '.'); git(root, 'commit', '-qm', 'Baseline'); git(root, 'switch', '-qc', 'feature');
  await writeFile(path.join(root, 'src/code.js'), 'export const count = 1;\n'); git(root, 'add', '.'); git(root, 'commit', '-qm', 'Earlier branch work');
  await writeFile(path.join(root, 'src/code.js'), 'export const count = 1;\nexport const extra = 2;\n');
  const dir = path.join(root, 'make-it-work/DEMO'); await mkdir(dir, { recursive: true });
  const fields = { ticket: 'DEMO', handoff_version: '1', controller_version: '1', final_package_version: '1', review_scope_version: '1',
    status: 'In Progress', phase: 'review', autonomy: 'autonomous', start_time: '2026-01-01T10:00:00Z',
    execution_mode: 'inline', inline_pause_mode: 'run-straight-through', spec: 'make-it-work/DEMO/DEMO-spec.md', spec_hash: 'spec',
    plan: 'make-it-work/DEMO/DEMO-plan.md', plan_version: '1', plan_hash: 'plan', execution: 'passed', review: 'not-started', review_cycle: '1',
    fix_cycle: '0', fix_plan_round_steps: 'none', fix_plan_dispatch: 'none', replans_used: '0', gate: 'full-suite', pause_reason: 'none',
    branch: 'feature', base: 'main', head: git(root, 'rev-parse', 'HEAD'), worktree_fingerprint: 'fingerprint',
    execute_report: 'make-it-work/DEMO/DEMO-execute.md', context_updated: 'none', current_activity: 'none', real_rows_from: '1',
    workspace_snapshot: JSON.stringify([{ root, branch: 'feature' }]) };
  const statePath = path.join(dir, 'DEMO-state.md');
  await writeFile(statePath, `# Workflow state — DEMO\n\n\`\`\`\n${Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join('\n')}\n\`\`\`\n\n## Known regressions\n\nNone\n\n## Decided findings\n\nNone\n\n## Context discoveries\n\nNone\n\n## Audit log\n\n| # | Time | From | To | Outcome / reason |\n| --- | --- | --- | --- | --- |\n| 1 | 2026-01-01T10:00:00Z | execute | review | Execution passed |\n`);
  for (const name of ['spec', 'plan', 'execute']) await writeFile(path.join(dir, `DEMO-${name}.md`), `# ${name}\n`);
  const input = () => ({ version: 1, ticket: 'DEMO', branch: 'feature', commit: git(root, 'rev-parse', 'HEAD'), working_tree: true,
    coverage: 'The entire branch-to-base delivery diff was inspected.', findings: [], repo_roots: { app: root },
    review_scope: [{ repo: 'app', base: 'main', scope: 'branch', paths: ['src/code.js'] }],
    ui_verification: { status: 'not-applicable', note: 'Only backend code and documentation.' },
    implement: { handoff_version: 1, plan_version: 1, review_cycle: 1, review_scope_version: 1 } });
  let id = 0;
  const apply = async (event, extra = {}) => applyWorkflow({ root, statePath, input: { event, id: `scope-${++id}`, repos: [root], expected_hash: digest(await readFile(statePath, 'utf8')), ...extra } });
  return { root, dir, statePath, input, apply };
}

test('review cannot silently narrow a full delivery target to HEAD or omit earlier work', async (t) => {
  const f = await fixture(t);
  const target = await prepareReviewScope(f.root, f.statePath);
  const input = { ...f.input(), review_target: target.review_target, review_target_sha256: target.sha256 };
  input.review_scope[0].scope = 'working-tree';
  await assert.rejects(writeReview(f.root, input), /full delivery diff/);
  await assert.rejects(readFile(path.join(f.dir, 'DEMO-review.md')), { code: 'ENOENT' });
  input.review_scope[0].scope = 'branch'; input.review_scope[0].paths = [];
  await assert.rejects(writeReview(f.root, input), /full delivery diff/);
  input.review_scope[0].paths = ['src/code.js'];
  const review = await writeReview(f.root, input);
  assert.equal(review.outcome, 'CLEAN'); assert.equal((await checkReviewScope(f.root, f.statePath)).covered, true);
  const proof = JSON.parse(await readFile(path.join(f.dir, 'DEMO-review-evidence.json'), 'utf8'));
  assert.equal(proof.delivery_target.sha256, target.sha256);
  proof.repos[0].scope = 'working-tree';
  await writeFile(path.join(f.dir, 'DEMO-review-evidence.json'), JSON.stringify(proof));
  await assert.rejects(checkReviewScope(f.root, f.statePath), /not fully reviewed/);
});

test('staged, untracked, binary and deleted changes share the review/package snapshot; drift invalidates the target', async (t) => {
  const f = await fixture(t);
  await writeFile(path.join(f.root, 'new.bin'), Buffer.from([0, 1, 255]));
  await rm(path.join(f.root, 'src/code.js')); git(f.root, 'add', 'src/code.js');
  const target = await prepareReviewScope(f.root, f.statePath);
  assert.deepEqual(target.repos[0].paths, ['new.bin', 'src/code.js']);
  const input = { ...f.input(), review_target: target.review_target, review_target_sha256: target.sha256 }; input.review_scope[0].paths = target.repos[0].paths;
  await writeReview(f.root, input); assert.equal((await checkReviewScope(f.root, f.statePath)).covered, true);
  await writeFile(path.join(f.root, 'new.bin'), Buffer.from([0, 2, 255]));
  await assert.rejects(checkReviewScope(f.root, f.statePath), /not fully reviewed/);
  await assert.rejects(writeReview(f.root, input), /changed during review/);
});

test('clean handoffs require target evidence; final-sync changes route back to review without charging a fix', async (t) => {
  const f = await fixture(t);
  const target = await prepareReviewScope(f.root, f.statePath);
  const review = await writeReview(f.root, { ...f.input(), review_target: target.review_target, review_target_sha256: target.sha256 });
  const proofPath = path.join(f.dir, 'DEMO-review-evidence.json');
  const proof = await readFile(proofPath, 'utf8'); const omitted = JSON.parse(proof); delete omitted.delivery_target;
  await writeFile(proofPath, JSON.stringify(omitted));
  await assert.rejects(f.apply('handoff', { handoff: review.handoff }), /delivery-bound scope evidence/);
  await writeFile(proofPath, proof);
  assert.equal((await f.apply('handoff', { handoff: review.handoff })).fields.phase, 'final-sync');
  await writeFile(path.join(f.root, 'CLAUDE.md'), '# Final context sync\n');
  const syncInput = { event: 'sync-complete', id: 'sync-docs', repos: [f.root], expected_hash: digest(await readFile(f.statePath, 'utf8')), context_updated: ['CLAUDE.md'], delivery_scope_changed: false };
  const sync = await applyWorkflow({ root: f.root, statePath: f.statePath, input: syncInput });
  assert.equal(sync.fields.phase, 'review'); assert.equal(sync.next_action.phase, 'review'); assert.equal(sync.fields.review_cycle, '2'); assert.equal(sync.fields.fix_cycle, '0');
  assert.equal(sync.fields.context_updated, 'CLAUDE.md'); assert.equal(syncInput.delivery_scope_changed, false);
  assert.equal((await applyWorkflow({ root: f.root, statePath: f.statePath, input: syncInput })).replayed, true);
  const updated = await prepareReviewScope(f.root, f.statePath);
  const input = { ...f.input(), review_target: updated.review_target, review_target_sha256: updated.sha256 }; input.implement.review_cycle = 2; input.review_scope[0].paths = updated.repos[0].paths;
  const second = await writeReview(f.root, input);
  assert.equal((await f.apply('handoff', { handoff: second.handoff })).fields.phase, 'final-sync');
  assert.equal((await f.apply('sync-complete', { context_updated: [] })).fields.phase, 'final-approval');
  assert.equal((await checkReviewScope(f.root, f.statePath)).covered, true);
  const draft = path.join(f.dir, 'DEMO-final-draft.json');
  await writeFile(draft, JSON.stringify({ commit_message: 'Feature', pr_title: 'Feature', pr_description: 'Full delivered scope reviewed.' }));
  const script = new URL('./final-package.mjs', import.meta.url).pathname;
  const build = (...extra) => JSON.parse(execFileSync(process.execPath, [script, 'build', '--root', f.root, '--state', f.statePath, '--draft', draft, '--repo', f.root, ...extra], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  const built = build();
  const pkg = JSON.parse(await readFile(built.json, 'utf8'));
  assert.equal(pkg.review_scope[0].status, 'covered');
  assert.ok(pkg.evidence.review_target); assert.ok(pkg.evidence.review_target_diff_0);
  assert.equal(pkg.repos[0].diff_sha256, JSON.parse(await readFile(path.join(f.root, updated.review_target), 'utf8')).repos[0].diff_sha256);
  assert.throws(() => build('--base', 'feature'), /repositories or bases differ/);
  await assert.rejects(f.apply('refresh-review'), /already reviewed/);
  await writeFile(path.join(f.root, 'CLAUDE.md'), '# Changed after review\n');
  assert.throws(() => build(), /not fully reviewed/);
  const refresh = await f.apply('refresh-review'); assert.equal(refresh.fields.phase, 'review');
  assert.equal(refresh.fields.review_cycle, '3'); assert.equal(refresh.fields.fix_cycle, '0');
});

test('review-target artifacts cannot be rebound or changed without another review', async (t) => {
  const f = await fixture(t), target = await prepareReviewScope(f.root, f.statePath);
  const input = { ...f.input(), review_target: target.review_target, review_target_sha256: target.sha256 };
  await writeReview(f.root, input);
  const file = path.join(f.root, target.review_target), original = await readFile(file, 'utf8');
  await writeFile(file, original.replace('2026-01-01T10:00:00Z', '2025-01-01T10:00:00Z'));
  await assert.rejects(checkReviewScope(f.root, f.statePath), /binding is stale/);
  await writeFile(file, original);
  const manifest = JSON.parse(original); await writeFile(path.join(f.dir, manifest.repos[0].diff_file), 'tampered');
  await assert.rejects(checkReviewScope(f.root, f.statePath), /target diff changed/);
  await writeFile(path.join(f.root, 'src/code.js'), 'export const count = 3;\n');
  const replacement = await prepareReviewScope(f.root, f.statePath);
  assert.notEqual(replacement.sha256, target.sha256);
  await assert.rejects(writeReview(f.root, input), /hash differs from the dispatched snapshot/);
});

test('scope-driven re-review obeys the existing review cap and preserves legacy transitions', () => {
  const fields = { phase: 'final-sync', review: 'clean', status: 'In Progress', autonomy: 'autonomous', final_package_version: '1', review_cycle: '4', fix_cycle: '1', review_scope_version: '1', current_activity: 'Syncing' };
  const capped = transition({ fields }, { event: 'sync-complete', context_updated: [], delivery_scope_changed: true });
  assert.equal(capped.fields.status, 'Stopped'); assert.equal(capped.fields.phase, 'review'); assert.match(capped.fields.pause_reason, /Review limit/);
  assert.equal(capped.fields.review_cycle, '4'); assert.equal(capped.fields.fix_cycle, '1');
  delete fields.review_scope_version;
  assert.equal(transition({ fields }, { event: 'sync-complete' }).fields.phase, 'final-approval');
});


test('workspace review honors each approved base and keeps unchanged supporting repos in scope', async (t) => {
  const one = await fixture(t), two = await fixture(t);
  git(two.root, 'branch', 'staging', 'main');
  git(two.root, 'reset', '--hard', 'main');
  const state = { fields: { workspace_version: '1', workspace_contract: JSON.stringify({ repos: [
    { root: one.root, branch: 'feature', base: 'main' }, { root: two.root, branch: 'feature', base: 'staging' },
  ] }) } };
  const snapshots = await deliverySnapshots(one.root, state);
  assert.equal(snapshots.find((repo) => repo.path === one.root).base, 'main');
  assert.equal(snapshots.find((repo) => repo.path === two.root).base, 'staging');
  assert.deepEqual(snapshots.find((repo) => repo.path === two.root).paths, []);
});


test('literal renamed paths are included as both deletion and addition', async (t) => {
  const f = await fixture(t);
  git(f.root, 'mv', 'src/code.js', 'src/renamed café.js');
  const target = await prepareReviewScope(f.root, f.statePath);
  assert.deepEqual(target.repos[0].paths, ['src/code.js', 'src/renamed café.js']);
  const input = { ...f.input(), review_target: target.review_target, review_target_sha256: target.sha256 };
  input.review_scope[0].paths = target.repos[0].paths;
  await writeReview(f.root, input); assert.equal((await checkReviewScope(f.root, f.statePath)).covered, true);
});
