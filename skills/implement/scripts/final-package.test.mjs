import { artifactJoin } from '../../../scripts/lib/artifact-path.mjs';
import { writeReview } from '../../../scripts/review-report.mjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { generateDashboard, parseState } from './render-status.mjs';
import { validateArtifacts } from './handoff.mjs';
import { transition } from './workflow.mjs';
import { lastWorkRow } from './workflow-decisions.mjs';

const cli = path.resolve('skills/implement/scripts/final-package.mjs');
function git(repo, ...args) { return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim(); }
function run(command, root, state, ...args) {
  return JSON.parse(execFileSync(process.execPath, [cli, command, '--root', root, '--state', state, ...args], { encoding: 'utf8' }));
}
async function initRepo(root) {
  await mkdir(root, { recursive: true });
  git(root, 'init', '-q');
  git(root, 'branch', '-m', 'main');
  await writeFile(artifactJoin(root, '.gitignore'), 'make-it-work/\n');
  await mkdir(artifactJoin(root, 'src'));
  await writeFile(artifactJoin(root, 'src/existing.txt'), 'before\n');
  git(root, 'add', '.gitignore', 'src/existing.txt');
  git(root, '-c', 'user.name=Test', '-c', 'user.email=test@example.test', 'commit', '-qm', 'Initial');
}
function stateMarkdown(ticket) {
  const fields = {
    ticket, handoff_version: '1', final_package_version: '1', status: 'In Progress', phase: 'final-approval',
    autonomy: 'guided', start_time: '2026-01-01T10:00:00Z', execution_mode: 'inline',
    inline_pause_mode: 'run-straight-through', spec: `make-it-work/${ticket}/${ticket}-spec.md`, spec_hash: 'spec',
    plan: `make-it-work/${ticket}/${ticket}-plan.md`, plan_version: '1', plan_hash: 'plan',
    execution: 'passed', review: 'clean', review_cycle: '1', fix_cycle: '0', fix_plan_round_steps: 'none',
    fix_plan_dispatch: 'none', replans_used: '0', gate: 'full-suite', pause_reason: 'none',
    branch: 'feature', base: 'main', head: 'abc123', worktree_fingerprint: 'fingerprint',
    execute_report: `make-it-work/${ticket}/${ticket}-execute.md`, context_updated: 'none', current_activity: 'none',
    real_rows_from: '1',
  };
  return `# Workflow state — ${ticket}\n\n\`\`\`\n${Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('\n')}\n\`\`\`\n\n## Known regressions\n\nNone\n\n## Decided findings\n\nNone\n\n## Context discoveries\n\nNone\n\n## Audit log\n\n| # | Time | From | To | Outcome / reason |\n| --- | --- | --- | --- | --- |\n| 1 | 2026-01-01T10:00:00Z | final-sync | final-approval | Context synced |\n`;
}
async function artifacts(root, ticket = 'DEMO') {
  const dir = artifactJoin(root, 'make-it-work', ticket);
  await mkdir(dir, { recursive: true });
  for (const name of ['spec', 'plan', 'execute', 'review']) await writeFile(artifactJoin(dir, `${ticket}-${name}.md`), `# ${name}\n`);
  const draft = artifactJoin(dir, `${ticket}-final-draft.json`);
  await writeFile(draft, JSON.stringify({ commit_message: 'DEMO Add feature', pr_title: 'DEMO: Add feature', pr_description: 'Implements AC1. Full suite passed.' }));
  const state = artifactJoin(dir, `${ticket}-state.md`);
  await writeFile(state, stateMarkdown(ticket));
  return { state, draft, dir };
}

async function verifiedAcceptance(root, state, dir) {
  await writeFile(state, (await readFile(state, 'utf8')).replace('final_package_version: 1', 'final_package_version: 1\nverification_version: 1'));
  await writeFile(artifactJoin(dir, 'DEMO-plan.md'), '# Plan\n\n## Steps\n\n### Step 1 — Feature\n\n## Test Plan\n\n**AC traceability:**\n\n| Acceptance criterion | Test scenario |\n| --- | --- |\n| AC1 works | Happy path |\n');
  await writeFile(artifactJoin(dir, 'DEMO-verification-v1.json'), JSON.stringify({ version: 1, ticket: 'DEMO', plan_version: 1,
    steps: [{ number: 1, checks: [{ type: 'automated', subject: 'Happy path', command: 'npm test', result: 'pass', note: 'Passed' }] }],
    gate: { mode: 'full-suite', result: 'pass', note: 'Full suite passed' },
    acceptance: [{ criterion: 'AC1 works', scenario: 'Happy path', status: 'automated', step: 1, note: 'Happy path passed' }],
  }));
}

