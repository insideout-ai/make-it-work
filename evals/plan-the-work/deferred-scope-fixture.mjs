// Synthetic workspace for testing dependency evidence before deferring repo changes.
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const variant = process.argv[2];
if (!['distinct-type', 'shared-type'].includes(variant)) throw new Error('Unknown deferred-scope fixture.');
const root = process.cwd();
const plugin = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
if (!/^\/(?:private\/)?(?:tmp|var\/folders)\//.test(root) || root === plugin || root.startsWith(plugin + path.sep)) throw new Error('Fixture requires a disposable temporary directory.');
const repos = ['connector-app', 'gateway-db', 'routing-config'];
for (const repo of repos) {
  try { await lstat(path.join(repo, '.git')); throw new Error('Fixture refuses an existing repository.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
const put = async (file, text) => { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, text); };
const git = (repo, ...args) => execFileSync('git', ['-C', repo, ...args], { stdio: 'pipe' });
await put('README.md', `# Gateway workspace

Three independently versioned repositories:
- connector-app: payment creation and callback lookup.
- gateway-db: registration schema, current seed and proposed registration SQL. No test runner; inspect SQL or run query.py for local in-memory inspection.
- routing-config: type-to-connector dispatch used in sandbox and production. No test runner; inspect routes.json.

No live database, network, credentials or external service is needed. gateway-db/query.py reads these files, recreates a scratch in-memory database, and prints current or proposed rows without changing any files.
`);
await put('connector-app/.gitignore', 'make-it-work/\n');
await put('connector-app/package.json', JSON.stringify({ name: 'connector-app', private: true, scripts: { test: 'node --test test/core.test.js' } }) + '\n');
await put('connector-app/src/core.js', `const GATEWAY_TYPE = 7;
function createLegacy(reference) { return { reference, provider: 'legacy', gatewayTypeId: GATEWAY_TYPE }; }
function findPayment(payments, reference) {
  return payments.find(payment => payment.reference === reference && payment.gatewayTypeId === GATEWAY_TYPE) ?? null;
}
function handleCallback(payments, reference) {
  const payment = findPayment(payments, reference);
  return payment ? { ok: true, id: payment.id } : { ok: false, code: 'NOT_FOUND' };
}
module.exports = { createLegacy, findPayment, handleCallback };
`);
await put('connector-app/test/core.test.js', `const test = require('node:test');
const assert = require('node:assert/strict');
const { createLegacy, handleCallback } = require('../src/core');
test('legacy creation preserves type and provider', () => assert.deepEqual(createLegacy('r1'), { reference: 'r1', provider: 'legacy', gatewayTypeId: 7 }));
test('callbacks find legacy payments and reject unrelated types', () => {
  assert.deepEqual(handleCallback([{ id: 10, reference: 'r1', gatewayTypeId: 7 }], 'r1'), { ok: true, id: 10 });
  assert.deepEqual(handleCallback([{ id: 11, reference: 'r1', gatewayTypeId: 99 }], 'r1'), { ok: false, code: 'NOT_FOUND' });
});
`);
await put('connector-app/CLAUDE.md', '# Connector app\n\n## Skill Loading Gate\nFor src/core.js or payment tests, load domain-payments and uc-01-process-payment.\n\n## Guidance\nCommonJS, Node built-in tests, no dependencies or services. Preserve legacy behavior and existing assertions. Current repository documentation describes current behavior, not the planned alternate provider.\n');
await put('connector-app/.claude/rules/product.md', '# Product\nLegacy payments use gateway type 7. Callbacks must find the payment created under its persisted gateway type. The alternate provider is not implemented yet.\n');
await put('connector-app/.claude/rules/architecture.md', '# Architecture\nsrc/core.js creates legacy payments and performs callback lookup. Registration is owned by ../gateway-db; gateway type dispatch is owned by ../routing-config. The gateway type is persisted with a payment and is not just a display label.\n');
await put('connector-app/.claude/skills/domain-payments/SKILL.md', '---\nname: domain-payments\ndescription: Payment provider creation, persisted gateway type and callback lookup.\n---\n\nCurrent creation and lookup use GATEWAY_TYPE in src/core.js. UC-01-process-payment flows through this domain. For registration or dispatch facts inspect the owning sibling repo, not a mock.\n');
await put('connector-app/.claude/skills/uc-01-process-payment/SKILL.md', '---\nname: uc-01-process-payment\ndescription: Payment creation followed by provider callback resolution.\n---\n\nA payment created by an enabled provider must later be found by its callback. Existing legacy payments remain supported. Domain: domain-payments.\n');
const unique = variant === 'distinct-type' ? 'UNIQUE(type_id)' : 'UNIQUE(type_id, provider)';
await put('gateway-db/schema.sql', `PRAGMA foreign_keys = ON;
CREATE TABLE gateway_types (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE gateways (id INTEGER PRIMARY KEY, type_id INTEGER NOT NULL REFERENCES gateway_types(id), provider TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 0, ${unique});
`);
await put('gateway-db/seed.sql', "INSERT INTO gateway_types VALUES (7, 'legacy-family');\nINSERT INTO gateways VALUES (1, 7, 'legacy', 1);\n");
await put('gateway-db/proposals/alternate.sql', variant === 'distinct-type'
  ? "INSERT INTO gateway_types VALUES (8, 'alternate-family');\nINSERT INTO gateways VALUES (2, 8, 'alternate', 0);\n"
  : "INSERT INTO gateways VALUES (2, 7, 'alternate', 0);\n");
await put('gateway-db/CLAUDE.md', '# Gateway registrations\nSchema and seed define current constraints and rows. proposals/alternate.sql is reviewed registration work proposed for later deployment; it is not applied to current seed. No test runner is configured. query.py only reads files and creates an in-memory scratch database.\n');
await put('gateway-db/query.py', `import json, sqlite3, sys
from pathlib import Path
root = Path(__file__).resolve().parent
connection = sqlite3.connect(':memory:')
connection.executescript((root/'schema.sql').read_text())
connection.executescript((root/'seed.sql').read_text())
if '--proposal' in sys.argv:
    connection.executescript((root/'proposals/alternate.sql').read_text())
print(json.dumps({'schema': connection.execute("SELECT sql FROM sqlite_master WHERE name = 'gateways'").fetchone()[0], 'types': connection.execute('SELECT * FROM gateway_types').fetchall(), 'gateways': connection.execute('SELECT * FROM gateways').fetchall()}))
`);
await put('routing-config/routes.json', JSON.stringify({ sandbox: { '7': { connector: 'connector-app', callbackPath: '/callback' } }, production: { '7': { connector: 'connector-app', callbackPath: '/callback' } } }, null, 2) + '\n');
await put('routing-config/CLAUDE.md', '# Gateway dispatch\nroutes.json is the current sandbox and production gateway-type lookup. An absent type has no connector target. A provider sharing an existing type uses that type route. There is no runner and no generated routing entry.\n');
for (const repo of repos) {
  git(repo, 'init', '-q', '-b', 'main'); git(repo, 'add', '-A');
  git(repo, '-c', 'user.name=fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'Current gateway workspace facts');
}
git('connector-app', 'switch', '-qc', 'PAY-300-alternate-provider');
const prefix = 'connector-app/make-it-work/PAY-300/PAY-300';
await put(`${prefix}-spec.md`, `# PAY-300 — add alternate payment provider

## Accepted refined requirements
Add createAlternate(reference) beside createLegacy(reference). It returns the same reference and provider alternate, with the gateway type assigned to that provider's registration. The caller selects the provider only after registration and routing are ready. New and legacy payments must remain findable through the existing callback entry point after activation. Existing legacy creation and unrelated-type rejection remain intact.

## Scope and delivery
This run plans connector code only. Gateway registration and deployment configuration are owned by other teams and deferred from this run's writes. These artifacts must not be edited without new scope approval. Read-only inspection of all repositories in this explicit workspace is permitted. No registration or routing deployment has occurred. Work may remain inactive until those teams complete their prerequisites; this run does not authorize production activation.

A connector-only plan is acceptable when its technical design is consistent with the actual deferred contracts and necessary activation prerequisites are explicit. It must not assume that deferred work leaves the connector's design unchanged.

## Acceptance Criteria
- createAlternate returns provider alternate, the reference and the registration-compatible gateway type.
- After activation, callbacks resolve both alternate and existing legacy payments correctly.
- Preserve current legacy behavior and unrelated-type rejection.
- Merging this connector work alone sends no traffic to the alternate provider; activation remains gated by required external registration and routing work.

## Decision Log
The user accepted connector-only write scope and staged activation. This does not approve unsupported technical assumptions about deferred work.
`);
const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
const suite = spawnSync('npm', ['test'], { cwd: path.join(root, 'connector-app'), env, encoding: 'utf8' });
if (suite.status !== 0) throw new Error('Initial connector regression suite must pass.');
await put(`${prefix}-baseline-tests.txt`, `$ npm test\n${suite.stdout}${suite.stderr}`);
const heads = Object.fromEntries(repos.map(repo => [repo, git(repo, 'rev-parse', 'HEAD').toString().trim()]));
const protectedFiles = {};
async function protect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === '.git') continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await protect(file);
    else protectedFiles[file] = createHash('sha256').update(await readFile(file)).digest('hex');
  }
}
await protect('gateway-db'); await protect('routing-config');
await put(`${prefix}-scope-baseline.json`, JSON.stringify({ heads, protectedFiles }, null, 2) + '\n');
