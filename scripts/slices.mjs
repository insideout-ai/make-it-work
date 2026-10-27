#!/usr/bin/env node
import { args, cell, cli, fail, jsonInput, requireText, slug, writeSet } from './lib/artifacts.mjs';

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
export function renderSlices(input, prefix) {
  const graph = sliceGraph(input);
  const overview = `${prefix}.md`;
  const names = Object.fromEntries(input.slices.map((slice) => [slice.id, `${prefix}-${slice.id}-${slug(slice.title)}.md`]));
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
  files[overview] = [`# ${input.title}`, '', input.goal ?? '', '', input.source ? `Source: ${input.source}` : '', '', '## Approach', '', input.approach ?? '', '', input.rationale ?? '', '', '## Assumptions', '', ...(input.assumptions?.length ? input.assumptions.map((s) => `- ${s}`) : ['None']), '', '## Slice summary', '', ...summary, '', '## Dependency map', '', ...diagram, '', ...dependencies, '', ...(graph.edges.length ? [] : ['No inter-slice dependencies identified', '']), '## Recommended implementation flow', '', ...flow, '', ...(graph.mvp_closure.length ? [`Proposed MVP prerequisite closure: ${graph.mvp_closure.map(reference).join(', ')}`, ''] : [])].join('\n');
  for (const slice of input.slices) files[names[slice.id]] = [`# ${slice.id} — ${slice.title}`, '', `Epic: ${input.title}`, input.source ? `Source: ${input.source}` : '', `Overview: [${input.title}](${overview})`, '', slice.content.trim(), '', '## Hard prerequisites', '', ...((slice.hard?.length || slice.external?.length) ? [...(slice.hard ?? []).map((id) => `- ${reference(id)}`), ...(slice.external ?? []).map((item) => `- ${item}`)] : ['None']), ''].join('\n');
  return { files, summary: summary.join('\n'), graph };
}
export async function writeSlices(directory, input) {
  let rendered;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 13);
  const result = await writeSet(directory, `slices-${slug(input.title)}-${stamp}`, (prefix) => { rendered = renderSlices(input, prefix); return rendered.files; });
  return { ...result, summary: rendered.summary, graph: rendered.graph };
}
cli(import.meta.url, async (argv) => {
  const o = args(argv, ['--input', '--directory', '--prefix']);
  const input = await jsonInput(o.input);
  if (o.command === 'check') return sliceGraph(input);
  if (o.command === 'render') return renderSlices(input, o.prefix ?? `slices-${slug(input.title)}`);
  if (o.command === 'write' && o.directory) return writeSlices(o.directory, input);
  fail('Usage: slices.mjs check|render --input SLICES.json | write --input SLICES.json --directory ARTIFACTS');
});
