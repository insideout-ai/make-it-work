import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { normalizeRisk, riskSummary, validatePlan } from './validate-plan.mjs';

function plan() {
  const sections = ['What This Changes', 'Open Questions & Blockers', 'Decision Log', 'Goal', 'Requirement Summary', 'Approach', 'Domains/UCs Touched', 'Codebase Gaps', 'Pre-flight', 'Definition of Done'].map((title) => `## ${title}\n\nNone\n`).join('\n');
  return `# Plan\n\n${sections}\n## Execution Status\n\n**Mode:** Inline — execute.\n\n**Progress:** Step 0 of 1 complete.\n\n## Affected Code\n\n### \`app\`\n\n| File | Change | Summary |\n| --- | --- | --- |\n| \`src/save.js\` | Modify | Save |\n\n## Verification Policy\n\nNone\n\n## Risks\n\n| Risk | Severity | Mitigation | Residual severity |\n| --- | --- | --- | --- |\n| Existing callers | High | Regression tests | Low |\n\n**Overall risk (before mitigations):** High\n**Overall risk (after mitigations):** Low\n\n## Steps\n\n### Step 1 — Save\n\n- **Files:** \`src/save.js\`\n- **Depends on:** none\n- **Can run in parallel with:** none\n\n**What to do:** Implement save.\n\n**Verify:** Save returns success.\n\n**Tests:** app: test/save.js, node --test, progression red\n\n## Test Plan\n\n| Scenario | Type | File / command |\n| --- | --- | --- |\n| Saved | Unit | Step 1 |\n\n**AC traceability:**\n\n| Acceptance criterion | Test scenario |\n| --- | --- |\n| AC1 | Saved |\n`;
}
test('validates a complete execution-ready plan', () => assert.deepEqual(validatePlan(plan()).errors, []));
test('rejects gaps in steps, undeclared files, duplicate scenarios and dangling AC references', () => {
  assert.equal(validatePlan(plan().replace('Step 1 —', 'Step 2 —')).valid, false);
  assert.match(validatePlan(plan().replace('**Files:** `src/save.js`', '**Files:** `src/other.js`')).errors.join(' '), /Affected Code/);
  assert.match(validatePlan(plan().replace('| Saved | Unit | Step 1 |', '| Saved | Unit | Step 1 |\n| Saved | Unit | Step 1 |')).errors.join(' '), /unique/);
  assert.match(validatePlan(plan().replace('| AC1 | Saved |', '| AC1 | Missing |')).errors.join(' '), /unknown test scenario/);
  assert.match(validatePlan(plan().replace('Implement save.', 'TBD')).errors.join(' '), /placeholders/);
});
test('risk aggregation escalates three medium residuals and normalization changes only summary values', () => {
  const risky = plan().replace('| Existing callers | High | Regression tests | Low |', '| A | High | Tests | Med |\n| B | Med | Tests | Medium |\n| C | Low | Tests | Med |');
  assert.deepEqual(riskSummary(risky), { before: 'High', after: 'High' });
  const normalized = normalizeRisk(risky);
  assert.match(normalized, /after mitigations\):\*\* High/);
  assert.match(validatePlan(normalized).errors.join(' '), /Phasing alternative/);
  assert.equal(validatePlan(normalized.replace('## Steps', '### Phasing alternative\n\nStart read-only.\n\n## Steps')).valid, true);
});
test('legacy execution fixture passes numbering/order checks without imposing new plan sections', async () => {
  const fixture = await readFile('evals/execute/execute-full-pass/fixture/make-it-work/DEMO-2/DEMO-2-plan.md', 'utf8');
  assert.equal(validatePlan(fixture, { executionOnly: true }).valid, true);
});
