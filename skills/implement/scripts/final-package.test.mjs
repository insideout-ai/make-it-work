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
  await writeFile(path.join(root, '.gitignore'), 'make-it-work/\n');
  await mkdir(path.join(root, 'src'));
  await writeFile(path.join(root, 'src/existing.txt'), 'before\n');
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
  const dir = path.join(root, 'make-it-work', ticket);
  await mkdir(dir, { recursive: true });
  for (const name of ['spec', 'plan', 'execute', 'review']) await writeFile(path.join(dir, `${ticket}-${name}.md`), `# ${name}\n`);
  const draft = path.join(dir, `${ticket}-final-draft.json`);
  await writeFile(draft, JSON.stringify({ commit_message: 'DEMO Add feature', pr_title: 'DEMO: Add feature', pr_description: 'Implements AC1. Full suite passed.' }));
  const state = path.join(dir, `${ticket}-state.md`);
  await writeFile(state, stateMarkdown(ticket));
  return { state, draft, dir };
}

async function verifiedAcceptance(root, state, dir) {
  await writeFile(state, (await readFile(state, 'utf8')).replace('final_package_version: 1', 'final_package_version: 1\nverification_version: 1'));
  await writeFile(path.join(dir, 'DEMO-plan.md'), '# Plan\n\n## Steps\n\n### Step 1 — Feature\n\n## Test Plan\n\n**AC traceability:**\n\n| Acceptance criterion | Test scenario |\n| --- | --- |\n| AC1 works | Happy path |\n');
  await writeFile(path.join(dir, 'DEMO-verification-v1.json'), JSON.stringify({ version: 1, ticket: 'DEMO', plan_version: 1,
    steps: [{ number: 1, checks: [{ type: 'automated', subject: 'Happy path', command: 'npm test', result: 'pass', note: 'Passed' }] }],
    gate: { mode: 'full-suite', result: 'pass', note: 'Full suite passed' },
    acceptance: [{ criterion: 'AC1 works', scenario: 'Happy path', status: 'automated', step: 1, note: 'Happy path passed' }],
  }));
}

test('builds a binary-safe working-tree package and invalidates approval on changes', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'final-package-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await initRepo(root);
  const { state, draft, dir } = await artifacts(root);
  await writeFile(path.join(dir, 'DEMO-review.md'), '**Verdict:** Approve with nits — 0 Critical, 0 Major, 1 Minor\n\n1. **[Minor]** Simplify the local name.\n\nOrchestrator outcome: CLEAN\n');
  await writeFile(path.join(root, 'src/existing.txt'), 'after\n');
  await writeFile(path.join(root, 'src/new.txt'), 'new\n');
  await writeFile(path.join(root, 'src/image.bin'), Buffer.from([0, 1, 2, 3, 255]));
  const built = run('build', root, state, '--draft', draft, '--repo', root);
  const audited = parseState(await readFile(state, 'utf8'));
  assert.equal(audited.audit.at(-1).note.kind, 'result');
  assert.ok(audited.audit.at(-1).outcome.includes(built.sha256));
  assert.equal(lastWorkRow(audited.audit).number, 1);
  run('build', root, state, '--draft', draft, '--repo', root);
  assert.equal(parseState(await readFile(state, 'utf8')).audit.length, audited.audit.length);
  const pkg = JSON.parse(await readFile(path.join(dir, 'DEMO-final-package.json'), 'utf8'));
  assert.deepEqual(pkg.repos[0].paths, ['src/existing.txt', 'src/image.bin', 'src/new.txt']);
  assert.deepEqual(pkg.open_nits, ['Simplify the local name.']);
  assert.equal(pkg.validation.result, 'PASS');
  assert.match(await readFile(built.package, 'utf8'), /DEMO: Add feature/);
  const diff = await readFile(path.join(dir, pkg.repos[0].diff_file), 'utf8');
  assert.match(diff, /new\n/);
  assert.match(diff, /GIT binary patch/);
  assert.throws(() => run('check', root, state, '--require-approval'), /no current approval/);
  run('approve', root, state, '--hash', built.sha256);
  assert.equal(run('check', root, state, '--require-approval').approved, true);
  await writeFile(path.join(root, 'src/existing.txt'), 'changed again\n');
  assert.throws(() => run('check', root, state), /stale/);
  const rebuilt = run('build', root, state, '--draft', draft, '--repo', root);
  assert.notEqual(rebuilt.sha256, built.sha256);
  assert.equal(run('check', root, state).approved, false);
  await writeFile(draft, JSON.stringify({ commit_message: 'DEMO Revised', pr_title: 'DEMO: Add feature', pr_description: 'Implements AC1. Full suite passed.' }));
  assert.throws(() => run('check', root, state), /stale/);
  await writeFile(draft, JSON.stringify({ commit_message: 'DEMO Add feature', pr_title: 'DEMO: Add feature', pr_description: 'Implements AC1. Full suite passed.' }));
  run('build', root, state, '--draft', draft, '--repo', root);
  await writeFile(path.join(dir, 'DEMO-execute.md'), '# execution changed\n');
  assert.throws(() => run('check', root, state), /stale/);
});

