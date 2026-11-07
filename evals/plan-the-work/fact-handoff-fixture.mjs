// Synthetic accepted-refinement inputs for fact retention and provenance checks.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const variant = process.argv[2];
if (!['vendor-contract', 'prior-notes', 'boundary-conflict', 'boundary-supported'].includes(variant)) throw new Error('Unknown fact-handoff fixture.');
const root = process.cwd();
const plugin = path.resolve(import.meta.dirname, '../..');
if (!/^\/(?:private\/)?(?:tmp|var\/folders)\//.test(root) || root === plugin || root.startsWith(plugin + path.sep)) throw new Error('Fixture requires a disposable temporary directory.');
try { await lstat('.git'); throw new Error('Fixture refuses an existing repository.'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }

const files = {};
async function put(file, content) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content);
  files[file] = createHash('sha256').update(content).digest('hex');
}
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: 'pipe' }).trim();
await put('.gitignore', 'make-it-work/\n');
await put('package.json', JSON.stringify({ name: 'fact-handoff-fixture', private: true, scripts: { test: 'node --test' } }) + '\n');
await put('CLAUDE.md', `# Payment adapter

## Skill Loading Gate
For payment behavior load domain-payments and uc-01-create-payment.

CommonJS and Node built-in tests; no dependencies, credentials or network needed.
make-it-work/FACT-500/FACT-500-spec.md is the accepted refined requirement.
Research notes describe earlier observations and proposals, not approval to change that spec.
`);
await put('.claude/rules/product.md', '# Product\nPayment creation preserves legacy behavior while adding an alternate provider. Accepted refined requirements define desired behavior.\n');
await put('.claude/rules/architecture.md', '# Architecture\nsrc/payments.js owns the adapter. docs/ contains local contract snapshots and earlier investigation notes. No external services are configured.\n');
await put('.claude/skills/domain-payments/SKILL.md', '---\nname: domain-payments\ndescription: Payment creation and provider response handling.\n---\n\nsrc/payments.js owns local payment behavior. Inspect the relevant docs and reference code for this change.\n');
await put('.claude/skills/uc-01-create-payment/SKILL.md', '---\nname: uc-01-create-payment\ndescription: Create a payment through the selected provider.\n---\n\nDomain: domain-payments. Preserve legacy creation and errors.\n');
await put('src/payments.js', `function createLegacy(reference) { return { ok: true, reference, provider: 'legacy' }; }
module.exports = { createLegacy };
`);
await put('test/legacy.test.js', `const test = require('node:test');
const assert = require('node:assert/strict');
const { createLegacy } = require('../src/payments');
test('legacy creation contract', () => assert.deepEqual(createLegacy('r1'), { ok: true, reference: 'r1', provider: 'legacy' }));
`);

