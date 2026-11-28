#!/usr/bin/env node
import { open, lstat, readdir, realpath, rename, unlink } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { args, cli, within } from './lib/artifacts.mjs';
import { resolveArtifactOutput } from './artifact-output.mjs';
import { zip } from './lib/zip.mjs';

const agentPattern = /^agent-([A-Za-z0-9_-]{1,128})\.jsonl$/;
const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const hash = data => createHash('sha256').update(data).digest('hex');

// Capture only the bytes present when each file is opened. Never wait for agents
// or the transcript's own archive command/result to be appended.
async function snapshot(file, budget) {
  if (!(await lstat(file)).isFile()) throw Object.assign(new Error('Not a regular file.'), { code: 'NOT_REGULAR' });
  const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await handle.stat();
    if (!stat.isFile()) throw Object.assign(new Error('Not a regular file.'), { code: 'NOT_REGULAR' });
    if (stat.size > budget.remaining) throw Object.assign(new Error('Snapshot budget exceeded.'), { code: 'SIZE_LIMIT' });
    const data = Buffer.alloc(stat.size);
    let offset = 0;
    while (offset < data.length) {
      const { bytesRead } = await handle.read(data, offset, data.length - offset, offset);
      if (!bytesRead) throw Object.assign(new Error('File shrank during capture.'), { code: 'CHANGED' });
      offset += bytesRead;
    }
    budget.remaining -= data.length;
    return { data, modifiedAt: stat.mtime.toISOString(), capturedAt: new Date().toISOString() };
  } finally { await handle.close(); }
}

function agentReferences(data, parentId, references, limitations) {
  const calls = new Set();
  let malformed = false;
  for (const line of data.toString('utf8').split('\n')) {
    if (!line.trim()) continue;
    let event;
    try { event = JSON.parse(line); } catch { malformed = true; continue; }
    if (!event || !['user', 'assistant'].includes(event.type)) continue;
    const content = event.message?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (!block || typeof block !== 'object') continue;
      if (event.type === 'assistant' && block.type === 'tool_use' && ['Agent', 'Task'].includes(block.name)) calls.add(block.id);
      if (event.type !== 'user' || block.type !== 'tool_result' || !calls.has(block.tool_use_id)) continue;
      const id = event.toolUseResult?.agentId;
      if (!validId(id) || id === parentId) continue;
      if (!references.has(id)) references.set(id, new Set());
      references.get(id).add(parentId);
    }
  }
  if (malformed) limitations.push(`${parentId}: unparseable or incomplete JSONL records retained; relationship discovery may be incomplete.`);
}

