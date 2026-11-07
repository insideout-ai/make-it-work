#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { args, atomicWrite, cli, digest, fail, jsonInput, requireText, withLock, within } from '../../../scripts/lib/artifacts.mjs';
import { parseState } from './render-status.mjs';
import { checkpointResult } from './dashboard-checkpoint.mjs';
import { noteCell, parseNoteCell } from './audit-notes.mjs';

function findingsRecord(findings) {
  if (!Array.isArray(findings) || !findings.length) fail('Provide a diagnosis for each actionable finding.');
  const ids = new Set();
  return findings.map((finding) => {
    if (!finding || typeof finding !== 'object' || Array.isArray(finding)) fail('Each finding needs a diagnosis object.');
    const saved = {};
    for (const key of ['id', 'failure', 'evidence', 'cause', 'next_change', 'expected_result', ...(finding.prior_result === undefined ? [] : ['prior_result'])]) {
      saved[key] = requireText(finding[key], `Diagnosis ${key}`).trim();
      if (/[\x7f]/.test(saved[key])) fail(`Diagnosis ${key} must be a single line.`);
    }
    if (ids.has(saved.id)) fail('Diagnosis finding IDs must be unique.');
    ids.add(saved.id);
    return saved;
  });
}

async function context(root, statePath) {
  const state = parseState(await readFile(await within(root, statePath), 'utf8'), statePath);
  const f = state.fields;
  if (f.status !== 'In Progress' || f.phase !== 'lightweight' || f.mode !== 'lightweight' || Number(f.fix_cycle) < 1) fail('A Lightweight fix round must be active.');
  const prefix = `make-it-work/${f.ticket}/${f.ticket}`;
  if (f.implementation_report !== `${prefix}-lightweight.md`) fail('Lightweight fix requires its existing implementation report.');
  return { state, prefix, report: await within(root, f.implementation_report), spec: await within(root, f.spec) };
}

const marker = (round) => `<!-- lightweight-fix-diagnosis:${round} -->`;
function savedRecord(report, round) {
  const start = marker(round);
  if (!report.includes(start)) fail('Checkpoint the Lightweight fix diagnosis before dispatch or handoff.');
  if (report.split(start).length !== 2) fail('Duplicate Lightweight fix diagnosis checkpoint.');
  const body = report.split(start)[1].match(/^\n```json\n([\s\S]*?)\n```\n<!-- \/lightweight-fix-diagnosis -->/);
  if (!body) fail('Malformed Lightweight fix diagnosis checkpoint.');
  return JSON.parse(body[1]);
}

async function validateRecord(root, ctx, record) {
  const f = ctx.state.fields;
  if (record.version !== 1 || record.ticket !== f.ticket || record.plan_version !== Number(f.plan_version) || record.round !== Number(f.fix_cycle)) fail('Lightweight diagnosis belongs to another fix round.');
  const allowed = [`${ctx.prefix}-review.md`, `${ctx.prefix}-final-feedback.md`];
  if (!allowed.includes(record.source)) fail('Diagnosis source must be this run\'s review or final feedback.');
  const source = await readFile(await within(root, record.source), 'utf8');
  if (record.spec_hash !== digest(await readFile(ctx.spec)) || record.source_hash !== digest(source)) fail('Lightweight diagnosis is stale; inspect the changed spec or fix source before dispatch.');
  if (JSON.stringify(findingsRecord(record.findings)) !== JSON.stringify(record.findings)) fail('Malformed saved diagnosis findings.');
  return record;
}

function auditNote(ctx, record) {
  return {
    id: `lightweight-diagnosis-${record.ticket}-v${record.plan_version}-r${record.round}`,
    text: `Lightweight fix round ${record.round} diagnosis: ${record.findings.map((item) => `${item.id}: ${item.failure}; cause: ${item.cause}; next: ${item.next_change}`).join('; ')}`,
    reference: `${ctx.state.fields.implementation_report}#fix-round-${record.round}; ${record.source}`,
  };
}

export async function inspectLightweightFix(root, statePath, expectedReport) {
  const ctx = await context(root, statePath);
  if (expectedReport && expectedReport !== ctx.state.fields.implementation_report) fail('Fix handoff must retain the checkpointed implementation report.');
  const record = await validateRecord(root, ctx, savedRecord(await readFile(ctx.report, 'utf8'), Number(ctx.state.fields.fix_cycle)));
  const note = auditNote(ctx, record);
  const expected = parseNoteCell(noteCell({ kind: 'result', ...note })).outcome;
  if (!ctx.state.audit.some((row) => row.note?.kind === 'result' && row.note.id === note.id && row.outcome === expected)) fail('Recover the Lightweight diagnosis audit checkpoint before dispatch or handoff.');
  return { report: ctx.state.fields.implementation_report, round: record.round, findings: record.findings, next_action: 'Dispatch one fresh fix subagent with this diagnosis; the parent must not edit product source.' };
}

export async function checkpointLightweightFix(root, statePath, input) {
  statePath = await within(root, statePath);
  return withLock(statePath, async () => {
    const ctx = await context(root, statePath), f = ctx.state.fields;
    const source = input.source ?? `${ctx.prefix}-review.md`;
    const record = { version: 1, ticket: f.ticket, plan_version: Number(f.plan_version), round: Number(f.fix_cycle), source,
      spec_hash: digest(await readFile(ctx.spec)), source_hash: digest(await readFile(await within(root, source))), findings: findingsRecord(input.findings) };
    await validateRecord(root, ctx, record);
    const original = await readFile(ctx.report, 'utf8');
    if (original.includes(marker(record.round))) {
      if (JSON.stringify(savedRecord(original, record.round)) !== JSON.stringify(record)) fail('This round already has a different diagnosis; reconcile it instead of overwriting its history.');
    } else {
      await atomicWrite(ctx.report, `${original.trimEnd()}\n\n## Fix round ${record.round}\n\n### Diagnosis before correction\n\n${marker(record.round)}\n\`\`\`json\n${JSON.stringify(record, null, 2)}\n\`\`\`\n<!-- /lightweight-fix-diagnosis -->\n`);
    }
    // Persist the report first. An identical call repairs audit/render failure.
    await checkpointResult(statePath, auditNote(ctx, record));
    return inspectLightweightFix(root, statePath);
  });
}

cli(import.meta.url, async (argv) => {
  const o = args(argv, ['--root', '--state', '--input']);
  if (!o.root || !o.state || !['checkpoint', 'inspect'].includes(o.command)) fail('Use lightweight-fix.mjs checkpoint|inspect --root ROOT --state STATE [--input diagnosis.json].');
  return o.command === 'inspect' ? inspectLightweightFix(o.root, o.state) : checkpointLightweightFix(o.root, o.state, await jsonInput(o.input));
});