test('includes every explicitly affected repository', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'final-package-workspace-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const one = path.join(root, 'service-one');
  const two = path.join(root, 'service-two');
  await initRepo(one);
  await initRepo(two);
  const { state, draft, dir } = await artifacts(root);
  await writeFile(path.join(one, 'src/existing.txt'), 'one\n');
  await writeFile(path.join(two, 'src/existing.txt'), 'two\n');
  run('build', root, state, '--draft', draft, '--repo', one, '--repo', two);
  const pkg = JSON.parse(await readFile(path.join(dir, 'DEMO-final-package.json'), 'utf8'));
  assert.deepEqual(pkg.repos.map((r) => r.name), ['service-one', 'service-two']);
  assert.equal(run('check', root, state).current, true);
});

test('delivery scope distinguishes reviewed changes from earlier commits in the same file and binds browser evidence', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'final-package-review-scope-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await initRepo(root);
  git(root, 'switch', '-qc', 'feature');
  const { state, draft, dir } = await artifacts(root);
  await writeFile(path.join(root, 'src/existing.txt'), 'earlier branch work\n');
  git(root, 'add', 'src/existing.txt');
  git(root, '-c', 'user.name=Test', '-c', 'user.email=test@example.test', 'commit', '-qm', 'Earlier work');
  await writeFile(path.join(root, 'src/existing.txt'), 'earlier branch work\ninvoice change\n');
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
  const evidencePath = path.join(dir, 'DEMO-review-evidence.json');
  const evidence = JSON.parse(await readFile(evidencePath, 'utf8'));
  evidence.ui_verification.note = 'Changed observation';
  await writeFile(evidencePath, JSON.stringify(evidence));
  assert.throws(() => run('check', root, state), /stale/);
  await writeFile(path.join(dir, 'DEMO-review.md'), '# Different report\n');
  assert.throws(() => run('build', root, state, '--draft', draft, '--repo', root), /does not match the current report/);
});

test('binds AC verification evidence into the final package', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'final-package-verification-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await initRepo(root);
  const { state, draft, dir } = await artifacts(root);
  const oldState = await readFile(state, 'utf8');
  await writeFile(state, oldState.replace('final_package_version: 1', 'final_package_version: 1\nverification_version: 1'));
  await writeFile(path.join(dir, 'DEMO-plan.md'), '# Plan\n\n## Steps\n\n### Step 1 — Feature\n\n## Test Plan\n\n**AC traceability:**\n\n| Acceptance criterion | Test scenario |\n| --- | --- |\n| AC1 works | Happy path |\n');
  const ledger = { version: 1, ticket: 'DEMO', plan_version: 1,
    steps: [{ number: 1, checks: [{ type: 'automated', subject: 'Happy path', command: 'npm test', result: 'pass', note: 'Passed' }] }],
    gate: { mode: 'full-suite', result: 'pass', note: 'Full suite passed' },
    acceptance: [{ criterion: 'AC1 works', scenario: 'Happy path', status: 'automated', step: 1, note: 'Happy path passed' }] };
  const ledgerPath = path.join(dir, 'DEMO-verification-v1.json');
  await writeFile(ledgerPath, JSON.stringify(ledger));
  await writeFile(path.join(root, 'src/existing.txt'), 'after\n');
  const built = run('build', root, state, '--draft', draft, '--repo', root);
  const pkg = JSON.parse(await readFile(path.join(dir, 'DEMO-final-package.json'), 'utf8'));
  assert.equal(pkg.evidence.verification.path, 'make-it-work/DEMO/DEMO-verification-v1.json');
  assert.equal(pkg.acceptance[0].status, 'automated');
  assert.match(await readFile(built.package, 'utf8'), /AC1 works/);
  assert.match(await readFile(built.package, 'utf8'), /Acceptance verification: Verified — 1 of 1 acceptance criteria verified/);
  await writeFile(ledgerPath, JSON.stringify({ ...ledger, acceptance: [{ ...ledger.acceptance[0], status: 'unverified', step: null, note: 'Not checked' }] }));
  assert.throws(() => run('check', root, state), /stale/);
});

