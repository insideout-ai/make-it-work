#!/usr/bin/env node
import { args, cell, cli, fail, jsonInput, requireText, slug, writeSet } from './lib/artifacts.mjs';

export function renderApproachPreview(input) {
  requireText(input.title, 'Epic title');
  const options = input.options;
  if (!Array.isArray(options) || options.length < 2 || options.length > 3) fail('Preview requires 2–3 approaches.');
  for (const option of options) {
    for (const field of ['label', 'fit', 'tradeoff']) requireText(option[field], `Approach ${field}`);
    if (option.recommended !== undefined && typeof option.recommended !== 'boolean') fail('recommended must be boolean.');
    if (!Array.isArray(option.examples) || option.examples.length < 2 || option.examples.length > 3) fail('Each approach needs 2–3 example slice titles.');
    option.examples.forEach((title) => requireText(title, 'Example slice title'));
    if (new Set(option.examples.map((title) => title.trim().toLowerCase())).size !== option.examples.length) fail('Example titles must be distinct within an approach.');
  }
  if (new Set(options.map((option) => option.label.trim().toLowerCase())).size !== options.length) fail('Approach labels must be unique.');
  if (options.filter((option) => option.recommended === true).length !== 1) fail('Exactly one recommended approach is required.');
  const lines = [`Slicing approaches for **${input.title}**:`, ''];
  for (const [i, option] of options.entries()) {
    if (!option.recommended && option.label.endsWith('(Recommended)')) fail('Only the recommended option may carry the Recommended label.');
    const label = option.recommended && !option.label.endsWith('(Recommended)') ? `${option.label} (Recommended)` : option.label;
    lines.push(`${i + 1}. **${label}**`, `   Fit: ${option.fit}`, `   Tradeoff: ${option.tradeoff}`,
      ...option.examples.map((title) => `   - ${title}`), '');
  }
  return lines.join('\n').trimEnd();
}

