// Shared setup for diagnosis smokes. Invoked only by guarded fixture.sh scripts.
import { execFileSync, spawnSync } from 'node:child_process';
import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest } from '../../scripts/lib/artifacts.mjs';
import { initializeWorkflow, planHash, snapshot } from '../../skills/implement/scripts/workflow.mjs';
import { generateDashboard } from '../../skills/implement/scripts/render-status.mjs';
import { executionControl } from '../../skills/execute/scripts/step-control.mjs';

const variant = process.argv[2];
if (!['first', 'repeat', 'unknown', 'lightweight'].includes(variant)) throw new Error('Unknown diagnosis fixture variant.');
const root = process.cwd(), plugin = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
if (!/^\/(?:private\/)?(?:tmp|var\/folders)\//.test(root) || root === plugin || root.startsWith(plugin + path.sep)) throw new Error('Fixture requires a disposable temporary directory.');
try { await lstat(path.join(root, '.git')); throw new Error('Fixture refuses an existing repository.'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
const put = async (file, contents) => { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, contents); };
const ticket = 'DIAG-1', relative = `make-it-work/${ticket}`, prefix = `${relative}/${ticket}`;
const source = variant === 'unknown'
  ? "const { collect } = require('./collector');\nfunction choose(selected, fallback) { return collect(selected, fallback); }\nmodule.exports = { choose };\n"
  : "function choose(selected, fallback) { return [...selected, fallback]; }\nmodule.exports = { choose };\n";
await put('.gitignore', 'make-it-work/\n');
await put('package.json', JSON.stringify({ name: 'choice-helper', private: true, scripts: { test: 'node --test test/selection.test.js' } }) + '\n');
await put('src/selection.js', source);
if (variant === 'unknown') await put('src/collector.js', 'function collect(selected, fallback) { return selected.concat([fallback]); }\nmodule.exports = { collect };\n');
await put('test/selection.test.js', `const test = require('node:test');
const assert = require('node:assert/strict');
const { choose } = require('../src/selection');
test('selected choices are returned without the fallback', () => assert.deepEqual(choose(['primary'], 'backup'), ['primary']));
test('empty selection uses the fallback', () => assert.deepEqual(choose([], 'backup'), ['backup']));
test('multiple selected choices retain their order', () => assert.deepEqual(choose(['a', 'b'], 'backup'), ['a', 'b']));
`);
await put('CLAUDE.md', '# Choice helper\n\n## Skill Loading Gate\nRead `.claude/skills/domain-choices/SKILL.md` before changing this helper.\n\n## After Any Feature Change\nKeep product and architecture guidance accurate.\n');
await put('.claude/rules/product.md', '# Product\nReturn selected choices unchanged when nonempty. Only an empty selection uses the fallback.\n');
await put('.claude/rules/architecture.md', '# Architecture\nA dependency-free CommonJS helper is exported from src/selection.js. Tests run with npm test.\n');
await put('.claude/skills/domain-choices/SKILL.md', '---\nname: domain-choices\ndescription: Context for the local choice helper.\n---\n\nRead `.claude/rules/product.md` and `.claude/rules/architecture.md`. Preserve selected-choice order and the empty-selection fallback.\n');
git('init', '-q', '-b', 'main'); git('add', '-A');
git('-c', 'user.name=fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'Choice helper with a failing selection check');
git('switch', '-qc', 'diagnosis-smoke');
const initialized = await initializeWorkflow(root, { ticket, autonomy: 'autopilot', base: 'main', repos: [root], branch_guard: 'Existing feature branch' });
const spec = `# ${ticket} — preserve selected choices

## Goal
Correct the choice helper without changing its public signature.

## Acceptance Criteria
- Nonempty selections are returned in their original order, without adding the fallback.
- Empty selections return a one-item array containing the fallback.
- Existing tests remain intact; no dependency or API changes.

## Decision Log
All behavior is explicitly agreed. No TBDs or unresolved questions.
`;
await put(`${prefix}-spec.md`, spec);
const files = variant === 'unknown' ? '`src/selection.js`, `src/collector.js`' : '`src/selection.js`';
const plan = `# ${ticket} — correct choice selection

> **Spec:** \`${prefix}-spec.md\` · **Target branch:** main

## Execution Status

**Mode:** Inline — execute here.
**Inline pause mode:** Run straight through — no pause between steps for review.
**Progress:** Step 0 of 1 complete.

## Goal
Nonempty selections retain only selected choices in order; empty selection uses the fallback.

## Requirement Summary
The accepted spec defines the behavior. Fix the implementation; preserve all existing assertions and the public signature.

## Affected Code
${files} — repair selected-choice handling.

## Risks
Low: one local pure helper; protect both nonempty and empty cases.

## Open Questions & Blockers
None.

## Steps

### Step 1 — Correct choice selection

- **Files:** ${files}
- **Depends on:** none
- **Can run in parallel with:** none

**What to do:** The implementation exists, but its scoped verification has failed. Resume from that failure, investigate the observed behavior and correct it consistently with the spec. Do not change the tests.

**Verify:** npm test

**Tests:** choice-helper: test/selection.test.js [unit], node --test test/selection.test.js, confirmed red — selected choices include an unwanted fallback.

## Test Plan
Run node --test test/selection.test.js from this repo. Then run the full suite through run-regression full.

**AC traceability:**

| Acceptance criterion | Test scenario |
| --- | --- |
| Nonempty selections exclude fallback | selected choices are returned without the fallback |
| Empty selection uses fallback | empty selection uses the fallback |
| Selected order is preserved | multiple selected choices retain their order |
`;
if (variant !== 'lightweight') await put(`${prefix}-plan.md`, plan);
function capture(file) {
  const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', 'test/selection.test.js'], { cwd: root, encoding: 'utf8' });
  if (result.status !== 1 || !result.stdout.includes('not ok')) throw new Error('Fixture must produce an actual assertion failure.');
  return put(file, `$ node --test --test-reporter=tap test/selection.test.js\n${result.stdout}${result.stderr}`);
}
await capture(`${prefix}-initial-failure.txt`);
if (variant === 'lightweight') {
  await put(`${prefix}-lightweight.md`, '# Implementation report\n\n## Summary\nChoice selection implementation needs a review correction.\n\n## Changed paths\nsrc/selection.js\n\n## Checks\nnode --test test/selection.test.js: FAIL; output in DIAG-1-initial-failure.txt.\n\n## Discoveries\nCommonJS choice helper.\n\n## Risk signal\nnone\n');
  await put(`${prefix}-review.md`, '# Review\n\nReview outcome: FIX_REQUIRED\n\n## Finding #1\nRoute: fix\nRegion: src/selection.js:choose\nThe accepted spec requires nonempty selected choices to exclude the fallback. The actual scoped tests fail for both one and multiple selected choices. Empty-selection behavior passes. Correct the implementation and preserve all assertions. Evidence: DIAG-1-initial-failure.txt.\n');
  await put(`${prefix}-handoffs/review-1.json`, JSON.stringify({ version: 1, ticket, stage: 'review', review_cycle: 1, plan_version: 1, status: 'done', outcome: 'FIX_REQUIRED', artifacts: { report: `${prefix}-review.md` }, data: { findings: [{ id: '#1', route: 'fix', region: 'src/selection.js:choose', introduced_by_fix_of: null }], context_gaps: [] } }, null, 2) + '\n');
}
let state = await readFile(initialized.state, 'utf8');
const fields = variant === 'lightweight'
  ? { phase: 'lightweight', risk: 'low', mode: 'lightweight', mode_source: 'assessed', risk_rationale: 'One local pure helper with unchanged API.', implementation_report: `${prefix}-lightweight.md`, review: 'fix-required', review_cycle: 1, fix_cycle: 1 }
  : { phase: 'execute', risk: 'medium', mode: 'tdd', mode_source: 'user', risk_rationale: 'Previously selected TDD run; continue existing plan.', execution_mode: 'inline', inline_pause_mode: 'run-straight-through', plan: `${prefix}-plan.md`, plan_hash: planHash(plan), execution: 'running' };
Object.assign(fields, { spec: `${prefix}-spec.md`, spec_hash: git('hash-object', `${prefix}-spec.md`).toString().trim(), current_activity: 'none' });
for (const [key, value] of Object.entries(fields)) state = state.replace(new RegExp(`^${key}:.*$`, 'm'), `${key}: ${value}`);
const time = new Date().toISOString();
state += `| 2 | ${time} | ${variant === 'lightweight' ? 'review' : 'plan'} | ${fields.phase} | ${variant === 'lightweight' ? 'Review found #1 in src/selection.js:choose; fix round 1 entered' : 'Plan accepted; step implementation exists and verification failed'} |\n`;
await writeFile(initialized.state, state); await generateDashboard(initialized.state);
if (variant !== 'lightweight') {
  const options = { dashboardState: initialized.state };
  await executionControl(`${prefix}-plan.md`, { action: 'start', id: 'selection-dispatch', steps: [1] }, options);
  if (variant === 'repeat') {
    await executionControl(`${prefix}-plan.md`, { action: 'begin-attempt', id: 'previous-null-guard', step: 1, diagnosis: { failure: 'Selected choices contain an unwanted backup.', evidence: `${prefix}-initial-failure.txt`, cause: 'Possibly a missing guard on absent selection.', next_change: 'Handle absent selection before combining choices.', expected_result: 'Selected inputs no longer gain an extra item.' } }, options);
    await put('src/selection.js', "function choose(selected, fallback) {\n  if (!selected) return [fallback];\n  return [...selected, fallback];\n}\nmodule.exports = { choose };\n");
    await capture(`${prefix}-previous-fix-failure.txt`);
  }
}
// Match resume's actual fingerprint after all seeded source changes.
const repos = await snapshot([root]);
state = await readFile(initialized.state, 'utf8');
state = state.replace(/^worktree_fingerprint:.*$/m, `worktree_fingerprint: ${digest(JSON.stringify(repos))}`).replace(/^workspace_snapshot:.*$/m, `workspace_snapshot: ${JSON.stringify(repos)}`);
await writeFile(initialized.state, state); await generateDashboard(initialized.state);
await put(`${relative}/smoke-baseline.json`, JSON.stringify({ variant, head: git('rev-parse', 'HEAD').toString().trim(), testHash: digest(await readFile('test/selection.test.js')) }, null, 2) + '\n');
