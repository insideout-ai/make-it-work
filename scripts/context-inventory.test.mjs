import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { contextInventory, namingInventory, staleSkills } from './context-inventory.mjs';
test('domain allocation reserves IDs named only in missing references and preserves legacy conventions', () => {
  assert.equal(namingInventory(['domain-01-auth', 'domain-09-retired']).next_domain_id, '10');
  assert.equal(namingInventory(['domain-auth']).convention, 'legacy');
  assert.equal(namingInventory([]).convention, 'numbered');
  assert.equal(namingInventory(['domain-auth', 'domain-01-pay']).convention, 'mixed');
});
test('inventory detects incomplete context, missing referenced skills and frontmatter/size issues', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'context-inventory-')); t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal((await contextInventory(root)).signals.length, 0);
  await mkdir(path.join(root, '.claude/skills/domain-01-auth'), { recursive: true });
  await mkdir(path.join(root, '.claude/rules'), { recursive: true });
  await writeFile(path.join(root, 'CLAUDE.md'), '# Skill Loading Gate\n\n| /domain-09-pay | `src/pay` |');
  await writeFile(path.join(root, '.claude/rules/product.md'), '# Product');
  await writeFile(path.join(root, '.claude/rules/architecture.md'), '# Architecture');
  await writeFile(path.join(root, '.claude/skills/domain-01-auth/SKILL.md'), '---\nname: wrong-name\n---\nShort');
  const result = await contextInventory(root);
  assert.equal(result.complete, true); assert.deepEqual(result.missing_skills, ['domain-09-pay']);
  assert.equal(result.naming.next_domain_id, '10'); assert.equal(result.skills[0].warnings.length, 2);
});
test('staleness is based on declared path boundaries and actual commits, never substrings', async (t) => {
  assert.deepEqual(staleSkills({ auth: ['src/auth'] }, [{ hash: 'a', files: ['src/authz/file.js'] }]), []);
  const root = await mkdtemp(path.join(os.tmpdir(), 'context-git-')); t.after(() => rm(root, { recursive: true, force: true }));
  const git = (...argv) => execFileSync('git', ['-C', root, ...argv], { stdio: 'pipe' });
  git('init'); git('config', 'user.email', 'test@example.invalid'); git('config', 'user.name', 'Test');
  await mkdir(path.join(root, 'src/pay'), { recursive: true }); await writeFile(path.join(root, 'src/pay/run.js'), 'code');
  await writeFile(path.join(root, 'CLAUDE.md'), '| /domain-01-pay | `src/pay` |'); git('add', '.'); git('commit', '-m', 'code');
  const result = await contextInventory(root, { days: 30 });
  assert.equal(result.stale_candidates[0].skill, 'domain-01-pay'); assert.equal(result.staleness_unavailable, null);
});