test('a complete workflow reports partial criterion verification consistently in its package and single-repo dashboard', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'final-package-partial-verification-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await initRepo(root);
  const { state, draft, dir } = await artifacts(root);
  await writeFile(state, (await readFile(state, 'utf8')).replace('final_package_version: 1', 'final_package_version: 1\nverification_version: 1'));
  await writeFile(path.join(dir, 'DEMO-plan.md'), '# Plan\n\n## Steps\n\n### Step 1 — Feature\n\n## Test Plan\n\n**AC traceability:**\n\n| Acceptance criterion | Test scenario |\n| --- | --- |\n| AC1 parity | Happy path |\n| AC1 parity | Failure path |\n| AC2 display | Observe display |\n');
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
  await writeFile(path.join(dir, 'DEMO-verification-v1.json'), JSON.stringify(ledger));
  const built = run('build', root, state, '--draft', draft, '--repo', root);
  const markdown = await readFile(built.package, 'utf8');
  assert.match(markdown, /Acceptance verification: Partially verified — 1 of 2 acceptance criteria pending/);
  assert.ok(markdown.indexOf('### Pending verification') < markdown.indexOf('## Changes'));
  const pkg = JSON.parse(await readFile(path.join(dir, 'DEMO-final-package.json'), 'utf8'));
  assert.equal(pkg.acceptance[1].status, 'unverified');
  const checked = run('check', root, state);
  assert.equal(checked.current, true);
  assert.equal(checked.verification_summary.text, 'Partially verified — 1 of 2 acceptance criteria pending');
  const parsed = parseState(await readFile(state, 'utf8'));
  assert.equal(transition(parsed, { event: 'complete' }).fields.status, 'Complete');
  const completed = (await readFile(state, 'utf8')).replace('status: In Progress', 'status: Complete').replace('phase: final-approval', 'phase: complete');
  await writeFile(state, completed);
  const html = await readFile(await generateDashboard(state), 'utf8');
  assert.match(html, /Implementation complete\./);
  assert.match(html, /Acceptance verification: Partially verified/);
  assert.match(html, /1 of 2 acceptance criteria pending/);
  assert.match(html, /Reference &lt;unavailable&gt;/);
  assert.doesNotMatch(html, /Reference <unavailable>/);
  assert.equal(parseState(await readFile(state, 'utf8')).fields.status, 'Complete');
});

