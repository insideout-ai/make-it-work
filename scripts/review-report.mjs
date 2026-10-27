#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { args, atomicWrite, cli, fail, jsonInput, requireText, withLock, within } from './lib/artifacts.mjs';
import { validateHandoff } from '../skills/implement/scripts/handoff.mjs';

export function reviewResult(input) {
  if (input.version !== 1 || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(input.ticket ?? '') || !Array.isArray(input.findings)) fail('Invalid review input.');
  requireText(input.branch, 'Branch'); requireText(input.commit, 'Reviewed commit'); requireText(input.coverage, 'Coverage');
  const counts = { Critical: 0, Major: 0, Minor: 0 };
  const findings = input.findings.map((finding, index) => {
    if (!Object.hasOwn(counts, finding.severity)) fail('Invalid finding severity.');
    counts[finding.severity] += 1;
    requireText(finding.claim, 'Finding claim');
    if (typeof finding.evidence !== 'string' || !finding.evidence.trim()) fail('Finding needs inspected evidence.');
    if (!Array.isArray(finding.locations) || !finding.locations.length) fail('Finding needs source locations.');
    for (const location of finding.locations) if (!Number.isSafeInteger(location.line) || location.line < 1 || typeof location.file !== 'string' || path.isAbsolute(location.file) || location.file.split('/').includes('..')) fail('Invalid finding source location.');
    const actionable = finding.actionable ?? finding.severity !== 'Minor';
    if (typeof actionable !== 'boolean' || !actionable && finding.severity !== 'Minor') fail('Major/Critical findings cannot be hidden as non-actionable.');
    if (input.implement) {
      if (!['fix', 'replan', 'human'].includes(finding.route)) fail('Implement findings require exactly one route.');
      requireText(finding.region, 'Stable finding region');
    }
    return { ...finding, actionable, id: `#${index + 1}` };
  });
  const actionable = findings.filter((finding) => finding.actionable);
  const outcome = actionable.some((f) => f.route === 'replan') ? 'REPLAN_REQUIRED' : actionable.some((f) => f.route === 'human') ? 'HUMAN_DECISION' : actionable.length ? 'FIX_REQUIRED' : 'CLEAN';
  return { counts, findings, outcome, verdict: actionable.length ? 'Request changes' : findings.length ? 'Approve with nits' : 'Approve' };
}
export function renderReview(input) {
  const result = reviewResult(input);
  const countText = Object.entries(result.counts).filter(([, value]) => value).map(([name, count]) => `${count} ${name}`).join(', ') || 'no issues found';
  const lines = [`### Code review — ${input.ticket} (${input.branch}, ${input.commit})`, '', `**Verdict:** ${result.verdict} — ${countText}`];
  if (input.solid) lines.push(`**Solid:** ${requireText(input.solid, 'Solid observation')}`);
  lines.push('', `Found ${result.findings.length} issues:`, '');
  const summary = [`Verdict: ${result.verdict} (${countText})`];
  for (const finding of result.findings) {
    const locations = finding.locations.map((location) => `${location.repo ? `${location.repo}/` : ''}${location.file}:${location.line}`);
    lines.push(`${finding.id.slice(1)}. **[${finding.severity}]** ${finding.claim}. ${finding.evidence}`, `   ${locations.map((location, i) => finding.locations[i].url ? `[${location}](${finding.locations[i].url})` : `\`${location}\``).join('; ')}${finding.rule ? ` — ${finding.rule}` : ''}`);
    if (input.implement) {
      lines.push(`   Route: ${finding.route}`);
      if (input.implement.review_cycle > 1) lines.push(`   Introduced by fix of: ${finding.introduced_by_fix_of ?? 'none'}`);
    }
    lines.push('');
    summary.push(`${finding.id.slice(1)}. [${finding.severity}] ${finding.claim} — ${locations.join('; ')}`);
  }
  for (const [name, items] of [['Pre-existing (not blocking)', input.preexisting], ['Context gaps (for final sync)', input.context_gaps], ['Known unrelated regressions (documented, out of scope)', input.known_regressions], ['Decided (not re-raised)', input.decided]]) {
    if (items?.length) lines.push(`**${name}:**`, ...items.map((item) => `- ${requireText(item, name)}`), '');
  }
  lines.push(`**Coverage:** ${input.coverage}`, '');
  let handoff = null;
  if (input.implement) {
    if (input.implement.handoff_version === 1) handoff = validateHandoff({ version: 1, ticket: input.ticket, plan_version: input.implement.plan_version, review_cycle: input.implement.review_cycle,
      stage: 'review', status: 'done', outcome: result.outcome, artifacts: { report: `make-it-work/${input.ticket}/${input.ticket}-review.md` },
      data: { findings: result.findings.filter((f) => f.actionable).map((f) => ({ id: f.id, route: f.route, region: f.region, introduced_by_fix_of: f.introduced_by_fix_of ?? null })), context_gaps: input.context_gaps ?? [] } });
    lines.push(`Orchestrator outcome: ${result.outcome}`); summary.push(`Orchestrator outcome: ${result.outcome}`);
  }
  return { markdown: lines.join('\n') + '\n', summary: summary.join('\n'), handoff, ...result };
}
export async function validateLocations(input) {
  for (const finding of input.findings) for (const location of finding.locations) {
    if (location.url && !/^https:\/\/[^\s()]+$/.test(location.url)) fail('Invalid hosted source URL.');
    const roots = input.repo_roots;
    if (!roots || typeof roots !== 'object') fail('Explicit repo_roots are required to validate source locations.');
    const repo = location.repo ?? (Object.keys(roots).length === 1 ? Object.keys(roots)[0] : null);
    if (!repo || !roots[repo]) fail(`No source repo root for ${location.file}.`);
    let content;
    if (input.working_tree === true) content = await readFile(await within(roots[repo], location.file), 'utf8');
    else {
      if (!/^(HEAD|[0-9a-f]{7,40})$/.test(input.commit)) fail('Committed review requires an exact commit hash or HEAD.');
      content = execFileSync('git', ['-C', roots[repo], 'show', `${input.commit}:${location.file}`], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    }
    const count = content.split('\n').length - (content.endsWith('\n') ? 1 : 0);
    if (location.line > count || content.includes('\0')) fail(`Source line is outside the reviewed text: ${location.file}:${location.line}`);
  }
}
export async function writeReview(root, input) {
  const rendered = renderReview(input);
  await validateLocations(input);
  const artifacts = path.join(root, 'make-it-work');
  await mkdir(artifacts, { recursive: true });
  if (!(await lstat(artifacts)).isDirectory()) fail('Artifact root must not be a symlink.');
  const directory = path.join(artifacts, input.ticket);
  await mkdir(directory, { recursive: true });
  if (!(await lstat(directory)).isDirectory()) fail('Run directory must not be a symlink.');
  const report = path.join(directory, `${input.ticket}-review.md`);
  return withLock(report, async () => {
    await atomicWrite(report, rendered.markdown);
    let handoff = null;
    if (rendered.handoff) {
      const handoffs = path.join(directory, `${input.ticket}-handoffs`);
      await mkdir(handoffs, { recursive: true });
      if (!(await lstat(handoffs)).isDirectory()) fail('Handoff directory must not be a symlink.');
      const numbers = (await readdir(handoffs)).map((name) => Number(name.match(/^review-([1-9]\d*)\.json$/)?.[1] ?? 0));
      handoff = path.join(handoffs, `review-${Math.max(0, ...numbers) + 1}.json`);
      await writeFile(handoff, JSON.stringify(rendered.handoff, null, 2) + '\n', { flag: 'wx' });
    }
    return { report, handoff, summary: rendered.summary + `\n→ full report: ${report}` + (handoff ? `\nHandoff: ${handoff}` : ''), outcome: rendered.outcome };
  });
}
cli(import.meta.url, async (argv) => {
  const o = args(argv, ['--root', '--input']);
  if (o.command !== 'write' || !o.root) fail('Usage: review-report.mjs write --root ARTIFACT_ROOT --input REVIEW.json');
  return writeReview(o.root, await jsonInput(o.input));
});
