#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { args, cell, cli, fail, jsonInput, requireText, slug, writeSet } from './lib/artifacts.mjs';

export const CATEGORIES = {
  product: [[3, 'What & Why'], [7, 'Definition of Done'], [1, 'Problem & Value Proposition'], [2, 'Target Users & Permissions'], [4, 'KPIs & Success Metrics'], [5, 'Use Cases & Requirements'], [6, 'Rollout Plan']],
  'technical-debt': [[1, 'Technical Problem, Evidence & Impact'], [3, 'Desired Outcome'], [5, 'Acceptance Criteria'], [4, 'Success Metrics & Verification'], [6, 'Scope Boundaries & Non-Goals'], [2, 'Technical Constraints & External Dependencies'], [7, 'Definition of Done']],
};
function existingSections(markdown) {
  const matches = [...(markdown ?? '').matchAll(/^## (.+)$/gm)];
  const sections = new Map();
  for (let i = 0; i < matches.length; i += 1) {
    const name = matches[i][1];
    if (sections.has(name)) fail(`Duplicate existing epic section: ${name}`);
    sections.set(name, markdown.slice(matches[i].index, matches[i + 1]?.index).trimEnd());
  }
  return sections;
}
export function renderEpic(input, existing = null) {
  if (input.version !== 1 || !CATEGORIES[input.mode]) fail('Epic requires version 1 and product/technical-debt mode.');
  requireText(input.title, 'Epic title');
  if (!Array.isArray(input.categories) || !input.categories.length) fail('At least one assessed/selected category is required.');
  const ids = input.categories.map((category) => category.id);
  if (new Set(ids).size !== ids.length || ids.some((id) => !Number.isInteger(id) || id < 1 || id > 7)) fail('Category IDs must be unique 1–7 values.');
  const old = existingSections(existing);
  const selectedNames = CATEGORIES[input.mode].filter(([id]) => ids.includes(id)).map(([, title]) => title);
  const omitted = CATEGORIES[input.mode].filter(([id]) => !ids.includes(id)).map(([, title]) => title);
  const lines = [`# ${input.title}`, '', `**Mode:** ${input.mode}`, '**Status:** Draft — pending review', `**Review scope:** ${selectedNames.join(', ')}`, ''];
  if (input.source) lines.push(`Source: ${requireText(input.source, 'Source reference')}`, '');
  const open = [...(input.open_items ?? [])], exclusions = [...(input.out_of_scope ?? [])], readiness = [];
  for (const [id, title] of CATEGORIES[input.mode]) {
    const category = input.categories.find((entry) => entry.id === id);
    if (!category) { if (old.has(title)) lines.push(old.get(title), ''); old.delete(title); continue; }
    old.delete(title);
    if (category.applicable === false) continue;
    if (category.assessed !== true) fail(`Selected category ${id} must be assessed or omitted as inapplicable.`);
    if (typeof category.content !== 'string' || !category.content.trim()) fail(`Category ${id} needs content.`);
    if (typeof category.ready !== 'boolean') fail(`Category ${id} requires a semantic readiness decision.`);
    const gaps = category.open_items ?? [];
    if (!Array.isArray(gaps) || !Array.isArray(category.exclusions ?? [])) fail('Open items/exclusions must be arrays.');
    if (category.ready && (gaps.length || category.unconfirmed === true)) fail(`Category ${id} cannot be ready with material unresolved decisions.`);
    lines.push(`## ${title}`, '', category.content.trim(), '');
    for (const item of gaps) { requireText(item, 'Open item'); lines.push(`> Open item: ${item}`, ''); open.push(item); }
    for (const item of category.exclusions ?? []) { requireText(item, 'Exclusion'); lines.push(`> Out of scope: ${item}`, ''); exclusions.push(item); }
    readiness.push(`- [${category.ready ? 'x' : ' '}] ${title}`);
  }
  for (const [title, content] of old) if (!['Open Items & Out of Scope', 'Readiness checklist', 'Readiness Checklist', 'Decision log', 'Decision Log'].includes(title)) lines.push(content, '');
  lines.push('## Open Items & Out of Scope', '', '### Open Items (TBD)', '', ...([...new Set(open)].length ? [...new Set(open)].map((item) => `- ${requireText(item, 'Open item')}`) : ['None noted.']), '', '### Out of Scope', '', ...([...new Set(exclusions)].length ? [...new Set(exclusions)].map((item) => `- ${requireText(item, 'Exclusion')}`) : ['None noted.']), '', '## Readiness checklist', '', ...readiness, '');
  if (omitted.length) lines.push('**Not assessed:**', '', ...omitted.map((title) => `- ${title}`), '');
  const statuses = ['Confirmed', 'Proposed', 'Open / Deferred', 'Out of scope'];
  const decisions = input.decisions ?? [];
  if (!Array.isArray(decisions)) fail('Decisions must be an array.');
  for (const decision of decisions) {
    if (!statuses.includes(decision.status)) fail('Invalid decision status.');
    requireText(decision.topic, 'Decision topic'); requireText(decision.decision, 'Decision text');
    if (decision.status === 'Confirmed' && (!['user', 'project-policy'].includes(decision.source) || !decision.reference)) fail('Confirmed decisions need explicit user/project-policy provenance.');
    if (decision.status === 'Confirmed') requireText(decision.reference, 'Decision reference');
  }
  const sorted = decisions.map((decision, index) => ({ ...decision, index })).sort((a, b) => statuses.indexOf(a.status) - statuses.indexOf(b.status) || a.index - b.index);
  lines.push('## Decision log', '');
  if (sorted.length) lines.push('| # | Topic | Decision | Rationale | Status |', '|---|---|---|---|---|', ...sorted.map((decision, i) => `| ${i + 1} | ${cell(decision.topic)} | ${cell(decision.decision)} | ${cell(decision.rationale ?? '')} | ${decision.status} |`));
  else lines.push('No decisions recorded.');
  return lines.join('\n') + '\n';
}
export async function writeEpic(directory, input, existing = null, { compact = false } = {}) {
  const markdown = renderEpic(input, existing);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 13);
  return writeSet(directory, compact ? 'requirement' : `epic-${slug(input.title)}-${stamp}`, (prefix) => ({ [`${prefix}.md`]: markdown }), { versioned: compact });
}
cli(import.meta.url, async (argv) => {
  const o = args(argv, ['--input', '--directory', '--existing']);
  const input = await jsonInput(o.input);
  const existing = o.existing ? await readFile(o.existing, 'utf8') : null;
  if (o.command === 'render') return renderEpic(input, existing);
  if (o.command === 'write' && o.directory) return writeEpic(o.directory, input, existing);
  fail('Usage: epic.mjs render|write --input EPIC.json [--directory ARTIFACTS --existing PRIOR.md]');
});
