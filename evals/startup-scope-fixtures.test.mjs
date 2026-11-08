import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { caseWorkingDirectory } from './run-suite-args.mjs';
import { resolveWorkspace } from '../scripts/workspace.mjs';
import { contextInventory } from '../scripts/context-inventory.mjs';
const suites = JSON.parse(await readFile(new URL('./suites.json', import.meta.url), 'utf8'));
const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
for (const name of ['implement-repo-start-dependencies', 'implement-repo-start-local']) {
  test(`${name}: starts in a real single repo with usable context and unchanged sibling evidence`, async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'startup-scope-fixture-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    const fixture = path.join(import.meta.dirname, 'implement', name, 'fixture.sh');
    execFileSync('bash', [fixture], { cwd: root, env, stdio: 'pipe' });
    const cwd = await caseWorkingDirectory(root, suites.workingDirectories[name]);
    assert.equal(execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8' }).trim(), await realpath(path.join(root, 'connector-app')));
    assert.equal(execFileSync('git', ['branch', '--show-current'], { cwd, encoding: 'utf8' }).trim(), 'startup-eval');
    const resolved = await resolveWorkspace(cwd);
    assert.equal(resolved.layout, 'single-repo');
    assert.equal(resolved.boundary_source, 'git-root');
    assert.equal(resolved.root, cwd);
    assert.equal((await contextInventory(cwd)).complete, true);
    const baseline = JSON.parse(await readFile(path.join(root, 'startup-scope-baseline.json')));
    for (const [file, hash] of Object.entries(baseline.protectedFiles)) assert.equal(createHash('sha256').update(await readFile(path.join(root, file))).digest('hex'), hash);
    await assert.rejects(readFile(path.join(cwd, 'make-it-work/PAY-300/PAY-300-spec.md')), /ENOENT/);
    for (const repo of Object.keys(baseline.repos)) assert.equal(execFileSync('git', ['-C', repo, 'status', '--porcelain'], { cwd: root, encoding: 'utf8' }), '');
    assert.notEqual(spawnSync('bash', [fixture], { cwd: root, env, encoding: 'utf8' }).status, 0);
  });
}
