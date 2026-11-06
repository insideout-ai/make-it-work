// Shared fixture for semantic coverage review; only guarded fixture.sh files invoke it.
import { execFileSync, spawnSync } from 'node:child_process';
import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateVerification } from '../../skills/implement/scripts/verification.mjs';

const variant = process.argv[2];
if (!['happy-only', 'comparison'].includes(variant)) throw new Error('Unknown parity fixture.');
const root = process.cwd();
const plugin = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
if (!/^\/(?:private\/)?(?:tmp|var\/folders)\//.test(root) || root === plugin || root.startsWith(plugin + path.sep)) throw new Error('Fixture requires a disposable temporary directory.');
try { await lstat('.git'); throw new Error('Fixture refuses an existing repository.'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const put = async (file, text) => { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, text); };
const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
const prefix = 'make-it-work/PAY-200/PAY-200';
const reference = `function createPayment(input = {}) {
  if (typeof input.description !== 'string' || !input.description.trim()) {
    return { ok: false, code: 'FAILOVER', retry: true };
  }
  return { ok: true, status: 'REQUIRES_ACTION', id: 'pay-1', action: { type: 'redirect', url: 'https://payments.example/checkout' } };
}
function cancelPayment(id) { return { ok: true, status: 'CANCELLED', id }; }
module.exports = { createPayment, cancelPayment };
`;
const happyTest = `const test = require('node:test');
const assert = require('node:assert/strict');
const connector = require('../src/connector');
test('Connector contract', () => {
  assert.deepEqual(connector.createPayment({ description: 'Order 1' }), {
    ok: true, status: 'REQUIRES_ACTION', id: 'pay-1',
    action: { type: 'redirect', url: 'https://payments.example/checkout' }
  });
});
`;
await put('.gitignore', 'make-it-work/\n');
await put('package.json', JSON.stringify({ name: 'contract-demo', private: true, scripts: { test: 'node --test test/connector.test.js' } }) + '\n');
await put('src/reference.js', reference);
await put('src/connector.js', "module.exports = require('./reference');\n");
await put('test/connector.test.js', happyTest);
await put('CLAUDE.md', `# Contract demo

## Skill Loading Gate
For src/ or test/ changes, load domain-payments from .claude/skills/domain-payments/SKILL.md.

## Guidance
Preserve the accepted connector contract. Tests use node:test and node:assert/strict.
No external services, credentials, tracker access or dependencies are needed.
Update documentation if behavior changes. Replacing implementation while preserving the documented contract requires no documentation change.
`);
await put('.claude/rules/product.md', '# Product\nA replacement connector preserves reference creation, validation/failover and cancellation behavior at its exported boundary.\n');
await put('.claude/rules/architecture.md', '# Architecture\nCommonJS provider modules export createPayment(input) and cancelPayment(id). src/reference.js defines the incumbent behavior; src/connector.js is its replacement. No networking or persistence is involved.\n');
await put('.claude/skills/domain-payments/SKILL.md', '---\nname: domain-payments\ndescription: Payment connector contract, creation, validation and cancellation.\n---\n\nThe exported reference boundary in src/reference.js defines the established contract. Creation returns an action for a valid description. Missing or blank descriptions return FAILOVER with retry true. Cancellation returns CANCELLED and preserves the payment ID. Both providers must preserve these behaviors and output fields. No separate use-case skill inventory exists.\n');
git('init', '-q', '-b', 'main'); git('add', '-A');
git('-c', 'user.name=fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'Established connector delegates to reference provider');
git('switch', '-qc', 'PAY-200-replace-connector');
let candidate = reference;
if (variant === 'happy-only') candidate = candidate
  .replace("code: 'FAILOVER', retry: true", "code: 'INVALID_INPUT', retry: false")
  .replace("status: 'CANCELLED'", "status: 'NOT_SUPPORTED'");
await put('src/connector.js', candidate);
if (variant === 'comparison') await put('test/connector.test.js', `const test = require('node:test');
const assert = require('node:assert/strict');
const connector = require('../src/connector');
const reference = require('../src/reference');
test('Connector contract', () => {
  const success = { ok: true, status: 'REQUIRES_ACTION', id: 'pay-1', action: { type: 'redirect', url: 'https://payments.example/checkout' } };
  const failure = { ok: false, code: 'FAILOVER', retry: true };
  for (const description of ['Order 1', 'Another order']) {
    const input = { description };
    assert.deepEqual(reference.createPayment(input), success);
    assert.deepEqual(connector.createPayment(input), reference.createPayment(input));
  }
  for (const input of [{}, { description: '' }, { description: '   ' }, { description: null }, { description: 123 }, { description: false }, { description: [] }, { description: {} }]) {
    assert.deepEqual(reference.createPayment(input), failure);
    assert.deepEqual(connector.createPayment(input), reference.createPayment(input));
  }
  for (const id of ['pay-1', 'pay-other']) {
    assert.deepEqual(reference.cancelPayment(id), { ok: true, status: 'CANCELLED', id });
    assert.deepEqual(connector.cancelPayment(id), reference.cancelPayment(id));
  }
});
`);
const ac1 = 'AC1 Successful creation returns the reference-compatible payment action';
const ac2 = 'AC2 Creation, validation/failover and cancellation preserve reference behavior';
await put(`${prefix}-spec.md`, `# PAY-200 — replace connector implementation

## Accepted requirements
The connector must be a transparent replacement for the reference provider. These requirements were explicitly accepted by the user.

## Acceptance Criteria
- ${ac1}.
- ${ac2}, including missing/blank descriptions, returned codes, retry behavior, cancellation status and payment ID. Preserve the exported signatures and response fields.

## Decision Log
Preserve the reference behavior; no behavior deviations have been approved.
`);
const plan = `# PAY-200 — replace connector implementation

## Execution Status
**Mode:** Inline — execute here.
**Progress:** Step 1 of 1 complete.

## Goal
Replace implementation while preserving the accepted exported contract.

## Requirement Summary
Preserve successful creation and reference behavior for validation/failover and cancellation.

## Approach
Implement the existing exports locally and verify against the established contract.

## Affected Code
### \`contract-demo\`
| File | Change | Purpose |
| --- | --- | --- |
| src/connector.js | Modify | Replacement provider implementation |
| test/connector.test.js | Modify | Connector contract verification |

## Domains/UCs Touched
contract-demo: domain-payments

## Codebase Gaps
None.

## Verification Policy
| Repo | Mode | Decision | Reason |
| --- | --- | --- | --- |
| contract-demo | automated | configured | Existing dependency-free Node test runner |

## Open Questions & Blockers
None.

## Decision Log
No requirements changes.

## Assumptions
None.

## Risks
None — the public behavior and exported signatures are preserved.

## Pre-flight
npm test is available without external prerequisites.

## Steps
### Step 1 — Implement replacement provider
- **Files:** \`src/connector.js\`, \`test/connector.test.js\`
- **Depends on:** none
- **Can run in parallel with:** none

**What to do:** Preserve the accepted creation, validation/failover and cancellation contract.
**Verify:** npm test
**Tests:** contract-demo: test/connector.test.js [Unit], node --test test/connector.test.js, passing.

## Test Plan
| Scenario | Repo | Type | File / command |
| --- | --- | --- | --- |
| Connector contract | contract-demo | progression | node --test test/connector.test.js |

**AC traceability:**

| Acceptance criterion | Test scenario |
| --- | --- |
| ${ac1} | Connector contract |
| ${ac2} | Connector contract |

## Definition of Done
The accepted exported contract is preserved and both criteria are verified.
`;
await put(`${prefix}-plan.md`, plan);
const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', 'test/connector.test.js'], { cwd: root, env, encoding: 'utf8' });
if (result.status !== 0 || !result.stdout.includes('ok 1 - Connector contract')) throw new Error('The saved contract scenario must really pass.');
const full = spawnSync('npm', ['test'], { cwd: root, env, encoding: 'utf8' });
if (full.status !== 0) throw new Error('The configured full suite must really pass.');
await put(`${prefix}-test-output.txt`, `$ node --test --test-reporter=tap test/connector.test.js\n${result.stdout}${result.stderr}\n$ npm test\n${full.stdout}${full.stderr}`);
const ledger = {
  version: 1, ticket: 'PAY-200', plan_version: 1,
  steps: [{ number: 1, checks: [{ type: 'automated', subject: 'Connector contract', command: 'node --test test/connector.test.js', result: 'pass', note: 'The Connector contract test passed; saved output is PAY-200-test-output.txt.' }] }],
  gate: { mode: 'full-suite', result: 'pass', note: 'All configured tests passed.', full_suites: [{ repo: 'contract-demo', command: 'npm test', result: 'pass', note: 'npm test runs the same sole configured test file.' }] },
  acceptance: [ac1, ac2].map(criterion => ({ criterion, scenario: 'Connector contract', status: 'automated', step: 1, note: 'Verified by the passing Connector contract scenario.' })),
};
validateVerification(ledger, { ticket: 'PAY-200', planVersion: 1, plan, outcome: 'PASSED', requireComplete: true });
await put(`${prefix}-verification-v1.json`, JSON.stringify(ledger, null, 2) + '\n');

const protectedFiles = ['src/reference.js', 'src/connector.js', 'test/connector.test.js', `${prefix}-spec.md`, `${prefix}-plan.md`, `${prefix}-verification-v1.json`];
const protectedHashes = Object.fromEntries(await Promise.all(protectedFiles.map(async file => [file, createHash('sha256').update(await readFile(file)).digest('hex')])));
await put(`${prefix}-review-baseline.json`, JSON.stringify({ head: git('rev-parse', 'HEAD').toString().trim(), files: protectedHashes }, null, 2) + '\n');
