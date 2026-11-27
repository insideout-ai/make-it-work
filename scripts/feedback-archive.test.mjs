import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, stat, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { inflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { createFeedbackArchive, prepareFeedbackArchive } from './feedback-archive.mjs';
import { crc32, zip } from './lib/zip.mjs';

function unpack(data) {
  const files = new Map();
  let offset = 0;
  while (data.readUInt32LE(offset) === 0x04034b50) {
    assert.equal(data.readUInt16LE(offset + 8), 8);
    const length = data.readUInt32LE(offset + 18), nameLength = data.readUInt16LE(offset + 26);
    const start = offset + 30 + nameLength + data.readUInt16LE(offset + 28);
    const name = data.subarray(offset + 30, offset + 30 + nameLength).toString();
    const body = inflateRawSync(data.subarray(start, start + length));
    assert.equal(body.length, data.readUInt32LE(offset + 22));
    assert.equal(crc32(body), data.readUInt32LE(offset + 14));
    files.set(name, body);
    offset = start + length;
  }
  const centralOffset = offset;
  let count = 0;
  while (data.readUInt32LE(offset) === 0x02014b50) {
    const nameLength = data.readUInt16LE(offset + 28);
    const localOffset = data.readUInt32LE(offset + 42);
    assert.equal(data.readUInt32LE(localOffset), 0x04034b50);
    const name = data.subarray(offset + 46, offset + 46 + nameLength).toString();
    assert.ok(files.has(name)); count++;
    offset += 46 + nameLength + data.readUInt16LE(offset + 30) + data.readUInt16LE(offset + 32);
  }
  assert.equal(data.readUInt32LE(offset), 0x06054b50);
  assert.equal(data.readUInt32LE(offset + 16), centralOffset);
  assert.equal(data.readUInt32LE(offset + 12), offset - centralOffset);
  assert.equal(data.readUInt16LE(offset + 10), count);
  assert.equal(count, files.size);
  assert.equal(offset + 22, data.length);
  return files;
}
const records = child => [
  { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'call', name: 'Agent', input: {} }] } },
  { type: 'user', toolUseResult: { agentId: child }, message: { content: [{ type: 'tool_result', tool_use_id: 'call', content: 'done' }] } },
].map(JSON.stringify).join('\n') + '\n';

