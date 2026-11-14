#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateEvalTree } from './validate.mjs';

export async function catalog(root) {
  const { cases, suites, errors } = await validateEvalTree(root);
  if (errors.length) throw new Error(errors.join('\n'));
  return Promise.all(cases.map(async item => {
    const graders = [];
    for (const filename of (await readdir(path.join(item.dir, 'graders'))).filter(name => name.endsWith('.md')).sort()) {
      const content = await readFile(path.join(item.dir, 'graders', filename), 'utf8');
      graders.push({ name: filename, type: content.match(/^type:\s*(\S+)/m)?.[1], requirement: content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim() });
    }
    const maintenance = suites.maintenance?.[item.name];
    return { name: item.name, skill: item.skill, directory: path.relative(root ?? path.dirname(fileURLToPath(import.meta.url)), item.dir),
      tier: suites.smoke.includes(item.name) ? 'smoke' : (suites.critical ?? []).includes(item.name) ? 'critical' : 'extended',
      purpose: suites.criticalReasons?.[item.name] ?? item.name.replaceAll('-', ' '),
      disposition: maintenance?.disposition ?? 'retain', blocking: maintenance?.blocking === true,
      basis: maintenance?.reason ?? 'Retained pending behavioral baseline; inventory presence does not certify relevance or reliability.',
      owner: maintenance?.owner ?? 'maintainers', followUp: maintenance?.followUp ?? 'Review current requirement, distinct coverage, and live evidence before promotion or retirement.', graders };
  }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const entries = await catalog();
  if (process.argv.includes('--json')) process.stdout.write(JSON.stringify(entries, null, 2) + '\n');
  else {
    process.stdout.write('Case\tSkill\tTier\tDisposition\tChecks\n');
    for (const item of entries) process.stdout.write(`${item.name}\t${item.skill}\t${item.tier}\t${item.disposition}\t${item.graders.length}\n`);
    process.stdout.write(`${entries.length} retained cases; cataloging is not a passing behavioral audit. No cases are silently excluded from full.\n`);
  }
}