export async function createFeedbackArchive({ root, reportPath, transcriptPath, maxBytes = 256 * 1024 * 1024 }) {
  const requestedReport = path.resolve(root, reportPath);
  root = await realpath(root);
  reportPath = await within(root, path.join(await realpath(path.dirname(requestedReport)), path.basename(requestedReport)));
  const directory = path.dirname(reportPath);
  const stem = path.basename(reportPath, '.md').replace(/^miw-/, '');
  const output = await resolveArtifactOutput({ root, directory: path.relative(root, directory),
    name: stem === 'workflow-feedback' ? 'miw-session-debug.zip' : `miw-${stem}-session-debug.zip` });
  const budget = { remaining: maxBytes }, files = [], entries = [], limitations = [];
  const references = new Map(), capturedAgents = new Set();
  async function capture(file, name, role, agentId = null) {
    const entry = { name, role, ...(agentId ? { agentId } : {}) };
    try {
      const saved = await snapshot(file, budget);
      files.push({ name, data: saved.data });
      entries.push({ ...entry, status: 'captured', bytes: saved.data.length, sha256: hash(saved.data),
        modifiedAt: saved.modifiedAt, capturedAt: saved.capturedAt });
      if (role !== 'report' && path.extname(file) === '.jsonl') agentReferences(saved.data, agentId ?? 'main', references, limitations);
      return true;
    } catch (error) {
      if (role === 'report') throw error;
      entries.push({ ...entry, status: 'unavailable', reason: error.code ?? 'READ_FAILED' });
      return false;
    }
  }
  await capture(reportPath, 'miw-workflow-feedback.md', 'report');
  if (!transcriptPath) {
    entries.push({ name: 'miw-main-transcript.jsonl', role: 'main', status: 'unavailable', reason: 'TRANSCRIPT_PATH_NOT_SUPPLIED' });
    limitations.push('No runtime transcript path supplied; main and sub-agent transcripts could not be discovered.');
  } else {
    const transcript = path.resolve(transcriptPath);
    const extension = ['.jsonl', '.txt', '.md'].includes(path.extname(transcript)) ? path.extname(transcript) : '.txt';
    await capture(transcript, `miw-main-transcript${extension}`, 'main');
    if (path.extname(transcript) !== '.jsonl') limitations.push('Input is not a JSONL runtime transcript; automatic sub-agent discovery is unavailable.');
    else {
      // The documented Claude session layout. No global history scan and no
      // execution or following of paths found in transcript content.
      const sessionDirectory = transcript.slice(0, -'.jsonl'.length);
      const discovered = new Map();
      async function scan(folder, depth = 0) {
        try {
          if (!(await lstat(folder)).isDirectory()) throw Object.assign(new Error('Not a directory.'), { code: 'NOT_DIRECTORY' });
          if (depth > 16) throw Object.assign(new Error('Directory nesting limit.'), { code: 'DEPTH_LIMIT' });
          for (const item of (await readdir(folder, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
            const file = path.join(folder, item.name), match = item.name.match(agentPattern);
            if (item.isDirectory()) await scan(file, depth + 1);
            else if (match) {
              if (discovered.has(match[1])) limitations.push(`${match[1]}: duplicate agent transcript omitted.`);
              else discovered.set(match[1], file);
            } else if (item.isSymbolicLink()) limitations.push('A symlink in the session sub-agent directory was skipped.');
          }
        } catch (error) { limitations.push(`Sub-agent directory discovery incomplete: ${error.code ?? 'READ_FAILED'}.`); }
      }
      try {
        // Reject a symlink at the session root before descending into subagents.
        if (!(await lstat(sessionDirectory)).isDirectory()) throw Object.assign(new Error('Not a directory.'), { code: 'NOT_DIRECTORY' });
        await scan(path.join(sessionDirectory, 'subagents'));
      } catch (error) { limitations.push(`Session sub-agent directory unavailable: ${error.code ?? 'READ_FAILED'}.`); }
      for (const [id, file] of discovered) {
        await capture(file, `miw-agent-${id}-transcript.jsonl`, 'agent', id);
        capturedAgents.add(id);
      }
    }
  }
  for (const [id] of references) if (!capturedAgents.has(id)) entries.push({ name: `miw-agent-${id}-transcript.jsonl`, role: 'agent', agentId: id,
    status: 'unavailable', reason: 'REFERENCED_TRANSCRIPT_NOT_FOUND' });
  for (const entry of entries) if (entry.role === 'agent') entry.parentIds = [...(references.get(entry.agentId) ?? [])].sort();
  limitations.push('Snapshot of files available at capture time; later messages and running-agent output are excluded.',
    'Agent relationships are inferred only from paired Agent/Task results. Empty parentIds means unknown.',
    'Discovery covers the selected Claude session subagents directory only; deleted, external or unsupported-runtime transcripts may be unavailable.');
  const manifest = { version: 1, capturedAt: new Date().toISOString(), snapshotByteLimit: maxBytes, sensitive: true, sanitized: false,
    entries, limitations, sharing: 'Local raw transcript archive. Review before deliberately sharing; never attach or upload automatically.' };
  files.push({ name: 'miw-manifest.json', data: JSON.stringify(manifest, null, 2) + '\n' });
  const temporary = path.join(directory, `miw-session-debug-${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await open(temporary, 'wx', 0o600);
    await handle.writeFile(zip(files));
    await handle.close(); handle = null;
    await rename(temporary, output.file);
  } finally { await handle?.close(); await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
  return { status: 'saved', archivePath: output.file, capturedTranscripts: entries.filter(e => e.role !== 'report' && e.status === 'captured').length,
    unavailableTranscripts: entries.filter(e => e.status === 'unavailable').length, limitations, sensitive: true };
}

// Archive failure never invalidates a successfully saved feedback report.
export async function prepareFeedbackArchive(options) {
  try { return await createFeedbackArchive(options); }
  catch (error) { return { status: 'unavailable', reason: error.code ?? 'ARCHIVE_FAILED',
    warning: 'Feedback report saved; session transcript ZIP could not be prepared. Any older ZIP is stale.' }; }
}

cli(import.meta.url, argv => {
  const o = args(argv, ['--root', '--report', '--transcript']);
  if (o.command !== 'create' || !o.root || !o.report) throw new Error('Usage: feedback-archive.mjs create --root PROJECT --report REPORT [--transcript SESSION_JSONL]');
  return prepareFeedbackArchive({ root: o.root, reportPath: o.report, transcriptPath: o.transcript });
});