test('builds with matching scoped+full gate modes and rejects a mismatch', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'final-package-scoped-full-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await initRepo(root);
  const { state, draft, dir } = await artifacts(root);
  const oldState = await readFile(state, 'utf8');
  await writeFile(state, oldState.replace('final_package_version: 1', 'final_package_version: 1\nverification_version: 1').replace('gate: full-suite', 'gate: scoped+full'));
  await writeFile(path.join(dir, 'DEMO-plan.md'), '# Plan\n\n## Steps\n\n### Step 1 — Feature\n\n## Test Plan\n\n**AC traceability:**\n\n| Acceptance criterion | Test scenario |\n| --- | --- |\n| AC1 works | Happy path |\n');
  const ledger = { version: 1, ticket: 'DEMO', plan_version: 1,
    steps: [{ number: 1, checks: [{ type: 'automated', subject: 'Happy path', command: 'npm test', result: 'pass', note: 'Passed' }] }],
    gate: { mode: 'scoped+full', result: 'pass', note: 'Scoped then full suite passed' },
    acceptance: [{ criterion: 'AC1 works', scenario: 'Happy path', status: 'automated', step: 1, note: 'Happy path passed' }] };
  const ledgerPath = path.join(dir, 'DEMO-verification-v1.json');
  await writeFile(ledgerPath, JSON.stringify(ledger));
  await writeFile(path.join(root, 'src/existing.txt'), 'after\n');
  run('build', root, state, '--draft', draft, '--repo', root);
  const pkg = JSON.parse(await readFile(path.join(dir, 'DEMO-final-package.json'), 'utf8'));
  assert.equal(pkg.validation.mode, 'scoped+full');
  await writeFile(ledgerPath, JSON.stringify({ ...ledger, gate: { ...ledger.gate, mode: 'scoped' } }));
  assert.throws(() => run('build', root, state, '--draft', draft, '--repo', root), /disagrees with state/);
});

