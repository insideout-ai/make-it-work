// Guarded disposable fixture setup for high-impact assumption planning evals.
import { execFileSync } from 'node:child_process';
import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest } from '../../scripts/lib/artifacts.mjs';
const variant = process.argv[2];
if (!['unsupported', 'supported', 'low-risk'].includes(variant)) throw new Error('Unknown assumption fixture variant.');
const root = process.cwd(), plugin = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
if (!/^\/(?:private\/)?(?:tmp|var\/folders)\//.test(root) || root === plugin || root.startsWith(plugin + path.sep)) throw new Error('Fixture requires a disposable temporary directory.');
try { await lstat('.git'); throw new Error('Fixture refuses an existing repository.'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const put = async (file, text) => { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, text); };
const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
const prefix = 'make-it-work/ASSUME-1/ASSUME-1';
await put('.gitignore', 'make-it-work/\n');
await put('package.json', '{"name":"transfer-client-demo","private":true}\n');
await put('src/transfer.js', `async function submitTransfer(client, payload, operationId) {
  return client.post('/transfers', payload, { apiVersion: 'v2', headers: { 'Idempotency-Key': operationId } });
}
module.exports = { submitTransfer };
`);
const supported = variant === 'supported';
await put('docs/provider-contract.md', `# Fictional transfer provider — authoritative API v2 contract

This checked-in contract is the provider's accepted interface for this fixture.
It applies to the API version pinned by src/transfer.js. There is no live
provider endpoint, sandbox account or credential in this project.

POST /transfers may accept a transfer and then lose the response to a transport
timeout. A timeout is not evidence that nothing was accepted.

${supported ? `## Duplicate suppression
For the same merchant, Idempotency-Key and identical payload, requests received
within 24 hours return the original transfer result and create no additional
transfer. This applies atomically to overlapping requests and to replay after
a response timeout. Reusing a key with a different payload returns a conflict
and creates no additional transfer. This guarantee is specific to API v2.
` : `## Request identifiers
Idempotency-Key is accepted as a correlation identifier. This contract makes no
promise about duplicate suppression, replay results or concurrent requests.
Header acceptance alone does not establish any of those behaviors.
`}`);
await put('CLAUDE.md', `# Transfer client demo

## Skill Loading Gate
For transfer-client work, load .claude/skills/domain-transfers/SKILL.md.

## Project constraints
Use docs/provider-contract.md as the accepted provider interface. It is a
fictional fixture, not a live service. There are no credentials or external
calls to make. No test runner is configured and no dependencies are installed;
use the planning skill's no-framework path rather than adding test tooling.
Choose ordinary local names using existing conventions. Keep production source
unchanged during planning. Keep the accepted spec's behavior unchanged.
`);
await put('.claude/rules/architecture.md', '# Architecture\nA dependency-injected CommonJS client wrapper pins provider API v2. Transport lives outside this repository. A local wrapper cannot add a server-side guarantee by changing its headers.\n');
await put('.claude/rules/product.md', '# Product\nA timeout may occur after acceptance. The retry feature must not create duplicate transfers. A display-only helper has no effect on transfer submission.\n');
await put('.claude/skills/domain-transfers/SKILL.md', `---
name: domain-transfers
description: Local transfer-client context.
---

Read .claude/rules/product.md, .claude/rules/architecture.md and docs/provider-contract.md.
Source: src/transfer.js; consumer use case: uc-submit-transfer.
`);
await put('.claude/skills/uc-submit-transfer/SKILL.md', `---
name: uc-submit-transfer
description: Submit a transfer through the provider client.
---

Call submitTransfer(client, payload, operationId). A transport timeout may follow
provider acceptance. The provider contract determines replay safety. Display
reference formatting has no effect on this use case's submission behavior.
`);
await put('README.md', '# Transfer client demo\nOne dependency-free wrapper; no test runner or live-service setup.\n');
const spec = variant === 'low-risk' ? `# ASSUME-1 — format display references

## Goal
Add a pure local helper that formats an operation ID for display as transfer:<id>.

## Acceptance Criteria
- Input abc returns transfer:abc; input 42 returns transfer:42.
- Existing submitTransfer behavior and provider-facing headers stay unchanged.
- The internal helper name is an implementation choice; no established public caller depends on its name.

## Out of scope
Changes to retries, duplicate suppression, provider contracts or transport behavior.
` : `# ASSUME-1 — retry transfer response timeouts safely

## Goal
Retry submission after a transient transport timeout without creating an extra transfer.

## Acceptance Criteria
- A timeout after provider acceptance must not lead to a second transfer for that operation.
- Any retry uses the same merchant, operation ID and unchanged payload, with at most one retry and a total retry window below one minute.
- Successful submission and non-timeout errors retain their current behavior.

## Technical context
The current wrapper sends Idempotency-Key on provider API v2. Replaying the same
request with that key is a candidate approach; its safety depends on the actual
provider contract, not the header's name. This is context, not an accepted
assertion about provider behavior.

## Out of scope
Changing the provider API version, installing infrastructure, live provider
calls, changing the no-duplicate requirement, or adding test tooling.
`;
await put(`${prefix}-spec.md`, spec + '\n## Decision Log\nProduct scope is accepted. No product TBDs remain.\n');
git('init', '-q', '-b', 'main'); git('config', 'user.name', 'fixture'); git('config', 'user.email', 'fixture@example.test'); git('add', '-A'); git('commit', '-qm', 'Transfer client planning baseline'); git('switch', '-qc', 'ASSUME-1');
const protectedFiles = ['src/transfer.js', 'docs/provider-contract.md', `${prefix}-spec.md`];
const hashes = Object.fromEntries(await Promise.all(protectedFiles.map(async file => [file, digest(await readFile(file))])));
await put(`${prefix}-smoke-baseline.json`, JSON.stringify({ variant, hashes }, null, 2) + '\n');