export function sliceGraph(input) {
  if (input.version !== 1 || !Array.isArray(input.slices) || !input.slices.length) fail('A version-1 nonempty slice set is required.');
  requireText(input.title, 'Epic title');
  const ids = input.slices.map((slice) => slice.id);
  if (new Set(ids).size !== ids.length || ids.some((id) => !/^S-[1-9]\d*$/.test(id))) fail('Slice IDs must be unique S-<number> values.');
  const edges = [];
  for (const slice of input.slices) {
    requireText(slice.title, 'Slice title'); requireText(slice.summary, 'Slice summary');
    if (typeof slice.content !== 'string' || !slice.content.trim()) fail(`${slice.id} needs full story/technical-task content.`);
    for (const kind of ['hard', 'recommended']) {
      if (!Array.isArray(slice[kind] ?? [])) fail(`Invalid ${kind} dependencies.`);
      const deps = slice[kind] ?? [];
      if (new Set(deps).size !== deps.length || deps.some((id) => !ids.includes(id) || id === slice.id)) fail(`${slice.id}: unknown/duplicate/self dependency.`);
      for (const id of deps) {
        const reason = slice.reasons?.[id];
        requireText(reason, `Reason for ${id} → ${slice.id}`);
        edges.push({ from: id, to: slice.id, kind, reason });
      }
    }
    for (const external of slice.external ?? []) requireText(external, 'External prerequisite');
  }
  const done = new Set(), feasible = [];
  while (done.size < ids.length) {
    const ready = input.slices.filter((slice) => !done.has(slice.id) && (slice.hard ?? []).every((id) => done.has(id))).map((slice) => slice.id);
    if (!ready.length) fail('Hard-dependency cycle; revise slice boundaries.');
    feasible.push(ready); ready.forEach((id) => done.add(id));
  }
  const stages = input.stages ?? feasible;
  const staged = stages.flat();
  if (staged.length !== ids.length || new Set(staged).size !== ids.length || ids.some((id) => !staged.includes(id))) fail('Implementation stages must include each slice exactly once.');
  const stage = Object.fromEntries(stages.flatMap((members, i) => members.map((id) => [id, i + 1])));
  if (edges.some((edge) => edge.kind === 'hard' && stage[edge.from] >= stage[edge.to])) fail('A hard prerequisite must be in an earlier stage.');
  const closure = new Set();
  function add(id) {
    if (!ids.includes(id)) fail(`Unknown MVP slice: ${id}`);
    if (closure.has(id)) return;
    closure.add(id); (input.slices.find((slice) => slice.id === id).hard ?? []).forEach(add);
  }
  (input.mvp ?? []).forEach(add);
  return { edges, feasible, stages, stage, mvp_closure: ids.filter((id) => closure.has(id)) };
}
const mermaid = (text) => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('`', '&#96;');
export function renderSlices(input, prefix, { compact = false } = {}) {
  const graph = sliceGraph(input);
  const overview = `${prefix}.md`;
  const shortName = (slice) => {
    const words = slug(slice.short_title ?? slice.title).split('-');
    let result = words.shift().slice(0, 40);
    for (const word of words.slice(0, 4)) { if (`${result}-${word}`.length > 40) break; result += `-${word}`; }
    return result;
  };
  const revision = compact ? prefix.slice('slicing-summary'.length) : '';
  const names = Object.fromEntries(input.slices.map((slice) => [slice.id, compact
    ? `${slice.id}-${shortName(slice)}${revision}.md` : `${prefix}-${slice.id}-${slug(slice.title)}.md`]));
  const reference = (id) => `[${id}](${names[id]})`;
  const files = {};
  const summary = ['| Slice | Summary / outcome | Hard prerequisites | Recommended after | Stage |', '|---|---|---|---|---|'];
  for (const slice of input.slices) summary.push(`| ${reference(slice.id)} | ${cell(slice.summary)} | ${[...(slice.hard ?? []).map(reference), ...(slice.external ?? []).map(cell)].join(', ') || 'None'} | ${(slice.recommended ?? []).map(reference).join(', ') || 'None'} | ${graph.stage[slice.id]} |`);
  const diagram = ['```mermaid', 'flowchart LR'];
  for (const slice of input.slices) diagram.push(`  S${slice.id.slice(2)}["${slice.id}: ${mermaid(slice.title)}"]`);
  for (const edge of graph.edges) diagram.push(`  S${edge.from.slice(2)} ${edge.kind === 'hard' ? '-->' : '-. recommended .->'} S${edge.to.slice(2)}`);
  diagram.push('```', '', 'Solid arrows: hard prerequisites. Dashed arrows: recommended sequence.');
  const dependencies = ['| Predecessor | Successor | Relationship | Reason |', '|---|---|---|---|', ...graph.edges.map((edge) => `| ${edge.from} | ${edge.to} | ${edge.kind === 'hard' ? 'Hard prerequisite' : 'Recommended sequence'} | ${cell(edge.reason)} |`)];
  const flow = graph.stages.map((stage, i) => `${i + 1}. ${stage.map(reference).join(', ')} — ${stage.length > 1 ? 'May proceed together after their hard prerequisites.' : 'Proceed after its hard prerequisites.'}`);
  const preparation = input.slices.some((s) => s.preparation || s.parallel) ? [
    '## Preparation and parallel suitability', '',
    '| Slice | Preparation | Parallel suitability | Reason |', '|---|---|---|---|',
    ...input.slices.map((s) => `| ${reference(s.id)} | ${cell(s.preparation ?? 'Not assessed')} | ${cell(s.parallel?.suitability ?? 'Not assessed')} | ${cell(s.parallel?.reason ?? 'Not assessed')} |`), '',
    '### Proposed parallel groups', '',
    ...(input.parallel_groups?.length ? input.parallel_groups.map((group) => `- ${group.map(reference).join(', ')}`) : ['No parallel groups proposed.']), '',
    'Dependency independence alone does not establish safe concurrent implementation. Implementation has not started in this preparation workflow.', '',
  ] : [];
  files[overview] = [`# ${input.title}`, '', input.goal ?? '', '', input.source ? `Source: ${input.source}` : '', '', '## Approach', '', input.approach ?? '', '', input.rationale ?? '', '', '## Assumptions', '', ...(input.assumptions?.length ? input.assumptions.map((s) => `- ${s}`) : ['None']), '', '## Slice summary', '', ...summary, '', '## Dependency map', '', ...diagram, '', ...dependencies, '', ...(graph.edges.length ? [] : ['No inter-slice dependencies identified', '']), '## Recommended implementation flow', '', ...flow, '', ...(graph.mvp_closure.length ? [`Proposed MVP prerequisite closure: ${graph.mvp_closure.map(reference).join(', ')}`, ''] : []), ...preparation, ...(input.open_items?.length ? ['## Open questions', '', ...input.open_items.map((item) => `- ${item}`), ''] : [])].join('\n');
  for (const slice of input.slices) files[names[slice.id]] = [`# ${slice.id} — ${slice.title}`, '', `Epic: ${input.title}`, input.source ? `Source: ${input.source}` : '', `Overview: [${input.title}](${overview})`, '', slice.content.trim(), '', '## Hard prerequisites', '', ...((slice.hard?.length || slice.external?.length) ? [...(slice.hard ?? []).map((id) => `- ${reference(id)}`), ...(slice.external ?? []).map((item) => `- ${item}`)] : ['None']), ''].join('\n');
  return { files, summary: summary.join('\n'), graph, overview, slice_files: names };
}
export async function writeSlices(directory, input, { compact = false } = {}) {
  let rendered;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 13);
  const result = await writeSet(directory, compact ? 'slicing-summary' : `slices-${slug(input.title)}-${stamp}`, (prefix) => { rendered = renderSlices(input, prefix, { compact }); return rendered.files; }, { versioned: compact });
  return { ...result, summary: rendered.summary, graph: rendered.graph, overview: rendered.overview, slice_files: rendered.slice_files,
    chat_summary: `${rendered.summary}\n\nRecommended starting slice: ${rendered.graph.stages.flat()[0]}.` };
}
cli(import.meta.url, async (argv) => {
  const o = args(argv, ['--input', '--directory', '--prefix']);
  const input = await jsonInput(o.input);
  if (o.command === 'preview') return renderApproachPreview(input);
  if (o.command === 'check') return sliceGraph(input);
  if (o.command === 'render') return renderSlices(input, o.prefix ?? `slices-${slug(input.title)}`);
  if (o.command === 'write' && o.directory) return writeSlices(o.directory, input);
  fail('Usage: slices.mjs preview --input APPROACHES.json | check|render --input SLICES.json | write --input SLICES.json --directory ARTIFACTS');
});
