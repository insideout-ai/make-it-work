#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { lstat, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HEADER = `# Implement workflow feedback

Schema: 1
Reporter: Anonymous

> Review this file before sharing. It may contain AI-generated inferences, and it is never uploaded automatically.
`;
const ROOT_CAUSES = new Set([
  'refinement gap', 'planning gap', 'execution deviation', 'review gap',
  'orchestration issue', 'project-context gap', 'unavoidable', 'unclear',
]);
const PREVENTABILITY = new Set(['likely', 'partial', 'unavoidable', 'unclear']);
const CONFIDENCE = new Set(['high', 'medium', 'low']);
const REPLAN_FROM = new Set(['execute', 'review', 'fix-plan']);
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

function fail(message) { throw new Error(message); }

function section(markdown, heading) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trimEnd() === `## ${heading}`);
  if (start < 0) fail(`Missing ## ${heading} in state file.`);
  const end = lines.findIndex((line, index) => index > start && line.startsWith('## '));
  return lines.slice(start + 1, end < 0 ? undefined : end).join('\n').trim();
}

function tableCells(line) {
  if (!line.startsWith('|') || !line.endsWith('|')) fail(`Malformed Audit log row: ${line}`);
  // Audit prose may contain escaped pipes; they are not column boundaries.
  const cells = line.slice(1, -1).split(/(?<!\\)\|/).map((cell) => cell.trim().replaceAll('\\|', '|'));
  if (cells.length !== 5) fail(`Audit log row must have five columns: ${line}`);
  return cells;
}

export function inspectState(markdown, { limitStop = false } = {}) {
  const fieldBlock = markdown.match(/^```\s*\r?\n([\s\S]*?)^```/m)?.[1];
  if (!fieldBlock) fail('Missing state field block.');
  const fields = Object.fromEntries([...fieldBlock.matchAll(/^([a-z_]+):\s*(.*?)\s*$/gm)]
    .map((match) => [match[1], match[2]]));
  const { ticket, status, phase, start_time: runId } = fields;
  if (!ticket || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(ticket)) fail('Invalid ticket field.');
  if (!ISO_UTC.test(runId ?? '') || Number.isNaN(Date.parse(runId))) {
    fail('A real ISO 8601 UTC start_time is required for feedback.');
  }
  if (status === 'Complete') {
    if (phase !== 'complete' || limitStop) fail('Complete feedback requires phase: complete and no --limit-stop.');
  } else if (status === 'Stopped' && limitStop) {
    if (!['execute', 'review', 'fix-plan'].includes(phase)) {
      fail('A limit stop must be in execute, review, or fix-plan.');
    }
  } else {
    fail('Feedback requires a completed run or an explicitly confirmed fix/review/replan limit stop.');
  }

  const lines = section(markdown, 'Audit log').split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length < 3 || !/^\|\s*#\s*\|/.test(lines[0]) || !/^\|\s*---/.test(lines[1])) {
    fail('Audit log table header is missing.');
  }
  const rows = lines.slice(2).map((line, index) => {
    const [number, time, from, to, outcome] = tableCells(line);
    if (Number(number) !== index + 1 || !ISO_UTC.test(time) || Number.isNaN(Date.parse(time))) {
      fail(`Invalid Audit log number or timestamp at row ${index + 1}.`);
    }
    return { number: index + 1, from, to, outcome };
  });
  if (rows.length === 0) fail('Audit log is empty.');
  const finalRow = rows.at(-1);
  if (finalRow.to !== phase) fail('Final Audit log destination and phase field disagree.');
  if (status === 'Complete' && finalRow.to !== 'complete') fail('Final Audit log row must enter complete.');
  if (status === 'Stopped' && !/\b(limit|cap|exhausted)\b/i.test(`${fields.pause_reason} ${finalRow.outcome}`)) {
    fail('A limit stop needs limit/cap/exhausted evidence in pause_reason or the final Audit log row.');
  }

  const events = rows.flatMap((row) => {
    if (row.to === 'fix-plan' && row.from !== 'fix-plan') return [{ kind: 'Fix', row: row.number }];
    if (row.to === 'plan' && REPLAN_FROM.has(row.from)) return [{ kind: 'Replan', row: row.number }];
    return [];
  });
  const explicitReviews = rows.filter((row) => /\bReview cycle \d+\b/i.test(row.outcome)).length;
  const enteredReviews = rows.filter((row) => row.to === 'review' && row.from !== 'review').length;
  return {
    runId, outcome: status === 'Complete' ? 'Complete' : 'Stopped — loop limit',
    minimal: events.length === 0,
    fixRounds: events.filter((event) => event.kind === 'Fix').length,
    replans: events.filter((event) => event.kind === 'Replan').length,
    reviewCycles: explicitReviews || enteredReviews,
    events,
    ticket,
  };
}

