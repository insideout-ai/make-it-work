// Native current-map fixture for an implement run already entering final sync.
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { discoverySignatures, serializeMap, snapshotRepo } from '../../../scripts/test-map.mjs';

const root = process.cwd();
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const productRepo = path.basename(root), token = `${productRepo}:domain-demo`;
await mkdir('test', { recursive: true });
await writeFile('test/policy.test.js', `const { test } = require('node:test');
const assert = require('node:assert/strict');
const { canProceed } = require('../src/policy');
test('members alone may proceed', () => {
  assert.equal(canProceed('member'), true);
  assert.equal(canProceed('guest'), false);
});
`);
await mkdir('.claude/skills/test-strategy', { recursive: true });
await writeFile('.claude/skills/test-strategy/SKILL.md', `---
name: test-strategy
description: Native indexed policy test strategy.
---
# Test Strategy
## Repo ID
\`${productRepo}\`
## Test Locations
| Location | Repo | Layers | Test files | Full-suite command | Run from |
| --- | --- | --- | --- | --- | --- |
| . | ${productRepo} | Unit | test/*.test.js | node --test | . |
## Layers
Unit configured: isolated policy decisions, no external services.
## Run Prerequisites
None; local run yes.
## Where New Tests Go
Unit: test/<module>.test.js in ${productRepo}.
## Coverage Decision Guidance
Role-policy changes need Unit tests.
## Test Map
Shared .claude/testing/test-map.json; no source/test annotations.
## How to Scan
Follow make-it-work docs/test-map-contract.md and scripts/test-map.mjs. Discover
node:test declarations in test/*.test.js; inspect freshness, reuse unchanged
relationships and reassess affected behavior/documentation before saving baselines.
`);
const map = { schemaVersion: 1, productRepo, tokens: [token], repos: [{ id: productRepo, root: '.' }],
  locations: [{ id: 'local', repo: productRepo, paths: ['test'], config: ['.claude/skills/test-strategy/SKILL.md'], complete: true, assessedTokens: [token] }],
  tests: [{ id: 'policy-members', location: 'local', file: 'test/policy.test.js', identity: 'members alone may proceed', placement: 'separate', granularity: 'test', selector: 'test/policy.test.js' }],
  mappings: [{ test: 'policy-members', token, source: 'inferred', status: 'mapped', evidence: [
    { repo: productRepo, file: 'src/policy.js', symbol: 'canProceed', reason: 'Assertions check the allowed member and denied guest policy outcomes.' },
    { repo: productRepo, file: '.claude/skills/domain-demo/SKILL.md', symbol: 'Demo domain', reason: 'Documents the policy-decision responsibility.' },
    { repo: productRepo, file: '.claude/rules/product.md', symbol: 'Product', reason: 'Defines the allow-or-deny product behavior.' },
  ] }],
  decisions: [{ test: 'policy-members', token, choice: 'confirm', reason: 'Policy relevance reviewed.' }], snapshots: {},
};
map.discovery = discoverySignatures(map);
map.snapshots[productRepo] = await snapshotRepo(root);
await mkdir('.claude/testing', { recursive: true });
await writeFile('.claude/testing/test-map.json', serializeMap(map));
const statePath = 'make-it-work/DEMO/DEMO-state.md';
let state = await readFile(statePath, 'utf8');
state = state.replace('## Context discoveries\n\nNone', '## Context discoveries\n\n- Final sync must document the verified role policy: only member is allowed; guest and other roles are denied. Existing reusable domain/product docs still omit the roles.');
await writeFile(statePath, state);
git('add', '-A');
git('-c', 'user.name=fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'Native test map before final documentation sync');
state = state.replace(/^head: .*$/m, `head: ${git('rev-parse', 'HEAD')}`);
await writeFile(statePath, state);
