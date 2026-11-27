import { artifactJoin } from '../../../scripts/lib/artifact-path.mjs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { digest } from '../../../scripts/lib/artifacts.mjs';
import { writeReview } from '../../../scripts/review-report.mjs';
import { prepareReviewScope, checkReviewScope, deliverySnapshots, excludePreexisting, preexistingUntracked } from './review-scope.mjs';
import { implementationBaseline } from './implementation-guard.mjs';
import { captureReviewRepos } from './review-baseline.mjs';
import { applyWorkflow, transition } from './workflow.mjs';
import { parseState } from './render-status.mjs';
import { captureCommand } from '../../../scripts/command-evidence.mjs';
import { approve, checkFinalPackage } from './final-package.mjs';

const git = (root, ...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
async function fixture(t) {
  const root = await realpath(await mkdtemp(artifactJoin(os.tmpdir(), 'delivery-review-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  git(root, 'init', '-qb', 'main'); git(root, 'config', 'user.name', 'Test'); git(root, 'config', 'user.email', 'test@example.invalid');
  await mkdir(artifactJoin(root, 'src')); await writeFile(artifactJoin(root, 'src/code.js'), 'export const count = 0;\n');
  await writeFile(artifactJoin(root, '.gitignore'), 'make-it-work/\n'); git(root, 'add', '.'); git(root, 'commit', '-qm', 'Baseline'); git(root, 'switch', '-qc', 'feature');
  await writeFile(artifactJoin(root, 'src/code.js'), 'export const count = 1;\n'); git(root, 'add', '.'); git(root, 'commit', '-qm', 'Earlier branch work');
  await writeFile(artifactJoin(root, 'src/code.js'), 'export const count = 1;\nexport const extra = 2;\n');
  const dir = artifactJoin(root, 'make-it-work/DEMO'); await mkdir(dir, { recursive: true });
  const fields = { ticket: 'DEMO', handoff_version: '1', controller_version: '1', final_package_version: '1', review_scope_version: '1',
    status: 'In Progress', phase: 'review', autonomy: 'autonomous', start_time: '2026-01-01T10:00:00Z',
    execution_mode: 'inline', inline_pause_mode: 'run-straight-through', spec: 'make-it-work/DEMO/DEMO-spec.md', spec_hash: 'spec',
    plan: 'make-it-work/DEMO/DEMO-plan.md', plan_version: '1', plan_hash: 'plan', execution: 'passed', review: 'not-started', review_cycle: '1',
    fix_cycle: '0', fix_plan_round_steps: 'none', fix_plan_dispatch: 'none', replans_used: '0', gate: 'full-suite', pause_reason: 'none',
    branch: 'feature', base: 'main', head: git(root, 'rev-parse', 'HEAD'), worktree_fingerprint: 'fingerprint',
    execute_report: 'make-it-work/DEMO/DEMO-execute.md', context_updated: 'none', current_activity: 'none', real_rows_from: '1',
    workspace_snapshot: JSON.stringify([{ root, branch: 'feature' }]) };
  const statePath = artifactJoin(dir, 'DEMO-state.md');
  await writeFile(statePath, `# Workflow state — DEMO\n\n\`\`\`\n${Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join('\n')}\n\`\`\`\n\n## Known regressions\n\nNone\n\n## Decided findings\n\nNone\n\n## Context discoveries\n\nNone\n\n## Audit log\n\n| # | Time | From | To | Outcome / reason |\n| --- | --- | --- | --- | --- |\n| 1 | 2026-01-01T10:00:00Z | execute | review | Execution passed |\n`);
  for (const name of ['spec', 'plan', 'execute']) await writeFile(artifactJoin(dir, `DEMO-${name}.md`), `# ${name}\n`);
  const input = () => ({ version: 1, ticket: 'DEMO', branch: 'feature', commit: git(root, 'rev-parse', 'HEAD'), working_tree: true,
    coverage: 'The entire branch-to-base delivery diff was inspected.', findings: [], repo_roots: { app: root },
    review_scope: [{ repo: 'app', base: 'main', scope: 'branch', paths: ['src/code.js'] }],
    ui_verification: { status: 'not-applicable', note: 'Only backend code and documentation.' },
    implement: { handoff_version: 1, plan_version: 1, review_cycle: 1, review_scope_version: 1 } });
  let id = 0;
  const apply = async (event, extra = {}) => applyWorkflow({ root, statePath, input: { event, id: `scope-${++id}`, repos: [root], expected_hash: digest(await readFile(statePath, 'utf8')), ...extra } });
  return { root, dir, statePath, input, apply };
}

async function validationCapture(f, exit) {
  const saved = await readFile(f.statePath, 'utf8');
  await writeFile(f.statePath, saved.replace('phase: review', 'phase: execute'));
  try {
    return await captureCommand({ root: f.root, state: f.statePath, repo: f.root,
      input: { version: 1, command: { bin: process.execPath, args: ['-e', `process.stdout.write('PRIVATE_VALIDATION_ARGUMENT_AND_OUTPUT');process.exitCode=${exit}`] } } });
  } finally { await writeFile(f.statePath, saved); }
}

test('captured failure and pass survive omitted reviewer notes, exact package approval and delivery preparation', async t => {
  const f = await fixture(t);
  await validationCapture(f, 1); const passed = await validationCapture(f, 0);
  const target = await prepareReviewScope(f.root, f.statePath);
  assert.equal(target.command_facts.records.length, 2);
  assert.equal((await prepareReviewScope(f.root, f.statePath)).sha256, target.sha256, 'unchanged facts do not refresh review or rerun commands');
  const reviewed = await writeReview(f.root, { ...f.input(), validation_notes: ['Reviewer did not rerun typecheck.'], review_target: target.review_target, review_target_sha256: target.sha256 });
  assert.equal(reviewed.outcome, 'CLEAN', 'a supplemental failed command is not a new test gate');
  const evidence = JSON.parse(await readFile(artifactJoin(f.dir, 'DEMO-review-evidence.json'), 'utf8'));
  assert.equal(evidence.command_facts.records.length, 2);
  for (const note of target.command_facts.notes) {
    assert.ok(evidence.validation_notes.includes(note)); assert.ok(reviewed.summary.includes(note));
    assert.ok((await readFile(reviewed.report, 'utf8')).includes(note));
  }
  const draft = artifactJoin(f.dir, 'DEMO-final-draft.json');
  await writeFile(draft, JSON.stringify({ commit_message: 'fix: preserve validation facts', pr_title: 'Preserve validation facts', pr_description: 'Implementation and recorded checks.' }));
  await writeFile(f.statePath, (await readFile(f.statePath, 'utf8')).replace('phase: review', 'phase: final-approval').replace('review: not-started', 'review: clean'));
  const built = JSON.parse(execFileSync(process.execPath, [path.resolve('skills/implement/scripts/final-package.mjs'), 'build', '--root', f.root, '--state', f.statePath, '--draft', draft, '--repo', f.root], { encoding: 'utf8' }));
  await approve(f.root, f.statePath, built.sha256);
  const checked = await checkFinalPackage(f.root, f.statePath, true);
  assert.equal(checked.command_facts.records.length, 2);
  assert.match(checked.validation_notes.join('\n'), /process exited 1/);
  assert.match(checked.validation_notes.join('\n'), /process exited 0/);
  assert.doesNotMatch(await readFile(built.package, 'utf8'), /PRIVATE_VALIDATION_ARGUMENT_AND_OUTPUT/);
  await writeFile(f.statePath, (await readFile(f.statePath, 'utf8')).replace('phase: final-approval', 'phase: complete').replace('status: In Progress', 'status: Complete'));
  git(f.root, 'remote', 'add', 'origin', 'https://github.com/example/demo.git');
  git(f.root, 'update-ref', 'refs/remotes/origin/main', git(f.root, 'rev-parse', 'main'));
  const prepared = JSON.parse(execFileSync(process.execPath, [path.resolve('skills/implement/scripts/deliver.mjs'), 'prepare', '--root', f.root, '--state', f.statePath], { encoding: 'utf8' }));
  const deliveryFile = (await (await import('node:fs/promises')).readdir(f.dir)).find(file => file.endsWith('delivery-plan.json'));
  assert.ok(prepared.sha256); assert.ok(deliveryFile);
  const delivery = JSON.parse(await readFile(path.join(f.dir, deliveryFile), 'utf8'));
  assert.match(delivery.draft.pr_description, /process exited 1/);
  assert.doesNotMatch(delivery.draft.pr_description, /PRIVATE_VALIDATION_ARGUMENT_AND_OUTPUT|command-stdout|command-stderr/);
  await writeFile(path.join(f.root, passed.streams.stdout.path), 'tampered output');
  await assert.rejects(checkFinalPackage(f.root, f.statePath, true), /Captured validation facts|Verification context changed/);
});

test('new review targets bind command files, reject omission/tampering and retain incomplete disclosure', async t => {
  const f = await fixture(t), capture = await validationCapture(f, 1);
  const target = await prepareReviewScope(f.root, f.statePath);
  const input = { ...f.input(), review_target: target.review_target, review_target_sha256: target.sha256 };
  await writeReview(f.root, input);
  await checkReviewScope(f.root, f.statePath);
  const evidencePath = artifactJoin(f.dir, 'DEMO-review-evidence.json');
  const saved = await readFile(evidencePath, 'utf8'), evidence = JSON.parse(saved);
  delete evidence.command_facts; await writeFile(evidencePath, JSON.stringify(evidence));
  await assert.rejects(checkReviewScope(f.root, f.statePath), /Captured validation facts/);
  await writeFile(evidencePath, saved);
  const record = await readFile(capture.record, 'utf8');
  await rm(capture.record);
  await assert.rejects(checkReviewScope(f.root, f.statePath), /Verification context changed/);
  await writeFile(capture.record, record);
  await rm(path.join(f.root, capture.streams.stderr.path));
  await assert.rejects(writeReview(f.root, input), /Verification context changed/);
  const refreshed = await prepareReviewScope(f.root, f.statePath);
  assert.match(refreshed.command_facts.notes[0], /incomplete or unverified/);
  const review = await writeReview(f.root, { ...f.input(), review_target: refreshed.review_target, review_target_sha256: refreshed.sha256 });
  assert.equal(review.outcome, 'CLEAN');
  await checkReviewScope(f.root, f.statePath);
  await validationCapture(f, 0);
  await assert.rejects(checkReviewScope(f.root, f.statePath), /Verification context changed/);
  const stale = await checkReviewScope(f.root, f.statePath, { requireCurrent: false });
  assert.equal(stale.covered, false); assert.equal(stale.command_facts_changed, true);
  const manifest = JSON.parse(await readFile(artifactJoin(f.root, target.review_target), 'utf8'));
  const diff = artifactJoin(f.dir, manifest.repos[0].diff_file), originalDiff = await readFile(diff);
  await writeFile(diff, 'corrupted diff');
  await assert.rejects(checkReviewScope(f.root, f.statePath, { requireCurrent: false }), /target diff changed/);
  await writeFile(diff, originalDiff);
  await writeFile(f.statePath, (await readFile(f.statePath, 'utf8')).replace('phase: review', 'phase: final-approval').replace('review: not-started', 'review: clean'));
  const refreshedPhase = await f.apply('refresh-review');
  assert.equal(refreshedPhase.fields.phase, 'review');
  assert.equal(refreshedPhase.fields.fix_cycle, '0'); assert.equal(refreshedPhase.fields.execution, 'passed');
  assert.match(refreshedPhase.fields.pause_reason ?? '', /none/);
  await rm(capture.record);
  const next = await prepareReviewScope(f.root, f.statePath);
  assert.ok(next.command_facts.notes.some(note => note.includes('process outcome is unknown')), 'a removed previously bound record cannot silently disappear after recovery');
  await writeReview(f.root, { ...f.input(), implement: { ...f.input().implement, review_cycle: Number(refreshedPhase.fields.review_cycle) }, review_target: next.review_target, review_target_sha256: next.sha256 });
  await checkReviewScope(f.root, f.statePath);
  const draft = artifactJoin(f.dir, 'DEMO-final-draft.json');
  await writeFile(draft, JSON.stringify({ commit_message: 'fix: retain incomplete evidence', pr_title: 'Retain incomplete evidence', pr_description: 'Capture remains qualified.' }));
  await writeFile(f.statePath, (await readFile(f.statePath, 'utf8')).replace('phase: review', 'phase: final-approval').replace('review: not-started', 'review: clean'));
  const built = JSON.parse(execFileSync(process.execPath, [path.resolve('skills/implement/scripts/final-package.mjs'), 'build', '--root', f.root, '--state', f.statePath, '--draft', draft, '--repo', f.root], { encoding: 'utf8' }));
  const markdown = await readFile(built.package, 'utf8');
  assert.match(markdown, /record unavailable; outcome unknown/);
  assert.ok(!markdown.includes(`](${path.basename(capture.record)})`));
  await checkFinalPackage(f.root, f.statePath);
});

test('saved targets without command facts retain their contract until explicit new preparation', async t => {
  const f = await fixture(t), legacy = await prepareReviewScope(f.root, f.statePath);
  assert.equal(legacy.command_facts, undefined);
  await validationCapture(f, 1);
  await writeReview(f.root, { ...f.input(), review_target: legacy.review_target, review_target_sha256: legacy.sha256 });
  await checkReviewScope(f.root, f.statePath);
  const evidence = JSON.parse(await readFile(artifactJoin(f.dir, 'DEMO-review-evidence.json'), 'utf8'));
  assert.equal(evidence.command_facts, undefined); assert.deepEqual(evidence.validation_notes, []);
  const adopted = await prepareReviewScope(f.root, f.statePath);
  assert.equal(adopted.command_facts.records.length, 1); assert.notEqual(adopted.sha256, legacy.sha256);
  await assert.rejects(checkReviewScope(f.root, f.statePath), /target changed/);
});

test('review cannot silently narrow a full delivery target to HEAD or omit earlier work', async (t) => {
  const f = await fixture(t);
  const target = await prepareReviewScope(f.root, f.statePath);
  const input = { ...f.input(), review_target: target.review_target, review_target_sha256: target.sha256 };
  input.review_scope[0].scope = 'working-tree';
  await assert.rejects(writeReview(f.root, input), /full delivery diff/);
  await assert.rejects(readFile(artifactJoin(f.dir, 'DEMO-review.md')), { code: 'ENOENT' });
  input.review_scope[0].scope = 'branch'; input.review_scope[0].paths = [];
  await assert.rejects(writeReview(f.root, input), /full delivery diff/);
  input.review_scope[0].paths = ['src/code.js'];
  const review = await writeReview(f.root, input);
  assert.equal(review.outcome, 'CLEAN'); assert.equal((await checkReviewScope(f.root, f.statePath)).covered, true);
  const proof = JSON.parse(await readFile(artifactJoin(f.dir, 'DEMO-review-evidence.json'), 'utf8'));
  assert.equal(proof.delivery_target.sha256, target.sha256);
  proof.repos[0].scope = 'working-tree';
  await writeFile(artifactJoin(f.dir, 'DEMO-review-evidence.json'), JSON.stringify(proof));
  await assert.rejects(checkReviewScope(f.root, f.statePath), /not fully reviewed/);
});

test('missing required skill applications or mapping assessment cannot produce a CLEAN handoff', async t => {
  const f = await fixture(t);
  await mkdir(artifactJoin(f.root, '.claude/skills/domain-demo'), { recursive: true });
  await writeFile(artifactJoin(f.root, '.claude/skills/domain-demo/SKILL.md'), '# Domain\nPreserve the documented count.\n');
  await writeFile(f.statePath, (await readFile(f.statePath, 'utf8')).replace('review_scope_version: 1', 'review_scope_version: 1\nreview_checks_version: 1'));
  await f.apply('review-context', { context_updated: [], review_requirements: [{ repo: f.root, reason: 'Count changes belong to the demo domain', skills: [{ name: 'domain-demo', method: 'Read' }] }] });
  const target = await prepareReviewScope(f.root, f.statePath);
  const input = { ...f.input(), review_target: target.review_target, review_target_sha256: target.sha256 };
  input.review_scope[0].paths = target.repos[0].paths;
  await assert.rejects(writeReview(f.root, input), /review_checks/);
  await assert.rejects(readFile(artifactJoin(f.dir, 'DEMO-review.md')), { code: 'ENOENT' });
  const skill = JSON.parse(await readFile(artifactJoin(f.root, target.review_target), 'utf8')).review_requirements[0].skills[0];
  input.review_checks = [{ repo: f.root, skills: [{ name: skill.name, method: skill.method, sha256: skill.sha256, rules: [{ line: 2, rule: 'Preserve count behavior', observation: 'Inspected count and extra exports against the required domain behavior', result: 'satisfied' }] }], test_map: { status: 'not-applicable', note: 'No test-map strategy is registered', tests: [] } }];
  const reviewed = await writeReview(f.root, input);
  assert.equal(reviewed.outcome, 'CLEAN'); assert.equal((await checkReviewScope(f.root, f.statePath)).covered, true);
});

test('known context is included before review so unchanged final sync needs no additional cycle', async (t) => {
  const f = await fixture(t);
  await writeFile(f.statePath, (await readFile(f.statePath, 'utf8')).replace('review_scope_version: 1', 'review_scope_version: 1\nreview_context_version: 1'));
  await assert.rejects(prepareReviewScope(f.root, f.statePath), /checkpoint review-context/);
  await writeFile(artifactJoin(f.root, 'README.md'), '# Updated behavior\n');
  const prepared = await f.apply('review-context', { context_updated: ['README.md'] });
  assert.equal(prepared.fields.phase, 'review'); assert.equal(prepared.fields.review_cycle, '1');
  assert.equal(prepared.fields.context_updated, 'README.md');
  assert.match(await readFile(f.statePath, 'utf8'), /Context ready for code review — round 1\./);
  const target = await prepareReviewScope(f.root, f.statePath);
  assert.ok(target.repos[0].paths.includes('README.md'));
  // Saved checkpoints from earlier versions still satisfy the preparation gate.
  await writeFile(f.statePath, (await readFile(f.statePath, 'utf8')).replace('Context ready for code review — round 1.', 'Review context prepared for cycle 1.'));
  await prepareReviewScope(f.root, f.statePath);
  const input = { ...f.input(), review_target: target.review_target, review_target_sha256: target.sha256 };
  input.review_scope[0].paths = target.repos[0].paths;
  const reviewed = await writeReview(f.root, input);
  await f.apply('handoff', { handoff: reviewed.handoff });
  const synced = await f.apply('sync-complete', { context_updated: [] });
  assert.equal(synced.fields.phase, 'final-approval'); assert.equal(synced.fields.review_cycle, '1');
  assert.equal((await checkReviewScope(f.root, f.statePath)).covered, true);
});

test('staged, untracked, binary and deleted changes share the review/package snapshot; drift invalidates the target', async (t) => {
  const f = await fixture(t);
  await writeFile(artifactJoin(f.root, 'new.bin'), Buffer.from([0, 1, 255]));
  await rm(artifactJoin(f.root, 'src/code.js')); git(f.root, 'add', 'src/code.js');
  const target = await prepareReviewScope(f.root, f.statePath);
  assert.deepEqual(target.repos[0].paths, ['new.bin', 'src/code.js']);
  const input = { ...f.input(), review_target: target.review_target, review_target_sha256: target.sha256 }; input.review_scope[0].paths = target.repos[0].paths;
  await writeReview(f.root, input); assert.equal((await checkReviewScope(f.root, f.statePath)).covered, true);
  await writeFile(artifactJoin(f.root, 'new.bin'), Buffer.from([0, 2, 255]));
  await assert.rejects(checkReviewScope(f.root, f.statePath), /not fully reviewed/);
  await assert.rejects(writeReview(f.root, input), /changed during review/);
});

test('clean handoffs require target evidence; final-sync changes route back to review without charging a fix', async (t) => {
  const f = await fixture(t);
  const target = await prepareReviewScope(f.root, f.statePath);
  const review = await writeReview(f.root, { ...f.input(), review_target: target.review_target, review_target_sha256: target.sha256 });
  const proofPath = artifactJoin(f.dir, 'DEMO-review-evidence.json');
  const proof = await readFile(proofPath, 'utf8'); const omitted = JSON.parse(proof); delete omitted.delivery_target;
  await writeFile(proofPath, JSON.stringify(omitted));
  await assert.rejects(f.apply('handoff', { handoff: review.handoff }), /delivery-bound scope evidence/);
  await writeFile(proofPath, proof);
  assert.equal((await f.apply('handoff', { handoff: review.handoff })).fields.phase, 'final-sync');
  await writeFile(artifactJoin(f.root, 'CLAUDE.md'), '# Final context sync\n');
  const syncInput = { event: 'sync-complete', id: 'sync-docs', repos: [f.root], expected_hash: digest(await readFile(f.statePath, 'utf8')), context_updated: ['CLAUDE.md'], delivery_scope_changed: false };
  const sync = await applyWorkflow({ root: f.root, statePath: f.statePath, input: syncInput });
  assert.equal(sync.fields.phase, 'review'); assert.equal(sync.next_action.phase, 'review'); assert.equal(sync.fields.review_cycle, '2'); assert.equal(sync.fields.fix_cycle, '0');
  assert.equal(sync.fields.context_updated, 'CLAUDE.md'); assert.equal(syncInput.delivery_scope_changed, false);
  assert.equal((await applyWorkflow({ root: f.root, statePath: f.statePath, input: syncInput })).replayed, true);
  const updated = await prepareReviewScope(f.root, f.statePath);
  const input = { ...f.input(), review_target: updated.review_target, review_target_sha256: updated.sha256 }; input.implement.review_cycle = 2; input.review_scope[0].paths = updated.repos[0].paths;
  input.review_limitations = [{ repo: 'app', paths: ['src/code.js'], depth: 'skimmed', reason: 'Earlier branch code was inspected only at diff level; its own requirements were not verified' }];
  const second = await writeReview(f.root, input);
  assert.equal((await f.apply('handoff', { handoff: second.handoff })).fields.phase, 'final-sync');
  assert.equal((await f.apply('sync-complete', { context_updated: [] })).fields.phase, 'final-approval');
  assert.equal((await checkReviewScope(f.root, f.statePath)).covered, true);
  const draft = artifactJoin(f.dir, 'DEMO-final-draft.json');
  await writeFile(draft, JSON.stringify({ commit_message: 'Feature', pr_title: 'Feature', pr_description: 'Full delivered scope reviewed.' }));
  const script = new URL('./final-package.mjs', import.meta.url).pathname;
  const build = (...extra) => JSON.parse(execFileSync(process.execPath, [script, 'build', '--root', f.root, '--state', f.statePath, '--draft', draft, '--repo', f.root, ...extra], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  const built = build();
  const pkg = JSON.parse(await readFile(built.json, 'utf8'));
  assert.equal(pkg.review_scope[0].status, 'covered');
  assert.equal(pkg.review_scope[0].limitations[0].depth, 'skimmed');
  assert.match(await readFile(built.package, 'utf8'), /Review qualification.*skimmed/);
  const { reviewDisclosure } = await import('../../../scripts/lib/review-evidence.mjs');
  assert.match(reviewDisclosure(pkg.review_scope, pkg.ui_verification), /skimmed.*src\/code.js/);
  assert.ok(pkg.evidence.review_target); assert.ok(pkg.evidence.review_target_diff_0);
  assert.equal(pkg.repos[0].diff_sha256, JSON.parse(await readFile(artifactJoin(f.root, updated.review_target), 'utf8')).repos[0].diff_sha256);
  assert.throws(() => build('--base', 'feature'), /repositories or bases differ/);
  await assert.rejects(f.apply('refresh-review'), /already reviewed/);
  await writeFile(artifactJoin(f.root, 'CLAUDE.md'), '# Changed after review\n');
  assert.throws(() => build(), /not fully reviewed/);
  const refresh = await f.apply('refresh-review'); assert.equal(refresh.fields.phase, 'review');
  assert.equal(refresh.fields.review_cycle, '3'); assert.equal(refresh.fields.fix_cycle, '0');
});

test('review-target artifacts cannot be rebound or changed without another review', async (t) => {
  const f = await fixture(t), target = await prepareReviewScope(f.root, f.statePath);
  const input = { ...f.input(), review_target: target.review_target, review_target_sha256: target.sha256 };
  await writeReview(f.root, input);
  const file = artifactJoin(f.root, target.review_target), original = await readFile(file, 'utf8');
  await writeFile(file, original.replace('2026-01-01T10:00:00Z', '2025-01-01T10:00:00Z'));
  await assert.rejects(checkReviewScope(f.root, f.statePath), /binding is stale/);
  await writeFile(file, original);
  const manifest = JSON.parse(original); await writeFile(artifactJoin(f.dir, manifest.repos[0].diff_file), 'tampered');
  await assert.rejects(checkReviewScope(f.root, f.statePath), /target diff changed/);
  await writeFile(artifactJoin(f.root, 'src/code.js'), 'export const count = 3;\n');
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

test('frozen review context preserves policy provenance and unverified criteria without granting a pass', async t => {
  const f = await fixture(t);
  const retained = { source: 'user', via: 'chat', decisions: [{ decision: 'Use code inspection now', reference: 'Explicit restart choice', unverified: ['Database boundaries', 'Internal-only access'] }] };
  const readiness = 'make-it-work/DEMO/DEMO-testing-readiness.md';
  await writeFile(artifactJoin(f.root, readiness), '# Readiness\n\n## Verification Policy\n\n| Repo | Mode | Decision | Reason |\n| --- | --- | --- | --- |\n| app | manual | user | User selected manual checks; no behavior observed |\n');
  await writeFile(f.statePath, (await readFile(f.statePath, 'utf8')).replace('phase: review', `phase: review\nmode: lightweight\ntesting_readiness: ${readiness}\nretained_verification: ${JSON.stringify(retained)}`));
  const prepared = await prepareReviewScope(f.root, f.statePath);
  const target = JSON.parse(await readFile(artifactJoin(f.root, prepared.review_target), 'utf8'));
  assert.equal(target.verification_context.mode, 'lightweight');
  assert.deepEqual(target.verification_context.retained_decisions, retained);
  assert.equal(target.verification_context.policy[0].Decision, 'user');
  assert.equal(target.verification_context.policy[0].Mode, 'manual');
  assert.equal(target.verification_context.policy_source.path, readiness);
  await writeFile(artifactJoin(f.root, readiness), (await readFile(artifactJoin(f.root, readiness), 'utf8')).replace('no behavior observed', 'criteria still unverified'));
  await assert.rejects(writeReview(f.root, { ...f.input(), review_target: prepared.review_target, review_target_sha256: prepared.sha256 }), /Verification context changed/);
});

test('pre-existing untracked files are listed before review and can be kept out of every delivery snapshot', async (t) => {
  const f = await fixture(t);
  await mkdir(artifactJoin(f.root, 'scripts-local'));
  await writeFile(artifactJoin(f.root, 'scripts-local/helper.py'), 'print(1)\n');
  await writeFile(artifactJoin(f.root, '.env.local'), 'TOKEN=secret\n');
  await writeFile(artifactJoin(f.root, 'odd [name].txt'), 'kept\n');
  await writeFile(artifactJoin(f.root, 'notes [a]*?.txt'), 'local notes\n');
  await writeFile(artifactJoin(f.root, 'notes a.txt'), 'written by the run later\n');
  const baseline = await implementationBaseline([f.root]);
  const text = await readFile(f.statePath, 'utf8');
  await writeFile(f.statePath, text.replace('real_rows_from: 1', `real_rows_from: 1\nimplementation_baseline: ${JSON.stringify({ version: 1, runId: '2026-01-01T10:00:00Z', repos: baseline })}`));
  await writeFile(artifactJoin(f.root, 'src/added.js'), 'export const added = true;\n');
  await writeFile(artifactJoin(f.root, 'odd [name].txt'), 'changed by the run\n');
  await writeFile(artifactJoin(f.root, 'notes a.txt'), 'changed by the run too\n');
  const first = await prepareReviewScope(f.root, f.statePath);
  assert.deepEqual(first.preexisting_untracked, [{ root: f.root, paths: ['.env.local', 'notes [a]*?.txt', 'scripts-local/helper.py'], sensitive: ['.env.local'] }], 'only unchanged pre-existing files are candidates');
  assert.ok(first.repos[0].paths.includes('.env.local'));
  await assert.rejects(excludePreexisting(f.root, f.statePath, { paths: ['src/added.js'] }), /Only pre-existing/);
  const result = await excludePreexisting(f.root, f.statePath);
  assert.deepEqual(result.repos[0].excluded, ['.env.local', 'notes [a]*?.txt', 'scripts-local/helper.py']);
  assert.deepEqual(await excludePreexisting(f.root, f.statePath), { repos: [] }, 'nothing left to exclude');
  const exclude = await readFile(artifactJoin(f.root, '.git/info/exclude'), 'utf8');
  assert.equal(exclude.match(/# make-it-work DEMO:/g).length, 1);
  const second = await prepareReviewScope(f.root, f.statePath);
  assert.equal(second.preexisting_untracked, undefined);
  assert.deepEqual(second.repos[0].paths, ['notes a.txt', 'odd [name].txt', 'src/added.js', 'src/code.js'], 'run-written and run-changed files stay in scope');
  const [snapshot] = await deliverySnapshots(f.root, await (async () => parseState(await readFile(f.statePath, 'utf8'), f.statePath))());
  assert.ok(!snapshot.diff.toString().includes('TOKEN=secret'));
  assert.equal(git(f.root, 'status', '--porcelain', '--', '.env.local'), '', 'the local exclude is honored by Git itself');
});

test('WF-019 legacy reproduction: baseline-exempt notes and skills enter review but cannot be excluded as pre-existing', async t => {
  const f = await fixture(t);
  await mkdir(artifactJoin(f.root, '.claude/skills/local'), { recursive: true });
  await mkdir(artifactJoin(f.root, 'docs'));
  await mkdir(artifactJoin(f.root, 'scripts-local'));
  const omitted = ['.claude/skills/local/SKILL.md', 'docs/local.txt', 'notes.md'];
  for (const file of [...omitted, 'scripts-local/helper.py']) await writeFile(artifactJoin(f.root, file), 'pre-existing unchanged content\n');
  const baseline = await implementationBaseline([f.root]);
  assert.ok(baseline[0].changes.some(entry => entry.file === 'src/code.js'), 'tracked modification is captured');
  for (const file of omitted) assert.ok(!baseline[0].changes.some(entry => entry.file === file), 'implementation guard deliberately exempts notes/context');
  const raw = await readFile(f.statePath, 'utf8');
  await writeFile(f.statePath, raw.replace('real_rows_from: 1', `real_rows_from: 1\nimplementation_baseline: ${JSON.stringify({ version: 1, runId: '2026-01-01T10:00:00Z', repos: baseline })}`));
  const state = parseState(await readFile(f.statePath, 'utf8'));
  assert.deepEqual((await preexistingUntracked(f.root, state)).repos[0].paths, ['scripts-local/helper.py']);
  await excludePreexisting(f.root, f.statePath);
  const target = await prepareReviewScope(f.root, f.statePath);
  assert.deepEqual(target.repos[0].paths, [...omitted, 'src/code.js']);
  for (const file of omitted) assert.equal(await readFile(artifactJoin(f.root, file), 'utf8'), 'pre-existing unchanged content\n');
});

test('new review provenance excludes unchanged notes and skills through review, package and delivery preparation', async t => {
  const f = await fixture(t);
  await mkdir(artifactJoin(f.root, '.claude/skills/local'), { recursive: true });
  await mkdir(artifactJoin(f.root, 'docs'));
  const unchanged = ['.claude/skills/local/SKILL.md', '.env.local', 'notes [x]* café.md'];
  for (const file of [...unchanged, 'docs/mixed.md']) await writeFile(artifactJoin(f.root, file), 'pre-existing local content');
  const baseline = { version: 1, ticket: 'DEMO', runId: '2026-01-01T10:00:00Z', repos: await captureReviewRepos([f.root]) };
  await writeFile(f.statePath, (await readFile(f.statePath, 'utf8')).replace('real_rows_from: 1', `real_rows_from: 1\nreview_baseline_version: 1\nreview_baseline: ${JSON.stringify(baseline)}`));
  await writeFile(artifactJoin(f.root, 'docs/mixed.md'), 'local content changed during the run');
  await writeFile(artifactJoin(f.root, 'docs/generated.md'), 'documentation created during the run');
  const before = await readFile(artifactJoin(f.root, '.git/info/exclude'), 'utf8');
  await assert.rejects(excludePreexisting(f.root, f.statePath, { paths: [unchanged[0], 'docs/generated.md'] }), /Only pre-existing/);
  assert.equal(await readFile(artifactJoin(f.root, '.git/info/exclude'), 'utf8'), before, 'invalid mixed selections cause no partial exclusion');
  const found = await preexistingUntracked(f.root, parseState(await readFile(f.statePath, 'utf8')));
  assert.deepEqual(found.repos[0].paths, unchanged);
  assert.ok(found.repos[0].sensitive.includes('.env.local'));
  await excludePreexisting(f.root, f.statePath);
  const target = await prepareReviewScope(f.root, f.statePath);
  assert.deepEqual(target.repos[0].paths, ['docs/generated.md', 'docs/mixed.md', 'src/code.js']);
  assert.equal(target.preexisting_untracked, undefined);
  const input = { ...f.input(), review_target: target.review_target, review_target_sha256: target.sha256 };
  input.review_scope[0].paths = target.repos[0].paths;
  const reviewed = await writeReview(f.root, input);
  await f.apply('handoff', { handoff: reviewed.handoff }); await f.apply('sync-complete', { context_updated: [] });
  const draft = artifactJoin(f.dir, 'DEMO-final-draft.json');
  await writeFile(draft, JSON.stringify({ commit_message: 'Ticket change', pr_title: 'Ticket change', pr_description: 'Reviewed the resolved scope.' }));
  const packageCli = path.resolve('skills/implement/scripts/final-package.mjs');
  const built = JSON.parse(execFileSync(process.execPath, [packageCli, 'build', '--root', f.root, '--state', f.statePath, '--draft', draft, '--repo', f.root], { encoding: 'utf8' }));
  const pkg = JSON.parse(await readFile(built.json, 'utf8'));
  assert.deepEqual(pkg.repos[0].paths, target.repos[0].paths);
  await f.apply('complete');
  git(f.root, 'remote', 'add', 'origin', 'https://github.com/example/service.git');
  git(f.root, 'update-ref', 'refs/remotes/origin/main', 'main');
  const prepared = JSON.parse(execFileSync(process.execPath, [path.resolve('skills/implement/scripts/deliver.mjs'), 'prepare', '--root', f.root, '--state', f.statePath], { encoding: 'utf8', stdio: 'pipe' }));
  const plan = JSON.parse(await readFile(artifactJoin(f.dir, 'DEMO-delivery-plan.json'), 'utf8'));
  assert.equal(prepared.sha256, digest(JSON.stringify(plan)));
  assert.deepEqual(plan.repos[0].paths, target.repos[0].paths);
  for (const file of unchanged) assert.equal(await readFile(artifactJoin(f.root, file), 'utf8'), 'pre-existing local content', 'excluded user files remain on disk');
});

test('WF-026 full delivery commits the enforced review result including a canceled inherited edit', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.root, 'src/code.js'), 'export const count = 0;\n');
  await writeFile(path.join(f.root, 'src/feature.js'), 'export const feature = true;\n');
  const target = await prepareReviewScope(f.root, f.statePath);
  assert.deepEqual(target.repos[0].paths, ['src/feature.js']);
  const input = { ...f.input(), review_target: target.review_target, review_target_sha256: target.sha256 };
  input.review_scope[0].paths = target.repos[0].paths;
  const reviewed = await writeReview(f.root, input);
  await f.apply('handoff', { handoff: reviewed.handoff });
  await f.apply('sync-complete', { context_updated: [] });
  const draft = artifactJoin(f.dir, 'DEMO-final-draft.json');
  await writeFile(draft, JSON.stringify({ commit_message: 'DEMO: Add feature with original count', pr_title: 'DEMO: Add feature', pr_description: 'Synthetic scope-binding fixture.' }));
  const packageCli = path.resolve('skills/implement/scripts/final-package.mjs');
  const deliveryCli = path.resolve('skills/implement/scripts/deliver.mjs');
  const invoke = (tool, action, extra = [], env = process.env) => JSON.parse(execFileSync(process.execPath,
    [tool, action, '--root', f.root, '--state', f.statePath, ...extra], { encoding: 'utf8', env, stdio: 'pipe' }));
  const built = invoke(packageCli, 'build', ['--draft', draft, '--repo', f.root]);
  assert.equal(JSON.parse(await readFile(built.json, 'utf8')).review_scope[0].status, 'covered');
  await f.apply('complete');
  const bare = path.join(f.root, '.git/fixture-origin.git');
  git(f.root, 'init', '-q', '--bare', bare);
  git(f.root, 'remote', 'add', 'origin', 'https://github.com/example/service.git');
  git(f.root, 'config', `url.${bare}.insteadOf`, 'https://github.com/example/service.git');
  git(f.root, 'update-ref', 'refs/remotes/origin/main', 'main');
  const bin = path.join(f.root, '.git/fixture-bin'); await mkdir(bin);
  const gh = path.join(bin, 'gh');
  await writeFile(gh, '#!/bin/sh\nif [ "$1" = "--version" ] || [ "$1" = "auth" ]; then exit 0; fi\nif [ "$2" = "list" ]; then echo "[]"; else echo "https://github.com/example/service/pull/1"; fi\n');
  await chmod(gh, 0o755);
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
  const prepared = invoke(deliveryCli, 'prepare', [], env);
  const plan = JSON.parse(await readFile(artifactJoin(f.dir, 'DEMO-delivery-plan.json'), 'utf8'));
  assert.deepEqual(plan.repos[0].full_result.source_paths, ['src/feature.js']);
  assert.deepEqual(plan.repos[0].full_result.reversal_paths, ['src/code.js']);
  assert.deepEqual(plan.repos[0].paths, ['src/code.js', 'src/feature.js']);
  assert.equal(invoke(deliveryCli, 'run', ['--hash', prepared.sha256], env).delivered, true);
  assert.equal(git(f.root, '--git-dir', bare, 'show', 'feature:src/code.js'), 'export const count = 0;');
  assert.equal(git(f.root, '--git-dir', bare, 'show', 'feature:src/feature.js'), 'export const feature = true;');
  assert.equal(git(f.root, 'status', '--porcelain'), '');
  const head = git(f.root, 'rev-parse', 'HEAD');
  invoke(deliveryCli, 'run', ['--hash', prepared.sha256], env);
  assert.equal(git(f.root, 'rev-parse', 'HEAD'), head);
});

test('review baseline never excludes formerly tracked files or symlinks converted to matching regular files', async t => {
  const f = await fixture(t);
  const link = artifactJoin(f.root, 'notes-link.md');
  await symlink('missing-target', link);
  const fields = parseState(await readFile(f.statePath, 'utf8')).fields;
  fields.review_baseline_version = '1';
  fields.review_baseline = JSON.stringify({ version: 1, ticket: fields.ticket, runId: fields.start_time, repos: await captureReviewRepos([f.root]) });
  git(f.root, 'rm', '--cached', 'src/code.js');
  await rm(link); await writeFile(link, 'missing-target'); await chmod(link, 0o777);
  assert.deepEqual(await preexistingUntracked(f.root, { fields }), { available: true, repos: [] });
  const saved = JSON.parse(fields.review_baseline);
  saved.repos[0].root += '-missing'; fields.review_baseline = JSON.stringify(saved);
  const unavailable = await preexistingUntracked(f.root, { fields });
  assert.equal(unavailable.available, false);
  assert.deepEqual(unavailable.repos, []);
  assert.match(unavailable.warnings[0], /missing a selected repository/);
});
