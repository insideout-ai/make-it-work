import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { discoverySignatures, serializeMap } from '../../../scripts/test-map.mjs';

const mapPath = '.claude/testing/test-map.json';
const map = JSON.parse(await readFile(mapPath, 'utf8'));
const other = `${map.productRepo}:domain-privacy`;
map.tokens.push(other);
map.locations[0].complete = false;
map.snapshots = {};
map.discovery = discoverySignatures(map);
await mkdir('.claude/skills/domain-privacy', { recursive: true });
await writeFile('.claude/skills/domain-privacy/SKILL.md', '# Privacy domain\n\nThe profile-visibility helper hides a private profile from other users.\n');
await writeFile('src/privacy.js', 'exports.visible = (isPrivate, isOwner) => !isPrivate || isOwner;\n');
await writeFile('test/privacy.test.js', `const { test } = require('node:test');
const assert = require('node:assert/strict');
const { visible } = require('../src/privacy');
test('private profiles are hidden from other users', () => assert.equal(visible(true, false), false));
`);
map.tests.push({ id: 'privacy-hidden', location: 'local', file: 'test/privacy.test.js',
  identity: 'private profiles are hidden from other users', placement: 'separate', granularity: 'test', selector: 'test/privacy.test.js', layer: 'Unit' });
map.mappings.push({ test: 'privacy-hidden', token: other, source: 'user', status: 'mapped', evidence: [
  { repo: map.productRepo, file: 'src/privacy.js', symbol: 'visible', reason: 'Checks a private profile is invisible to another user.' },
  { repo: map.productRepo, file: '.claude/skills/domain-privacy/SKILL.md', symbol: 'Privacy domain', reason: 'Describes private profile visibility.' },
] });
map.decisions.push({ test: 'privacy-hidden', token: other, choice: 'confirm', reason: 'Existing reviewed privacy relationship; preserve.' });
await writeFile(mapPath, serializeMap(map));
// An affected test exists but was not indexed during partial onboarding.
await writeFile('test/policy-boundary.test.js', `const { test } = require('node:test');
const assert = require('node:assert/strict');
const { canProceed } = require('../src/policy');
test('unknown roles cannot proceed', () => assert.equal(canProceed('unknown'), false));
`);
await writeFile('make-it-work/DEMO/partial-map-before.json', serializeMap(map));
const statePath = 'make-it-work/DEMO/DEMO-state.md';
let state = await readFile(statePath, 'utf8');
state = state.replace('## Context discoveries\n', '## Context discoveries\n\n- The role-policy boundary test in test/policy-boundary.test.js is not yet indexed. Preserve the existing incomplete onboarding scope while maintaining affected policy evidence.\n');
await writeFile(statePath, state);
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
git('add', '-A');
git('-c', 'user.name=fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'Pre-existing partial onboarding before final sync');
state = state.replace(/^head: .*$/m, `head: ${git('rev-parse', 'HEAD')}`);
await writeFile(statePath, state);