async function fixture(t, reportName = 'miw-workflow-feedback.md') {
  const root = await mkdtemp(path.join(os.tmpdir(), 'miw-archive-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = path.join(root, 'make-it-work', 'DEMO');
  await mkdir(directory, { recursive: true });
  const reportPath = path.join(directory, reportName), transcriptPath = path.join(root, 'history', 'session.jsonl');
  await mkdir(path.dirname(transcriptPath));
  await writeFile(reportPath, '# Feedback\n');
  await writeFile(transcriptPath, records('child'));
  const agents = path.join(root, 'history', 'session', 'subagents');
  await mkdir(agents, { recursive: true });
  return { root, reportPath, transcriptPath, agents, directory };
}

test('ZIP records have valid CRCs and reject duplicate or unsafe names', () => {
  assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926);
  assert.equal(unpack(zip([{ name: 'miw-empty.txt', data: '' }])).get('miw-empty.txt').length, 0);
  for (const name of ['../secret', 'main.txt', 'miw-a/b.txt']) assert.throws(() => zip([{ name, data: '' }]));
  assert.throws(() => zip([{ name: 'miw-a', data: '' }, { name: 'miw-a', data: '' }]));
});

test('captures raw main, nested agents and report with hashes, known relationships and missing agents', async t => {
  const f = await fixture(t);
  const child = records('grandchild'), grandchild = records('missing');
  await writeFile(path.join(f.agents, 'agent-child.jsonl'), child);
  await mkdir(path.join(f.agents, 'nested'));
  await writeFile(path.join(f.agents, 'nested', 'agent-grandchild.jsonl'), grandchild);
  await writeFile(path.join(f.agents, 'agent-child.meta.json'), '{"private":"metadata is excluded"}');
  await writeFile(path.join(f.root, 'history', 'unrelated.jsonl'), 'other session');
  const original = await readFile(f.transcriptPath);
  const result = await createFeedbackArchive(f);
  assert.equal(result.status, 'saved');
  assert.equal(path.basename(result.archivePath), 'miw-session-debug.zip');
  assert.equal(result.capturedTranscripts, 3);
  assert.equal(result.unavailableTranscripts, 1);
  const files = unpack(await readFile(result.archivePath));
  assert.deepEqual([...files.keys()].sort(), ['miw-agent-child-transcript.jsonl', 'miw-agent-grandchild-transcript.jsonl',
    'miw-main-transcript.jsonl', 'miw-manifest.json', 'miw-workflow-feedback.md']);
  assert.deepEqual(files.get('miw-main-transcript.jsonl'), original);
  assert.deepEqual(await readFile(f.transcriptPath), original);
  const manifest = JSON.parse(files.get('miw-manifest.json'));
  assert.equal(manifest.sanitized, false);
  for (const e of manifest.entries.filter(e => e.status === 'captured')) {
    assert.equal(e.sha256, createHash('sha256').update(files.get(e.name)).digest('hex'));
    assert.ok(Date.parse(e.capturedAt));
  }
  assert.deepEqual(manifest.entries.find(e => e.agentId === 'child').parentIds, ['main']);
  assert.deepEqual(manifest.entries.find(e => e.agentId === 'grandchild').parentIds, ['child']);
  assert.equal(manifest.entries.find(e => e.agentId === 'missing').reason, 'REFERENCED_TRANSCRIPT_NOT_FOUND');
  assert.equal((await stat(result.archivePath)).mode & 0o777, 0o600);
  assert.ok(!(await readdir(f.directory)).some(name => name.endsWith('.tmp')));
});

test('standalone and legacy inputs always produce miw-prefixed copies and unique report-bound ZIP names', async t => {
  const f = await fixture(t, 'feedback-20261127T120000Z.md');
  const result = await createFeedbackArchive({ root: f.root, reportPath: f.reportPath });
  assert.equal(path.basename(result.archivePath), 'miw-feedback-20261127T120000Z-session-debug.zip');
  const files = unpack(await readFile(result.archivePath));
  assert.deepEqual([...files.keys()], ['miw-workflow-feedback.md', 'miw-manifest.json']);
  const manifest = JSON.parse(files.get('miw-manifest.json'));
  assert.equal(manifest.entries.find(e => e.role === 'main').reason, 'TRANSCRIPT_PATH_NOT_SUPPLIED');
  await writeFile(f.reportPath, '# Corrected feedback\n');
  const update = await createFeedbackArchive({ root: f.root, reportPath: f.reportPath });
  assert.equal(update.archivePath, result.archivePath);
  assert.equal(unpack(await readFile(update.archivePath)).get('miw-workflow-feedback.md').toString(), '# Corrected feedback\n');
});

test('retains partial JSONL and reports incomplete relationship discovery without executing content', async t => {
  const f = await fixture(t);
  await writeFile(f.transcriptPath, records('absent') + '{"type":');
  const result = await createFeedbackArchive(f), files = unpack(await readFile(result.archivePath));
  assert.equal(files.get('miw-main-transcript.jsonl').toString(), records('absent') + '{"type":');
  assert.ok(result.limitations.some(x => x.includes('incomplete JSONL')));
  assert.equal(result.unavailableTranscripts, 1);
});

test('does not follow symlinked agent files, directories or session roots', async t => {
  const f = await fixture(t);
  const external = path.join(f.root, 'external'); await mkdir(external);
  await writeFile(path.join(external, 'agent-private.jsonl'), 'private');
  await symlink(external, path.join(f.agents, 'linked-folder'));
  await symlink(path.join(external, 'agent-private.jsonl'), path.join(f.agents, 'agent-child.jsonl'));
  let result = await createFeedbackArchive(f);
  let files = unpack(await readFile(result.archivePath));
  assert.ok(!files.has('miw-agent-child-transcript.jsonl'));
  assert.ok(!files.has('miw-agent-private-transcript.jsonl'));
  assert.equal(result.unavailableTranscripts, 1);
  await rm(path.dirname(f.agents), { recursive: true });
  await symlink(external, path.dirname(f.agents));
  result = await createFeedbackArchive(f);
  files = unpack(await readFile(result.archivePath));
  assert.ok(!files.has('miw-agent-private-transcript.jsonl'));
  assert.ok(result.limitations.some(x => x.includes('NOT_DIRECTORY')));
});

test('size budget discloses omitted transcripts and absent directory remains a coverage limitation', async t => {
  const f = await fixture(t);
  await rm(f.agents, { recursive: true });
  const result = await createFeedbackArchive({ ...f, maxBytes: 12 });
  const files = unpack(await readFile(result.archivePath));
  const manifest = JSON.parse(files.get('miw-manifest.json'));
  assert.equal(manifest.entries.find(e => e.role === 'main').reason, 'SIZE_LIMIT');
  assert.ok(result.limitations.some(x => x.includes('ENOENT')));
});

test('unsupported text input is archived without pretending JSONL discovery is complete', async t => {
  const f = await fixture(t), transcriptPath = path.join(f.root, 'supplied.txt');
  await writeFile(transcriptPath, 'user: original session\n');
  const result = await createFeedbackArchive({ ...f, transcriptPath });
  assert.equal(result.capturedTranscripts, 1);
  const files = unpack(await readFile(result.archivePath));
  assert.equal(files.get('miw-main-transcript.txt').toString(), 'user: original session\n');
  assert.ok(result.limitations.some(x => x.includes('not a JSONL')));
  assert.ok(!result.limitations.some(x => x.includes('unparseable')));
});

test('failed output replacement preserves existing files and remains non-blocking', async t => {
  const f = await fixture(t), target = path.join(f.directory, 'miw-session-debug.zip');
  const outside = path.join(f.root, 'outside.zip'); await writeFile(outside, 'do not overwrite');
  await symlink(outside, target);
  const result = await prepareFeedbackArchive(f);
  assert.equal(result.status, 'unavailable');
  assert.match(result.warning, /report saved/);
  assert.equal(await readFile(outside, 'utf8'), 'do not overwrite');
  assert.equal(await readFile(f.reportPath, 'utf8'), '# Feedback\n');
  assert.ok(!(await readdir(f.directory)).some(name => name.endsWith('.tmp')));
});

test('CLI uses the standalone helper and Git-protects the ZIP', async t => {
  const f = await fixture(t);
  assert.equal(spawnSync('git', ['init', '-q', f.root]).status, 0);
  const cli = spawnSync(process.execPath, [path.resolve('scripts/feedback-archive.mjs'), 'create', '--root', f.root,
    '--report', f.reportPath, '--transcript', f.transcriptPath], { encoding: 'utf8' });
  assert.equal(cli.status, 0, cli.stderr);
  const result = JSON.parse(cli.stdout);
  assert.equal(result.status, 'saved');
  assert.equal(spawnSync('git', ['-C', f.root, 'check-ignore', '-q', '--', result.archivePath]).status, 0);
  assert.ok(unpack(await readFile(result.archivePath)).has('miw-main-transcript.jsonl'));
});