test('builds a binary-safe working-tree package and invalidates approval on changes', async (t) => {
  const root = await mkdtemp(artifactJoin(os.tmpdir(), 'final-package-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await initRepo(root);
  const { state, draft, dir } = await artifacts(root);
  await writeFile(artifactJoin(dir, 'DEMO-review.md'), '**Verdict:** Approve with nits — 0 Critical, 0 Major, 1 Minor\n\n1. **[Minor]** Simplify the local name.\n\nOrchestrator outcome: CLEAN\n');
  await writeFile(artifactJoin(root, 'src/existing.txt'), 'after\n');
  await writeFile(artifactJoin(root, 'src/new.txt'), 'new\n');
  await writeFile(artifactJoin(root, 'src/image.bin'), Buffer.from([0, 1, 2, 3, 255]));
  const built = run('build', root, state, '--draft', draft, '--repo', root);
  const audited = parseState(await readFile(state, 'utf8'));
  assert.equal(audited.audit.at(-1).note.kind, 'result');
  assert.ok(audited.audit.at(-1).outcome.includes(built.sha256));
  assert.equal(lastWorkRow(audited.audit).number, 1);
  run('build', root, state, '--draft', draft, '--repo', root);
  assert.equal(parseState(await readFile(state, 'utf8')).audit.length, audited.audit.length);
  const pkg = JSON.parse(await readFile(artifactJoin(dir, 'DEMO-final-package.json'), 'utf8'));
  assert.deepEqual(pkg.repos[0].paths, ['src/existing.txt', 'src/image.bin', 'src/new.txt']);
  assert.deepEqual(pkg.open_nits, ['Simplify the local name.']);
  assert.equal(pkg.validation.result, 'PASS');
  assert.match(await readFile(built.package, 'utf8'), /DEMO: Add feature/);
  const diff = await readFile(artifactJoin(dir, pkg.repos[0].diff_file), 'utf8');
  assert.match(diff, /new\n/);
  assert.match(diff, /GIT binary patch/);
  assert.throws(() => run('check', root, state, '--require-approval'), /no current approval/);
  run('approve', root, state, '--hash', built.sha256);
  assert.equal(run('check', root, state, '--require-approval').approved, true);
  await writeFile(artifactJoin(root, 'src/existing.txt'), 'changed again\n');
  assert.throws(() => run('check', root, state), /stale/);
  const rebuilt = run('build', root, state, '--draft', draft, '--repo', root);
  assert.notEqual(rebuilt.sha256, built.sha256);
  assert.equal(run('check', root, state).approved, false);
  await writeFile(draft, JSON.stringify({ commit_message: 'DEMO Revised', pr_title: 'DEMO: Add feature', pr_description: 'Implements AC1. Full suite passed.' }));
  assert.throws(() => run('check', root, state), /stale/);
  await writeFile(draft, JSON.stringify({ commit_message: 'DEMO Add feature', pr_title: 'DEMO: Add feature', pr_description: 'Implements AC1. Full suite passed.' }));
  run('build', root, state, '--draft', draft, '--repo', root);
  await writeFile(artifactJoin(dir, 'DEMO-execute.md'), '# execution changed\n');
  assert.throws(() => run('check', root, state), /stale/);
});

test('includes every explicitly affected repository', async (t) => {
  const root = await mkdtemp(artifactJoin(os.tmpdir(), 'final-package-workspace-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const one = artifactJoin(root, 'service-one');
  const two = artifactJoin(root, 'service-two');
  await initRepo(one);
  await initRepo(two);
  const { state, draft, dir } = await artifacts(root);
  await writeFile(artifactJoin(one, 'src/existing.txt'), 'one\n');
  await writeFile(artifactJoin(two, 'src/existing.txt'), 'two\n');
  run('build', root, state, '--draft', draft, '--repo', one, '--repo', two);
  const pkg = JSON.parse(await readFile(artifactJoin(dir, 'DEMO-final-package.json'), 'utf8'));
  assert.deepEqual(pkg.repos.map((r) => r.name), ['service-one', 'service-two']);
  assert.equal(run('check', root, state).current, true);
});

test('delivery scope distinguishes reviewed changes from earlier commits in the same file and binds browser evidence', async (t) => {
  const root = await mkdtemp(artifactJoin(os.tmpdir(), 'final-package-review-scope-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await initRepo(root);
  git(root, 'switch', '-qc', 'feature');
  const { state, draft, dir } = await artifacts(root);
  await writeFile(artifactJoin(root, 'src/existing.txt'), 'earlier branch work\n');
  git(root, 'add', 'src/existing.txt');
  git(root, '-c', 'user.name=Test', '-c', 'user.email=test@example.test', 'commit', '-qm', 'Earlier work');
  await writeFile(artifactJoin(root, 'src/existing.txt'), 'earlier branch work\ninvoice change\n');
  const reviewInput = { version: 1, ticket: 'DEMO', branch: 'feature', commit: git(root, 'rev-parse', 'HEAD'), working_tree: true,
    coverage: 'Reviewed only current invoice edits', findings: [], repo_roots: { app: root },
    review_scope: [{ repo: 'app', base: 'main', scope: 'working-tree', paths: ['src/existing.txt'] }],
    ui_verification: { status: 'pending', note: 'Browser unavailable; invoice header layout unchecked.' } };
  await writeReview(root, reviewInput);
  await verifiedAcceptance(root, state, dir);
  let built = run('build', root, state, '--draft', draft, '--repo', root);
  let pkg = JSON.parse(await readFile(built.json, 'utf8'));
  assert.equal(pkg.review_scope[0].status, 'partial');
  assert.deepEqual(pkg.review_scope[0].uncovered_paths, ['src/existing.txt']);
  assert.match(await readFile(built.package, 'utf8'), /invoice header layout unchecked/);
  const checked = run('check', root, state);
  assert.equal(checked.ui_verification.status, 'pending');
  assert.match(checked.assurance_summary.text, /delivery review partial.*browser verification pending/);
  const dashboard = await generateDashboard(state);
  const dashboardHtml = await readFile(dashboard, 'utf8');
  assert.doesNotMatch(dashboardHtml, /assurance-summary|Assurance:|Browser verification: pending|Recorded verification limits/);
  assert.match(dashboardHtml, /href="DEMO-final-package\.md"/);
  const markdown = await readFile(built.package, 'utf8');
  assert.match(markdown, /\*\*Assurance: Limited — .*delivery review partial.*browser verification pending/);
  assert.ok(markdown.indexOf('Assurance: Limited') < markdown.indexOf('## Changes'));
  assert.equal(checked.current, true);
  assert.equal(checked.verification_summary.label, 'Verified');
  assert.match(markdown, /Acceptance verification: Verified/);
  // A review of the entire branch covers earlier work as well.
  reviewInput.review_scope[0].scope = 'branch';
  reviewInput.ui_verification = { status: 'passed', note: 'Opened dashboard; checked header and empty state.' };
  await writeReview(root, reviewInput);
  built = run('build', root, state, '--draft', draft, '--repo', root);
  pkg = JSON.parse(await readFile(built.json, 'utf8'));
  assert.equal(pkg.review_scope[0].status, 'covered');
  assert.equal(pkg.ui_verification.status, 'passed');
  const evidencePath = artifactJoin(dir, 'DEMO-review-evidence.json');
  const evidence = JSON.parse(await readFile(evidencePath, 'utf8'));
  evidence.ui_verification.note = 'Changed observation';
  await writeFile(evidencePath, JSON.stringify(evidence));
  assert.throws(() => run('check', root, state), /stale/);
  await writeFile(artifactJoin(dir, 'DEMO-review.md'), '# Different report\n');
  assert.throws(() => run('build', root, state, '--draft', draft, '--repo', root), /does not match the current report/);
});

test('binds AC verification evidence into the final package', async (t) => {
  const root = await mkdtemp(artifactJoin(os.tmpdir(), 'final-package-verification-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await initRepo(root);
  const { state, draft, dir } = await artifacts(root);
  const oldState = await readFile(state, 'utf8');
  await writeFile(state, oldState.replace('final_package_version: 1', 'final_package_version: 1\nverification_version: 1'));
  await writeFile(artifactJoin(dir, 'DEMO-plan.md'), '# Plan\n\n## Steps\n\n### Step 1 — Feature\n\n## Test Plan\n\n**AC traceability:**\n\n| Acceptance criterion | Test scenario |\n| --- | --- |\n| AC1 works | Happy path |\n');
  const ledger = { version: 1, ticket: 'DEMO', plan_version: 1,
    steps: [{ number: 1, checks: [{ type: 'automated', subject: 'Happy path', command: 'npm test', result: 'pass', note: 'Passed' }] }],
    gate: { mode: 'full-suite', result: 'pass', note: 'Full suite passed' },
    acceptance: [{ criterion: 'AC1 works', scenario: 'Happy path', status: 'automated', step: 1, note: 'Happy path passed' }] };
  const ledgerPath = artifactJoin(dir, 'DEMO-verification-v1.json');
  await writeFile(ledgerPath, JSON.stringify(ledger));
  await writeFile(artifactJoin(root, 'src/existing.txt'), 'after\n');
  const built = run('build', root, state, '--draft', draft, '--repo', root);
  const pkg = JSON.parse(await readFile(artifactJoin(dir, 'DEMO-final-package.json'), 'utf8'));
  assert.equal(pkg.evidence.verification.path, 'make-it-work/DEMO/DEMO-verification-v1.json');
  assert.equal(pkg.acceptance[0].status, 'automated');
  assert.match(await readFile(built.package, 'utf8'), /AC1 works/);
  assert.match(await readFile(built.package, 'utf8'), /Acceptance verification: Verified — 1 of 1 acceptance criteria verified/);
  await writeFile(ledgerPath, JSON.stringify({ ...ledger, acceptance: [{ ...ledger.acceptance[0], status: 'unverified', step: null, note: 'Not checked' }] }));
  assert.throws(() => run('check', root, state), /stale/);
});

test('a complete workflow reports partial criterion verification consistently in its package and single-repo dashboard', async (t) => {
  const root = await mkdtemp(artifactJoin(os.tmpdir(), 'final-package-partial-verification-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await initRepo(root);
  const { state, draft, dir } = await artifacts(root);
  await writeFile(state, (await readFile(state, 'utf8')).replace('final_package_version: 1', 'final_package_version: 1\nverification_version: 1'));
  await writeFile(artifactJoin(dir, 'DEMO-plan.md'), '# Plan\n\n## Steps\n\n### Step 1 — Feature\n\n## Test Plan\n\n**AC traceability:**\n\n| Acceptance criterion | Test scenario |\n| --- | --- |\n| AC1 parity | Happy path |\n| AC1 parity | Failure path |\n| AC2 display | Observe display |\n');
  const ledger = { version: 1, ticket: 'DEMO', plan_version: 1,
    steps: [{ number: 1, checks: [
      { type: 'automated', subject: 'Happy path', command: 'npm test', result: 'pass', note: 'Passed' },
      { type: 'manual', subject: 'Observe display', command: null, result: 'pass', note: 'Observed display' },
    ] }],
    gate: { mode: 'full-suite', result: 'pass', note: 'Full suite passed' },
    acceptance: [
      { criterion: 'AC1 parity', scenario: 'Happy path', status: 'automated', step: 1, note: 'Passed' },
      { criterion: 'AC1 parity', scenario: 'Failure path', status: 'unverified', step: null, note: 'Reference <unavailable>' },
      { criterion: 'AC2 display', scenario: 'Observe display', status: 'manual', step: 1, note: 'Observed display' },
    ] };
  await writeFile(artifactJoin(dir, 'DEMO-verification-v1.json'), JSON.stringify(ledger));
  const built = run('build', root, state, '--draft', draft, '--repo', root);
  const markdown = await readFile(built.package, 'utf8');
  assert.match(markdown, /Acceptance verification: Partially verified — 1 of 2 acceptance criteria pending/);
  assert.ok(markdown.indexOf('### Pending verification') < markdown.indexOf('## Changes'));
  const pkg = JSON.parse(await readFile(artifactJoin(dir, 'DEMO-final-package.json'), 'utf8'));
  assert.equal(pkg.acceptance[1].status, 'unverified');
  const checked = run('check', root, state);
  assert.equal(checked.current, true);
  assert.equal(checked.verification_summary.text, 'Partially verified — 1 of 2 acceptance criteria pending');
  const parsed = parseState(await readFile(state, 'utf8'));
  assert.equal(transition(parsed, { event: 'complete' }).fields.status, 'Complete');
  const completed = (await readFile(state, 'utf8')).replace('status: In Progress', 'status: Complete').replace('phase: final-approval', 'phase: complete');
  await writeFile(state, completed);
  const html = await readFile(await generateDashboard(state), 'utf8');
  assert.match(html, /Finalizing session\./);
  assert.match(html, /Acceptance verification: Partially verified/);
  assert.match(html, /1 of 2 acceptance criteria pending/);
  assert.match(html, /Reference &lt;unavailable&gt;/);
  assert.doesNotMatch(html, /Reference <unavailable>/);
  assert.equal(parseState(await readFile(state, 'utf8')).fields.status, 'Complete');
});

test('builds with matching scoped+full gate modes and rejects a mismatch', async (t) => {
  const root = await mkdtemp(artifactJoin(os.tmpdir(), 'final-package-scoped-full-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await initRepo(root);
  const { state, draft, dir } = await artifacts(root);
  const oldState = await readFile(state, 'utf8');
  await writeFile(state, oldState.replace('final_package_version: 1', 'final_package_version: 1\nverification_version: 1').replace('gate: full-suite', 'gate: scoped+full'));
  await writeFile(artifactJoin(dir, 'DEMO-plan.md'), '# Plan\n\n## Steps\n\n### Step 1 — Feature\n\n## Test Plan\n\n**AC traceability:**\n\n| Acceptance criterion | Test scenario |\n| --- | --- |\n| AC1 works | Happy path |\n');
  const ledger = { version: 1, ticket: 'DEMO', plan_version: 1,
    steps: [{ number: 1, checks: [{ type: 'automated', subject: 'Happy path', command: 'npm test', result: 'pass', note: 'Passed' }] }],
    gate: { mode: 'scoped+full', result: 'pass', note: 'Scoped then full suite passed' },
    acceptance: [{ criterion: 'AC1 works', scenario: 'Happy path', status: 'automated', step: 1, note: 'Happy path passed' }] };
  const ledgerPath = artifactJoin(dir, 'DEMO-verification-v1.json');
  await writeFile(ledgerPath, JSON.stringify(ledger));
  await writeFile(artifactJoin(root, 'src/existing.txt'), 'after\n');
  run('build', root, state, '--draft', draft, '--repo', root);
  const pkg = JSON.parse(await readFile(artifactJoin(dir, 'DEMO-final-package.json'), 'utf8'));
  assert.equal(pkg.validation.mode, 'scoped+full');
  await writeFile(ledgerPath, JSON.stringify({ ...ledger, gate: { ...ledger.gate, mode: 'scoped' } }));
  assert.throws(() => run('build', root, state, '--draft', draft, '--repo', root), /disagrees with state/);
});

test('packages a failed gate only when triage recorded every failure as unrelated', async (t) => {
  const root = await mkdtemp(artifactJoin(os.tmpdir(), 'final-package-unrelated-gate-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await initRepo(root);
  const { state, draft, dir } = await artifacts(root);
  const failedGate = (await readFile(state, 'utf8'))
    .replace('final_package_version: 1', 'final_package_version: 1\nverification_version: 1')
    .replace('execution: passed', 'execution: gate-failed');
  await writeFile(state, failedGate);
  await writeFile(artifactJoin(dir, 'DEMO-plan.md'), '# Plan\n\n## Steps\n\n### Step 1 — Feature\n\n## Test Plan\n\n**AC traceability:**\n\n| Acceptance criterion | Test scenario |\n| --- | --- |\n| AC1 works | Happy path |\n');
  await writeFile(artifactJoin(dir, 'DEMO-verification-v1.json'), JSON.stringify({ version: 1, ticket: 'DEMO', plan_version: 1,
    steps: [{ number: 1, checks: [{ type: 'automated', subject: 'Happy path', command: 'npm test', result: 'pass', note: 'Passed' }] }],
    gate: { mode: 'full-suite', result: 'fail', note: 'Legacy runtime tests fail on a clean base' },
    acceptance: [{ criterion: 'AC1 works', scenario: 'Happy path', status: 'automated', step: 1, note: 'Happy path passed' }] }));
  await writeFile(artifactJoin(root, 'src/existing.txt'), 'after\n');
  assert.throws(() => run('build', root, state, '--draft', draft, '--repo', root), /triage classified every failure as unrelated/);

  await writeFile(state, failedGate
    .replace('## Known regressions\n\nNone', '## Known regressions\n\n- demo: test/legacy.test.js — runs on the old runtime')
    .replace('| 1 | 2026-01-01T10:00:00Z | final-sync |', '| 1 | 2026-01-01T09:00:00Z | execute | review | Only unrelated regressions remain. |\n| 2 | 2026-01-01T10:00:00Z | final-sync |'));
  run('build', root, state, '--draft', draft, '--repo', root);
  const pkg = JSON.parse(await readFile(artifactJoin(dir, 'DEMO-final-package.json'), 'utf8'));
  assert.match(pkg.validation.result, /accepted: only unrelated pre-existing failures/);
  assert.deepEqual(pkg.known_regressions, ['demo: test/legacy.test.js — runs on the old runtime']);
  const markdown = await readFile(artifactJoin(dir, 'DEMO-final-package.md'), 'utf8');
  assert.match(markdown, /Known unrelated regressions: demo: test\/legacy\.test\.js/);
  assert.equal(run('check', root, state).current, true);
});

test('packages an explicitly manual completion without claiming automated PASS', async (t) => {
  const root = await mkdtemp(artifactJoin(os.tmpdir(), 'final-package-manual-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await initRepo(root);
  const { state, draft, dir } = await artifacts(root);
  await writeFile(state, stateMarkdown('DEMO').replace('final_package_version: 1', 'final_package_version: 1\nverification_version: 1')
    .replace('execution: passed', 'execution: verified-manually').replace('gate: full-suite', 'gate: none')
    .replace('context_updated: none', `testing_readiness: make-it-work/DEMO/DEMO-testing-readiness.md\ntesting_summary: ${JSON.stringify([{ repo: 'app', strategy: 'missing', verification: 'manual' }])}\nworkspace_snapshot: ${JSON.stringify([{ root, id: 'app' }])}\ncontext_updated: none`));
  await writeFile(artifactJoin(dir, 'DEMO-testing-readiness.md'), '# Readiness\n\nUser selected manual verification before planning.\n');
  await writeFile(artifactJoin(dir, 'DEMO-plan.md'), '# Plan\n\n## Verification Policy\n\n| Repo | Mode | Decision | Reason |\n| --- | --- | --- | --- |\n| app | manual | user | User deferred setup |\n\n## Steps\n\n### Step 1 — Feature\n\n## Test Plan\n\n| Scenario | Repo | Type | File / command |\n| --- | --- | --- | --- |\n| Happy path | app | Manual | Start app; perform action; observe result |\n\n**AC traceability:**\n\n| Acceptance criterion | Test scenario |\n| --- | --- |\n| AC1 works | Happy path |\n');
  const evidence = { version: 1, ticket: 'DEMO', plan_version: 1,
    steps: [{ number: 1, checks: [{ type: 'manual', subject: 'Happy path', command: null, result: 'pass', note: 'Observed expected behavior' }] }],
    gate: { mode: 'none', result: 'manual-accepted', note: 'Manual policy selected before planning; automated regression unavailable' },
    acceptance: [{ criterion: 'AC1 works', scenario: 'Happy path', status: 'manual', step: 1, note: 'Observed expected behavior' }] };
  await writeFile(artifactJoin(dir, 'DEMO-verification-v1.json'), JSON.stringify(evidence));
  await writeFile(draft, JSON.stringify({ commit_message: 'DEMO Add feature', pr_title: 'DEMO: Add feature', pr_description: 'Manual scenarios verified; automated regression unavailable.' }));
  run('build', root, state, '--draft', draft, '--repo', root);
  const pkg = JSON.parse(await readFile(artifactJoin(dir, 'DEMO-final-package.json'), 'utf8'));
  assert.deepEqual(pkg.validation, { mode: 'none', result: 'manual-accepted' });
  assert.equal(pkg.acceptance[0].status, 'manual');
  assert.equal(pkg.evidence.testing_readiness.path, 'make-it-work/DEMO/DEMO-testing-readiness.md');
  assert.equal(pkg.testing_summary[0].verification, 'manual');
  assert.match(run('check', root, state).testing_notes[0], /Strategy missing for app; used manual verification/);
  const savedState = await readFile(state, 'utf8');
  await writeFile(state, savedState.replace('\"verification\":\"manual\"', '\"verification\":\"automated\"'));
  assert.throws(() => run('check', root, state), /Testing summary changed/);
  await writeFile(state, savedState);
  assert.equal(run('check', root, state).current, true);
  await writeFile(artifactJoin(dir, 'DEMO-testing-readiness.md'), '# Readiness changed\n');
  assert.throws(() => run('check', root, state), /stale/);
  await writeFile(artifactJoin(dir, 'DEMO-verification-v1.json'), JSON.stringify({ ...evidence, acceptance: [{ ...evidence.acceptance[0], status: 'unverified', step: null }] }));
  assert.throws(() => run('build', root, state, '--draft', draft, '--repo', root), /every acceptance criterion/);
});

function adaptiveState(ticket, { mode, risk, escalations, implementationReport = `make-it-work/${ticket}/${ticket}-lightweight.md` }) {
  let state = stateMarkdown(ticket).replace('final_package_version: 1', `final_package_version: 1\nverification_version: 1\nadaptive_version: 1\nrisk: ${risk}\nmode: ${mode}\nmode_source: assessed\nrisk_rationale: Small isolated change\nescalations: ${escalations}\nimplementation_report: ${implementationReport}`);
  if (mode === 'lightweight') {
    state = state.replace(`plan: make-it-work/${ticket}/${ticket}-plan.md`, 'plan: none').replace('plan_hash: plan', 'plan_hash: none')
      .replace('execution: passed', 'execution: not-started').replace('gate: full-suite', 'gate: none')
      .replace(`execute_report: make-it-work/${ticket}/${ticket}-execute.md`, 'execute_report: none')
      .replace('context_updated: none', 'testing_readiness: none\ncontext_updated: none');
  }
  return state;
}

test('packages a Lightweight run from spec, implementation report and review only', async (t) => {
  const root = await mkdtemp(artifactJoin(os.tmpdir(), 'final-package-lightweight-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await initRepo(root);
  const { state, draft, dir } = await artifacts(root);
  for (const name of ['plan', 'execute']) await rm(artifactJoin(dir, `DEMO-${name}.md`));
  await writeFile(artifactJoin(dir, 'DEMO-lightweight.md'), '# Lightweight\n\nChanged src/existing.txt; ran unit tests.\n');
  await writeFile(state, adaptiveState('DEMO', { mode: 'lightweight', risk: 'low', escalations: 0 }));
  await writeFile(artifactJoin(root, 'src/existing.txt'), 'after\n');
  const built = run('build', root, state, '--draft', draft, '--repo', root);
  const pkg = JSON.parse(await readFile(artifactJoin(dir, 'DEMO-final-package.json'), 'utf8'));
  assert.deepEqual(Object.keys(pkg.evidence), ['spec', 'implementation', 'review']);
  assert.equal(pkg.evidence.implementation.path, 'make-it-work/DEMO/DEMO-lightweight.md');
  assert.deepEqual(pkg.validation, { mode: 'lightweight', result: 'Lightweight — no regression gate; verified by independent review' });
  assert.deepEqual(pkg.adaptive, { mode: 'lightweight', risk: 'low', mode_source: 'assessed', escalations: 0 });
  assert.equal(pkg.acceptance, undefined);
  assert.deepEqual(pkg.repos[0].paths, ['src/existing.txt']);
  const md = await readFile(built.package, 'utf8');
  assert.match(md, /Validation: Lightweight — no regression gate; verified by independent review\./);
  assert.match(md, /Mode: Lightweight \(assessed\) · Risk: low · Escalations: 0 \/ 1/);
  assert.doesNotMatch(md, /- plan:|- execute:/);
  run('approve', root, state, '--hash', built.sha256);
  assert.equal(run('check', root, state, '--require-approval').approved, true);
  await writeFile(artifactJoin(dir, 'DEMO-lightweight.md'), '# Lightweight changed\n');
  assert.throws(() => run('check', root, state), /stale/);
  await writeFile(state, adaptiveState('DEMO', { mode: 'lightweight', risk: 'low', escalations: 0 }).replace('review: clean', 'review: fix-required'));
  assert.throws(() => run('build', root, state, '--draft', draft, '--repo', root), /clean review/);
  await writeFile(state, adaptiveState('DEMO', { mode: 'lightweight', risk: 'low', escalations: 0, implementationReport: 'none' }));
  assert.throws(() => run('build', root, state, '--draft', draft, '--repo', root), /implementation report/);
});

test('packages an escalated run on the TDD path with the Lightweight report as extra evidence', async (t) => {
  const root = await mkdtemp(artifactJoin(os.tmpdir(), 'final-package-escalated-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await initRepo(root);
  const { state, draft, dir } = await artifacts(root);
  await writeFile(artifactJoin(dir, 'DEMO-lightweight.md'), '# Lightweight baseline\n');
  await writeFile(state, adaptiveState('DEMO', { mode: 'tdd', risk: 'medium', escalations: 1 }));
  await writeFile(artifactJoin(dir, 'DEMO-plan.md'), '# Plan\n\n## Steps\n\n### Step 1 — Feature\n\n## Test Plan\n\n**AC traceability:**\n\n| Acceptance criterion | Test scenario |\n| --- | --- |\n| AC1 works | Happy path |\n');
  await writeFile(artifactJoin(dir, 'DEMO-verification-v1.json'), JSON.stringify({ version: 1, ticket: 'DEMO', plan_version: 1,
    steps: [{ number: 1, checks: [{ type: 'automated', subject: 'Happy path', command: 'npm test', result: 'pass', note: 'Passed' }] }],
    gate: { mode: 'full-suite', result: 'pass', note: 'Full suite passed' },
    acceptance: [{ criterion: 'AC1 works', scenario: 'Happy path', status: 'automated', step: 1, note: 'Happy path passed' }] }));
  await writeFile(artifactJoin(root, 'src/existing.txt'), 'after\n');
  const built = run('build', root, state, '--draft', draft, '--repo', root);
  const pkg = JSON.parse(await readFile(artifactJoin(dir, 'DEMO-final-package.json'), 'utf8'));
  assert.deepEqual(Object.keys(pkg.evidence), ['spec', 'plan', 'execute', 'review', 'implementation', 'verification']);
  assert.deepEqual(pkg.validation, { mode: 'full-suite', result: 'pass' });
  assert.equal(pkg.acceptance[0].status, 'automated');
  assert.match(await readFile(built.package, 'utf8'), /Mode: TDD \(assessed\) · Risk: medium · Escalations: 1 \/ 1/);
  await writeFile(artifactJoin(dir, 'DEMO-lightweight.md'), '# Baseline changed\n');
  assert.throws(() => run('check', root, state), /stale/);
});

test('new builds for old runs add assurance presentation without adaptive fields', async (t) => {
  const root = await mkdtemp(artifactJoin(os.tmpdir(), 'final-package-legacy-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await initRepo(root);
  const { state, draft, dir } = await artifacts(root);
  await writeFile(artifactJoin(root, 'src/existing.txt'), 'after\n');
  const built = run('build', root, state, '--draft', draft, '--repo', root);
  const pkg = JSON.parse(await readFile(artifactJoin(dir, 'DEMO-final-package.json'), 'utf8'));
  assert.deepEqual(Object.keys(pkg), ['version', 'assurance_version', 'ticket', 'draft_path', 'draft_sha256', 'draft', 'evidence', 'validation', 'review', 'open_nits', 'known_regressions', 'decided_findings', 'repos']);
  assert.match(await readFile(built.package, 'utf8'), /^# Final approval — DEMO\n\n\*\*Assurance: Limited[^\n]*\n\nReview: clean\. Validation: full-suite — PASS\.\n\n## Changes/);
});


test('a rendered advisory review remains visible as an unfixed nit in the final package', async (t) => {
  const root = await mkdtemp(artifactJoin(os.tmpdir(), 'package-advisory-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await initRepo(root);
  const { state, draft, dir } = await artifacts(root);
  const reviewed = await writeReview(root, {
    version: 1, ticket: 'DEMO', branch: 'feature', commit: 'HEAD', working_tree: true,
    coverage: 'Reviewed against the accepted spec.', repo_roots: { app: root },
    implement: { plan_version: 1, review_cycle: 1 },
    findings: [{ severity: 'Minor', route: 'advisory', region: 'src/existing.txt', claim: 'Simplify the local name',
      evidence: 'The adjacent declaration uses a clearer name.', locations: [{ file: 'src/existing.txt', line: 1 }] }],
  });
  assert.equal(reviewed.outcome, 'CLEAN');
  const built = run('build', root, state, '--draft', draft, '--repo', root);
  const pkg = JSON.parse(await readFile(artifactJoin(dir, 'DEMO-final-package.json'), 'utf8'));
  assert.equal(pkg.open_nits.length, 1);
  assert.match(pkg.open_nits[0], /Simplify the local name/);
  assert.match(await readFile(built.package, 'utf8'), /Open review nits \(unfixed\):.*Simplify the local name/);
});

test('new clause contract blocks name-only handoff/package claims and renders each pending clause', async (t) => {
  const root = await mkdtemp(artifactJoin(os.tmpdir(), 'final-clause-evidence-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await initRepo(root);
  const { state, draft, dir } = await artifacts(root);
  await writeFile(state, (await readFile(state, 'utf8')).replace('final_package_version: 1', 'final_package_version: 1\nverification_version: 1\nacceptance_evidence_version: 1'));
  await writeFile(artifactJoin(dir, 'DEMO-plan.md'), '# Plan\n\n## Steps\n\n### Step 1 — Total\n\n## Test Plan\n\n**AC traceability:**\n\n| Acceptance criterion | Requirement clause | Test scenario |\n| --- | --- | --- |\n| AC1 parity | Include prepaid value | Total |\n| AC1 parity | Preserve ascending output order | Total |\n');
  await writeFile(artifactJoin(dir, 'DEMO-execute.md'), 'Execute outcome: PASSED\n');
  const evidence = { version: 1, ticket: 'DEMO', plan_version: 1,
    steps: [{ number: 1, checks: [{ type: 'automated', subject: 'Total', command: 'node test.js', result: 'pass', note: 'Named test passes', assertions: [{ clause: 'Include prepaid value', expected: '100 + 25 = 125', observed: '125', source: 'test.js:12 assert.equal(total, 125)' }] }] }],
    gate: { mode: 'full-suite', result: 'pass', note: 'Tests passed' },
    acceptance: [
      { criterion: 'AC1 parity', clause: 'Include prepaid value', scenario: 'Total', status: 'automated', step: 1, note: 'Amount assertion passes' },
      { criterion: 'AC1 parity', clause: 'Preserve ascending output order', scenario: 'Total', status: 'automated', step: 1, note: 'Same named test passes' },
    ] };
  const relative = 'make-it-work/DEMO/DEMO-verification-v1.json';
  await writeFile(artifactJoin(root, relative), JSON.stringify(evidence));
  const handoff = { version: 1, ticket: 'DEMO', stage: 'execute', plan_version: 1, status: 'done', outcome: 'PASSED', artifacts: { report: 'make-it-work/DEMO/DEMO-execute.md', verification: relative }, data: { discoveries: [], failing_tests: [], gate: 'full-suite' } };
  await assert.rejects(validateArtifacts(handoff, root, { requireClauses: true }), /Acceptance evidence is missing/);
  assert.throws(() => run('build', root, state, '--draft', draft, '--repo', root), /Acceptance evidence is missing/);
  evidence.acceptance[1] = { ...evidence.acceptance[1], status: 'unverified', step: null, note: 'No ordering assertion was executed.' };
  await writeFile(artifactJoin(root, relative), JSON.stringify(evidence));
  await validateArtifacts(handoff, root, { requireClauses: true });
  const built = run('build', root, state, '--draft', draft, '--repo', root);
  const md = await readFile(built.package, 'utf8');
  assert.match(md, /Acceptance verification: Pending verification — 1 of 1 acceptance criteria pending/);
  assert.match(md, /Preserve ascending output order/);
  assert.match(md, /Source: test.js:12/);
  assert.match(md, /Expected: 100 \+ 25 = 125; Observed: 125/);
  await generateDashboard(state);
  assert.match(await readFile(state.replace('-state.md', '-status.html'), 'utf8'), /Preserve ascending output order/);
  assert.equal(run('check', root, state).verification_summary.pending, 1);
  assert.match(run('check', root, state).assurance_summary.text, /acceptance verification pending/);
});


test('approved historical packages retain their exact presentation and approval while exposing a limited check summary', async (t) => {
  const root = await mkdtemp(artifactJoin(os.tmpdir(), 'assurance-legacy-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await initRepo(root);
  const { state, draft, dir } = await artifacts(root);
  await verifiedAcceptance(root, state, dir);
  const built = run('build', root, state, '--draft', draft, '--repo', root);
  const pkg = JSON.parse(await readFile(built.json, 'utf8'));
  assert.equal(pkg.assurance_version, 1);
  delete pkg.assurance_version;
  // Recreate the preceding formatter: no assurance headline and the original acceptance label.
  const oldMarkdown = (await readFile(built.package, 'utf8')).replace(/^\*\*Assurance:.*\n\n/m, '').replace('**Acceptance verification:', '**Verification:');
  await writeFile(built.json, JSON.stringify(pkg, null, 2) + '\n');
  await writeFile(built.package, oldMarkdown);
  const hash = createHash('sha256').update(JSON.stringify(pkg)).digest('hex');
  await writeFile(artifactJoin(dir, 'DEMO-final-approval.json'), JSON.stringify({ version: 1, ticket: 'DEMO', package_sha256: hash }));
  const checked = run('check', root, state, '--require-approval');
  assert.equal(checked.approved, true);
  assert.equal(checked.sha256, hash);
  assert.equal(checked.verification_summary.label, 'Verified');
  assert.match(checked.assurance_summary.text, /delivery review unknown.*browser verification pending/);
  assert.match(oldMarkdown, /\*\*Verification: Verified/);
  assert.equal(await readFile(built.package, 'utf8'), oldMarkdown);
  assert.equal(await readFile(built.json, 'utf8'), JSON.stringify(pkg, null, 2) + '\n');
  // Rebuilding opts into the new presentation and normal approval binding.
  run('build', root, state, '--draft', draft, '--repo', root);
  assert.equal(run('check', root, state).approved, false);
  assert.match(await readFile(built.package, 'utf8'), /Assurance: Limited/);
});

for (const mode of ['tdd', 'lightweight']) test(`change assessment is informational and consistent across ${mode} packaging/dashboard`, async t => {
  const { captureScope, assess, saveAssessment, unavailable } = await import('../../../scripts/change-assessment.mjs');
  const root = await mkdtemp(artifactJoin(os.tmpdir(), 'assessment-package-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await initRepo(root);
  const { state, draft, dir } = await artifacts(root);
  if (mode === 'lightweight') {
    await writeFile(state, adaptiveState('DEMO', { mode, risk: 'low', escalations: 0 }));
    await writeFile(artifactJoin(dir, 'DEMO-lightweight.md'), '# Implemented\n');
  }
  await writeFile(state, (await readFile(state, 'utf8')).replace('final_package_version: 1', 'final_package_version: 1\nchange_assessment_version: 1'));
  const before = await readFile(state, 'utf8');
  await generateDashboard(state);
  const html = artifactJoin(dir, 'DEMO-status.html');
  assert.doesNotMatch(await readFile(html, 'utf8'), /class="change-assessment"|Assessment:|Code complexity:|CHANGE_ASSESSMENT/);
  let built = run('build', root, state, '--draft', draft, '--repo', root);
  let pkg = JSON.parse(await readFile(built.json,'utf8'));
  assert.equal(pkg.change_assessment.completeness,'unavailable');
  assert.equal(run('check',root,state).current,true);
  await writeFile(artifactJoin(root,'src/existing.txt'),'after\n');
  const scope={ label:'DEMO', repos:[{path:root,base:'main'}] };
  const snap=await captureScope(scope);
  const report=assess(snap,{ snapshot_id:snap.snapshot_id, rationale:'src/existing.txt:1 sensitive contract change', repos:[{
    path:snap.repos[0].path, full_scope:true, coverage:[{file:'src/existing.txt',status:'assessed',evidence:'Full diff inspected'}],
    dependencies:'All consumers checked', verification:'Existing validation retained', measurements:'missing', measurement_limitation:'No analyzer available',
    complexity_dimensions:[{dimension:'state',rating:'High',evidence:'Inherited state complexity in changed function'}], risk_dimensions:[{dimension:'impact',rating:'Low',evidence:'Local change'}]
  }] });
  await saveAssessment(root,'DEMO',report);
  const afterSave = await readFile(state, 'utf8');
  assert.equal(parseState(afterSave).audit.filter(row => row.note?.id.startsWith('change-assessment:')).length, 1, 'Saving a final assessment must persist its audit entry immediately.');
  for (const phase of mode === 'lightweight' ? ['close-the-gaps', 'lightweight', 'review', 'final-sync'] : ['close-the-gaps', 'plan', 'execute', 'review', 'final-sync']) {
    const early = before.replace('phase: final-approval', `phase: ${phase}`);
    await writeFile(state, early);
    await generateDashboard(state);
    assert.doesNotMatch(await readFile(html, 'utf8'), /class="pill assessment-|class="change-assessment"|CHANGE_ASSESSMENT/);
    assert.equal(await readFile(state, 'utf8'), early, 'Earlier phases must not checkpoint an assessment.');
  }
  await writeFile(state, afterSave);
  built=run('build',root,state,'--draft',draft,'--repo',root);
  pkg=JSON.parse(await readFile(built.json,'utf8'));
  assert.equal(pkg.change_assessment.complexity,'High'); assert.equal(pkg.change_assessment.risk,'High'); assert.equal(pkg.review.status,'clean');
  await generateDashboard(state);
  const rendered = await readFile(html, 'utf8');
  const header = value => value.match(/<div class="header-badges"[^>]*>(.*?)<\/div>/s)?.[1] ?? '';
  assert.match(header(rendered), /class="pill assessment-high"[^>]*>Code complexity: High/);
  assert.match(header(rendered), /class="pill assessment-high"[^>]*>Production risk: High/);
  assert.match(header(rendered), /title="Completeness: partial\. src\/existing.txt:1 sensitive contract change"/);
  assert.doesNotMatch(rendered, /class="change-assessment"|<h2>Change assessment|CHANGE_ASSESSMENT/);
  assert.match(rendered, /Result: Change assessment — Code complexity: High; Production risk: High; completeness: partial.*href="DEMO-complexity.md"/);
  const assessmentRows = async () => parseState(await readFile(state, 'utf8')).audit.filter(row => row.note?.id.startsWith('change-assessment:'));
  assert.equal((await assessmentRows()).length, 1);
  const savedState = await readFile(state, 'utf8');
  await generateDashboard(state); await generateDashboard(state);
  const resumed = JSON.parse(execFileSync(process.execPath, [path.resolve('skills/implement/scripts/dashboard-checkpoint.mjs'), 'resume', '--state', state], { encoding: 'utf8' }));
  assert.equal(resumed.last_work_row.number, 1);
  await generateDashboard(state);
  assert.equal(await readFile(state, 'utf8'), savedState, 'Refresh and resume cannot repeat the assessment audit entry.');
  assert.match(await readFile(built.package,'utf8'),/Code complexity: High · Production change risk: High · partial/);
  assert.equal(run('check',root,state).current,true);
  await writeFile(artifactJoin(root,'src/existing.txt'),'changed again\n');
  await generateDashboard(state);
  const staleHtml = await readFile(html, 'utf8');
  assert.match(header(staleHtml), /class="pill assessment-neutral"[^>]*>Assessment: Stale/);
  assert.match(header(staleHtml), /snapshot changed/);
  assert.doesNotMatch(header(staleHtml), /Code complexity:|Production risk:/);
  assert.equal((await assessmentRows()).length, 2);
  await generateDashboard(state); assert.equal((await assessmentRows()).length, 2);
  const next=await captureScope(scope);
  await saveAssessment(root,'DEMO',unavailable(next,'Reassessment failed: analyzer crashed'));
  built=run('build',root,state,'--draft',draft,'--repo',root);
  assert.match(await readFile(built.package,'utf8'),/Assessment unavailable.*analyzer crashed/);
  assert.match(await readFile(built.package,'utf8'),/Stale history/);
  assert.doesNotMatch(await readFile(built.package,'utf8'),/Code complexity: High/);
  assert.equal(run('check',root,state).current,true);
  const failedHtml = await readFile(html, 'utf8');
  assert.match(header(failedHtml), /class="pill assessment-neutral"[^>]*>Assessment: Unavailable/);
  assert.match(header(failedHtml), /analyzer crashed/);
  assert.doesNotMatch(header(failedHtml), /Code complexity:|Production risk:/);
  assert.equal((await assessmentRows()).length, 3);
  // Reassessment of the same scope is a new result, not a repeated refresh.
  const reassessed = structuredClone(report);
  reassessed.scope = next; reassessed.timestamp = '2026-11-16T15:00:00Z';
  await saveAssessment(root, 'DEMO', reassessed);
  await generateDashboard(state);
  assert.equal((await assessmentRows()).length, 4);
  assert.match(header(await readFile(html, 'utf8')), /Code complexity: High/);
  const completed = (await readFile(state, 'utf8')).replace('status: In Progress', 'status: Complete').replace('phase: final-approval', 'phase: complete');
  await writeFile(state, completed);
  await generateDashboard(state);
  assert.equal((await assessmentRows()).length, 4);
  assert.match(header(await readFile(html, 'utf8')), /Production risk: High/);
  await writeFile(state, completed.replace('status: Complete', 'status: In Progress').replace('phase: complete', 'phase: final-approval'));
  await writeFile(artifactJoin(dir, 'DEMO-complexity.json'), '{broken report');
  await generateDashboard(state);
  assert.match(header(await readFile(html, 'utf8')), /Assessment: Unavailable/);
  assert.doesNotMatch(header(await readFile(html, 'utf8')), /Code complexity:|Production risk:/);
  assert.equal((await assessmentRows()).length, 5);
  await generateDashboard(state); assert.equal((await assessmentRows()).length, 5);
  await rm(artifactJoin(dir, 'DEMO-complexity.json'));
  await generateDashboard(state);
  assert.match(header(await readFile(html, 'utf8')), /Assessment: Unavailable/);
  assert.match(header(await readFile(html, 'utf8')), /Recorded assessment evidence is missing/);
  assert.equal((await assessmentRows()).length, 6);
  await generateDashboard(state); assert.equal((await assessmentRows()).length, 6);
  // Informational assessment/package checkpoints may change audit only; gates are unchanged.
  const after = await readFile(state,'utf8');
  for (const key of ['phase','mode','risk','review','gate','execution']) assert.equal(parseState(after).fields[key],parseState(before).fields[key]);
});

test('explicit standalone reports leave older package bytes and approval intact', async t => {
  const { captureScope, saveAssessment, unavailable }=await import('../../../scripts/change-assessment.mjs');
  const root=await mkdtemp(artifactJoin(os.tmpdir(),'assessment-legacy-'));
  t.after(()=>rm(root,{recursive:true,force:true})); await initRepo(root);
  const {state,draft}=await artifacts(root);
  const built=run('build',root,state,'--draft',draft,'--repo',root); run('approve',root,state,'--hash',built.sha256);
  const bytes=await readFile(built.json,'utf8');
  await saveAssessment(root,'DEMO-assessment-new',unavailable(await captureScope({label:'Older DEMO',repos:[{path:root,base:'main'}]}),'No analyzer evidence'));
  assert.equal(await readFile(built.json,'utf8'),bytes);
  assert.equal(run('check',root,state,'--require-approval').approved,true);
  const stateBytes = await readFile(state, 'utf8');
  await saveAssessment(root, 'DEMO', unavailable(await captureScope({ label: 'Legacy DEMO', repos: [{ path: root, base: 'main' }] }), 'Explicit assessment on an older run'));
  const legacyHtml = await readFile(await generateDashboard(state), 'utf8');
  assert.doesNotMatch(legacyHtml, /Assessment:|Code complexity:|Production risk:|CHANGE_ASSESSMENT/);
  assert.equal(await readFile(state, 'utf8'), stateBytes);
  assert.equal(await readFile(built.json, 'utf8'), bytes);
});
