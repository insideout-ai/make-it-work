#!/usr/bin/env node
// Narrow, pre-edit authorizations for planning's test-writing sub-phase.
import { execFileSync } from 'node:child_process';
import { lstat, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { args, atomicWrite, cli, digest, fail, jsonInput, within, withLock } from '../../../scripts/lib/artifacts.mjs';
import { validateMap } from '../../../scripts/test-map.mjs';
import { parseSteps } from '../../../scripts/lib/plan.mjs';
import { parseState } from './render-status.mjs';
import { checkTestingReadiness } from './testing-readiness.mjs';
import { assertRunState } from './artifact-layout.mjs';

export const dedicatedTestPath = (file) => /(?:^|\/)(?:__tests__|tests?|specs?)\/|(?:^|\/)(?:test(?:_[^/]+)?|[^/]+[._](?:test|spec)|[^/]*Test[^/]*)\.[^/]+$/.test(file);
export async function dedicatedTestFile(repo, file, productRoots) {
  if (dedicatedTestPath(file)) return true;
  for (const root of productRoots) {
    let map;
    try { map = validateMap(JSON.parse(await readFile(await within(root, '.claude/testing/test-map.json'), 'utf8'))); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    for (const test of map.tests.filter((test) => test.file === file && test.placement === 'separate')) {
      const location = map.locations.find((location) => location.id === test.location);
      const selected = map.repos.find((entry) => entry.id === location.repo);
      if (await realpath(path.resolve(root, selected.root)) === repo) return true;
    }
  }
  return false;
}
export const draftPlanPath = (statePath, f) => path.join(path.dirname(statePath), `${f.ticket}-plan${f.plan_version === '1' ? '' : `-v${f.plan_version}`}.md`);
export function declaredTest(steps, step, file) { return steps.find((item) => item.number === step)?.tests?.includes(`\`${file}\``); }
export const planningReceiptPath = (statePath) => statePath.replace(/-state\.md$/, '-planning-tests.json');
export async function fileImage(root, file) {
  const absolute = path.resolve(root, file);
  if (!file || path.isAbsolute(file) || file.includes('\\') || file.split('/').some((part) => ['..', '.', '', '.git', 'make-it-work'].includes(part))) fail('Invalid planning test path.');
  try {
    const resolved = await within(root, file);
    const info = await lstat(resolved);
    if (!info.isFile()) fail('Planning test must be a regular file.');
    const bytes = await readFile(resolved);
    return { image: { mode: info.mode & 0o111, sha256: digest(bytes) }, bytes };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    // Check the parent even for a new file; symlinked/missing parents fail closed.
    const parent = await realpath(path.dirname(absolute));
    if (parent !== root && !parent.startsWith(`${root}${path.sep}`)) fail('Planning test parent escapes the repo.');
    return { image: null, bytes: Buffer.alloc(0) };
  }
}
export async function authorizePlanningTests(statePath, input) {
  const state = parseState(await readFile(statePath, 'utf8'), statePath), f = state.fields;
  const root = await realpath(path.dirname(path.dirname(path.dirname(statePath))));
  assertRunState(root, statePath, f.ticket);
  if (f.status !== 'In Progress' || !['plan', 'fix-plan'].includes(f.phase)) fail('Authorize test edits only in active TDD Plan.');
  if (f.controller_version !== '1' || !f.workspace_snapshot) return { required: false, reason: 'Legacy run has no controller startup baseline scope.' };
  await checkTestingReadiness(root, state);
  if (state.audit.some((row) => ['execute', 'lightweight'].includes(row.to))) return { required: false, reason: 'Implementation was already authorized; the startup edit guard is released.' };
  if (f.phase !== 'plan' || (f.adaptive_version === '1' && f.mode !== 'tdd')) fail('Authorize test edits only in active TDD Plan.');
  if (f.spec === 'none' || f.spec_hash !== digest(await readFile(await within(root, f.spec)))) fail('Planning tests require the unchanged accepted spec.');
  const repo = await realpath(input.repo);
  const selected = f.workspace_version === '1' ? JSON.parse(f.workspace_contract).repos : JSON.parse(f.workspace_snapshot);
  if (!selected.some((item) => item.root === repo)) fail('Planning test repo is outside the approved scope.');
  const planPath = draftPlanPath(statePath, f);
  const steps = parseSteps(await readFile(await within(root, path.relative(root, planPath)), 'utf8'));
  if (!declaredTest(steps, input.step, input.file)) fail('Draft the step and declare the exact test path in its Tests field before authorizing edits.');
  if (!input.reason?.trim()) fail('Planning test authorization needs its behavior/purpose.');
  const { image, bytes } = await fileImage(repo, input.file);
  let region = null;
  if (input.kind === 'embedded') {
    const lines = bytes.toString('utf8').split(/(?<=\n)/);
    if (!image || !Number.isSafeInteger(input.start_line) || !Number.isSafeInteger(input.end_line) || input.start_line < 1 || input.end_line < input.start_line || input.end_line > lines.length) fail('Embedded authorization requires an existing, bounded test region.');
    const prefix = lines.slice(0, input.start_line - 1).join(''), body = lines.slice(input.start_line - 1, input.end_line).join(''), suffix = lines.slice(input.end_line).join('');
    if ((!prefix && !suffix) || !/(?:\b(?:test|describe|it|unittest|TestCase)\b|\btest_\w+|#\[test\]|>>>|@Test|\[(?:Fact|Theory|TestMethod)\])/.test(body)) fail('Embedded region must identify test code and retain protected source outside it.');
    if (!Buffer.from(prefix + body + suffix).equals(bytes)) fail('Embedded test regions require UTF-8 source.');
    region = { prefix: Buffer.from(prefix).toString('base64'), suffix: Buffer.from(suffix).toString('base64') };
  } else if (input.kind !== 'test-file' || !await dedicatedTestFile(repo, input.file, selected.map((entry) => entry.root))) {
    fail('Whole-file authorization requires a dedicated test path; use a bounded embedded region for mixed source/test files.');
  }
  const target = planningReceiptPath(statePath);
  return withLock(target, async () => {
    let receipt;
    try { receipt = JSON.parse(await readFile(await within(root, path.relative(root, target)), 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const binding = { version: 1, ticket: f.ticket, start_time: f.start_time, plan_version: f.plan_version, spec_hash: f.spec_hash };
    if (receipt && Object.keys(binding).some((key) => receipt[key] !== binding[key])) fail('Planning authorization belongs to another run/spec/plan.');
    receipt ??= { ...binding, entries: [] };
    if (!Array.isArray(receipt.entries)) fail('Invalid planning test receipt.');
    const existing = receipt.entries.find((entry) => entry.repo === repo && entry.file === input.file);
    if (existing) {
      if (existing.kind !== input.kind || existing.start_line !== input.start_line || existing.end_line !== input.end_line) fail('Cannot widen or replace an existing planning authorization.');
      return { authorized: true, replayed: true, receipt: target };
    }
    const before = image ? { ...image, git_blob: execFileSync('git', ['-C', repo, 'hash-object', '--path', input.file, '--stdin'], { input: bytes }).toString().trim() } : null;
    receipt.entries.push({ repo, file: input.file, step: input.step, kind: input.kind, reason: input.reason, before, region, ...(input.kind === 'embedded' ? { start_line: input.start_line, end_line: input.end_line } : {}) });
    await atomicWrite(target, JSON.stringify(receipt, null, 2) + '\n');
    return { authorized: true, receipt: target };
  });
}
cli(import.meta.url, async (argv) => {
  const o = args(argv, ['--state', '--input']);
  if (o.command !== 'authorize' || !o.state || !o.input) fail('Usage: planning-tests.mjs authorize --state STATE --input JSON');
  return authorizePlanningTests(path.resolve(o.state), await jsonInput(o.input));
});