function safeLine(value, label, ticket) {
  const escapedTicket = ticket.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const ticketMention = new RegExp(`(?<![A-Za-z0-9])${escapedTicket}(?![A-Za-z0-9])`, 'i');
  if (typeof value !== 'string' || !value.trim() || /[\r\n<>`\\/]/.test(value) ||
      /(?:https?:|\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/i.test(value) ||
      ticketMention.test(value)) {
    fail(`${label} must be one share-safe line without paths, markup, contact details, or the ticket ID.`);
  }
  return value.trim();
}

function safeLines(value, label, ticket) {
  if (!Array.isArray(value)) fail(`${label} must be an array.`);
  return value.map((item, index) => safeLine(item, `${label}[${index}]`, ticket));
}

function validateAnalysis(analysis, summary) {
  if (!analysis || typeof analysis !== 'object' || Array.isArray(analysis)) fail('Analysis must be a JSON object.');
  if (!Array.isArray(analysis.events) || analysis.events.length !== summary.events.length) {
    fail('Analysis must have one event per Audit log fix/replan event, in order.');
  }
  const events = analysis.events.map((event, index) => {
    const expected = summary.events[index];
    if (event.kind !== expected.kind || event.row !== expected.row) {
      fail(`Analysis event ${index + 1} must match ${expected.kind} at Audit log row ${expected.row}.`);
    }
    if (!ROOT_CAUSES.has(event.rootCause)) fail(`Invalid rootCause in event ${index + 1}.`);
    if (!PREVENTABILITY.has(event.preventability)) fail(`Invalid preventability in event ${index + 1}.`);
    if (!CONFIDENCE.has(event.confidence)) fail(`Invalid confidence in event ${index + 1}.`);
    return {
      ...event,
      trigger: safeLine(event.trigger, 'trigger', summary.ticket),
      explanation: safeLine(event.explanation, 'explanation', summary.ticket),
      earliestStage: safeLine(event.earliestStage, 'earliestStage', summary.ticket),
      owner: safeLine(event.owner, 'owner', summary.ticket),
      improvement: safeLine(event.improvement, 'improvement', summary.ticket),
    };
  });
  const recommendations = safeLines(analysis.recommendations, 'recommendations', summary.ticket);
  const openQuestions = safeLines(analysis.openQuestions, 'openQuestions', summary.ticket);
  if (recommendations.length === 0) fail('At least one consolidated recommendation is required.');
  if (!Array.isArray(analysis.clarifications)) fail('clarifications must be an array.');
  const clarifications = analysis.clarifications.map((entry, index) => ({
    question: safeLine(entry.question, `clarifications[${index}].question`, summary.ticket),
    answer: safeLine(entry.answer, `clarifications[${index}].answer`, summary.ticket),
  }));
  return { events, recommendations, openQuestions, clarifications };
}

export function renderBlock(summary, analysis = null) {
  const prefix = `<!-- run:${summary.runId} -->\n## Run started ${summary.runId}\n\n` +
    `- Outcome: ${summary.outcome}\n- Minimal path: ${summary.minimal ? 'Yes' : 'No'}\n` +
    `- Fix rounds: ${summary.fixRounds}\n- Replans: ${summary.replans}\n` +
    `- Review cycles: ${summary.reviewCycles}\n`;
  if (summary.minimal) {
    if (analysis !== null) fail('Minimal runs must not include retrospective analysis.');
    return `${prefix}- Workflow feedback: No fix or replan round was needed.\n<!-- /run:${summary.runId} -->`;
  }
  const validated = validateAnalysis(analysis, summary);
  const eventBlocks = validated.events.map((event, index) =>
    `#### Event ${index + 1} — ${event.kind}\n\n` +
    `- Trigger: ${event.trigger}\n- Root cause: ${event.rootCause} — ${event.explanation}\n` +
    `- Earliest preventable stage: ${event.earliestStage}\n` +
    `- Preventability: ${event.preventability}\n- Workflow owner: ${event.owner}\n` +
    `- Suggested improvement: ${event.improvement}\n- Confidence: ${event.confidence}`);
  const clarificationBlock = validated.clarifications.length
    ? `\n\n### User clarifications\n\n${validated.clarifications.map((entry) =>
      `- Question: ${entry.question}\n  Answer: ${entry.answer}`).join('\n')}` : '';
  return `${prefix}\n### Extra-round analysis\n\n${eventBlocks.join('\n\n')}\n\n` +
    `### Consolidated recommendations\n\n${validated.recommendations.map((item) => `- ${item}`).join('\n')}` +
    `${clarificationBlock}\n\n### Open questions\n\n` +
    `${validated.openQuestions.length ? validated.openQuestions.map((item) => `- ${item}`).join('\n') : '- None'}\n` +
    `<!-- /run:${summary.runId} -->`;
}

export function upsertBlock(existing, summary, block) {
  if (existing === null) return { text: `${HEADER}\n${block}\n`, warning: null };
  const start = `<!-- run:${summary.runId} -->`;
  const end = `<!-- /run:${summary.runId} -->`;
  const tokens = [];
  for (const [marker, type] of [[start, 'start'], [end, 'end']]) {
    let index = existing.indexOf(marker);
    while (index >= 0) {
      tokens.push({ index, type });
      index = existing.indexOf(marker, index + marker.length);
    }
  }
  tokens.sort((a, b) => a.index - b.index);
  const pairs = [];
  for (let index = 0; index < tokens.length - 1; index += 1) {
    if (tokens[index].type === 'start' && tokens[index + 1].type === 'end') {
      pairs.push([tokens[index].index, tokens[index + 1].index]);
    }
  }
  if (pairs.length === 1) {
    const [opening, closing] = pairs[0];
    const warning = tokens.length === 2 ? null
      : 'Preserved malformed matching markers outside the replaced run block.';
    return { text: existing.slice(0, opening) + block + existing.slice(closing + end.length), warning };
  }
  const warning = tokens.length > 0
    ? 'Malformed or duplicate matching run markers; appended a fresh complete block without altering existing text.' : null;
  return { text: `${existing}${existing.endsWith('\n') ? '\n' : '\n\n'}${block}\n`, warning };
}

export async function writeFeedback(statePath, { analysis = null, limitStop = false } = {}) {
  const state = await readFile(statePath, 'utf8');
  const summary = inspectState(state, { limitStop });
  if (path.basename(statePath) !== `${summary.ticket}-state.md`) fail('State filename and ticket field disagree.');
  const block = renderBlock(summary, analysis);
  const outputPath = path.join(path.dirname(statePath), 'implement-feedback.md');
  let existing = null;
  let mode;
  try {
    const info = await lstat(outputPath);
    if (!info.isFile()) fail('Feedback path must be a regular file, not a symlink or directory.');
    mode = info.mode & 0o777;
    existing = await readFile(outputPath, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const result = upsertBlock(existing, summary, block);
  const temporary = path.join(path.dirname(outputPath), `.implement-feedback.${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, result.text, { flag: 'wx', mode: mode ?? 0o600 });
    await rename(temporary, outputPath);
  } finally {
    await unlink(temporary).catch((error) => { if (error.code !== 'ENOENT') throw error; });
  }
  return { ...summary, outputPath, warning: result.warning };
}

async function main() {
  const [mode, ...args] = process.argv.slice(2);
  if (!['inspect', 'write'].includes(mode)) fail('Usage: write-feedback.mjs <inspect|write> --state <path> [--analysis <json-path>] [--limit-stop]');
  let statePath;
  let analysisPath;
  let limitStop = false;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--state') statePath = args[++index];
    else if (args[index] === '--analysis') analysisPath = args[++index];
    else if (args[index] === '--limit-stop') limitStop = true;
    else fail(`Unknown argument: ${args[index]}`);
  }
  if (!statePath || (mode === 'inspect' && analysisPath)) fail('Provide --state; --analysis is write-only.');
  if (mode === 'inspect') {
    const summary = inspectState(await readFile(statePath, 'utf8'), { limitStop });
    const { ticket: _ticket, ...shareSafe } = summary;
    process.stdout.write(`${JSON.stringify(shareSafe)}\n`);
    return;
  }
  const analysis = analysisPath ? JSON.parse(await readFile(analysisPath, 'utf8')) : null;
  const result = await writeFeedback(statePath, { analysis, limitStop });
  const { ticket: _ticket, outputPath, ...shareSafe } = result;
  process.stdout.write(`${JSON.stringify({ ...shareSafe, outputPath })}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { process.stderr.write(`Feedback writer: ${error.message}\n`); process.exitCode = 1; });
}