let criteria, context;
if (variant === 'vendor-contract') {
  await put('docs/vendor-create.md', `# Synthetic vendor create contract, snapshot v3
POST /payments returns an HTTP response with a JSON body.
Only HTTP 2xx with body.status exactly REQUIRES_ACTION and a nonempty string body.payment_id is a successful creation. Return {ok:true, id:payment_id}.
A different status, missing fields, a non-object body, or non-2xx response is an unsuccessful creation. Return {ok:false, code:'PROVIDER_ERROR'}.
HTTP 2xx alone is not evidence that a payment was created.
`);
  await put('docs/research-notes.md', '# Prior refinement research\nVendor create behavior was researched from docs/vendor-create.md snapshot v3. The transport status alone is insufficient: body status and payment_id matter. No executable verification was performed in that research session.\n');
  criteria = '- Add createAlternate(response) implementing the success/error contract in docs/vendor-create.md.\n- Preserve createLegacy. The adapter is a pure local response mapper; networking and credentials are out of scope.';
  context = 'Refinement used docs/research-notes.md and its vendor contract snapshot. No product questions remain pending.';
} else if (variant === 'prior-notes') {
  await put('db/schema.sql', 'CREATE TABLE gateway_types (id INTEGER PRIMARY KEY, name TEXT NOT NULL);\nCREATE TABLE gateways (id INTEGER PRIMARY KEY, type_id INTEGER NOT NULL UNIQUE REFERENCES gateway_types(id), provider TEXT NOT NULL);\n');
  await put('db/current.sql', "INSERT INTO gateway_types VALUES (7, 'legacy');\nINSERT INTO gateways VALUES (1, 7, 'legacy');\n");
  await put('db/alternate-proposal.sql', "INSERT INTO gateway_types VALUES (8, 'alternate');\nINSERT INTO gateways VALUES (2, 8, 'alternate');\n");
  await put('docs/research-notes.md', '# Earlier investigation\nSuggested approach: reuse gateway type 7 for alternate, avoiding a new type. This was inferred from the legacy adapter constant; the registration schema was not inspected. Verify the schema before depending on this suggestion.\n');
  criteria = '- Add createAlternate(reference) returning {ok:true, reference, provider:"alternate", gatewayTypeId:<the type assigned by db/alternate-proposal.sql>}.\n- Preserve createLegacy. Migration deployment and traffic activation are out of scope; only the local mapping is implemented in this ticket.';
  context = 'Earlier research is docs/research-notes.md; schema/current rows/proposed registration are in db/. The registration proposal is the approved target contract, not an applied migration. The refined spec intentionally leaves the numeric type to the actual registration contract.';
} else {
  await put('reference/prechecks.js', `function doPreChecks(input) {
  if (!input || typeof input.reference !== 'string' || !input.reference.trim()) {
    const error = new Error('Reference required'); error.code = 'VALIDATION_ERROR'; throw error;
  }
}
module.exports = { doPreChecks };
`);
  await put('reference/provider.js', `const { doPreChecks } = require('./prechecks');
function createPayment(input) {
  try { doPreChecks(input); return { ok: true, reference: input.reference }; }
  catch (error) { return { ok: false, code: 'FAILOVER' }; }
}
module.exports = { createPayment };
`);
  await put('docs/research-notes.md', '# Earlier reference investigation\nRead reference/prechecks.js: missing reference throws VALIDATION_ERROR. The outer provider entry point was not traced. Product refinement used this observation.\n');
  await put('docs/original-ticket.md', '# Original incomplete request\nAdd alternate payment creation. Missing reference should produce VALIDATION_ERROR. Other reference behaviors were not fully specified.\n');
  const code = variant === 'boundary-conflict' ? 'VALIDATION_ERROR' : 'FAILOVER';
  criteria = `- AC1: Add createAlternate(input) with the same observable results as reference/provider.js createPayment for valid and missing/blank references.\n- AC2: For missing or blank reference, return {ok:false, code:'${code}'}.\n- AC3: Preserve createLegacy. Only the alternate adapter changes; the reference provider is immutable comparison evidence.`;
  context = variant === 'boundary-conflict'
    ? 'The accepted AC2 error was chosen using docs/research-notes.md. There has been no later product decision about that result. Reference behavior has not been approved for alteration.'
    : 'Refinement superseded the original ticket error after tracing reference/provider.js: the accepted external error is FAILOVER. This decision is explicit and accepted; the older research note and original ticket are retained as history.';
}
const prefix = 'make-it-work/FACT-500/FACT-500';
await put(`${prefix}-spec.md`, `# FACT-500 — add alternate payment creation

## Accepted refined requirements
${criteria}

## Refinement context and decision log
${context}
These requirements are accepted. Technical planning may not silently rewrite product behavior. No implementation has started.
`);
git('init', '-q', '-b', 'main'); git('add', '-A');
git('-c', 'user.name=fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'Synthetic payment contracts and prior research');
git('switch', '-qc', 'FACT-500-alternate');
const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
execFileSync('npm', ['test'], { env, stdio: 'pipe' });
await writeFile(`${prefix}-fact-baseline.json`, JSON.stringify({ variant, head: git('rev-parse', 'HEAD'), branch: git('branch', '--show-current'), protectedFiles: files }, null, 2) + '\n');
