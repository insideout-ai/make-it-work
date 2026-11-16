#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { args, atomicWrite, cli, requireText, withLock } from '../../../scripts/lib/artifacts.mjs';
import { artifactJoin, artifactResolve } from '../../../scripts/lib/artifact-path.mjs';
import { assertRunState } from './artifact-layout.mjs';
import { parseState } from './render-status.mjs';

// Notification bookkeeping only. Acceptance never authorizes a stage transition,
// a source edit, or a delivery operation; the ordinary gates still apply.
export async function acceptDelegateReport({ statePath, agent, task, report }) {
  requireText(agent, 'Native agent ID'); requireText(task, 'Native task ID');
  statePath = artifactResolve(statePath);
  const { fields } = parseState(await readFile(statePath, 'utf8'), statePath);
  assertRunState(path.dirname(path.dirname(path.dirname(statePath))), statePath, fields.ticket);
  const directory = await realpath(path.dirname(statePath));
  const target = await realpath(artifactResolve(directory, requireText(report, 'Report path')));
  if (!target.startsWith(directory + path.sep)) throw new Error('Delegate report must stay inside this run directory.');
  const entry = { agent, task, report: path.relative(directory, target), sha256: createHash('sha256').update(await readFile(target)).digest('hex') };
  const file = artifactJoin(directory, 'accepted-delegate-reports.json');
  return withLock(file, async () => {
    let journal;
    try { journal = JSON.parse(await readFile(file, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    journal ??= { version: 1, runId: fields.start_time, reports: [] };
    if (journal.version !== 1 || journal.runId !== fields.start_time || !Array.isArray(journal.reports)) throw new Error('Delegate report journal does not match this run.');
    if (journal.reports.some(item => Object.keys(entry).every(key => item[key] === entry[key]))) return { duplicate: true, ...entry };
    const revised = journal.reports.some(item => item.agent === agent && item.task === task);
    journal.reports.push(entry);
    await atomicWrite(file, JSON.stringify(journal) + '\n');
    return { duplicate: false, revised, ...entry };
  });
}

cli(import.meta.url, async argv => {
  const options = args(argv, ['--state', '--agent', '--task', '--report']);
  if (options.command !== 'accept' || !options.state) throw new Error('Usage: delegate-report.mjs accept --state PATH --agent ID --task ID --report PATH');
  return acceptDelegateReport({ statePath: options.state, agent: options.agent, task: options.task, report: options.report });
});
