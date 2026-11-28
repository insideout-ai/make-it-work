import { inflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { crc32 } from './zip.mjs';

// Read only our bounded ZIP32 format; never extract paths to disk.
export function readCostArchive(buffer) {
  const files = new Map(); let offset = 0, total = 0;
  while (offset + 4 <= buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    if (offset + 30 > buffer.length) throw new Error('Truncated archive');
    const flags = buffer.readUInt16LE(offset + 6), method = buffer.readUInt16LE(offset + 8);
    const packed = buffer.readUInt32LE(offset + 18), size = buffer.readUInt32LE(offset + 22);
    const nameSize = buffer.readUInt16LE(offset + 26), extra = buffer.readUInt16LE(offset + 28);
    const start = offset + 30 + nameSize + extra, end = start + packed;
    const name = buffer.toString('utf8', offset + 30, offset + 30 + nameSize);
    if (flags !== 0 || method !== 8 || end > buffer.length || !/^miw-[A-Za-z0-9_.-]+$/.test(name) || files.has(name)) throw new Error('Unsupported archive entry');
    total += size;
    if (total > 256 * 1024 * 1024 || files.size >= 10000) throw new Error('Archive size limit');
    const data = inflateRawSync(buffer.subarray(start, end), { maxOutputLength: Math.max(1, size) });
    if (data.length !== size || crc32(data) !== buffer.readUInt32LE(offset + 14)) throw new Error('Archive checksum mismatch');
    files.set(name, data); offset = end;
  }
  if (offset + 4 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error('Invalid archive');
  const manifest = JSON.parse(files.get('miw-manifest.json')?.toString('utf8') ?? 'null');
  if (manifest?.version !== 1 || !Array.isArray(manifest.entries) || !Number.isFinite(Date.parse(manifest.capturedAt))) throw new Error('Invalid archive manifest');
  for (const entry of manifest.entries.filter(e => e.status === 'captured')) {
    const data = files.get(entry.name);
    if (!data || data.length !== entry.bytes || createHash('sha256').update(data).digest('hex') !== entry.sha256) throw new Error('Manifest checksum mismatch');
  }
  return { files, manifest };
}
