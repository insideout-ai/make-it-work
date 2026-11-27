// Read capture artifacts only; never execute commands or infer baseline status.
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { digest, fail, within } from './artifacts.mjs';
import { runDirectory } from '../../skills/implement/scripts/artifact-layout.mjs';

const uuid = '[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}';
const recordName = new RegExp(`^(?:miw-)?command-capture-${uuid}\\.json$`);
const hashPattern = /^[a-f0-9]{64}$/;
async function fileDigest(root, relative) {
  const file = await within(root, relative);
  const hash = createHash('sha256'); let bytes = 0;
  for await (const chunk of createReadStream(file)) { hash.update(chunk); bytes += chunk.length; }
  return { path: relative, sha256: hash.digest('hex'), bytes };
}
function processDescription(record) {
  const p = record.process;
  if (record.version !== 1 || record.status !== 'finished' || !p ||
      !(p.exit_code === null || Number.isSafeInteger(p.exit_code)) ||
      !(p.signal === null || typeof p.signal === 'string') ||
      !(p.error === null || typeof p.error === 'string') || typeof p.timed_out !== 'boolean' ||
      !['pass', 'fail'].includes(p.result)) return null;
  const passed = p.exit_code === 0 && !p.signal && !p.error && !p.timed_out;
  if ((p.result === 'pass') !== passed) return null;
  if (p.timed_out) return `timed out (recorded exit ${p.exit_code ?? 'unavailable'})`;
  if (p.error) return `recorded an execution/startup error (exit ${p.exit_code ?? 'unavailable'})`;
  if (p.signal) return 'ended by a recorded signal';
  return `exited ${p.exit_code ?? 'with unavailable status'}`;
}

export async function collectCommandFacts(root, fields, expectedRecords = []) {
  const directory = runDirectory(root, fields.ticket);
  let names;
  try { names = (await readdir(directory)).filter(name => recordName.test(name)).sort(); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  const expected = new Set();
  for (const entry of expectedRecords) {
    if (typeof entry.path !== 'string' || path.dirname(entry.path) !== path.relative(root, directory) || !recordName.test(path.basename(entry.path))) fail('Bound capture record must be a local run artifact.');
    expected.add(path.basename(entry.path));
  }
  names = [...new Set([...names, ...expected])].sort();
  const records = [], files = [], notes = [];
  for (const name of names) {
    const relative = path.relative(root, path.join(directory, name));
    let record = null, entry;
    // Oversized/malformed or interrupted records remain disclosed, never pass.
    try {
      const file = await within(root, relative);
      if ((await stat(file)).size <= 4 * 1024 * 1024) {
        try { record = JSON.parse(await readFile(file, 'utf8')); } catch { /* incomplete */ }
      }
      entry = await fileDigest(root, relative);
    } catch (error) {
      if (error.code !== 'ENOENT' || !expected.has(name)) throw error;
      entry = { path: relative, sha256: null, bytes: null };
    }
    if (record?.run_id && record.run_id !== fields.start_time) {
      if (!expected.has(name)) continue;
      record = null;
    }
    if (record?.ticket && record.ticket !== fields.ticket) fail('Command capture ticket differs from the current run.');
    const id = digest(relative).slice(0, 12);
    files.push(entry); records.push({ id, ...entry });
    let complete = record?.capture_complete === true;
    if (record?.streams) for (const stream of ['stdout', 'stderr']) {
      const expected = record.streams[stream];
      if (!expected || typeof expected.path !== 'string' || path.dirname(expected.path) !== path.relative(root, directory) ||
          !new RegExp(`^(?:miw-)?command-${stream}-${uuid}\\.txt$`).test(path.basename(expected.path))) fail('Command capture stream must be a local run output.');
      let actual;
      try { actual = await fileDigest(root, expected.path); }
      catch (error) { if (error.code !== 'ENOENT') throw error; actual = { path: expected.path, sha256: null, bytes: null }; }
      files.push(actual);
      complete &&= expected.complete === true && hashPattern.test(expected.sha256 ?? '') && expected.sha256 === actual.sha256 && expected.bytes === actual.bytes;
    }
    else complete = false;
    const validIdentity = record?.run_id === fields.start_time && record.ticket === fields.ticket &&
      Number.isSafeInteger(record.plan_version) && record.plan_version > 0 && record.plan_version <= Number(fields.plan_version) &&
      /^[a-f0-9]{40}$/.test(record.before?.head ?? '') && hashPattern.test(record.before?.fingerprint ?? '');
    const description = validIdentity ? processDescription(record) : null;
    const boundaries = record?.source_unchanged === true ? 'recorded boundary snapshots matched' : record?.source_unchanged === false ? 'recorded boundary snapshots differ' : 'source boundary comparison unavailable';
    // Safe for inclusion in delivery prose: no raw argv, log contents, paths or
    // repository names. Full private details remain in the linked capture file.
    notes.push(description
      ? `Captured validation ${id}: process ${description} at recorded HEAD ${record.before.head.slice(0, 12)}, worktree ${record.before.fingerprint.slice(0, 12)}, plan ${record.plan_version}; raw capture ${complete ? 'complete' : 'incomplete or unverified'}; ${boundaries}. This historical observation does not certify the current tree or establish baseline/destination provenance.`
      : `Captured validation ${id}: incomplete or unrecognized capture; process outcome is unknown. No passing validation or baseline/destination provenance is established.`);
  }
  return records.length ? { version: 1, records, files, notes } : null;
}

export function requireCommandFacts(actual, expected, notes, report = null) {
  if (JSON.stringify(actual ?? null) !== JSON.stringify(expected ?? null) ||
      expected?.notes.some(note => !notes?.includes(note) || report !== null && !report.includes(note))) {
    fail('Captured validation facts differ from the reviewed evidence; prepare/review the current facts without rerunning commands.');
  }
}