test('packages an explicitly manual completion without claiming automated PASS', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'final-package-manual-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await initRepo(root);
  const { state, draft, dir } = await artifacts(root);
  await writeFile(state, stateMarkdown('DEMO').replace('final_package_version: 1', 'final_package_version: 1\nverification_version: 1')
    .replace('execution: passed', 'execution: verified-manually').replace('gate: full-suite', 'gate: none')
    .replace('context_updated: none', 'testing_readiness: make-it-work/DEMO/DEMO-testing-readiness.md\ncontext_updated: none'));
  await writeFile(path.join(dir, 'DEMO-testing-readiness.md'), '# Readiness\n\nUser selected manual verification before planning.\n');
  await writeFile(path.join(dir, 'DEMO-plan.md'), '# Plan\n\n## Verification Policy\n\n| Repo | Mode | Decision | Reason |\n| --- | --- | --- | --- |\n| app | manual | user | User deferred setup |\n\n## Steps\n\n### Step 1 — Feature\n\n## Test Plan\n\n| Scenario | Repo | Type | File / command |\n| --- | --- | --- | --- |\n| Happy path | app | Manual | Start app; perform action; observe result |\n\n**AC traceability:**\n\n| Acceptance criterion | Test scenario |\n| --- | --- |\n| AC1 works | Happy path |\n');
  const evidence = { version: 1, ticket: 'DEMO', plan_version: 1,
    steps: [{ number: 1, checks: [{ type: 'manual', subject: 'Happy path', command: null, result: 'pass', note: 'Observed expected behavior' }] }],
    gate: { mode: 'none', result: 'manual-accepted', note: 'Manual policy selected before planning; automated regression unavailable' },
    acceptance: [{ criterion: 'AC1 works', scenario: 'Happy path', status: 'manual', step: 1, note: 'Observed expected behavior' }] };
  await writeFile(path.join(dir, 'DEMO-verification-v1.json'), JSON.stringify(evidence));
  await writeFile(draft, JSON.stringify({ commit_message: 'DEMO Add feature', pr_title: 'DEMO: Add feature', pr_description: 'Manual scenarios verified; automated regression unavailable.' }));
  run('build', root, state, '--draft', draft, '--repo', root);
  const pkg = JSON.parse(await readFile(path.join(dir, 'DEMO-final-package.json'), 'utf8'));
  assert.deepEqual(pkg.validation, { mode: 'none', result: 'manual-accepted' });
  assert.equal(pkg.acceptance[0].status, 'manual');
  assert.equal(pkg.evidence.testing_readiness.path, 'make-it-work/DEMO/DEMO-testing-readiness.md');
  assert.equal(run('check', root, state).current, true);
  await writeFile(path.join(dir, 'DEMO-testing-readiness.md'), '# Readiness changed\n');
  assert.throws(() => run('check', root, state), /stale/);
  await writeFile(path.join(dir, 'DEMO-verification-v1.json'), JSON.stringify({ ...evidence, acceptance: [{ ...evidence.acceptance[0], status: 'unverified', step: null }] }));
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
  const root = await mkdtemp(path.join(os.tmpdir(), 'final-package-lightweight-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await initRepo(root);
  const { state, draft, dir } = await artifacts(root);
  for (const name of ['plan', 'execute']) await rm(path.join(dir, `DEMO-${name}.md`));
  await writeFile(path.join(dir, 'DEMO-lightweight.md'), '# Lightweight\n\nChanged src/existing.txt; ran unit tests.\n');
  await writeFile(state, adaptiveState('DEMO', { mode: 'lightweight', risk: 'low', escalations: 0 }));
  await writeFile(path.join(root, 'src/existing.txt'), 'after\n');
  const built = run('build', root, state, '--draft', draft, '--repo', root);
  const pkg = JSON.parse(await readFile(path.join(dir, 'DEMO-final-package.json'), 'utf8'));
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
  await writeFile(path.join(dir, 'DEMO-lightweight.md'), '# Lightweight changed\n');
  assert.throws(() => run('check', root, state), /stale/);
  await writeFile(state, adaptiveState('DEMO', { mode: 'lightweight', risk: 'low', escalations: 0 }).replace('review: clean', 'review: fix-required'));
  assert.throws(() => run('build', root, state, '--draft', draft, '--repo', root), /clean review/);
  await writeFile(state, adaptiveState('DEMO', { mode: 'lightweight', risk: 'low', escalations: 0, implementationReport: 'none' }));
  assert.throws(() => run('build', root, state, '--draft', draft, '--repo', root), /implementation report/);
});

test('packages an escalated run on the TDD path with the Lightweight report as extra evidence', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'final-package-escalated-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await initRepo(root);
  const { state, draft, dir } = await artifacts(root);
  await writeFile(path.join(dir, 'DEMO-lightweight.md'), '# Lightweight baseline\n');
  await writeFile(state, adaptiveState('DEMO', { mode: 'tdd', risk: 'medium', escalations: 1 }));
  await writeFile(path.join(dir, 'DEMO-plan.md'), '# Plan\n\n## Steps\n\n### Step 1 — Feature\n\n## Test Plan\n\n**AC traceability:**\n\n| Acceptance criterion | Test scenario |\n| --- | --- |\n| AC1 works | Happy path |\n');
  await writeFile(path.join(dir, 'DEMO-verification-v1.json'), JSON.stringify({ version: 1, ticket: 'DEMO', plan_version: 1,
    steps: [{ number: 1, checks: [{ type: 'automated', subject: 'Happy path', command: 'npm test', result: 'pass', note: 'Passed' }] }],
    gate: { mode: 'full-suite', result: 'pass', note: 'Full suite passed' },
    acceptance: [{ criterion: 'AC1 works', scenario: 'Happy path', status: 'automated', step: 1, note: 'Happy path passed' }] }));
  await writeFile(path.join(root, 'src/existing.txt'), 'after\n');
  const built = run('build', root, state, '--draft', draft, '--repo', root);
  const pkg = JSON.parse(await readFile(path.join(dir, 'DEMO-final-package.json'), 'utf8'));
  assert.deepEqual(Object.keys(pkg.evidence), ['spec', 'plan', 'execute', 'review', 'implementation', 'verification']);
  assert.deepEqual(pkg.validation, { mode: 'full-suite', result: 'pass' });
  assert.equal(pkg.acceptance[0].status, 'automated');
  assert.match(await readFile(built.package, 'utf8'), /Mode: TDD \(assessed\) · Risk: medium · Escalations: 1 \/ 1/);
  await writeFile(path.join(dir, 'DEMO-lightweight.md'), '# Baseline changed\n');
  assert.throws(() => run('check', root, state), /stale/);
});

