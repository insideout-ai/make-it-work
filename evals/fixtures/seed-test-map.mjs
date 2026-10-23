// Used only by disposable eval fixtures after seed-embedded-tests.sh.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { discoverySignatures, serializeMap, snapshotRepo } from '../../scripts/test-map.mjs';

const root = path.resolve(process.argv[2] ?? 'embedded-tests');
const product = 'embedded-tests';
const uc = (id) => `${product}:UC-${id}`;
const domain = (name) => `${product}:domain-${name}`;
const tokens = [uc('01'), uc('02'), uc('03'), domain('accounts'), domain('labels')];
const location = 'local';
const tests = [
  { id: 'discounts', file: 'src/account.py', identity: 'src.account.DiscountTests', placement: 'embedded', granularity: 'suite', selector: 'src.account.DiscountTests' },
  { id: 'checkout-example', file: 'src/account.py', identity: 'discounted_total doctest', placement: 'documentation', granularity: 'test', selector: 'src/account.py' },
  { id: 'labels', file: 'src/test_labels.py', identity: 'src.test_labels.LabelTests', placement: 'separate', granularity: 'suite', selector: 'src.test_labels.LabelTests' },
  { id: 'experimental', file: 'src/experimental.py', identity: 'src.experimental.HelperTests', placement: 'embedded', granularity: 'suite', selector: 'src.experimental.HelperTests' },
].map((entry) => ({ ...entry, location }));
const mappings = tests.filter((entry) => entry.id !== 'experimental').flatMap((entry) => (entry.id === 'labels' ? [uc('03'), domain('labels')] : [uc('01'), domain('accounts')]).map((token) => ({
  test: entry.id, token, source: 'inferred', status: 'mapped', evidence: [
    { repo: product, file: entry.id === 'labels' ? 'src/labels.py' : 'src/account.py', symbol: entry.id === 'labels' ? 'account_label' : 'discounted_total', reason: 'Assertions exercise the documented label formatting or checkout discount behavior.' },
    { repo: product, file: '.claude/rules/product.md', symbol: token, reason: 'Product table assigns the asserted behavior to this use case.' },
    { repo: product, file: '.claude/rules/architecture.md', symbol: 'Functional Domains', reason: 'Documents the implementation and domain boundary.' },
  ],
})));
for (const token of [uc('01'), uc('02')]) mappings.push({ test: 'experimental', token, source: 'inferred', status: 'unresolved', evidence: [], reason: 'Experimental rounding has no documented UC relationship or production callers.' });
const map = { schemaVersion: 1, productRepo: product, tokens, repos: [{ id: product, root: '.' }],
  locations: [{ id: location, repo: product, paths: ['src'], config: ['Makefile', '.claude/skills/test-strategy/SKILL.md'], complete: true, assessedTokens: tokens }],
  tests, mappings, decisions: [{ test: 'discounts', token: uc('02'), choice: 'reject', reason: 'Discount assertions do not test refunds.' }], snapshots: {},
};
await mkdir(path.join(root, '.claude/testing'), { recursive: true });
map.discovery = discoverySignatures(map);
map.snapshots[product] = await snapshotRepo(root);
await writeFile(path.join(root, '.claude/testing/test-map.json'), serializeMap(map));

if (process.argv.includes('--changed-label')) {
  const file = path.join(root, 'src/test_labels.py');
  await writeFile(file, `${await readFile(file, 'utf8')}\n    def test_empty_label(self):\n        self.assertEqual(account_label(" "), "")\n`);
}

// Baseline of the invocation's source bytes, after any intentional fixture change.
// Kept in the workflow-artifact namespace, outside the index snapshot.
await mkdir(path.join(root, 'make-it-work'), { recursive: true });
const digests = {};
for (const file of ['src/account.py', 'src/test_labels.py', 'src/experimental.py', 'src/labels.py']) {
  digests[file] = createHash('sha256').update(await readFile(path.join(root, file))).digest('hex');
}
await writeFile(path.join(root, 'make-it-work/source-baseline.json'), JSON.stringify(digests, null, 2));
