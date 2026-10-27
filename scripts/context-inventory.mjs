#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { args, cli, fail } from './lib/artifacts.mjs';

async function optional(file) {
  try { if (!(await lstat(file)).isFile()) fail(`Not a regular context file: ${file}`); return await readFile(file, 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
const skillNames = (text) => [...new Set(text?.match(/\b(?:uc-\d+-[a-z0-9]+(?:-[a-z0-9]+)*|domain-(?:\d+-)?[a-z0-9]+(?:-[a-z0-9]+)*)\b/g) ?? [])];
export function namingInventory(names) {
  const domains = names.filter((name) => name.startsWith('domain-'));
  const numbered = domains.filter((name) => /^domain-\d+-/.test(name));
  const legacy = domains.filter((name) => !/^domain-\d+-/.test(name));
  const ids = numbered.map((name) => Number(name.match(/^domain-(\d+)-/)[1]));
  return { convention: domains.length === 0 || numbered.length && !legacy.length ? 'numbered' : legacy.length && !numbered.length ? 'legacy' : 'mixed', next_domain_id: String(Math.max(0, ...ids) + 1).padStart(2, '0'), reserved: [...new Set(names)].sort() };
}
export function staleSkills(areas, commits) {
  const result = [];
  for (const [skill, paths] of Object.entries(areas)) {
    const touched = commits.filter((commit) => commit.files.some((file) => paths.some((area) => file === area || file.startsWith(`${area.replace(/\/$/, '')}/`))));
    if (touched.length) result.push({ skill, commits: touched.map((commit) => commit.hash) });
  }
  return result;
}
export async function contextInventory(root, { days = null } = {}) {
  const docs = {};
  for (const file of ['CLAUDE.md', '.claude/rules/product.md', '.claude/rules/architecture.md']) docs[file] = await optional(path.join(root, file));
  let entries = [];
  try { entries = await readdir(path.join(root, '.claude/skills'), { withFileTypes: true }); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const skills = [];
  for (const entry of entries.filter((entry) => entry.isDirectory() && /^(uc-|domain-)/.test(entry.name))) {
    const file = `.claude/skills/${entry.name}/SKILL.md`;
    const content = await optional(path.join(root, file));
    const lines = content?.trimEnd().split('\n').length ?? 0;
    const kind = entry.name.startsWith('uc-') ? 'uc' : 'domain';
    const warnings = [];
    if (!content) warnings.push('SKILL.md missing');
    else {
      if (content.match(/^name:\s*(.+)$/m)?.[1].trim() !== entry.name) warnings.push('Frontmatter name differs from directory');
      const target = kind === 'uc' ? [30, 50] : [60, 120];
      if (lines < target[0] || lines > target[1]) warnings.push(`Outside ${target.join('–')}-line target`);
      if (lines > 500) warnings.push('Exceeds 500-line maximum');
      if (/^```/m.test(content)) warnings.push('Code fence requires signal-to-noise review');
    }
    skills.push({ name: entry.name, file, lines, warnings, present: content !== null });
  }
  const referenced = [...new Set(Object.values(docs).flatMap(skillNames))].sort();
  const names = [...new Set([...skills.map((skill) => skill.name), ...referenced])];
  const signals = [];
  if (skills.length) signals.push('uc/domain directories');
  if (/Skill Loading Gate|Skills Reference|After Any Feature Change/.test(docs['CLAUDE.md'] ?? '')) signals.push('CLAUDE.md markers');
  for (const file of ['.claude/rules/product.md', '.claude/rules/architecture.md']) if (docs[file] !== null) signals.push(file);
  const missing = [];
  if (!/Skill Loading Gate/.test(docs['CLAUDE.md'] ?? '')) missing.push('CLAUDE.md Skill Loading Gate');
  for (const file of ['.claude/rules/product.md', '.claude/rules/architecture.md']) if (docs[file] === null) missing.push(file);
  if (!skills.some((skill) => skill.name.startsWith('domain-') && skill.present)) missing.push('domain skill SKILL.md');
  const areas = {};
  for (const doc of Object.values(docs)) for (const row of (doc ?? '').split('\n').filter((line) => line.startsWith('|'))) {
    const namesInRow = skillNames(row);
    const code = [...row.matchAll(/`([^`]+)`/g)].map((m) => m[1]).filter((file) => file.includes('/') && !file.startsWith('.claude/') && !file.startsWith('/') && !file.includes('..') && !file.includes('*'));
    for (const name of namesInRow) areas[name] = [...new Set([...(areas[name] ?? []), ...code])];
  }
  let commits = [], stalenessUnavailable = null;
  if (days !== null) {
    if (![10, 30, 60, 90].includes(days)) fail('Staleness window must be 10, 30, 60 or 90 days.');
    try {
      const hashes = execFileSync('git', ['-C', root, 'log', `--since=${days} days ago`, '--format=%H'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
      commits = hashes.map((hash) => ({ hash, files: execFileSync('git', ['-C', root, 'diff-tree', '--root', '--no-commit-id', '--name-only', '-r', '-z', hash], { encoding: 'utf8' }).split('\0').filter(Boolean) }));
    } catch (error) { stalenessUnavailable = error.message; }
  }
  return { signals, complete: missing.length === 0, missing_context: missing, skills,
    missing_skills: referenced.filter((name) => !skills.some((skill) => skill.name === name && skill.present)), naming: namingInventory(names),
    code_areas: areas, stale_candidates: staleSkills(areas, commits), staleness_unavailable: stalenessUnavailable };
}
cli(import.meta.url, async (argv) => {
  const o = args(argv, ['--root', '--days']);
  if (o.command !== 'inspect' || !o.root) fail('Usage: context-inventory.mjs inspect --root ROOT [--days 30]');
  return contextInventory(o.root, { days: o.days === undefined ? null : Number(o.days) });
});