test('new builds for old runs add assurance presentation without adaptive fields', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'final-package-legacy-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await initRepo(root);
  const { state, draft, dir } = await artifacts(root);
  await writeFile(path.join(root, 'src/existing.txt'), 'after\n');
  const built = run('build', root, state, '--draft', draft, '--repo', root);
  const pkg = JSON.parse(await readFile(path.join(dir, 'DEMO-final-package.json'), 'utf8'));
  assert.deepEqual(Object.keys(pkg), ['version', 'assurance_version', 'ticket', 'draft_path', 'draft_sha256', 'draft', 'evidence', 'validation', 'review', 'open_nits', 'known_regressions', 'decided_findings', 'repos']);
  assert.match(await readFile(built.package, 'utf8'), /^# Final approval — DEMO\n\n\*\*Assurance: Limited[^\n]*\n\nReview: clean\. Validation: full-suite — PASS\.\n\n## Changes/);
});


test('a rendered advisory review remains visible as an unfixed nit in the final package', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'package-advisory-'));
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
  const pkg = JSON.parse(await readFile(path.join(dir, 'DEMO-final-package.json'), 'utf8'));
  assert.equal(pkg.open_nits.length, 1);
  assert.match(pkg.open_nits[0], /Simplify the local name/);
  assert.match(await readFile(built.package, 'utf8'), /Open review nits \(unfixed\):.*Simplify the local name/);
});

test('new clause contract blocks name-only handoff/package claims and renders each pending clause', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'final-clause-evidence-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await initRepo(root);
  const { state, draft, dir } = await artifacts(root);
  await writeFile(state, (await readFile(state, 'utf8')).replace('final_package_version: 1', 'final_package_version: 1\nverification_version: 1\nacceptance_evidence_version: 1'));
  await writeFile(path.join(dir, 'DEMO-plan.md'), '# Plan\n\n## Steps\n\n### Step 1 — Total\n\n## Test Plan\n\n**AC traceability:**\n\n| Acceptance criterion | Requirement clause | Test scenario |\n| --- | --- | --- |\n| AC1 parity | Include prepaid value | Total |\n| AC1 parity | Preserve ascending output order | Total |\n');
  await writeFile(path.join(dir, 'DEMO-execute.md'), 'Execute outcome: PASSED\n');
  const evidence = { version: 1, ticket: 'DEMO', plan_version: 1,
    steps: [{ number: 1, checks: [{ type: 'automated', subject: 'Total', command: 'node test.js', result: 'pass', note: 'Named test passes', assertions: [{ clause: 'Include prepaid value', expected: '100 + 25 = 125', observed: '125', source: 'test.js:12 assert.equal(total, 125)' }] }] }],
    gate: { mode: 'full-suite', result: 'pass', note: 'Tests passed' },
    acceptance: [
      { criterion: 'AC1 parity', clause: 'Include prepaid value', scenario: 'Total', status: 'automated', step: 1, note: 'Amount assertion passes' },
      { criterion: 'AC1 parity', clause: 'Preserve ascending output order', scenario: 'Total', status: 'automated', step: 1, note: 'Same named test passes' },
    ] };
  const relative = 'make-it-work/DEMO/DEMO-verification-v1.json';
  await writeFile(path.join(root, relative), JSON.stringify(evidence));
  const handoff = { version: 1, ticket: 'DEMO', stage: 'execute', plan_version: 1, status: 'done', outcome: 'PASSED', artifacts: { report: 'make-it-work/DEMO/DEMO-execute.md', verification: relative }, data: { discoveries: [], failing_tests: [], gate: 'full-suite' } };
  await assert.rejects(validateArtifacts(handoff, root, { requireClauses: true }), /Acceptance evidence is missing/);
  assert.throws(() => run('build', root, state, '--draft', draft, '--repo', root), /Acceptance evidence is missing/);
  evidence.acceptance[1] = { ...evidence.acceptance[1], status: 'unverified', step: null, note: 'No ordering assertion was executed.' };
  await writeFile(path.join(root, relative), JSON.stringify(evidence));
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
  const root = await mkdtemp(path.join(os.tmpdir(), 'assurance-legacy-'));
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
  await writeFile(path.join(dir, 'DEMO-final-approval.json'), JSON.stringify({ version: 1, ticket: 'DEMO', package_sha256: hash }));
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
